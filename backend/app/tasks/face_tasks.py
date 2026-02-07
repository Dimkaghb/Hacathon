"""
Face Analysis Celery Tasks

Production-ready tasks for:
- Face analysis and feature extraction
- Visual embedding generation
- Prompt enhancement
"""
import logging
from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy import select, create_engine
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.services.face_service import face_service
from app.services.prompt_service import prompt_service
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobStatus
from app.models.character import Character
from app.config import settings
from app.services.subscription_service import refund_credits_sync

logger = logging.getLogger(__name__)

# Create sync engine for Celery tasks
sync_engine = create_engine(
    settings.DATABASE_URL.replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql+psycopg2"),
    pool_pre_ping=True,
)


def update_job_status_sync(
    job_id: str,
    status: JobStatus,
    progress: int = 0,
    result: Optional[Dict] = None,
    error: Optional[str] = None,
):
    """Update job status in database (sync version)."""
    with Session(sync_engine) as db:
        job = db.execute(
            select(Job).where(Job.id == UUID(job_id))
        ).scalar_one_or_none()

        if job:
            job.status = status
            job.progress = progress
            if result:
                job.result = result
            if error:
                job.error = error
            db.commit()


def update_node_status_sync(
    node_id: str,
    status: NodeStatus,
    data: Optional[Dict] = None,
    error_message: Optional[str] = None,
):
    """Update node status in database (sync version)."""
    with Session(sync_engine) as db:
        node = db.execute(
            select(Node).where(Node.id == UUID(node_id))
        ).scalar_one_or_none()

        if node:
            node.status = status
            if data:
                node.data = {**node.data, **data}
            if error_message:
                node.error_message = error_message
            db.commit()


@celery_app.task(
    bind=True,
    name="app.tasks.face_tasks.analyze_face",
    max_retries=3,
    default_retry_delay=10,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=120,
    soft_time_limit=100,
)
def analyze_face(
    self,
    job_id: str,
    node_id: str,
    project_id: str,
    character_id: str,
    image_url: str,
    user_id: Optional[str] = None,
    credit_cost: int = 0,
) -> Dict[str, Any]:
    """
    Analyze face and extract embeddings.

    Creates visual embeddings for character consistency in video generation.
    """
    import asyncio

    logger.info(f"Starting face analysis for character {character_id}")

    update_job_status_sync(job_id, JobStatus.PROCESSING, progress=0)
    update_node_status_sync(node_id, NodeStatus.PROCESSING)

    try:
        # Run async face analysis in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Store character embedding (does analysis + embedding in parallel)
            result = loop.run_until_complete(
                face_service.store_character_embedding(
                    character_id=character_id,
                    image_url=image_url,
                    metadata={"project_id": project_id},
                )
            )
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Face analysis failed: {e}")

        # Update status on failure
        update_job_status_sync(job_id, JobStatus.FAILED, error=str(e))
        update_node_status_sync(node_id, NodeStatus.FAILED, error_message=str(e))

        # Refund credits on permanent failure
        if self.request.retries >= self.max_retries and user_id and credit_cost > 0:
            try:
                refund_credits_sync(
                    sync_engine=sync_engine,
                    user_id=user_id,
                    amount=credit_cost,
                    job_id=job_id,
                    operation_type="face_analysis",
                )
            except Exception as refund_err:
                logger.error(f"Failed to refund credits: {refund_err}")

        raise

    embedding_id = result["embedding_id"]
    analysis = result["analysis"]
    video_prompt_description = result.get("video_prompt_description", "")

    # Update character in database
    with Session(sync_engine) as db:
        character = db.execute(
            select(Character).where(Character.id == UUID(character_id))
        ).scalar_one_or_none()

        if character:
            character.embedding_id = embedding_id
            character.analysis_data = {
                **character.analysis_data,
                **analysis,
                "video_prompt_description": video_prompt_description,
            }
            db.commit()

    result_data = {
        "character_id": character_id,
        "embedding_id": embedding_id,
        "analysis": analysis,
        "video_prompt_description": video_prompt_description,
    }

    update_job_status_sync(job_id, JobStatus.COMPLETED, progress=100, result=result_data)
    update_node_status_sync(node_id, NodeStatus.COMPLETED, data=result_data)

    logger.info(f"Face analysis complete for character {character_id}")
    return result_data


@celery_app.task(
    name="app.tasks.face_tasks.enhance_prompt",
    max_retries=2,
    default_retry_delay=5,
    time_limit=30,
)
def enhance_prompt(
    prompt: str,
    style: Optional[str] = None,
    mood: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Enhance a video generation prompt using AI.

    This is a quick task that doesn't need job/node tracking.
    """
    import asyncio

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        result = loop.run_until_complete(
            prompt_service.enhance_prompt(
                prompt=prompt,
                style=style,
                mood=mood,
            )
        )

        return {
            "original_prompt": result.original_prompt,
            "enhanced_prompt": result.enhanced_prompt,
            "suggestions": result.suggestions,
        }
    finally:
        loop.close()
