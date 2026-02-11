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
from app.tasks.face_tasks import analyze_face as analyze_face_task
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobType, JobStatus
from app.schemas.ai import JobStatusResponse

router = APIRouter()


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
    """Create a new character in the user's library."""
    # Get primary image URL from source_images
    primary_url = None
    for img in data.source_images:
        if img.get("is_primary"):
            primary_url = img.get("url")
            break
    if not primary_url and data.source_images:
        primary_url = data.source_images[0].get("url")

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

    # Load wardrobe_presets relationship for response
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
    """Update character details."""
    result = await db.execute(
        select(Character)
        .options(selectinload(Character.wardrobe_presets))
        .where(Character.id == character_id, Character.user_id == current_user.id)
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if data.name is not None:
        character.name = data.name
    if data.prompt_dna is not None:
        character.prompt_dna = data.prompt_dna
    if data.source_images is not None:
        character.source_images = data.source_images
        # Update legacy field
        primary_url = None
        for img in data.source_images:
            if img.get("is_primary"):
                primary_url = img.get("url")
                break
        if not primary_url and data.source_images:
            primary_url = data.source_images[0].get("url")
        character.source_image_url = primary_url
    if data.voice_profile is not None:
        character.voice_profile = data.voice_profile
    if data.performance_style is not None:
        character.performance_style = data.performance_style
    if data.metadata is not None:
        character.metadata_ = data.metadata

    await db.commit()
    await db.refresh(character)
    return character


@router.delete("/{character_id}", status_code=204)
async def delete_character(
    character_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a character from the library."""
    result = await db.execute(
        select(Character).where(
            Character.id == character_id, Character.user_id == current_user.id
        )
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    await db.delete(character)
    await db.commit()


# ── Face Analysis ───────────────────────────────────────────────────────────

@router.post("/{character_id}/analyze", response_model=JobStatusResponse)
async def analyze_character_face(
    character_id: UUID,
    current_user: User = Depends(get_current_user),
    subscription: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Run face analysis on a character. Costs 5 credits."""
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

    # Deduct credits
    credit_cost = CREDIT_COSTS["face_analysis"]
    await subscription_service.deduct_credits(
        db, current_user.id, credit_cost, "face_analysis"
    )

    # Need a project to create the placeholder node — use user's first project
    from sqlalchemy import select as sa_select
    from app.models.project import Project

    proj_result = await db.execute(
        sa_select(Project).where(Project.user_id == current_user.id).limit(1)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=400, detail="No project found for face analysis node")

    # Create placeholder node
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

    # Create job
    job = Job(
        node_id=node.id,
        type=JobType.FACE_ANALYSIS,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch task
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
