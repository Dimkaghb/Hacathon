"""
Celery Application Configuration

Production-ready task queue with:
- Automatic retries with exponential backoff
- Task routing for different job types
- Priority queues
- Dead letter queue for failed tasks
- Result backend for job status
"""
from celery import Celery
from kombu import Queue, Exchange

from app.config import settings

# Create Celery app
celery_app = Celery(
    "videogen",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.video_tasks",
        "app.tasks.face_tasks",
    ],
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Result backend settings
    result_expires=86400,  # Results expire after 24 hours
    result_extended=True,  # Store additional task metadata

    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completion
    task_reject_on_worker_lost=True,  # Requeue if worker dies
    task_track_started=True,  # Track when task starts

    # Worker settings
    worker_prefetch_multiplier=1,  # One task at a time for long-running tasks
    worker_concurrency=4,  # Number of concurrent workers

    # Task routing - route different tasks to different queues
    task_routes={
        "app.tasks.video_tasks.generate_video": {"queue": "video"},
        "app.tasks.video_tasks.extend_video": {"queue": "video"},
        "app.tasks.face_tasks.analyze_face": {"queue": "face"},
        "app.tasks.face_tasks.enhance_prompt": {"queue": "default"},
    },

    # Queue configuration
    task_queues=(
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("video", Exchange("video"), routing_key="video",
              queue_arguments={"x-max-priority": 10}),
        Queue("face", Exchange("face"), routing_key="face"),
    ),

    # Default queue
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",

    # Retry settings
    task_default_retry_delay=30,  # 30 seconds
    task_max_retries=3,

    # Beat scheduler (for periodic tasks if needed)
    beat_schedule={},
)


def get_celery_app() -> Celery:
    """Get the Celery app instance."""
    return celery_app
