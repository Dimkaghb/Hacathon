import asyncio
import httpx
from typing import Optional, Dict, Any
from google import genai
from google.genai import types

from app.config import settings
from app.services.storage_service import storage_service


class VeoService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def _load_image_from_url(self, image_url: str) -> types.Image:
        """Load image from URL or GCS"""
        if image_url.startswith("gs://"):
            # Download from GCS
            content = await storage_service.download_file(image_url)
            return types.Image(image_bytes=content)
        else:
            # Download from HTTP URL
            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                response.raise_for_status()
                return types.Image(image_bytes=response.content)

    async def _load_video_from_url(self, video_url: str) -> types.Video:
        """Load video from URL or GCS"""
        if video_url.startswith("gs://"):
            content = await storage_service.download_file(video_url)
            return types.Video(video_bytes=content)
        else:
            async with httpx.AsyncClient() as client:
                response = await client.get(video_url)
                response.raise_for_status()
                return types.Video(video_bytes=response.content)

    async def generate_video(
        self,
        prompt: str,
        image_url: Optional[str] = None,
        resolution: str = "1080p",
        aspect_ratio: str = "16:9",
        duration: int = 8,
        negative_prompt: Optional[str] = None,
    ) -> str:
        """
        Start video generation and return operation ID for polling.

        Args:
            prompt: Text description of the video to generate
            image_url: Optional source image for image-to-video generation
            resolution: Video resolution (720p, 1080p, 4k)
            aspect_ratio: Video aspect ratio (16:9, 9:16, 1:1)
            duration: Video duration in seconds (4, 6, or 8)
            negative_prompt: Things to avoid in the video

        Returns:
            Operation ID for polling status
        """
        config = types.GenerateVideosConfig(
            resolution=resolution,
            aspect_ratio=aspect_ratio,
            duration_seconds=str(duration),
            negative_prompt=negative_prompt,
        )

        kwargs = {
            "model": settings.VEO_MODEL,
            "prompt": prompt,
            "config": config,
        }

        # Add image for image-to-video generation
        if image_url:
            image = await self._load_image_from_url(image_url)
            kwargs["image"] = image

        # Run in executor since the SDK is synchronous
        loop = asyncio.get_event_loop()
        operation = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_videos(**kwargs),
        )

        return operation.name

    async def extend_video(
        self,
        video_url: str,
        prompt: str,
    ) -> str:
        """
        Extend an existing video. Only supports 720p.

        Args:
            video_url: URL of the video to extend
            prompt: Text description for the extension

        Returns:
            Operation ID for polling status
        """
        video = await self._load_video_from_url(video_url)

        config = types.GenerateVideosConfig(
            resolution="720p",  # Extension only supports 720p
        )

        loop = asyncio.get_event_loop()
        operation = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_videos(
                model=settings.VEO_MODEL,
                video=video,
                prompt=prompt,
                config=config,
            ),
        )

        return operation.name

    async def poll_operation(self, operation_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation operation.

        Args:
            operation_id: The operation ID returned from generate_video

        Returns:
            Dict with 'done', 'result', and 'error' keys
        """
        loop = asyncio.get_event_loop()
        operation = await loop.run_in_executor(
            None,
            lambda: self.client.operations.get(name=operation_id),
        )

        result = {
            "done": operation.done,
            "result": None,
            "error": None,
        }

        if operation.done:
            if hasattr(operation, "error") and operation.error:
                result["error"] = str(operation.error)
            elif hasattr(operation, "response") and operation.response:
                result["result"] = operation.response

        return result

    async def download_generated_video(
        self,
        operation_result: Any,
        destination_path: str,
    ) -> str:
        """
        Download the generated video from the operation result.

        Args:
            operation_result: The result from a completed operation
            destination_path: GCS path to store the video

        Returns:
            Public URL of the stored video
        """
        # Extract video data from result
        if hasattr(operation_result, "generated_videos"):
            videos = operation_result.generated_videos
            if videos and len(videos) > 0:
                video = videos[0]
                if hasattr(video, "video"):
                    video_bytes = video.video.video_bytes

                    # Upload to GCS
                    url = await storage_service.upload_file(
                        file_data=video_bytes,
                        object_name=destination_path,
                        content_type="video/mp4",
                    )
                    return url

        raise ValueError("No video data found in operation result")


veo_service = VeoService()
