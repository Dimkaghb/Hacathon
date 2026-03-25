"""
Character Library API

User-level character management with wardrobe presets.
Characters are owned by users (not projects) and can be reused across projects.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.core.database import get_db
from app.models.user import User
from app.models.character import Character
from app.models.wardrobe_preset import WardrobePreset
from app.models.subscription import Subscription
from app.models.project import Project
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobType, JobStatus
from app.schemas.character import (
    CharacterLibraryCreate,
    CharacterLibraryUpdate,
    CharacterLibraryResponse,
)
from app.schemas.wardrobe_preset import (
    WardrobePresetCreate,
    WardrobePresetUpdate,
    WardrobePresetResponse,
)
from app.api.deps import get_current_user, require_active_subscription
from app.services.subscription_service import subscription_service, CREDIT_COSTS
from app.services.vector_service import vector_service
from app.tasks.face_tasks import analyze_face as analyze_face_task
from app.schemas.ai import JobStatusResponse

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _dispatch_face_analysis(
    db: AsyncSession,
    character: Character,
    user_id: UUID,
    image_url: str,
) -> None:
    """
    Create a tracking job+node and dispatch the face analysis Celery task.

    Requires at least one project to exist for the user (for job/node tracking).
    Silently skips if no project is found so character creation never fails.
    """
    proj_result = await db.execute(
        select(Project).where(Project.user_id == user_id).limit(1)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        return  # No project to attach the tracking node to — skip silently

    node = Node(
        project_id=project.id,
        type="image",
        character_id=character.id,
        data={"image_url": image_url},
        status=NodeStatus.PROCESSING,
    )
    db.add(node)
    await db.flush()  # Get node.id without committing outer transaction

    job = Job(
        node_id=node.id,
        type=JobType.FACE_ANALYSIS,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.flush()

    await db.commit()

    analyze_face_task.delay(
        job_id=str(job.id),
        node_id=str(node.id),
        project_id=str(project.id),
        character_id=str(character.id),
        image_url=image_url,
        user_id=str(user_id),
        credit_cost=0,  # Auto-analysis is free; manual re-analysis charges credits
    )


def _primary_image_url(source_images: list) -> str | None:
    """Extract the primary (or first) image URL from source_images list."""
    for img in source_images:
        if img.get("is_primary"):
            return img.get("url")
    if source_images:
        return source_images[0].get("url")
    return None


# ── Character CRUD ──────────────────────────────────────────────────────────

@router.get("", response_model=list[CharacterLibraryResponse])
async def list_characters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all characters in the user's library."""
    result = await db.execute(
        select(Character)
        .options(selectinload(Character.wardrobe_presets))
        .where(Character.user_id == current_user.id)
        .order_by(Character.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CharacterLibraryResponse, status_code=201)
async def create_character(
    data: CharacterLibraryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new character in the user's library.

    If source_images are provided, face analysis is automatically dispatched
    (free of charge) so the ArcFace embedding is ready before the first
    video generation.
    """
    primary_url = _primary_image_url(data.source_images)

    character = Character(
        user_id=current_user.id,
        name=data.name,
        source_image_url=primary_url,
        source_images=data.source_images,
        voice_profile=data.voice_profile or {},
        performance_style=data.performance_style or {},
        analysis_data={},
    )
    db.add(character)
    await db.commit()
    await db.refresh(character)

    # Auto-analyze face if an image was provided
    if primary_url:
        try:
            await _dispatch_face_analysis(db, character, current_user.id, primary_url)
        except Exception:
            pass  # Never let analysis dispatch failure break character creation

    result = await db.execute(
        select(Character)
        .options(selectinload(Character.wardrobe_presets))
        .where(Character.id == character.id)
    )
    return result.scalar_one()


@router.get("/{character_id}", response_model=CharacterLibraryResponse)
async def get_character(
    character_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single character with wardrobe presets."""
    result = await db.execute(
        select(Character)
        .options(selectinload(Character.wardrobe_presets))
        .where(Character.id == character_id, Character.user_id == current_user.id)
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@router.put("/{character_id}", response_model=CharacterLibraryResponse)
async def update_character(
    character_id: UUID,
    data: CharacterLibraryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update character details.

    If source_images change, face analysis is automatically re-dispatched
    to update the ArcFace embedding in Qdrant.
    """
    result = await db.execute(
        select(Character)
        .options(selectinload(Character.wardrobe_presets))
        .where(Character.id == character_id, Character.user_id == current_user.id)
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    images_changed = False

    if data.name is not None:
        character.name = data.name
    if data.prompt_dna is not None:
        character.prompt_dna = data.prompt_dna
    if data.source_images is not None:
        images_changed = True
        character.source_images = data.source_images
        primary_url = _primary_image_url(data.source_images)
        character.source_image_url = primary_url
    if data.voice_profile is not None:
        character.voice_profile = data.voice_profile
    if data.performance_style is not None:
        character.performance_style = data.performance_style
    if data.metadata is not None:
        character.metadata_ = data.metadata

    await db.commit()
    await db.refresh(character)

    # Re-analyze if images were updated
    if images_changed and character.source_image_url:
        try:
            await _dispatch_face_analysis(
                db, character, current_user.id, character.source_image_url
            )
        except Exception:
            pass

    return character


@router.delete("/{character_id}", status_code=204)
async def delete_character(
    character_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a character from the library and remove its Qdrant embedding."""
    result = await db.execute(
        select(Character).where(
            Character.id == character_id, Character.user_id == current_user.id
        )
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    # Clean up Qdrant embedding before deleting from DB
    if character.embedding_id:
        try:
            await vector_service.delete_embedding(str(character_id))
        except Exception:
            pass  # Don't block deletion if Qdrant cleanup fails

    await db.delete(character)
    await db.commit()


# ── Face Analysis (manual trigger) ──────────────────────────────────────────

@router.post("/{character_id}/analyze", response_model=JobStatusResponse)
async def analyze_character_face(
    character_id: UUID,
    current_user: User = Depends(get_current_user),
    subscription: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually trigger face analysis on a character. Costs 5 credits.

    Use this to re-analyze after changing photos or if auto-analysis failed.
    """
    result = await db.execute(
        select(Character).where(
            Character.id == character_id, Character.user_id == current_user.id
        )
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    image_url = character.source_image_url
    if not image_url and character.source_images:
        image_url = character.source_images[0].get("url")
    if not image_url:
        raise HTTPException(status_code=400, detail="Character has no source image")

    # TESTING MODE: credit deduction disabled — re-enable by uncommenting below
    credit_cost = CREDIT_COSTS["face_analysis"]
    # await subscription_service.deduct_credits(
    #     db, current_user.id, credit_cost, "face_analysis"
    # )

    proj_result = await db.execute(
        select(Project).where(Project.user_id == current_user.id).limit(1)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=400, detail="No project found for face analysis node")

    node = Node(
        project_id=project.id,
        type="image",
        character_id=character.id,
        data={"image_url": image_url},
        status=NodeStatus.PROCESSING,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)

    job = Job(
        node_id=node.id,
        type=JobType.FACE_ANALYSIS,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    analyze_face_task.delay(
        job_id=str(job.id),
        node_id=str(node.id),
        project_id=str(project.id),
        character_id=str(character.id),
        image_url=image_url,
        user_id=str(current_user.id),
        credit_cost=credit_cost,
    )

    return JobStatusResponse(
        job_id=job.id,
        node_id=node.id,
        type=job.type.value,
        status=job.status.value,
        progress=0,
    )


# ── Wardrobe Presets ────────────────────────────────────────────────────────

@router.post("/{character_id}/wardrobe", response_model=WardrobePresetResponse, status_code=201)
async def create_wardrobe_preset(
    character_id: UUID,
    data: WardrobePresetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a wardrobe preset to a character."""
    result = await db.execute(
        select(Character).where(
            Character.id == character_id, Character.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Character not found")

    preset = WardrobePreset(
        character_id=character_id,
        name=data.name,
        description=data.description,
        reference_images=data.reference_images,
        clothing_details=data.clothing_details or {},
        prompt_snippet=data.prompt_snippet,
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    return preset


@router.put("/{character_id}/wardrobe/{preset_id}", response_model=WardrobePresetResponse)
async def update_wardrobe_preset(
    character_id: UUID,
    preset_id: UUID,
    data: WardrobePresetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a wardrobe preset."""
    result = await db.execute(
        select(Character).where(
            Character.id == character_id, Character.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Character not found")

    result = await db.execute(
        select(WardrobePreset).where(
            WardrobePreset.id == preset_id,
            WardrobePreset.character_id == character_id,
        )
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Wardrobe preset not found")

    if data.name is not None:
        preset.name = data.name
    if data.description is not None:
        preset.description = data.description
    if data.reference_images is not None:
        preset.reference_images = data.reference_images
    if data.clothing_details is not None:
        preset.clothing_details = data.clothing_details
    if data.prompt_snippet is not None:
        preset.prompt_snippet = data.prompt_snippet

    await db.commit()
    await db.refresh(preset)
    return preset


@router.delete("/{character_id}/wardrobe/{preset_id}", status_code=204)
async def delete_wardrobe_preset(
    character_id: UUID,
    preset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a wardrobe preset."""
    result = await db.execute(
        select(Character).where(
            Character.id == character_id, Character.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Character not found")

    result = await db.execute(
        select(WardrobePreset).where(
            WardrobePreset.id == preset_id,
            WardrobePreset.character_id == character_id,
        )
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Wardrobe preset not found")

    await db.delete(preset)
    await db.commit()
