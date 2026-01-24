import redis.asyncio as redis
from typing import Optional

from app.config import settings

redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return redis_client


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


class JobQueue:
    def __init__(self, queue_name: str = "jobs"):
        self.queue_name = queue_name

    async def enqueue(self, job_data: dict) -> str:
        """
        Enqueue a job to Redis queue.
        
        Args:
            job_data: Dictionary containing job information, must include 'job_id'
        
        Returns:
            The job_id that was enqueued
        """
        client = await get_redis()
        import json

        # Use the job_id from job_data (should already be set from database)
        job_id = job_data.get("job_id")
        if not job_id:
            raise ValueError("job_data must contain 'job_id'")
        
        await client.rpush(self.queue_name, json.dumps(job_data))
        return job_id

    async def dequeue(self) -> Optional[dict]:
        client = await get_redis()
        import json

        data = await client.lpop(self.queue_name)
        if data:
            return json.loads(data)
        return None

    async def get_job_status(self, job_id: str) -> Optional[dict]:
        client = await get_redis()
        import json

        data = await client.get(f"job_status:{job_id}")
        if data:
            return json.loads(data)
        return None

    async def set_job_status(self, job_id: str, status: dict):
        client = await get_redis()
        import json

        await client.set(f"job_status:{job_id}", json.dumps(status), ex=86400)


job_queue = JobQueue()
