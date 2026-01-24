from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.core.database import get_db
from app.core.redis import job_queue
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

router = APIRouter()


@router.post("/analyze-face", response_model=JobStatusResponse)
async def analyze_face(
    request: FaceAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
        metadata={},
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

    # Create job
    job = Job(
        node_id=node.id,
        type=JobType.FACE_ANALYSIS,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Enqueue job
    await job_queue.enqueue({
        "job_id": str(job.id),
        "type": "face_analysis",
        "node_id": str(node.id),
        "character_id": str(character.id),
        "project_id": str(request.project_id),
        "image_url": request.image_url,
    })

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

    # Create job
    job = Job(
        node_id=node.id,
        type=JobType.VIDEO_GENERATION,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Enqueue job
    await job_queue.enqueue({
        "job_id": str(job.id),
        "type": "video_generation",
        "node_id": str(node.id),
        "project_id": str(node.project_id),
        "prompt": request.prompt,
        "image_url": request.image_url,
        "character_id": str(request.character_id) if request.character_id else None,
        "resolution": request.resolution.value,
        "aspect_ratio": request.aspect_ratio.value,
        "duration": request.duration,
        "negative_prompt": request.negative_prompt,
    })

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

    # Create job
    job = Job(
        node_id=node.id,
        type=JobType.VIDEO_EXTENSION,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Enqueue job
    await job_queue.enqueue({
        "job_id": str(job.id),
        "type": "video_extension",
        "node_id": str(node.id),
        "project_id": str(node.project_id),
        "video_url": request.video_url,
        "prompt": request.prompt,
    })

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
    character = Character(
        project_id=project.id,
        name=character_data.name,
        source_image_url=character_data.source_image_url,
        metadata={},
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
    result = await db.execute(
        select(Character).where(Character.project_id == project.id)
    )
    return result.scalars().all()
