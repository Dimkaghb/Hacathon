import asyncio
import httpx
import logging
from typing import Optional, Dict, Any
from google import genai

from app.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


class VeoService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def _prepare_image(self, image_url: str):
        """Prepare image for Veo API - return GCS URI or uploaded reference"""
        # If it's already a GCS URL, return as-is
        if image_url.startswith("gs://"):
            return image_url

        # For HTTP URLs, return the URL (Veo may support direct URLs)
        # In production, you might want to download and upload to GCS first
        return image_url

    async def _prepare_video(self, video_url: str):
        """Prepare video for Veo API - return GCS URI or uploaded reference"""
        # If it's already a GCS URL, return as-is
        if video_url.startswith("gs://"):
            return video_url

        # For HTTP URLs, return the URL
        return video_url

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

    async def poll_operation(self, operation_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation operation.

        Args:
            operation_id: The operation ID returned from generate_video

        Returns:
            Dict with 'done', 'result', and 'error' keys
        """
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
                if hasattr(video, 