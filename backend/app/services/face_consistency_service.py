"""
Face Consistency Service

Post-generation face swap pipeline using InsightFace inswapper_128.
After Veo generates a video, this service:
  1. Downloads the video
  2. Detects faces in every frame
  3. Swaps them with the character's reference face
  4. Reassembles the video (preserving audio via ffmpeg)
  5. Re-uploads to GCS

This complements Veo's native reference_images feature — Veo guides the
composition, InsightFace enforces exact identity at the pixel level.
"""
import asyncio
import logging
import os
import shutil
import subprocess
import tempfile
import threading
from typing import Optional

import httpx
import numpy as np

from app.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

# ── InsightFace singletons ───────────────────────────────────────────────────
_face_app = None
_swapper = None
_model_lock = threading.Lock()


def _get_face_app():
    global _face_app
    if _face_app is None:
        with _model_lock:
            if _face_app is None:
                from insightface.app import FaceAnalysis
                os.environ.setdefault("INSIGHTFACE_HOME", settings.INSIGHTFACE_HOME)
                app = FaceAnalysis(
                    name="buffalo_l",
                    root=settings.INSIGHTFACE_HOME,
                    providers=["CPUExecutionProvider"],
                )
                app.prepare(ctx_id=-1, det_size=(640, 640))
                _face_app = app
                logger.info("FaceConsistencyService: buffalo_l loaded")
    return _face_app


def _get_swapper():
    global _swapper
    if _swapper is None:
        with _model_lock:
            if _swapper is None:
                try:
                    import insightface
                    model_path = os.path.join(
                        settings.INSIGHTFACE_HOME, "models", "inswapper_128.onnx"
                    )
                    if not os.path.exists(model_path):
                        logger.error(
                            f"inswapper_128.onnx not found at {model_path}. "
                            "Download it from GitHub releases and place it there."
                        )
                        raise FileNotFoundError(f"inswapper_128.onnx missing: {model_path}")
                    # Load by absolute path — get_model("name", root=...) lookup is unreliable
                    swapper = insightface.model_zoo.get_model(
                        model_path,
                        providers=["CPUExecutionProvider"],
                    )
                    _swapper = swapper
                    logger.info("FaceConsistencyService: inswapper_128 loaded")
                except Exception as e:
                    logger.error(f"Failed to load inswapper_128: {e}")
                    raise
    return _swapper


def _process_video_sync(
    input_path: str,
    output_no_audio_path: str,
    reference_image_bytes: bytes,
) -> bool:
    """
    Frame-by-frame face swap. Runs synchronously in an executor.
    Returns True if at least one face was swapped.
    """
    import cv2

    face_app = _get_face_app()
    swapper = _get_swapper()

    # Detect reference face
    nparr = np.frombuffer(reference_image_bytes, np.uint8)
    ref_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if ref_img is None:
        raise ValueError("Cannot decode reference image")

    ref_faces = face_app.get(ref_img)
    if not ref_faces:
        logger.warning("No face detected in reference image — skipping face swap")
        return False

    # Use largest face from reference image
    source_face = max(
        ref_faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
    )

    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_no_audio_path, fourcc, fps, (width, height))

    swapped_count = 0
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        target_faces = face_app.get(frame)
        for face in target_faces:
            try:
                frame = swapper.get(frame, face, source_face, paste_back=True)
                swapped_count += 1
            except Exception as e:
                logger.debug(f"Frame {frame_idx} swap failed: {e}")

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()

    logger.info(f"Processed {frame_idx} frames, swapped {swapped_count} faces")
    return swapped_count > 0


class FaceConsistencyService:
    """Post-generation InsightFace face swap to enforce character identity."""

    async def _load_bytes(self, url: str) -> bytes:
        if url.startswith("gs://"):
            return await storage_service.download_file(url)
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.content

    async def apply_face_consistency(
        self,
        video_url: str,
        reference_image_url: str,
        job_id: str,
        project_id: str,
    ) -> str:
        """
        Apply InsightFace face swap to a generated video.

        Downloads the video, swaps all detected faces with the character
        reference face, merges audio back, and re-uploads to GCS.

        Returns the new GCS video URL (replaces original).
        """
        if not settings.ENABLE_FACE_CONSISTENCY:
            return video_url

        logger.info(f"Applying face consistency to job {job_id}")

        try:
            video_bytes, ref_bytes = await asyncio.gather(
                self._load_bytes(video_url),
                self._load_bytes(reference_image_url),
            )
        except Exception as e:
            logger.error(f"Failed to download assets for face consistency: {e}")
            return video_url  # Graceful fallback

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input.mp4")
            no_audio_path = os.path.join(tmpdir, "swapped_no_audio.mp4")
            audio_path = os.path.join(tmpdir, "audio.aac")
            output_path = os.path.join(tmpdir, "output.mp4")

            with open(input_path, "wb") as f:
                f.write(video_bytes)

            # Extract audio track (ignore errors — video may have no audio)
            has_audio = await self._extract_audio(input_path, audio_path)

            # Run frame-by-frame face swap in executor (CPU-bound)
            loop = asyncio.get_event_loop()
            try:
                swapped = await loop.run_in_executor(
                    None,
                    _process_video_sync,
                    input_path,
                    no_audio_path,
                    ref_bytes,
                )
            except Exception as e:
                logger.error(f"Face swap processing failed for job {job_id}: {e}")
                return video_url  # Graceful fallback

            if not swapped:
                logger.info(f"No faces swapped in job {job_id}, keeping original video")
                return video_url

            # Re-mux with original audio
            if has_audio and os.path.exists(audio_path):
                await self._merge_audio(no_audio_path, audio_path, output_path)
            else:
                # Re-encode with ffmpeg for proper mp4 container
                await self._reencode(no_audio_path, output_path)

            if not os.path.exists(output_path):
                logger.error("Output file missing after face consistency, keeping original")
                return video_url

            with open(output_path, "rb") as f:
                output_bytes = f.read()

        # Upload back to GCS (same path prefix, _fc suffix)
        gcs_path = f"videos/{project_id}/fc_{job_id}.mp4"
        new_url = await storage_service.upload_file(
            file_data=output_bytes,
            object_name=gcs_path,
            content_type="video/mp4",
        )

        logger.info(f"Face consistency applied, new URL: {new_url}")
        return new_url

    async def _extract_audio(self, video_path: str, audio_path: str) -> bool:
        """Extract audio track from video. Returns True if audio found."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y",
                "-i", video_path,
                "-vn", "-acodec", "copy",
                audio_path,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.wait()
            return proc.returncode == 0 and os.path.exists(audio_path) and os.path.getsize(audio_path) > 0
        except FileNotFoundError:
            logger.warning("ffmpeg not found — audio will not be preserved")
            return False

    async def _merge_audio(self, video_path: str, audio_path: str, output_path: str):
        """Merge processed video frames with original audio."""
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "libx264", "-crf", "18", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            output_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
        if proc.returncode != 0:
            # Fallback: just reencode video without audio
            await self._reencode(video_path, output_path)

    async def _reencode(self, video_path: str, output_path: str):
        """Re-encode with ffmpeg for proper mp4 container."""
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y",
            "-i", video_path,
            "-c:v", "libx264", "-crf", "18", "-preset", "fast",
            output_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
        if proc.returncode != 0:
            # Last resort: just copy the file as-is
            shutil.copy(video_path, output_path)


face_consistency_service = FaceConsistencyService()
