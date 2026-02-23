"""
Video Stitch Service

Concatenates multiple video segments using FFmpeg.
FFmpeg and ffprobe binaries must be available in the execution environment
(installed in the Docker container via apt-get or the base image).

Transition modes supported:
  - "cut"       : stream-copy concat, no re-encode (fastest)
  - "fade"      : xfade with fadegrays transition
  - "crossfade" : xfade with fade transition

Aspect ratio scaling is applied after concatenation when requested.
"""

import asyncio
import json
import logging
import os
import tempfile
from typing import List, Optional, Tuple
from uuid import uuid4

import httpx

from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

# Aspect ratio → (width, height) for output scaling
ASPECT_RATIO_DIMENSIONS: dict[str, Tuple[str, str]] = {
    "9:16": ("1080", "1920"),   # TikTok / Instagram Reels / YouTube Shorts
    "4:5": ("1080", "1350"),    # Instagram Feed portrait
    "1:1": ("1080", "1080"),    # Square (Stories / grid)
    "16:9": ("1920", "1080"),   # YouTube / landscape
}

TRANSITION_DURATION = 0.5  # seconds for fade / crossfade

# Platform export presets — aspect ratio, max duration (seconds), resolution
PLATFORM_PRESETS: dict[str, dict] = {
    "tiktok":          {"aspect_ratio": "9:16", "max_duration": 60,   "resolution": "1080x1920", "label": "TikTok"},
    "instagram_reels": {"aspect_ratio": "9:16", "max_duration": 90,   "resolution": "1080x1920", "label": "Instagram Reels"},
    "instagram_feed":  {"aspect_ratio": "4:5",  "max_duration": 60,   "resolution": "1080x1350", "label": "Instagram Feed"},
    "youtube_shorts":  {"aspect_ratio": "9:16", "max_duration": 60,   "resolution": "1080x1920", "label": "YouTube Shorts"},
    "youtube":         {"aspect_ratio": "16:9", "max_duration": None, "resolution": "1920x1080", "label": "YouTube"},
}


