"""
AI Operations API

Provides endpoints for:
- Face analysis and character creation
- Prompt enhancement
- Video generation (text-to-video, image-to-video)
- Video extension
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.core.database import get_db
from app.models.user import User
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobType, JobStatus
from app.models.character import Character
from app.models.project import Project
from app.schemas.ai import (
    FaceAnalysisRequest,
    FaceAnalysisResponse,
    PromptEnhanceRequest,
    PromptEnhanceResponse,
    VideoGenerateRequest,
    VideoExtendRequest,
    JobStatusResponse,
    CharacterCreate,
    CharacterResponse,
)
from app.api.deps import get_current_user, verify_project_access
from app.services.prompt_service import prompt_service

# Import Celery tasks
from app.tasks.video_tasks import generate_video as generate_video_task
from app.tasks.video_tasks import extend_video as extend_video_task
from app.tasks.face_tasks import analyze_face as analyze_face_task

router = APIRouter()


@router.post("/analyze-face", response_model=JobStatusResponse)
async def analyze_face(
    request: FaceAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a face image and create a character.

    This extracts visual embeddings for character consistency
    in video generation.
    """
    # Verify project access
    result = await db.execute(
        select(Project).where(
            Project.id == request.project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Create character
    character = Character(
        project_id=request.project_id,
        name=request.character_name,
        source_image_url=request.image_url,
        analysis_data={},
    )
    db.add(character)
    await db.commit()
    await db.refresh(character)

    # Create a placeholder node for the job
    node = Node(
        project_id=request.project_id,
        type="image",
        character_id=character.id,
        data={"image_url": request.image_url},
        status=NodeStatus.PROCESSING,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)

    # Create job record
    job = Job(
        node_id=node.id,
        type=JobType.FACE_ANALYSIS,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch Celery task
    analyze_face_task.delay(
        job_id=str(job.id),
        node_id=str(node.id),
        project_id=str(request.project_id),
        character_id=str(character.id),
        image_url=request.image_url,
    )

    return JobStatusResponse(
        job_id=job.id,
        node_id=node.id,
        type=job.type.value,
        status=job.status.value,
        progress=0,
    )


@router.post("/enhance-prompt", response_model=PromptEnhanceResponse)
async def enhance_prompt(
    request: PromptEnhanceRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Enhance a video generation prompt using AI.

    Adds cinematographic details and visual guidance for better results.
    """
    enhanced = await prompt_service.enhance_prompt(
        prompt=request.prompt,
        style=request.style,
        mood=request.mood,
    )
    return enhanced


@router.post("/generate-video", response_model=JobStatusResponse)
async def generate_video(
    request: VideoGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a video using Veo 3.1.

    Supports:
    - Text-to-video generation
    - Image-to-video generation (when image_url provided)
    - Character consistency (when character_id provided)
    - Multiple video candidates (num_videos > 1)
    """
    # Verify node exists and user has access
    result = await db.execute(
        select(Node)
        .join(Project)
        .where(
            Node.id == request.node_id,
            Project.user_id == current_user.id,
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    # Update node status
    node.status = NodeStatus.PROCESSING
    await db.commit()

    # Create job record
    job = Job(
        node_id=node.id,
        type=JobType.VIDEO_GENERATION,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch Celery task
    generate_video_task.delay(
        job_id=str(job.id),
        node_id=str(node.id),
        project_id=str(node.project_id),
        prompt=request.prompt,
        image_url=request.image_url,
        character_id=str(request.character_id) if request.character_id else None,
        resolution=request.resolution.value,
        aspect_ratio=request.aspect_ratio.value,
        duration=request.duration,
        negative_prompt=request.negative_prompt,
        seed=request.seed,
        num_videos=request.num_videos,
        use_fast_model=request.use_fast_model,
    )

    return JobStatusResponse(
        job_id=job.id,
        node_id=node.id,
        type=job.type.value,
        status=job.status.value,
        progress=0,
    )


@router.post("/extend-video", response_model=JobStatusResponse)
async def extend_video(
    request: VideoExtendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Extend an existing video with temporal continuity.

    Uses Veo's video extension capability for seamless continuation.
    Note: Extensions are limited to 720p and max 20 extensions.
    """
    # Verify node exists and user has access
    result = await db.execute(
        select(Node)
        .join(Project)
        .where(
            Node.id == request.node_id,
            Project.user_id == current_user.id,
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    # Validate extension count
    if request.extension_count > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum extension limit is 20",
        )

    # Update node status
    node.status = NodeStatus.PROCESSING
    await db.commit()

    # Create job record
    job = Job(
        node_id=node.id,
        type=JobType.VIDEO_EXTENSION,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch Celery task
    extend_video_task.delay(
        job_id=str(job.id),
        node_id=str(node.id),
        project_id=str(node.project_id),
        video_url=request.video_url,
        prompt=request.prompt,
        seed=request.seed,
        extension_count=request.extension_count,
    )

    return JobStatusResponse(
        job_id=job.id,
        node_id=node.id,
        type=job.type.value,
        status=job.status.value,
        progress=0,
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the status of a job."""
    result = await db.execute(
        select(Job)
        .join(Node)
        .join(Project)
        .where(
            Job.id == job_id,
            Project.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return JobStatusResponse(
        job_id=job.id,
        node_id=job.node_id,
        type=job.type.value,
        status=job.status.value,
        progress=job.progress,
        result=job.result,
        error=job.error,
    )


@router.post("/{project_id}/characters", response_model=CharacterResponse)
async def create_character(
    character_data: CharacterCreate,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    """Create a character without face analysis."""
    character = Character(
        project_id=project.id,
        name=character_data.name,
        source_image_url=character_data.source_image_url,
        analysis_data={},
    )
    db.add(character)
    await db.commit()
    await db.refresh(character)
    return character


@router.get("/{project_id}/characters", response_model=list[CharacterResponse])
async def list_characters(
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    """List all characters in a project."""
    result = await db.execute(
        select(Character).where(Character.project_id == project.id)
    )
    return result.scalars().all()
