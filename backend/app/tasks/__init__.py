"""
Celery Tasks Module

Contains async task definitions for:
- Video generation
- Video extension
- Face analysis
- Prompt enhancement
"""
from app.tasks.video_tasks import generate_video, extend_video
from app.tasks.face_tasks import analyze_face, enhance_prompt

__all__ = [
    "generate_video",
    "extend_video",
    "analyze_face",
    "enhance_prompt",
]
