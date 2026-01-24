"""
Veo 3.1 Video Generation Service

Provides high-quality video generation with:
- Text-to-video generation
- Image-to-video generation (proper image handling)
- Video extension with temporal continuity
- Quality optimization parameters
- Character consistency support
"""
import asyncio
import base64
import httpx
import logging
from typing import Optional, Dict, Any, List
from google import genai
from google.genai import types
from pathlib import Path

from app.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


class VeoService:
    """Production-ready Veo video generation service."""

    def __init__(self):
        self._client = None

    @property
    def client(self) -> genai.Client:
        """Lazy-loaded Gemini client."""
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def _load_image_bytes(self, image_url: str) -> bytes:
        """
        Load image bytes from URL or GCS.

        Args:
            image_url: HTTP URL or GCS URI (gs://bucket/path)

        Returns:
            Image bytes
        """
        if image_url.startswith("gs://"):
            return await storage_service.download_file(image_url)
        else:
            # Add API key for Gemini API downloads
            headers = {}
            if "generativelanguage.googleapis.com" in image_url:
                headers["x-goog-api-key"] = settings.GEMINI_API_KEY
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(image_url, headers=headers)
                response.raise_for_status()
                return response.content

    async def _load_video_bytes(self, video_url: str) -> bytes:
        """
        Load video bytes from URL or GCS.

        Args:
            video_url: HTTP URL or GCS URI (gs://bucket/path)

        Returns:
            Video bytes
        """
        if video_url.startswith("gs://"):
            return await storage_service.download_file(video_url)
        else:
            # Add API key for Gemini API downloads
            headers = {}
            if "generativelanguage.googleapis.com" in video_url:
                headers["x-goog-api-key"] = settings.GEMINI_API_KEY
            
            async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
                response = await client.get(video_url, headers=headers)
                response.raise_for_status()
                return response.content

    def _get_mime_type(self, url: str) -> str:
        """Determine MIME type from URL extension."""
        url_lower = url.lower()
        if url_lower.endswith('.png'):
            return "image/png"
        elif url_lower.endswith('.webp'):
            return "image/webp"
        elif url_lower.endswith('.gif'):
            return "image/gif"
        elif url_lower.endswith('.mp4'):
            return "video/mp4"
        elif url_lower.endswith('.webm'):
            return "video/webm"
        return "image/jpeg"  # Default

    async def generate_video(
        self,
        prompt: str,
        image_url: Optional[str] = None,
        resolution: str = "1080p",
        aspect_ratio: str = "16:9",
        duration: int = 8,
        negative_prompt: Optional[str] = None,
        seed: Optional[int] = None,
        num_videos: int = 1,
        use_fast_model: bool = False,
        enhance_prompt: bool = True,
        character_description: Optional[str] = None,
    ) -> str:
        """
        Start video generation and return operation ID for polling.

        Supports both text-to-video and image-to-video with proper handling.

        Args:
            prompt: Text description of the video to generate
            image_url: Optional source image for image-to-video generation
            resolution: Video resolution (720p, 1080p, 4k)
            aspect_ratio: Video aspect ratio (16:9, 9:16, 1:1)
            duration: Video duration in seconds (4, 6, or 8)
            negative_prompt: Things to avoid in the video
            seed: Random seed for reproducibility
            num_videos: Number of video candidates to generate (1-4)
            use_fast_model: Use faster but lower quality model
            enhance_prompt: Auto-enhance prompt for better results
            character_description: Character features for consistency

        Returns:
            Operation ID for polling status
        """
        # Select model
        model = settings.VEO_FAST_MODEL if use_fast_model else settings.VEO_MODEL

        # Build enhanced prompt with character consistency if provided
        final_prompt = prompt
        if character_description:
            final_prompt = f"{prompt}. Character details: {character_description}"

        # Add quality enhancement to prompt
        if enhance_prompt:
            final_prompt = self._enhance_prompt_for_veo(final_prompt)

        logger.info(f"Starting video generation with prompt: {final_prompt[:100]}...")

        # Build configuration
        config = types.GenerateVideosConfig(
            resolution=resolution,
            aspect_ratio=aspect_ratio,
            duration_seconds=str(duration),
            negative_prompt=negative_prompt,
            number_of_videos=num_videos,
            person_generation="allow_adult",  # Enable person generation
        )

        # Note: seed parameter is not supported in Gemini API
        # It's only available in Vertex AI
        if seed is not None:
            logger.warning(f"Seed parameter ({seed}) is not supported in Gemini API and will be ignored")

        loop = asyncio.get_event_loop()

        # Determine generation type
        if image_url:
            # IMAGE-TO-VIDEO: Load and pass actual image
            logger.info(f"Image-to-video generation from: {image_url}")

            image_bytes = await self._load_image_bytes(image_url)
            mime_type = self._get_mime_type(image_url)

            # Create image object for Veo
            image = types.Image(
                image_bytes=image_bytes,
                mime_type=mime_type,
            )

            operation = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_videos(
                    model=model,
                    prompt=final_prompt,
                    image=image,
                    config=config,
                ),
            )
        else:
            # TEXT-TO-VIDEO: Standard generation
            logger.info("Text-to-video generation")

            operation = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_videos(
                    model=model,
                    prompt=final_prompt,
                    config=config,
                ),
            )

        logger.info(f"Video generation started with operation: {operation.name}")
        return operation.name

    async def extend_video(
        self,
        video_url: str,
        prompt: str,
        seed: Optional[int] = None,
    ) -> str:
        """
        Extend an existing video with temporal continuity.

        Uses Veo's video extension capability to add more content
        that seamlessly continues from the source video.

        Note: Extension only supports 720p resolution.

        Args:
            video_url: URL of the video to extend (HTTP or GCS)
            prompt: Text description for the extension content

        Returns:
            Operation ID for polling status
        """
        logger.info(f"Extending video: {video_url}")

        # Load actual video bytes
        video_bytes = await self._load_video_bytes(video_url)
        mime_type = self._get_mime_type(video_url)

        # Create video object for extension
        video = types.Video(
            video_bytes=video_bytes,
            mime_type=mime_type,
        )

        # Extension only supports 720p
        config = types.GenerateVideosConfig(
            resolution="720p",
            person_generation="allow_adult",
        )

        # Note: seed parameter is not supported in Gemini API
        if seed is not None:
            logger.warning(f"Seed parameter ({seed}) is not supported in Gemini API and will be ignored")

        loop = asyncio.get_event_loop()

        operation = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_videos(
                model=settings.VEO_MODEL,
                prompt=prompt,
                video=video,  # Pass actual video for extension
                config=config,
            ),
        )

        logger.info(f"Video extension started with operation: {operation.name}")
        return operation.name

    async def poll_operation(self, operation_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation operation.

        Args:
            operation_id: The operation ID (name) returned from generate_video

        Returns:
            Dict with 'done', 'result', 'error', and 'progress' keys
        """
        loop = asyncio.get_event_loop()

        # Create operation object from name/ID
        operation = types.GenerateVideosOperation(name=operation_id)
        
        # Get the latest status
        operation = await loop.run_in_executor(
            None,
            lambda: self.client.operations.get(operation),
        )

        result = {
            "done": operation.done,
            "result": None,
            "error": None,
            "metadata": None,
        }

        if operation.done:
            if hasattr(operation, "error") and operation.error:
                error_msg = str(operation.error)
                logger.error(f"Operation {operation_id} failed: {error_msg}")
                result["error"] = error_msg
            elif hasattr(operation, "response") and operation.response:
                result["result"] = operation.response
                logger.info(f"Operation {operation_id} completed successfully")

        # Extract metadata for progress estimation if available
        if hasattr(operation, "metadata") and operation.metadata:
            result["metadata"] = operation.metadata

            return result
        else:
            # Fallback to REST API polling
            return await self._poll_operation_rest_api(operation_id)
    
    async def _poll_operation_rest_api(self, operation_id: str) -> Dict[str, Any]:
        """
        Poll operation status using REST API.
        
        The operation_id should be in the format returned by generateVideos,
        which might be a full resource name like "operations/...".
        """
        # Ensure operation_id is in the correct format
        # If it's just an ID, prepend the operations path
        if not operation_id.startswith("operations/"):
            if operation_id.startswith("/"):
                operation_id = operation_id.lstrip("/")
            if not operation_id.startswith("operations/"):
                operation_id = f"operations/{operation_id}"
        
        url = f"https://generativelanguage.googleapis.com/v1/{operation_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers={
                        "x-goog-api-key": settings.GEMINI_API_KEY,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()
                
                done = result.get("done", False)
                response_data = result.get("response")
                error = result.get("error")
                
                if error:
                    error_msg = error.get("message", str(error)) if isinstance(error, dict) else str(error)
                    logger.warning(f"Operation has error: {error_msg}")
                
                return {
                    "done": done,
                    "result": response_data,
                    "error": error_msg if error else None,
                }
            except httpx.HTTPStatusError as e:
                error_detail = e.response.text if e.response else str(e)
                logger.error(f"HTTP error polling operation {operation_id}: {e.response.status_code} - {error_detail}")
                raise Exception(
                    f"Failed to poll operation: {e.response.status_code} - {error_detail}"
                )
            except Exception as e:
                logger.error(f"Error polling operation: {str(e)}")
                raise

    async def download_generated_video(
        self,
        operation_result: Any,
        destination_path: str,
        select_best: bool = True,
    ) -> Dict[str, Any]:
        """
        Download the generated video(s) from the operation result.

        If multiple videos were generated, can select the best one
        or return all for user selection.

        Args:
            operation_result: The result from a completed operation
            destination_path: GCS path to store the video (without extension)
            select_best: If True, automatically select best video

        Returns:
            Dict with video_url and metadata
        """
        videos_data = []

        # Debug: Log the structure of the response
        logger.info(f"Operation result type: {type(operation_result)}")
        logger.info(f"Operation result dir: {[attr for attr in dir(operation_result) if not attr.startswith('_')]}")
        
        if hasattr(operation_result, "generated_videos"):
            videos = operation_result.generated_videos
            logger.info(f"Found {len(videos)} generated videos")

            for idx, video in enumerate(videos):
                logger.info(f"Video {idx} type: {type(video)}")
                logger.info(f"Video {idx} dir: {[attr for attr in dir(video) if not attr.startswith('_')]}")
                
                if hasattr(video, "video") and video.video:
                    video_bytes = None
                    logger.info(f"Video {idx}.video type: {type(video.video)}")
                    logger.info(f"Video {idx}.video dir: {[attr for attr in dir(video.video) if not attr.startswith('_')]}")

                    # Method 1: Direct video_bytes access
                    if hasattr(video.video, "video_bytes") and video.video.video_bytes:
                        logger.info(f"Video {idx}: Found video_bytes directly")
                        video_bytes = video.video.video_bytes
                    
                    # Method 2: URI download
                    elif hasattr(video.video, "uri") and video.video.uri:
                        logger.info(f"Video {idx}: Found URI, downloading from: {video.video.uri}")
                        video_bytes = await self._load_video_bytes(video.video.uri)
                    
                    # Method 3: Download via client, then save to temp file and read back
                    else:
                        logger.info(f"Video {idx}: Attempting to download via client.files.download()")
                        loop = asyncio.get_event_loop()
                        
                        # Download the video (modifies video object in-place)
                        await loop.run_in_executor(
                            None,
                            lambda v=video: self.client.files.download(file=v.video)
                        )
                        
                        # Now try to get bytes - use a temp file
                        import tempfile
                        import os
                        
                        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
                            tmp_path = tmp.name
                        
                        try:
                            # Save to temp file
                            await loop.run_in_executor(
                                None,
                                lambda: video.video.save(tmp_path)
                            )
                            
                            # Read bytes back
                            with open(tmp_path, 'rb') as f:
                                video_bytes = f.read()
                            
                            logger.info(f"Video {idx}: Successfully downloaded via temp file, size: {len(video_bytes)} bytes")
                        finally:
                            # Clean up temp file
                            if os.path.exists(tmp_path):
                                os.unlink(tmp_path)

                    if video_bytes:
                        # Store each video
                        video_path = f"{destination_path}_{idx}.mp4" if len(videos) > 1 else f"{destination_path}.mp4"

                        url = await storage_service.upload_file(
                            file_data=video_bytes,
                            object_name=video_path,
                            content_type="video/mp4",
                        )

                        video_info = {
                            "video_url": url,
                            "index": idx,
                            "size_bytes": len(video_bytes),
                        }

                        videos_data.append(video_info)
                        logger.info(f"Stored video {idx} at {video_path}")
                    else:
                        logger.warning(f"Video {idx}: No video bytes found after all attempts")
                else:
                    logger.warning(f"Video {idx}: No 'video' attribute or it's None")
        else:
            logger.error(f"No 'generated_videos' attribute found in operation result")
            logger.error(f"Available attributes: {[attr for attr in dir(operation_result) if not attr.startswith('_')]}")

        if not videos_data:
            raise ValueError("No video data found in operation result")

        # Return best (first) or all
        if select_best or len(videos_data) == 1:
            return {
                "video_url": videos_data[0]["video_url"],
                "all_videos": videos_data,
                "selected_index": 0,
            }

        return {
            "video_url": videos_data[0]["video_url"],
            "all_videos": videos_data,
            "selected_index": None,  # User should select
        }

    def _enhance_prompt_for_veo(self, prompt: str) -> str:
        """
        Enhance prompt with Veo-specific optimizations for better quality.

        Adds cinematographic guidance without changing the user's intent.
        """
        # Check if prompt already has cinematic elements
        cinematic_keywords = [
            "camera", "shot", "lighting", "cinematic", "4k", "hdr",
            "dolly", "pan", "zoom", "tracking", "angle"
        ]

        has_cinematic = any(kw in prompt.lower() for kw in cinematic_keywords)

        if has_cinematic:
            # Prompt already has good guidance
            return prompt

        # Add subtle quality enhancement
        enhancement = "High quality, cinematic lighting, smooth motion"

        # Don't make the prompt too long
        if len(prompt) < 150:
            return f"{prompt}. {enhancement}."

        return prompt

    async def generate_video_with_retry(
        self,
        prompt: str,
        max_retries: int = 3,
        **kwargs,
    ) -> str:
        """
        Generate video with automatic retry on transient failures.

        Args:
            prompt: Video generation prompt
            max_retries: Maximum retry attempts
            **kwargs: Additional arguments for generate_video

        Returns:
            Operation ID
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                return await self.generate_video(prompt, **kwargs)
            except Exception as e:
                last_error = e
                logger.warning(f"Video generation attempt {attempt + 1} failed: {e}")

                # Check if error is retryable
                error_str = str(e).lower()
                if "quota" in error_str or "rate" in error_str:
                    # Rate limited, wait longer
                    await asyncio.sleep(30 * (attempt + 1))
                elif "safety" in error_str or "blocked" in error_str:
                    # Content blocked, don't retry
                    raise
                else:
                    # Transient error, short wait
                    await asyncio.sleep(5 * (attempt + 1))

        raise last_error


# Singleton instance
veo_service = VeoService()
