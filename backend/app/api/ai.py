"""
AI Operations API

Provides endpoints for:
- Face analysis and character creation
- Prompt enhancement
- Video generation (text-to-video, image-to-video)
- Video extension
"""
from typing import Any, Callable, Dict
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
    VideoStitchRequest,
    ExportVideoRequest,
    JobStatusResponse,
    CharacterCreate,
    CharacterResponse,
)
from app.api.deps import get_current_user, verify_project_access, require_active_subscription
from app.models.subscription import Subscription
from app.services.prompt_service import prompt_service
from app.services.subscription_service import subscription_service, CREDIT_COSTS
from app.core.exceptions import InsufficientCreditsError

# Import Celery tasks
from app.tasks.video_tasks import generate_video as generate_video_task
from app.tasks.video_tasks import extend_video as extend_video_task
from app.tasks.video_tasks import stitch_videos as stitch_videos_task
from app.tasks.video_tasks import export_video as export_video_task
from app.tasks.face_tasks import analyze_face as analyze_face_task
from app.services.stitch_service import PLATFORM_PRESETS

router = APIRouter()


async def create_and_dispatch_video_job(
    db: AsyncSession,
    node: Node,
    job_type: JobType,
    celery_task: Callable,
    task_kwargs: Dict[str, Any],
) -> Job:
    """
    Create a job record and dispatch it to Celery.

    This consolidates the common job creation and dispatch logic
    for video generation and extension endpoints.

    Args:
        db: Database session
        node: The node associated with this job
        job_type: Type of job (VIDEO_GENERATION or VIDEO_EXTENSION)
        celery_task: The Celery task to dispatch
        task_kwargs: Keyword arguments to pass to the Celery task

    Returns:
        The created Job record
    """
    # Update node status
    node.status = NodeStatus.PROCESSING
    await db.commit()

    # Create job record
    job = Job(
        node_id=node.id,
        type=job_type,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch Celery task with standard parameters
    celery_task.delay(
        job_id=str(job.id),
        node_id=str(node.id),
        project_id=str(node.project_id),
        **task_kwargs,
    )

    return job


@router.post("/analyze-face", response_model=JobStatusResponse)
async def analyze_face(
    request: FaceAnalysisRequest,
    current_user: User = Depends(get_current_user),
    subscription: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a face image and create a character.

    This extracts visual embeddings for character consistency
    in video generation. Costs 5 credits.
    """
    # Deduct credits
    credit_cost = CREDIT_COSTS["face_analysis"]
    await subscription_service.deduct_credits(
        db, current_user.id, credit_cost, "face_analysis"
    )

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
        user_id=current_user.id,
        project_id=request.project_id,
        name=request.character_name,
        source_image_url=request.image_url,
        source_images=[{"url": request.image_url, "angle": "front", "is_primary": True}],
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


@router.post("/enhance-prompt", response_model=PromptEnhanceResponse)
async def enhance_prompt(
    request: PromptEnhanceRequest,
    current_user: User = Depends(get_current_user),
    subscription: Subscription = Depends(require_active_subscription),
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
    subscription: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a video using Veo 3.1.

    Supports:
    - Text-to-video generation
    - Image-to-video generation (when image_url provided)
    - Character consistency (when character_id provided)
    - Multiple video candidates (num_videos > 1)

    Costs 25 credits (standard) or 10 credits (fast).
    """
    # Deduct credits
    operation_type = "video_generation_fast" if request.use_fast_model else "video_generation_standard"
    credit_cost = CREDIT_COSTS[operation_type]
    await subscription_service.deduct_credits(
        db, current_user.id, credit_cost, operation_type
    )

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

    # Create and dispatch job
    job = await create_and_dispatch_video_job(
        db=db,
        node=node,
        job_type=JobType.VIDEO_GENERATION,
        celery_task=generate_video_task,
        task_kwargs={
            "prompt": request.prompt,
            "image_url": request.image_url,
            "character_id": str(request.character_id) if request.character_id else None,
            "wardrobe_preset_id": str(request.wardrobe_preset_id) if request.wardrobe_preset_id else None,
            "product_data": request.product_data,
            "setting_data": request.setting_data,
            "resolution": request.resolution.value,
            "aspect_ratio": request.aspect_ratio.value,
            "duration": request.duration,
            "negative_prompt": request.negative_prompt,
            "seed": request.seed,
            "num_videos": request.num_videos,
            "use_fast_model": request.use_fast_model,
            "user_id": str(current_user.id),
            "credit_cost": credit_cost,
        },
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
    subscription: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """
    Extend an existing video with temporal continuity.

    Uses Veo's video extension capability for seamless continuation.
    Note: Extensions are limited to 720p and max 20 extensions.
    Costs 25 credits (standard) or 10 credits (fast).
    """
    # Deduct credits (extensions currently use standard model)
    operation_type = "video_extension_standard"
    credit_cost = CREDIT_COSTS[operation_type]
    await subscription_service.deduct_credits(
        db, current_user.id, credit_cost, operation_type
    )

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

    # Validate extension count (endpoint-specific validation)
    if request.extension_count > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum extension limit is 20",
        )

    # Create and dispatch job
    job = await create_and_dispatch_video_job(
        db=db,
        node=node,
        job_type=JobType.VIDEO_EXTENSION,
        celery_task=extend_video_task,
        task_kwargs={
            "video_url": request.video_url,
            "prompt": request.prompt,
            "seed": request.seed,
            "extension_count": request.extension_count,
            "veo_video_uri": request.veo_video_uri,
            "veo_video_name": request.veo_video_name,
            "user_id": str(current_user.id),
            "credit_cost": credit_cost,
        },
    )

    return JobStatusResponse(
        job_id=job.id,
        node_id=node.id,
        type=job.type.value,
        status=job.status.value,
        progress=0,
    )


@router.post("/stitch-videos", response_model=JobStatusResponse)
async def stitch_videos_endpoint(
    request: VideoStitchRequest,
    current_user: User = Depends(get_current_user),
    subscription: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """
    Stitch multiple video segments into one final video using FFmpeg.

    Videos are concatenated in the order provided, with optional transitions
    (cut, fade, crossfade) and aspect-ratio normalisation.

    Zero credits charged — this is assembly only, no AI generation.
    """
    if len(request.video_urls) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 video_urls are required for stitching",
        )

    # Verify the stitch node belongs to the authenticated user
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

    job = await create_and_dispatch_video_job(
        db=db,
        node=node,
        job_type=JobType.VIDEO_STITCH,
        celery_task=stitch_videos_task,
        task_kwargs={
            "video_urls": request.video_urls,
            "transitions": request.transitions,
            "aspect_ratio": request.aspect_ratio,
            "output_format": request.output_format,
        },
    )

    return JobStatusResponse(
        job_id=job.id,
        node_id=node.id,
        type=job.type.value,
        status=job.status.value,
        progress=0,
    )


@router.post("/export-video", response_model=JobStatusResponse)
async def export_video(
    request: ExportVideoRequest,
    current_user: User = Depends(get_current_user),
    subscription: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """
    Export a video for a specific platform (TikTok, Instagram, YouTube, etc.).

    Re-encodes to the platform's required aspect ratio, resolution, and
    max duration. Zero credits charged — post-processing only.
    """
    # Validate platform
    if request.platform not in PLATFORM_PRESETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown platform: {request.platform}. Valid: {list(PLATFORM_PRESETS.keys())}",
        )

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

    # Create job record
    job = Job(
        node_id=node.id,
        type=JobType.VIDEO_EXPORT,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch Celery task
    export_video_task.delay(
        job_id=str(job.id),
        node_id=str(node.id),
        project_id=str(node.project_id),
        video_url=request.video_url,
        platform=request.platform,
    )

    return JobStatusResponse(
        job_id=job.id,
        node_id=node.id,
        type=job.type.value,
        status=job.status.value,
        progress=0,
    )


@router.get("/export-presets")
async def get_export_presets(
    current_user: User = Depends(get_current_user),
):
    """Return available platform export presets."""
    return PLATFORM_PRESETS


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

    result = job.result or {}
    return JobStatusResponse(
        job_id=job.id,
        node_id=job.node_id,
        type=job.type.value,
        status=job.status.value,
        progress=job.progress,
        result=job.result,
        error=job.error,
        progress_message=result.get("progress_message"),
        stage=result.get("stage"),
    )


@router.get("/nodes/{node_id}/jobs/latest", response_model=JobStatusResponse)
async def get_latest_job_for_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest job for a node (useful for resuming polling after page reload)"""
    result = await db.execute(
        select(Job)
        .join(Node)
        .join(Project)
        .where(
            Job.node_id == node_id,
            Project.user_id == current_user.id,
        )
        .order_by(Job.created_at.desc())
        .limit(1)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No job found for this node",
        )

    result = job.result or {}
    return JobStatusResponse(
        job_id=job.id,
        node_id=job.node_id,
        type=job.type.value,
        status=job.status.value,
        progress=job.progress,
        result=job.result,
        error=job.error,
        progress_message=result.get("progress_message"),
        stage=result.get("stage"),
    )


@router.post("/{project_id}/characters", response_model=CharacterResponse)
async def create_character(
    character_data: CharacterCreate,
    project: Project = Depends(verify_project_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a character without face analysis."""
    character = Character(
        user_id=current_user.id,
        project_id=project.id,
        name=character_data.name,
        source_image_url=character_data.source_image_url,
        source_images=[{"url": character_data.source_image_url, "angle": "front", "is_primary": True}],
        analysis_data={},
    )
    db.add(character)
    await db.commit()
    await db.refresh(character)
    return character


@router.get("/{project_id}/characters", response_model=list[CharacterResponse])
async def list_characters(
    project: Project = Depends(verify_project_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all characters for the current user (user-level library)."""
    result = await db.execute(
        select(Character).where(Character.user_id == current_user.id)
    )
    return result.scalars().all()
