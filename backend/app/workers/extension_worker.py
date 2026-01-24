"""
Video Extension Worker

Handles async video extension jobs with:
- Proper video continuation using Veo API
- Temporal consistency preservation
- Progress tracking and WebSocket updates
"""
import asyncio
import logging
from typing import Dict, Any
from uuid import uuid4

from app.workers.base import BaseWorker
from app.services.veo_service import veo_service
from app.config import settings
from app.models.job import JobStatus

logger = logging.getLogger(__name__)


class VideoExtensionWorker(BaseWorker):
    """Worker for processing video extension jobs with proper continuation."""

    def __init__(self):
        super().__init__(job_type="video_extension")

    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a video extension job.

        Uses Veo's video extension capability for seamless temporal continuation.
        Note: Extension only supports 720p resolution.

        Steps:
        1. Start Veo video extension with source video
        2. Poll until complete with progress updates
        3. Download and store the extended video
        4. Return video URL and metadata
        """
        job_id = job_data["job_id"]
        node_id = job_data["node_id"]
        project_id = job_data["project_id"]
        video_url = job_data["video_url"]
        prompt = job_data["prompt"]
        seed = job_data.get("seed")
        extension_count = job_data.get("extension_count", 1)  # Track how many times extended

        # Validate extension count (max 20 extensions)
        if extension_count > 20:
            raise Exception("Maximum extension limit (20) reached. Cannot extend further.")

        # Step 1: Start extension
        await self.broadcast_progress(
            project_id, node_id, 5, "processing", "Starting video extension..."
        )

        logger.info(f"Starting video extension for job {job_id}, extension #{extension_count}")

        try:
            operation_id = await veo_service.extend_video(
                video_url=video_url,
                prompt=prompt,
                seed=seed,
            )
        except Exception as e:
            error_msg = str(e)
            if "720p" in error_msg.lower() or "resolution" in error_msg.lower():
                raise Exception("Video extension only supports 720p resolution. Please use a 720p source video.")
            if "safety" in error_msg.lower() or "blocked" in error_msg.lower():
                raise Exception("Content blocked by safety filters. Try modifying your prompt.")
            raise

        # Update job with operation ID
        await self.update_job_status(
            job_id, JobStatus.PROCESSING, progress=10, operation_id=operation_id
        )

        await self.broadcast_progress(
            project_id, node_id, 10, "processing",
            f"Extending video (extension #{extension_count})..."
        )

        # Step 2: Poll until complete
        poll_count = 0
        max_polls = settings.VEO_MAX_POLL_TIME // settings.VEO_POLL_INTERVAL

        while poll_count < max_polls:
            result = await veo_service.poll_operation(operation_id)

            if result["done"]:
                if result["error"]:
                    error_msg = result["error"]
                    if "safety" in error_msg.lower():
                        raise Exception("Video extension blocked due to safety filters. Please modify your prompt.")
                    elif "quota" in error_msg.lower():
                        raise Exception("API quota exceeded. Please try again later.")
                    else:
                        raise Exception(f"Video extension failed: {error_msg}")

                # Step 3: Download and store video
                await self.broadcast_progress(
                    project_id, node_id, 85, "processing", "Downloading extended video..."
                )

                video_id = str(uuid4())
                destination_path = f"videos/{project_id}/{video_id}"

                video_result = await veo_service.download_generated_video(
                    operation_result=result["result"],
                    destination_path=destination_path,
                    select_best=True,
                )

                await self.broadcast_progress(
                    project_id, node_id, 95, "processing", "Finalizing..."
                )

                # Calculate total duration (original + extension)
                # Each extension adds 8 seconds by default
                extension_duration = 8

                logger.info(f"Video extension complete for job {job_id}")

                return {
                    "video_url": video_result["video_url"],
                    "video_id": video_id,
                    "extension_count": extension_count,
                    "source_video_url": video_url,
                    "resolution": "720p",  # Extension always 720p
                    "extension_duration": extension_duration,
                    "remaining_extensions": 20 - extension_count,
                    "generation_params": {
                        "prompt": prompt,
                        "source_video": video_url,
                        "model": settings.VEO_MODEL,
                        "seed": seed,
                    },
                }

            # Update progress
            poll_count += 1
            progress = min(10 + int(poll_count * 70 / max_polls), 80)

            await self.update_job_status(job_id, JobStatus.PROCESSING, progress=progress)

            # Update message based on progress
            if progress < 30:
                message = "Analyzing source video..."
            elif progress < 50:
                message = "Generating continuation frames..."
            elif progress < 70:
                message = "Blending with original video..."
            else:
                message = "Finalizing extension..."

            await self.broadcast_progress(
                project_id, node_id, progress, "processing", message
            )

            await asyncio.sleep(settings.VEO_POLL_INTERVAL)

        raise Exception(f"Video extension timed out after {settings.VEO_MAX_POLL_TIME} seconds")


# Singleton instance
extension_worker = VideoExtensionWorker()