async def _get_video_duration(video_path: str) -> float:
    """Return the video duration in seconds using ffprobe."""
    proc = await asyncio.create_subprocess_exec(
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-select_streams", "v:0",
        video_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    try:
        info = json.loads(stdout.decode())
        return float(info["streams"][0].get("duration", 5.0))
    except Exception:
        return 5.0  # safe fallback


async def _run_ffmpeg(*args: str) -> None:
    """Run an ffmpeg command; raise RuntimeError on non-zero exit."""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        # Include the last 2 000 chars of stderr for diagnostics
        raise RuntimeError(f"FFmpeg error:\n{stderr.decode()[-2000:]}")


class StitchService:
    """Download → concatenate → upload video segments."""

    async def stitch_videos(
        self,
        video_urls: List[str],
        transitions: List[str],
        project_id: str,
        target_aspect_ratio: Optional[str] = None,
        output_format: str = "mp4",
    ) -> str:
        """
        Download, stitch, and upload multiple video segments.

        Args:
            video_urls: Ordered list of signed URLs to download.
            transitions: Transition type per junction ("cut" | "fade" | "crossfade").
                         Length must equal len(video_urls) - 1.
            project_id: Used for GCS path organisation.
            target_aspect_ratio: Optional "9:16" | "4:5" | "1:1" | "16:9".
            output_format: Output container (default "mp4").

        Returns:
            Signed GCS URL of the stitched video (valid 7 days).
        """
        if len(video_urls) < 2:
            raise ValueError("At least 2 video URLs are required for stitching")

        # Normalise transitions length
        num_junctions = len(video_urls) - 1
        transitions = list(transitions or [])
        while len(transitions) < num_junctions:
            transitions.append("cut")
        transitions = transitions[:num_junctions]

        with tempfile.TemporaryDirectory() as tmpdir:
            # ── 1. Download all video segments in parallel ─────────────────
            downloaded: List[str] = []
            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
                tasks = [
                    self._download_video(client, url, os.path.join(tmpdir, f"src_{i:02d}.mp4"))
                    for i, url in enumerate(video_urls)
                ]
                downloaded = await asyncio.gather(*tasks)
                logger.info(f"Downloaded {len(downloaded)} video segments")

            output_path = os.path.join(tmpdir, f"stitched.{output_format}")
            has_fade = any(t in ("fade", "crossfade") for t in transitions)

            if not has_fade:
                # ── 2a. Cut-only: concat demuxer (stream copy, no re-encode) ─
                concat_list = os.path.join(tmpdir, "concat.txt")
                with open(concat_list, "w") as f:
                    for path in downloaded:
                        # Escape single quotes for the concat list format
                        safe_path = path.replace("'", r"'\''")
                        f.write(f"file '{safe_path}'\n")

                await _run_ffmpeg(
                    "-f", "concat", "-safe", "0",
                    "-i", concat_list,
                    "-c", "copy",
                    output_path,
                )

            else:
                # ── 2b. Fade transitions: filter_complex with xfade ──────────
                # Need actual durations to compute xfade offsets
                durations = await asyncio.gather(*[_get_video_duration(p) for p in downloaded])

                # Decide output resolution
                if target_aspect_ratio and target_aspect_ratio in ASPECT_RATIO_DIMENSIONS:
                    w, h = ASPECT_RATIO_DIMENSIONS[target_aspect_ratio]
                else:
                    w, h = "1920", "1080"

                # Build -i arguments
                input_args: List[str] = []
                for path in downloaded:
                    input_args += ["-i", path]

                # Scale / pad all inputs to the target resolution
                filter_parts: List[str] = []
                n = len(downloaded)
                for i in range(n):
                    filter_parts.append(
                        f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,"
                        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[sv{i}]"
                    )

                # Chain xfade filters between scaled inputs
                current = "sv0"
                cumulative_offset = float(durations[0])
                for i in range(1, n):
                    t = transitions[i - 1]
                    xfade_type = "fadeblack" if t == "crossfade" else "fadegrays"
                    label_out = f"xf{i}" if i < n - 1 else "vout"
                    offset = max(cumulative_offset - TRANSITION_DURATION, 0.0)
                    filter_parts.append(
                        f"[{current}][sv{i}]xfade=transition={xfade_type}:"
                        f"duration={TRANSITION_DURATION}:offset={offset:.3f}[{label_out}]"
                    )
                    current = label_out
                    cumulative_offset += durations[i] - TRANSITION_DURATION

                filter_complex = ";".join(filter_parts)
                await _run_ffmpeg(
                    *input_args,
                    "-filter_complex", filter_complex,
                    "-map", "[vout]",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-an",   # UGC clips are typically silent / music added later
                    output_path,
                )

            # ── 3. Aspect-ratio resize (cut path only — fade path already scales) ──
            if target_aspect_ratio and target_aspect_ratio in ASPECT_RATIO_DIMENSIONS and not has_fade:
                w, h = ASPECT_RATIO_DIMENSIONS[target_aspect_ratio]
                resized = os.path.join(tmpdir, f"resized.{output_format}")
                await _run_ffmpeg(
                    "-i", output_path,
                    "-vf", (
                        f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
                        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"
                    ),
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    resized,
                )
                output_path = resized

            # ── 4. Upload to GCS ───────────────────────────────────────────
            with open(output_path, "rb") as f:
                video_bytes = f.read()

        video_id = str(uuid4())
        gcs_path = f"stitched/{project_id}/{video_id}.{output_format}"
        logger.info(f"Uploading stitched video ({len(video_bytes):,} bytes) → {gcs_path}")
        signed_url = await storage_service.upload_file(
            file_data=video_bytes,
            object_name=gcs_path,
            content_type="video/mp4",
        )
        logger.info(f"Stitch complete for project {project_id}")
        return signed_url

    async def export_for_platform(
        self,
        video_url: str,
        platform: str,
        project_id: str,
    ) -> dict:
        """
        Re-encode a video to match a platform's export preset.

        Downloads the source video, scales/pads to the target resolution,
        trims to the platform's max duration, and uploads the result.

        Returns:
            Dict with video_url (signed GCS URL), platform, and preset info.
        """
        preset = PLATFORM_PRESETS.get(platform)
        if not preset:
            raise ValueError(f"Unknown platform: {platform}")

        w_str, h_str = preset["resolution"].split("x")
        max_dur = preset["max_duration"]

        with tempfile.TemporaryDirectory() as tmpdir:
            # ── 1. Download source video ──────────────────────────────────
            src_path = os.path.join(tmpdir, "source.mp4")
            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
                await self._download_video(client, video_url, src_path)

            # ── 2. Scale / pad to target resolution ───────────────────────
            scaled_path = os.path.join(tmpdir, "scaled.mp4")
            await _run_ffmpeg(
                "-i", src_path,
                "-vf", (
                    f"scale={w_str}:{h_str}:force_original_aspect_ratio=decrease,"
                    f"pad={w_str}:{h_str}:(ow-iw)/2:(oh-ih)/2,setsar=1"
                ),
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-an",
                scaled_path,
            )

            output_path = scaled_path

            # ── 3. Trim to max duration if needed ─────────────────────────
            if max_dur is not None:
                duration = await _get_video_duration(scaled_path)
                if duration > max_dur:
                    trimmed_path = os.path.join(tmpdir, "trimmed.mp4")
                    await _run_ffmpeg(
                        "-i", scaled_path,
                        "-t", str(max_dur),
                        "-c", "copy",
                        trimmed_path,
                    )
                    output_path = trimmed_path

            # ── 4. Upload to GCS ──────────────────────────────────────────
            with open(output_path, "rb") as f:
                video_bytes = f.read()

        video_id = str(uuid4())
        gcs_path = f"exports/{project_id}/{platform}/{video_id}.mp4"
        logger.info(f"Uploading {platform} export ({len(video_bytes):,} bytes) → {gcs_path}")
        signed_url = await storage_service.upload_file(
            file_data=video_bytes,
            object_name=gcs_path,
            content_type="video/mp4",
        )
        logger.info(f"Export complete: {platform} for project {project_id}")
        return {
            "video_url": signed_url,
            "platform": platform,
            "resolution": preset["resolution"],
            "aspect_ratio": preset["aspect_ratio"],
        }

    @staticmethod
    async def _download_video(client: httpx.AsyncClient, url: str, dest: str) -> str:
        resp = await client.get(url)
        resp.raise_for_status()
        with open(dest, "wb") as f:
            f.write(resp.content)
        return dest


stitch_service = StitchService()
