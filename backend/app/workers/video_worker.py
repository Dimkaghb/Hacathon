"""
Video Generation Worker

Handles async video generation jobs with:
- Proper image-to-video support
- Character consistency via face descriptions
- Progress tracking and WebSocket updates
- Error handling with useful feedback
"""
import asyncio
import logging
from typing import Dict, Any
from uuid import uuid4

from app.workers.base import BaseWorker
from app.services.veo_service import veo_service
from app.services.face_service import face_service
from app.config import settings
from app.models.job import JobStatus

logger = logging.getLogger(__name__)


class VideoGenerationWorker(BaseWorker):
    """Worker for processing video generation jobs with full feature support."""

    def __init__(self):
        super().__init__(job_type="video_generation")

    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a video generation job.

        Steps:
        1. Load character description if character_id provided
        2. Start Veo video generation with proper image handling
        3. Poll until complete with progress updates
        4. Download and store the video
        5. Return video URL and metadata
        """
        job_id = job_data["job_id"]
        node_id = job_data["node_id"]
        project_id = job_data["project_id"]
        prompt = job_data["prompt"]
        image_url = job_data.get("image_url")
        character_id = job_data.get("character_id")
        resolution = job_data.get("resolution", "1080p")
        aspect_ratio = job_data.get("aspect_ratio", "16:9")
        duration = job_data.get("duration", 8)
        negative_prompt = job_data.get("negative_prompt")
        seed = job_data.get("seed")
        num_videos = job_data.get("num_videos", 1)
        use_fast_model = job_data.get("use_fast_model", False)

<<<<<<< HEAD
        # Step 1: Get character description for consistency
        character_description = None
        if character_id:
            await self.broadcast_progress(
                project_id, node_id, 2, "processing", "Loading character data..."
            )
            try:
                character_description = await face_service.get_character_description(character_id)
                if character_description:
                    logger.info(f"Using character description for consistency: {character_description[:100]}...")
            except Exception as e:
                logger.warning(f"Failed to load character description: {e}")

        # Step 2: Start generation
=======
        # Step 1: Start generation
        await self.update_job_status(
            job_id, 
            JobStatus.PROCESSING, 
            progress=5, 
            progress_message="Initializing video generation...",
            stage="initializing"
        )
>>>>>>> main
        await self.broadcast_progress(
            project_id, node_id, 5, "processing", "Starting video generation..."
        )

<<<<<<< HEAD
        generation_type = "image-to-video" if image_url else "text-to-video"
        logger.info(f"Starting {generation_type} generation for job {job_id}")

=======
>>>>>>> main
        try:
            operation_id = await veo_service.generate_video(
                prompt=prompt,
                image_url=image_url,
                resolution=resolution,
                aspect_ratio=aspect_ratio,
                duration=duration,
                negative_prompt=negative_prompt,
<<<<<<< HEAD
                seed=seed,
                num_videos=num_videos,
                use_fast_model=use_fast_model,
                enhance_prompt=True,
                character_description=character_description,
            )
        except Exception as e:
            error_msg = str(e)
            if "safety" in error_msg.lower() or "blocked" in error_msg.lower():
                raise Exception(f"Content blocked by safety filters. Try modifying your prompt to avoid potentially sensitive content.")
            raise
=======
            )
>>>>>>> main

            # Update job with operation ID
            await self.update_job_status(
                job_id, 
                JobStatus.PROCESSING, 
                progress=10, 
                operation_id=operation_id,
                progress_message=f"Video generation started (Operation ID: {operation_id[:20]}...)",
                stage="generating"
            )

<<<<<<< HEAD
        await self.broadcast_progress(
            project_id, node_id, 10, "processing",
            f"Video generation in progress ({generation_type})..."
        )
=======
            await self.broadcast_progress(
                project_id, node_id, 10, "processing", "Video generation in progress..."
            )
        except Exception as e:
            import traceback
            error_msg = f"Failed to start video generation: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise Exception(error_msg)
>>>>>>> main

        # Step 3: Poll until complete with better progress estimation
        poll_count = 0
        max_polls = settings.VEO_MAX_POLL_TIME // settings.VEO_POLL_INTERVAL

        while poll_count < max_polls:
            try:
                result = await veo_service.poll_operation(operation_id)

<<<<<<< HEAD
            if result["done"]:
                if result["error"]:
                    error_msg = result["error"]
                    # Provide helpful error messages
                    if "safety" in error_msg.lower():
                        raise Exception("Video generation blocked due to safety filters. Please modify your prompt.")
                    elif "quota" in error_msg.lower():
                        raise Exception("API quota exceeded. Please try again later.")
                    else:
                        raise Exception(f"Video generation failed: {error_msg}")

                # Step 4: Download and store video
                await self.broadcast_progress(
                    project_id, node_id, 85, "processing", "Downloading video..."
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

                logger.info(f"Video generation complete for job {job_id}")

                return {
                    "video_url": video_result["video_url"],
                    "video_id": video_id,
                    "all_videos": video_result.get("all_videos", []),
                    "duration": duration,
                    "resolution": resolution,
                    "aspect_ratio": aspect_ratio,
                    "generation_type": generation_type,
                    "generation_params": {
                        "prompt": prompt,
                        "image_url": image_url,
                        "character_id": character_id,
                        "character_description": character_description,
                        "model": settings.VEO_FAST_MODEL if use_fast_model else settings.VEO_MODEL,
                        "seed": seed,
                    },
                }

            # Update progress based on poll count
            # Video generation typically takes 1-6 minutes
            poll_count += 1
            # Progress from 10% to 80% over polling period
            progress = min(10 + int(poll_count * 70 / max_polls), 80)

            await self.update_job_status(job_id, JobStatus.PROCESSING, progress=progress)

            # Update message based on progress
            if progress < 30:
                message = "Analyzing prompt and preparing generation..."
            elif progress < 50:
                message = "Generating video frames..."
            elif progress < 70:
                message = "Processing video..."
            else:
                message = "Finalizing generation..."

            await self.broadcast_progress(
                project_id, node_id, progress, "processing", message
            )

            await asyncio.sleep(settings.VEO_POLL_INTERVAL)

        raise Exception(f"Video generation timed out after {settings.VEO_MAX_POLL_TIME} seconds")
=======
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
>>>>>>> main


# Singleton instance
video_worker = VideoGenerationWorker()
