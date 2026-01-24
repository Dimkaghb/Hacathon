import asyncio
import logging
from typing import Dict, Any
from uuid import uuid4

from app.workers.base import BaseWorker
from app.services.veo_service import veo_service
from app.config import settings
from app.models.job import JobStatus

logger = logging.getLogger(__name__)


class VideoGenerationWorker(BaseWorker):
    """Worker for processing video generation jobs."""

    def __init__(self):
        super().__init__(job_type="video_generation")

    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a video generation job.

        Steps:
        1. Start Veo video generation
        2. Poll until complete
        3. Download and store the video
        4. Return video URL and metadata
        """
        job_id = job_data["job_id"]
        node_id = job_data["node_id"]
        project_id = job_data["project_id"]
        prompt = job_data["prompt"]
        image_url = job_data.get("image_url")
        resolution = job_data.get("resolution", "1080p")
        aspect_ratio = job_data.get("aspect_ratio", "16:9")
        duration = job_data.get("duration", 8)
        negative_prompt = job_data.get("negative_prompt")

        # Step 1: Start generation
        await self.update_job_status(
            job_id, 
            JobStatus.PROCESSING, 
            progress=5, 
            progress_message="Initializing video generation...",
            stage="initializing"
        )
        await self.broadcast_progress(
            project_id, node_id, 5, "processing", "Starting video generation..."
        )

        try:
            operation_id = await veo_service.generate_video(
                prompt=prompt,
                image_url=image_url,
                resolution=resolution,
                aspect_ratio=aspect_ratio,
                duration=duration,
                negative_prompt=negative_prompt,
            )

            # Update job with operation ID
            await self.update_job_status(
                job_id, 
                JobStatus.PROCESSING, 
                progress=10, 
                operation_id=operation_id,
                progress_message=f"Video generation started (Operation ID: {operation_id[:20]}...)",
                stage="generating"
            )

            await self.broadcast_progress(
                project_id, node_id, 10, "processing", "Video generation in progress..."
            )
        except Exception as e:
            import traceback
            error_msg = f"Failed to start video generation: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise Exception(error_msg)

        # Step 2: Poll until complete
        poll_count = 0
        max_polls = settings.VEO_MAX_POLL_TIME // settings.VEO_POLL_INTERVAL

        while poll_count < max_polls:
            try:
                result = await veo_service.poll_operation(operation_id)

                if result["done"]:
                    if result["error"]:
                        error_msg = f"Video generation failed: {result['error']}"
                        await self.update_job_status(
                            job_id,
                            JobStatus.PROCESSING,
                            progress=75,
                            progress_message=error_msg,
                            stage="error"
                        )
                        raise Exception(error_msg)

                    # Step 3: Download and store video
                    await self.update_job_status(
                        job_id,
                        JobStatus.PROCESSING,
                        progress=80,
                        progress_message="Video generation complete. Downloading video...",
                        stage="downloading"
                    )
                    await self.broadcast_progress(
                        project_id, node_id, 80, "processing", "Downloading video..."
                    )

                    try:
                        video_id = str(uuid4())
                        destination_path = f"videos/{project_id}/{video_id}.mp4"

                        video_url = await veo_service.download_generated_video(
                            operation_result=result["result"],
                            destination_path=destination_path,
                        )

                        await self.update_job_status(
                            job_id,
                            JobStatus.PROCESSING,
                            progress=95,
                            progress_message="Video downloaded. Finalizing...",
                            stage="finalizing"
                        )

                        await self.broadcast_progress(
                            project_id, node_id, 95, "processing", "Finalizing..."
                        )

                        return {
                            "video_url": video_url,
                            "video_id": video_id,
                            "duration": duration,
                            "resolution": resolution,
                            "aspect_ratio": aspect_ratio,
                            "generation_params": {
                                "prompt": prompt,
                                "image_url": image_url,
                                "model": settings.VEO_MODEL,
                            },
                        }
                    except Exception as e:
                        import traceback
                        error_msg = f"Failed to download video: {str(e)}\n{traceback.format_exc()}"
                        logger.error(error_msg)
                        raise Exception(error_msg)

                # Update progress (estimate based on typical generation time)
                poll_count += 1
                progress = min(10 + (poll_count * 70 // max_polls), 75)
                
                # More detailed progress messages
                if progress < 30:
                    progress_msg = "Initializing video generation..."
                elif progress < 50:
                    progress_msg = "Generating video frames..."
                elif progress < 70:
                    progress_msg = "Processing video content..."
                else:
                    progress_msg = "Finalizing video generation..."

                await self.update_job_status(
                    job_id, 
                    JobStatus.PROCESSING, 
                    progress=progress,
                    progress_message=f"{progress_msg} (Poll {poll_count}/{max_polls})",
                    stage="generating"
                )
                await self.broadcast_progress(
                    project_id, node_id, progress, "processing", progress_msg
                )

                await asyncio.sleep(settings.VEO_POLL_INTERVAL)
            except Exception as e:
                # Re-raise to be caught by outer exception handler
                raise

        error_msg = f"Video generation timed out after {max_polls} polls ({settings.VEO_MAX_POLL_TIME}s)"
        await self.update_job_status(
            job_id,
            JobStatus.PROCESSING,
            progress=75,
            progress_message=error_msg,
            stage="timeout"
        )
        raise Exception(error_msg)


video_worker = VideoGenerationWorker()
