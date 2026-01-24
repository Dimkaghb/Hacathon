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
<<<<<<< HEAD
from typing import Optional, Dict, Any, List
from google import genai
from google.genai import types
from pathlib import Path
=======
from typing import Optional, Dict, Any
from google import genai
>>>>>>> main

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
<<<<<<< HEAD
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
=======
        # Check if generate_videos method exists (SDK version >= 1.0.0)
        if hasattr(self.client.models, 'generate_videos'):
            logger.info("Using SDK generate_videos method")
            # Use SDK method if available
            generate_params = {
                "model": settings.VEO_MODEL,
                "prompt": prompt,
            }
            
            # Add optional parameters if provided
            if resolution:
                generate_params["resolution"] = resolution
            if aspect_ratio:
                generate_params["aspect_ratio"] = aspect_ratio
            if duration:
                generate_params["duration_seconds"] = str(duration)
            if negative_prompt:
                generate_params["negative_prompt"] = negative_prompt
            
            # TODO: Image-to-video support requires proper image handling
            if image_url:
                generate_params["prompt"] = f"{prompt} (based on image: {image_url})"

            loop = asyncio.get_event_loop()
            operation = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_videos(**generate_params),
            )
            return operation.name
        else:
            # SDK doesn't have generate_videos - REST API fallback
            logger.warning(
                "SDK doesn't have generate_videos method. "
                "Falling back to REST API. "
                "Please rebuild container with google-genai>=1.0.0 for better support."
            )
            try:
                return await self._generate_video_rest_api(
                    prompt=prompt,
                    image_url=image_url,
                    resolution=resolution,
                    aspect_ratio=aspect_ratio,
                    duration=duration,
                    negative_prompt=negative_prompt,
                )
            except Exception as e:
                # Provide helpful error message
                error_msg = str(e)
                if "404" in error_msg:
                    raise Exception(
                        f"Video generation is not available via REST API. "
                        f"The Google Gemini API video generation endpoint returned 404, "
                        f"which suggests video generation may only be available through the SDK.\n\n"
                        f"SOLUTION: Rebuild the Docker container to upgrade google-genai SDK:\n"
                        f"  cd backend\n"
                        f"  docker-compose build worker-video\n"
                        f"  docker-compose up -d worker-video\n\n"
                        f"Original error: {error_msg}"
                    )
                raise
    
    async def _generate_video_rest_api(
        self,
        prompt: str,
        image_url: Optional[str] = None,
        resolution: str = "1080p",
        aspect_ratio: str = "16:9",
        duration: int = 8,
        negative_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate video using REST API (fallback when SDK doesn't support it).
        
        Uses the Gemini API REST endpoint for video generation.
        API endpoint: POST /v1beta/models/{model}:generateVideos
        """
        # Build request payload according to Gemini API format
        # The API expects prompt and optional config parameters
        payload = {
            "prompt": prompt,
        }
        
        # Build config object with optional parameters
        config_params = {}
        if resolution:
            config_params["resolution"] = resolution
        if aspect_ratio:
            config_params["aspect_ratio"] = aspect_ratio
        if duration:
            config_params["duration_seconds"] = str(duration)
        if negative_prompt:
            config_params["negative_prompt"] = negative_prompt
        
        if config_params:
            payload["config"] = config_params
        
        # TODO: Image-to-video support - need to handle image upload/reference
        if image_url:
            # For now, just enhance the prompt
            payload["prompt"] = f"{prompt} (based on image: {image_url})"
            logger.warning("Image-to-video not fully implemented, using enhanced prompt")
        
        # Call Gemini API REST endpoint
        # Try different endpoint formats - the API might use a different path structure
        # Format 1: Direct generateVideos endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.VEO_MODEL}:generateVideos"
        
        logger.info(f"Calling Gemini API: {url} with model {settings.VEO_MODEL}")
        logger.info(f"Payload: {payload}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": settings.GEMINI_API_KEY,
                    },
                    json=payload,
                    timeout=60.0,  # Longer timeout for video generation
                )
                
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"API response keys: {list(result.keys())}")
                
                # Extract operation name from response
                # The response should contain an operation object with a 'name' field
                if "name" in result:
                    operation_name = result["name"]
                    logger.info(f"Got operation name: {operation_name}")
                    return operation_name
                elif "operation" in result:
                    if isinstance(result["operation"], dict) and "name" in result["operation"]:
                        operation_name = result["operation"]["name"]
                        logger.info(f"Got operation name from operation object: {operation_name}")
                        return operation_name
                
                # Log the full response for debugging
                logger.error(f"Unexpected API response format: {result}")
                raise ValueError(
                    f"Unexpected API response format. Expected 'name' or 'operation.name' in response. "
                    f"Response keys: {list(result.keys())}, Full response: {result}"
                )
            except httpx.HTTPStatusError as e:
                error_detail = e.response.text if e.response else str(e)
                logger.error(f"HTTP error {e.response.status_code}: {error_detail}")
                
                # If 404, try alternative endpoint format
                if e.response.status_code == 404:
                    logger.info("404 error - trying alternative endpoint format...")
                    # Try using operations API pattern
                    alt_url = f"https://generativelanguage.googleapis.com/v1beta/{settings.VEO_MODEL}:generateVideos"
                    try:
                        alt_response = await client.post(
                            alt_url,
                            headers={
                                "Content-Type": "application/json",
                                "x-goog-api-key": settings.GEMINI_API_KEY,
                            },
                            json=payload,
                            timeout=60.0,
                        )
                        alt_response.raise_for_status()
                        result = alt_response.json()
                        if "name" in result:
                            return result["name"]
                        elif "operation" in result and "name" in result["operation"]:
                            return result["operation"]["name"]
                    except Exception as alt_e:
                        logger.error(f"Alternative endpoint also failed: {alt_e}")
                
                # If still failing, provide helpful error message
                raise Exception(
                    f"Video generation API call failed with status {e.response.status_code}. "
                    f"The endpoint '{url}' returned 404. "
                    f"This might mean:\n"
                    f"1. Video generation is not available via REST API (SDK only)\n"
                    f"2. The endpoint format is incorrect\n"
                    f"3. The model name '{settings.VEO_MODEL}' is invalid\n"
                    f"4. Your API key doesn't have access to video generation\n"
                    f"Error details: {error_detail}\n"
                    f"Please upgrade google-genai SDK to >= 1.0.0 or check API documentation."
                )
            except Exception as e:
                logger.error(f"Error calling video generation API: {str(e)}")
                raise
>>>>>>> main

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
<<<<<<< HEAD
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
=======
        # TODO: Video extension requires proper video input handling
        # For now, create a new video with continuation prompt
        # Extension only supports 720p
        continuation_prompt = f"Continue from previous video ({video_url}): {prompt}"

        if hasattr(self.client.models, 'generate_videos'):
            loop = asyncio.get_event_loop()
            operation = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_videos(
                    model=settings.VEO_MODEL,
                    prompt=continuation_prompt,
                    resolution="720p",
                ),
            )
            return operation.name
        else:
            # Fallback to REST API
            return await self._generate_video_rest_api(
                prompt=continuation_prompt,
                resolution="720p",
            )
>>>>>>> main

    async def poll_operation(self, operation_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation operation.

        Args:
            operation_id: The operation ID (name) returned from generate_video

        Returns:
            Dict with 'done', 'result', 'error', and 'progress' keys
        """
<<<<<<< HEAD
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
=======
        # Check if operations.get method exists
        if hasattr(self.client, 'operations') and hasattr(self.client.operations, 'get'):
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
>>>>>>> main

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


<<<<<<< HEAD
# Singleton instance
veo_service = VeoService()
=======
veo_service = VeoService()
>>>>>>> main
