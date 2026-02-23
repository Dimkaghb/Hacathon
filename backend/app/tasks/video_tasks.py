"""
Video Generation Celery Tasks

Production-ready tasks with:
- Automatic retries with exponential backoff
- Progress tracking via task state
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
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobStatus
from app.config import settings
from app.services.subscription_service import refund_credits_sync
from app.services.prompt_service import build_product_context, build_setting_context, format_performance
from app.services.stitch_service import stitch_service

logger = logging.getLogger(__name__)


# Type alias for operation starter coroutine
from typing import Callable, Awaitable

OperationStarter = Callable[[], Awaitable[str]]


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


def _execute_video_operation(
    celery_task,
    job_id: str,
    node_id: str,
    project_id: str,
    start_operation: OperationStarter,
    operation_label: str,
    build_result_data: Callable[[Dict], Dict[str, Any]],
    credit_refund_info: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute a video operation lifecycle: start, poll, download, and update status.

    This consolidates the common orchestration logic for both video generation
    and video extension tasks.

    Args:
        celery_task: The Celery task instance (self from the task)
        job_id: The job ID to track
        node_id: The node ID to update
        project_id: The project ID
        start_operation: Async callable that starts the operation and returns operation_id
        operation_label: Label for progress messages (e.g., "Generating", "Extending")
        build_result_data: Callable that builds final result data from video_result

    Returns:
        The final result data dict
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Start the operation
        try:
            operation_id = loop.run_until_complete(start_operation())
        except Exception as e:
            error_msg = str(e)
            if "safety" in error_msg.lower() or "blocked" in error_msg.lower():
                update_job_status_sync(job_id, JobStatus.FAILED, error="Content blocked by safety filters")
                update_node_status_sync(node_id, NodeStatus.FAILED, error_message="Content blocked")
                raise Exception("Content blocked by safety filters - will not retry")
            raise

        update_job_status_sync(job_id, JobStatus.PROCESSING, progress=10, operation_id=operation_id)

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

                    if "quota" in error_msg.lower() or "rate" in error_msg.lower():
                        raise Exception(f"Rate limited: {error_msg}")  # Will retry
                    raise Exception(error_msg)

                # Download video
                video_id = str(uuid4())
                destination_path = f"videos/{project_id}/{video_id}"

                video_result = loop.run_until_complete(
                    veo_service.download_generated_video(
                        operation_result=result["result"],
                        destination_path=destination_path,
                        select_best=True,
                    )
                )

                # Build final result using provided builder
                result_data = build_result_data(video_result)

                update_job_status_sync(job_id, JobStatus.COMPLETED, progress=100, result=result_data)
                update_node_status_sync(node_id, NodeStatus.COMPLETED, data=result_data)

                logger.info(f"Video operation complete for job {job_id}")
                return result_data

            # Update progress
            poll_count += 1
            progress = min(10 + int(poll_count * 70 / max_polls), 80)

            # Update Celery task state for monitoring
            celery_task.update_state(
                state="PROGRESS",
                meta={"progress": progress, "status": operation_label.lower()}
            )

            update_job_status_sync(job_id, JobStatus.PROCESSING, progress=progress)

            loop.run_until_complete(asyncio.sleep(settings.VEO_POLL_INTERVAL))

        # Timeout
        raise Exception(f"Video operation timed out after {settings.VEO_MAX_POLL_TIME}s")

    except Exception as e:
        logger.error(f"Video operation failed: {e}")

        # Update status on final failure
        if celery_task.request.retries >= celery_task.max_retries:
            update_job_status_sync(job_id, JobStatus.FAILED, error=str(e))
            update_node_status_sync(node_id, NodeStatus.FAILED, error_message=str(e))

            # Refund credits on permanent failure
            if credit_refund_info:
                try:
                    refund_credits_sync(
                        sync_engine=sync_engine,
                        user_id=credit_refund_info["user_id"],
                        amount=credit_refund_info["amount"],
                        job_id=job_id,
                        operation_type=credit_refund_info["operation_type"],
                    )
                except Exception as refund_err:
                    logger.error(f"Failed to refund credits: {refund_err}")

        raise

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
    wardrobe_preset_id: Optional[str] = None,
    product_data: Optional[Dict[str, Any]] = None,
    setting_data: Optional[Dict[str, Any]] = None,
    resolution: str = "720p",
    aspect_ratio: str = "16:9",
    duration: int = 8,
    negative_prompt: Optional[str] = None,
    seed: Optional[int] = None,
    num_videos: int = 1,
    use_fast_model: bool = False,
    user_id: Optional[str] = None,
    credit_cost: int = 0,
) -> Dict[str, Any]:
    """
    Generate video using Veo API.

    This is a Celery task with automatic retries and progress tracking.
    """
    logger.info(f"Starting video generation task {self.request.id} for job {job_id}")

    # Update status to processing
    update_job_status_sync(job_id, JobStatus.PROCESSING, progress=0)
    update_node_status_sync(node_id, NodeStatus.PROCESSING)

    # Load character description if provided (before starting the operation)
    character_description = None
    if character_id:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            character_description = loop.run_until_complete(
                face_service.get_character_description(character_id)
            )
        except Exception as e:
            logger.warning(f"Failed to load character: {e}")
        finally:
            loop.close()

    # Load wardrobe preset + character model extras from DB
    wardrobe_snippet = None
    character_performance = None
    if character_id or wardrobe_preset_id:
        with Session(sync_engine) as db:
            if wardrobe_preset_id:
                from app.models.wardrobe_preset import WardrobePreset
                wp = db.execute(
                    select(WardrobePreset).where(WardrobePreset.id == UUID(wardrobe_preset_id))
                ).scalar_one_or_none()
                if wp and wp.prompt_snippet:
                    wardrobe_snippet = wp.prompt_snippet
            if character_id:
                from app.models.character import Character
                char = db.execute(
                    select(Character).where(Character.id == UUID(character_id))
                ).scalar_one_or_none()
                if char:
                    if char.prompt_dna and not character_description:
                        character_description = char.prompt_dna
                    if char.performance_style:
                        character_performance = format_performance(char.performance_style)

    # Build enriched prompt with all context
    final_prompt = prompt
    if character_description:
        final_prompt += f"\n\nCharacter: {character_description}"
    if wardrobe_snippet:
        final_prompt += f"\n{wardrobe_snippet}"
    if character_performance:
        final_prompt += f"\nPerformance: {character_performance}"
    if product_data:
        product_ctx = build_product_context(product_data)
        if product_ctx:
            final_prompt += f"\n\nProduct context: {product_ctx}"
    if setting_data:
        setting_ctx = build_setting_context(setting_data)
        if setting_ctx:
            final_prompt += f"\n\nSetting: {setting_ctx}"

    generation_type = "image-to-video" if image_url else "text-to-video"

    # Define the operation starter
    async def start_operation() -> str:
        return await veo_service.generate_video(
            prompt=final_prompt,
            image_url=image_url,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
            duration=duration,
            negative_prompt=negative_prompt,
            seed=seed,
            num_videos=num_videos,
            use_fast_model=use_fast_model,
            enhance_prompt=True,
            character_description=None,  # Already baked into final_prompt
        )

    # Define result builder
    def build_result(video_result: Dict) -> Dict[str, Any]:
        all_videos = video_result.get("all_videos", [])
        veo_video_uri = all_videos[0].get("veo_video_uri") if all_videos else None
        veo_video_name = all_videos[0].get("veo_video_name") if all_videos else None

        return {
            "video_url": video_result["video_url"],
            "video_id": str(uuid4()),
            "all_videos": all_videos,
            "duration": duration,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "generation_type": generation_type,
            "veo_video_uri": veo_video_uri,
            "veo_video_name": veo_video_name,
        }

    credit_refund_info = None
    if user_id and credit_cost > 0:
        op_type = "video_generation_fast" if use_fast_model else "video_generation_standard"
        credit_refund_info = {"user_id": user_id, "amount": credit_cost, "operation_type": op_type}

    return _execute_video_operation(
        celery_task=self,
        job_id=job_id,
        node_id=node_id,
        project_id=project_id,
        start_operation=start_operation,
        operation_label="Generating",
        build_result_data=build_result,
        credit_refund_info=credit_refund_info,
    )


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
    user_id: Optional[str] = None,
    credit_cost: int = 0,
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

    # Update status to processing
    update_job_status_sync(job_id, JobStatus.PROCESSING, progress=0)
    update_node_status_sync(node_id, NodeStatus.PROCESSING)

    # Define the operation starter
    async def start_operation() -> str:
        return await veo_service.extend_video(
            video_url=video_url,
            prompt=prompt,
            veo_video_uri=veo_video_uri,
            veo_video_name=veo_video_name,
            seed=seed,
        )

    # Define result builder
    def build_result(video_result: Dict) -> Dict[str, Any]:
        # Get Veo references for chained extensions
        all_videos = video_result.get("all_videos", [])
        new_veo_video_uri = all_videos[0].get("veo_video_uri") if all_videos else None
        new_veo_video_name = all_videos[0].get("veo_video_name") if all_videos else None

        return {
            "video_url": video_result["video_url"],
            "video_id": str(uuid4()),
            "extension_count": extension_count,
            "source_video_url": video_url,
            "resolution": "720p",
            "remaining_extensions": 20 - extension_count,
            "veo_video_uri": new_veo_video_uri,
            "veo_video_name": new_veo_video_name,
        }

    credit_refund_info = None
    if user_id and credit_cost > 0:
        credit_refund_info = {"user_id": user_id, "amount": credit_cost, "operation_type": "video_extension_standard"}

    return _execute_video_operation(
        celery_task=self,
        job_id=job_id,
        node_id=node_id,
        project_id=project_id,
        start_operation=start_operation,
        operation_label=f"Extending (#{extension_count})",
        build_result_data=build_result,
        credit_refund_info=credit_refund_info,
    )


@celery_app.task(
    bind=True,
    name="app.tasks.video_tasks.stitch_videos",
    max_retries=2,
    default_retry_delay=15,
    time_limit=300,
    soft_time_limit=270,
)
def stitch_videos(
    self,
    job_id: str,
    node_id: str,
    project_id: str,
    video_urls: list,
    transitions: Optional[list] = None,
    aspect_ratio: Optional[str] = None,
    output_format: str = "mp4",
) -> Dict[str, Any]:
    """
    Stitch multiple video segments using FFmpeg.

    Zero credit cost — assembly only, no AI generation.
    Requires the ffmpeg binary to be available in the worker environment.
    """
    logger.info(f"Starting stitch task for job {job_id} ({len(video_urls)} videos)")

    update_job_status_sync(job_id, JobStatus.PROCESSING, progress=5)
    update_node_status_sync(node_id, NodeStatus.PROCESSING)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        update_job_status_sync(job_id, JobStatus.PROCESSING, progress=10)

        signed_url = loop.run_until_complete(
            stitch_service.stitch_videos(
                video_urls=video_urls,
                transitions=transitions or [],
                project_id=project_id,
                target_aspect_ratio=aspect_ratio,
                output_format=output_format,
            )
        )

        result_data: Dict[str, Any] = {
            "video_url": signed_url,
            "stitch_count": len(video_urls),
            "aspect_ratio": aspect_ratio,
            "transitions": transitions,
        }

        update_job_status_sync(job_id, JobStatus.COMPLETED, progress=100, result=result_data)
        update_node_status_sync(node_id, NodeStatus.COMPLETED, data=result_data)
        logger.info(f"Stitch job {job_id} completed successfully")
        return result_data

    except Exception as e:
        logger.error(f"Stitch job {job_id} failed: {e}")
        update_job_status_sync(job_id, JobStatus.FAILED, error=str(e))
        update_node_status_sync(node_id, NodeStatus.FAILED, error_message=str(e))
        raise

    finally:
        loop.close()
