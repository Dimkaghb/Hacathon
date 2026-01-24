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
    """Worker for processing video extension jobs."""

    def __init__(self):
        super().__init__(job_type="video_extension")

    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a video extension job.

        Steps:
        1. Start Veo video extension
        2. Poll until complete
        3. Download and store the extended video
        4. Return new video URL and metadata
        """
        job_id = job_data["job_id"]
        node_id = job_data["node_id"]
        project_id = job_data["project_id"]
        video_url = job_data["video_url"]
        prompt = job_data["prompt"]

        # Step 1: Start extension
        await self.broadcast_progress(
            project_id, node_id, 5, "processing", "Starting video extension..."
        )

        operation_id = await veo_service.extend_video(
            video_url=video_url,
            prompt=prompt,
        )

        # Update job with operation ID
        await self.update_job_status(
            job_id, JobStatus.PROCESSING, progress=10, operation_id=operation_id
        )

        await self.broadcast_progress(
            project_id, node_id, 10, "processing", "Extending video..."
        )

        # Step 2: Poll until complete
        poll_count = 0
        max_polls = settings.VEO_MAX_POLL_TIME // settings.VEO_POLL_INTERVAL

        while poll_count < max_polls:
            result = await veo_service.poll_operation(operation_id)

            if result["done"]:
                if result["error"]:
                    raise Exception(f"Video extension failed: {result['error']}")

                # Step 3: Download and store video
                await self.broadcast_progress(
                    project_id, node_id, 80, "processing", "Saving extended video..."
                )

                video_id = str(uuid4())
                destination_path = f"videos/{project_id}/{video_id}_extended.mp4"

                new_video_url = await veo_service.download_generated_video(
                    operation_result=result["result"],
                    destination_path=destination_path,
                )

                await self.broadcast_progress(
                    project_id, node_id, 100, "completed", "Extension complete"
                )

                return {
                    "video_url": new_video_url,
                    "video_id": video_id,
                    "is_extension": True,
                    "parent_video_url": video_url,
                    "resolution": "720p",  # Extensions are always 720p
                    "extension_params": {
                        "prompt": prompt,
                        "source_video_url": video_url,
                        "model": settings.VEO_MODEL,
                    },
                }

            # Update progress
            poll_count += 1
            progress = min(10 + (poll_count * 70 // max_polls), 75)

            await self.update_job_status(job_id, JobStatus.PROCESSING, progress=progress)
            await self.broadcast_progress(
                project_id, node_id, progress, "processing", "Extending video..."
            )

            await asyncio.sleep(settings.VEO_POLL_INTERVAL)

        raise Exception("Video extension timed out")


extension_worker = VideoExtensionWorker()
