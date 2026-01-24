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
        await self.broadcast_progress(
            project_id, node_id, 5, "processing", "Starting video generation..."
        )

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
            job_id, JobStatus.PROCESSING, progress=10, operation_id=operation_id
        )

        await self.broadcast_progress(
            project_id, node_id, 10, "processing", "Video generation in progress..."
        )

        # Step 2: Poll until complete
        poll_count = 0
        max_polls = settings.VEO_MAX_POLL_TIME // settings.VEO_POLL_INTERVAL

        while poll_count < max_polls:
            result = await veo_service.poll_operation(operation_id)

            if result["done"]:
                if result["error"]:
                    raise Exception(f"Video generation failed: {result['error']}")

                # Step 3: Download and store video
                await self.broadcast_progress(
                    project_id, node_id, 80, "processing", "Downloading video..."
                )

                video_id = str(uuid4())
                destination_path = f"videos/{project_id}/{video_id}.mp4"

                video_url = await veo_service.download_generated_video(
                    operation_result=result["result"],
                    destination_path=destination_path,
                )

                await self.broadcast_progress(
                    project_id, node_id, 100, "completed", "Video ready"
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

            # Update progress (estimate based on typical generation time)
            poll_count += 1
            progress = min(10 + (poll_count * 70 // max_polls), 75)

            await self.update_job_status(job_id, JobStatus.PROCESSING, progress=progress)
            await self.broadcast_progress(
                project_id, node_id, progress, "processing", "Generating video..."
            )

            await asyncio.sleep(settings.VEO_POLL_INTERVAL)

        raise Exception("Video generation timed out")


video_worker = VideoGenerationWorker()
