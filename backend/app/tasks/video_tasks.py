"""
Video Generation Celery Tasks

Production-ready tasks with:
- Automatic retries with exponential backoff
- Progress tracking via task state
- WebSocket notifications
- Comprehensive error handling
"""
import asyncio
import logging
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from sqlalchemy import select, create_engine
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.services.veo_service import veo_service
from app.services.face_service import face_service
from app.core.websocket_manager import manager
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobStatus
from app.config import settings

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
    operation_id: Optional[str] = None,
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
            if operation_id:
                job.external_operation_id = operation_id
            db.commit()


def update_node_status_sync(
    node_id: str,
    status: NodeStatus,
    data: Optional[Dict] = None,
    error_message: Optional[str] = None,
) -> Optional[str]:
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
            return str(node.project_id)
    return None


def broadcast_progress_sync(
    project_id: str,
    node_id: str,
    progress: int,
    status: str,
    message: str,
):
    """Broadcast progress to WebSocket clients (sync wrapper)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(
            manager.broadcast_job_progress(
                project_id=project_id,
                node_id=node_id,
                progress=progress,
                status=status,
                message=message,
            )
        )
    except Exception as e:
        logger.warning(f"Failed to broadcast progress: {e}")
    finally:
        loop.close()


@celery_app.task(
    bind=True,
    name="app.tasks.video_tasks.generate_video",
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    acks_late=True,
    reject_on_worker_lost=True,
    time_limit=600,
    soft_time_limit=540,
)
def generate_video(
    self,
    job_id: str,
    node_id: str,
    project_id: str,
    prompt: str,
    image_url: Optional[str] = None,
    character_id: Optional[str] = None,
    resolution: str = "1080p",
    aspect_ratio: str = "16:9",
    duration: int = 8,
    negative_prompt: Optional[str] = None,
    seed: Optional[int] = None,
    num_videos: int = 1,
    use_fast_model: bool = False,
) -> Dict[str, Any]:
    """
    Generate video using Veo API.

    This is a Celery task with automatic retries and progress tracking.
    """
    logger.info(f"Starting video generation task {self.request.id} for job {job_id}")

    # Update status to processing
    update_job_status_sync(job_id, JobStatus.PROCESSING, progress=0)
    update_node_status_sync(node_id, NodeStatus.PROCESSING)
    broadcast_progress_sync(project_id, node_id, 0, "processing", "Starting...")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Get character description if provided
        character_description = None
        if character_id:
            broadcast_progress_sync(project_id, node_id, 2, "processing", "Loading character...")
            try:
                character_description = loop.run_until_complete(
                    face_service.get_character_description(character_id)
                )
            except Exception as e:
                logger.warning(f"Failed to load character: {e}")

        # Start video generation
        broadcast_progress_sync(project_id, node_id, 5, "processing", "Starting generation...")

        generation_type = "image-to-video" if image_url else "text-to-video"

        try:
            operation_id = loop.run_until_complete(
                veo_service.generate_video(
                    prompt=prompt,
                    image_url=image_url,
                    resolution=resolution,
                    aspect_ratio=aspect_ratio,
                    duration=duration,
                    negative_prompt=negative_prompt,
                    seed=seed,
                    num_videos=num_videos,
                    use_fast_model=use_fast_model,
                    enhance_prompt=True,
                    character_description=character_description,
                )
            )
        except Exception as e:
            error_msg = str(e)
            if "safety" in error_msg.lower() or "blocked" in error_msg.lower():
                # Don't retry content safety errors
                update_job_status_sync(job_id, JobStatus.FAILED, error="Content blocked by safety filters")
                update_node_status_sync(node_id, NodeStatus.FAILED, error_message="Content blocked")
                broadcast_progress_sync(project_id, node_id, 0, "failed", "Content blocked")
                raise Exception("Content blocked by safety filters - will not retry")
            raise

        update_job_status_sync(job_id, JobStatus.PROCESSING, progress=10, operation_id=operation_id)
        broadcast_progress_sync(project_id, node_id, 10, "processing", f"Generating ({generation_type})...")

        # Poll for completion
        poll_count = 0
        max_polls = settings.VEO_MAX_POLL_TIME // settings.VEO_POLL_INTERVAL

        while poll_count < max_polls:
            result = loop.run_until_complete(veo_service.poll_operation(operation_id))

            if result["done"]:
                if result["error"]:
                    error_msg = result["error"]
                    update_job_status_sync(job_id, JobStatus.FAILED, error=error_msg)
                    update_node_status_sync(node_id, NodeStatus.FAILED, error_message=error_msg)
                    broadcast_progress_sync(project_id, node_id, 0, "failed", error_msg[:100])

                    if "quota" in error_msg.lower() or "rate" in error_msg.lower():
                        raise Exception(f"Rate limited: {error_msg}")  # Will retry
                    raise Exception(error_msg)

                # Download video
                broadcast_progress_sync(project_id, node_id, 85, "processing", "Downloading...")

                video_id = str(uuid4())
                destination_path = f"videos/{project_id}/{video_id}"

                video_result = loop.run_until_complete(
                    veo_service.download_generated_video(
                        operation_result=result["result"],
                        destination_path=destination_path,
                        select_best=True,
                    )
                )

                # Success! Include Veo references for extension capability
                all_videos = video_result.get("all_videos", [])
                # Get Veo video reference from the first/selected video
                veo_video_uri = all_videos[0].get("veo_video_uri") if all_videos else None
                veo_video_name = all_videos[0].get("veo_video_name") if all_videos else None

                result_data = {
                    "video_url": video_result["video_url"],
                    "video_id": video_id,
                    "all_videos": all_videos,
                    "duration": duration,
                    "resolution": resolution,
                    "aspect_ratio": aspect_ratio,
                    "generation_type": generation_type,
                    "veo_video_uri": veo_video_uri,  # For video extension
                    "veo_video_name": veo_video_name,  # For video extension
                }

                update_job_status_sync(job_id, JobStatus.COMPLETED, progress=100, result=result_data)
                update_node_status_sync(node_id, NodeStatus.COMPLETED, data=result_data)
                broadcast_progress_sync(project_id, node_id, 100, "completed", "Complete")

                logger.info(f"Video generation complete for job {job_id}")
                return result_data

            # Update progress
            poll_count += 1
            progress = min(10 + int(poll_count * 70 / max_polls), 80)

            # Update Celery task state for monitoring
            self.update_state(
                state="PROGRESS",
                meta={"progress": progress, "status": "generating"}
            )

            update_job_status_sync(job_id, JobStatus.PROCESSING, progress=progress)
            broadcast_progress_sync(project_id, node_id, progress, "processing", "Generating...")

            loop.run_until_complete(asyncio.sleep(settings.VEO_POLL_INTERVAL))

        # Timeout
        raise Exception(f"Video generation timed out after {settings.VEO_MAX_POLL_TIME}s")

    except Exception as e:
        logger.error(f"Video generation failed: {e}")

        # Update status on final failure
        if self.request.retries >= self.max_retries:
            update_job_status_sync(job_id, JobStatus.FAILED, error=str(e))
            update_node_status_sync(node_id, NodeStatus.FAILED, error_message=str(e))
            broadcast_progress_sync(project_id, node_id, 0, "failed", str(e)[:100])

        raise

    finally:
        loop.close()


@celery_app.task(
    bind=True,
    name="app.tasks.video_tasks.extend_video",
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=600,
    soft_time_limit=540,
)
def extend_video(
    self,
    job_id: str,
    node_id: str,
    project_id: str,
    video_url: str,
    prompt: str,
    seed: Optional[int] = None,
    extension_count: int = 1,
    veo_video_uri: Optional[str] = None,
    veo_video_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extend video using Veo API.

    Provides seamless temporal continuation of existing video.
    IMPORTANT: Only videos generated by Veo can be extended.
    Must pass veo_video_uri or veo_video_name from original generation.
    """
    logger.info(f"Starting video extension task for job {job_id}")
    logger.info(f"Veo URI: {veo_video_uri}, Veo Name: {veo_video_name}")

    if extension_count > 20:
        raise Exception("Maximum extension limit (20) reached")

    update_job_status_sync(job_id, JobStatus.PROCESSING, progress=0)
    update_node_status_sync(node_id, NodeStatus.PROCESSING)
    broadcast_progress_sync(project_id, node_id, 5, "processing", "Starting extension...")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        try:
            operation_id = loop.run_until_complete(
                veo_service.extend_video(
                    video_url=video_url,
                    prompt=prompt,
                    veo_video_uri=veo_video_uri,
                    veo_video_name=veo_video_name,
                    seed=seed,
                )
            )
        except Exception as e:
            error_msg = str(e)
            if "safety" in error_msg.lower():
                update_job_status_sync(job_id, JobStatus.FAILED, error="Content blocked")
                update_node_status_sync(node_id, NodeStatus.FAILED, error_message="Content blocked")
                raise Exception("Content blocked - will not retry")
            raise

        update_job_status_sync(job_id, JobStatus.PROCESSING, progress=10, operation_id=operation_id)
        broadcast_progress_sync(project_id, node_id, 10, "processing", f"Extending (#{extension_count})...")

        # Poll for completion
        poll_count = 0
        max_polls = settings.VEO_MAX_POLL_TIME // settings.VEO_POLL_INTERVAL

        while poll_count < max_polls:
            result = loop.run_until_complete(veo_service.poll_operation(operation_id))

            if result["done"]:
                if result["error"]:
                    raise Exception(result["error"])

                broadcast_progress_sync(project_id, node_id, 85, "processing", "Downloading...")

                video_id = str(uuid4())
                destination_path = f"videos/{project_id}/{video_id}"

                video_result = loop.run_until_complete(
                    veo_service.download_generated_video(
                        operation_result=result["result"],
                        destination_path=destination_path,
                        select_best=True,
                    )
                )

                result_data = {
                    "video_url": video_result["video_url"],
                    "video_id": video_id,
                    "extension_count": extension_count,
                    "source_video_url": video_url,
                    "resolution": "720p",
                    "remaining_extensions": 20 - extension_count,
                }

                update_job_status_sync(job_id, JobStatus.COMPLETED, progress=100, result=result_data)
                update_node_status_sync(node_id, NodeStatus.COMPLETED, data=result_data)
                broadcast_progress_sync(project_id, node_id, 100, "completed", "Complete")

                return result_data

            poll_count += 1
            progress = min(10 + int(poll_count * 70 / max_polls), 80)

            self.update_state(state="PROGRESS", meta={"progress": progress})
            update_job_status_sync(job_id, JobStatus.PROCESSING, progress=progress)
            broadcast_progress_sync(project_id, node_id, progress, "processing", "Extending...")

            loop.run_until_complete(asyncio.sleep(settings.VEO_POLL_INTERVAL))

        raise Exception("Extension timed out")

    except Exception as e:
        logger.error(f"Video extension failed: {e}")

        if self.request.retries >= self.max_retries:
            update_job_status_sync(job_id, JobStatus.FAILED, error=str(e))
            update_node_status_sync(node_id, NodeStatus.FAILED, error_message=str(e))

        raise

    finally:
        loop.close()
