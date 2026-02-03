import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from sqlalchemy import select
from uuid import UUID

from app.core.database import AsyncSessionLocal
from app.core.redis import job_queue
from app.models.node import Node, NodeStatus
from app.models.job import Job, JobStatus

logger = logging.getLogger(__name__)


class BaseWorker(ABC):
    """Base class for async job workers."""

    def __init__(self, job_type: str):
        self.job_type = job_type
        self.running = False

    @abstractmethod
    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a job. Must be implemented by subclasses.

        Args:
            job_data: Job data from the queue

        Returns:
            Result data
        """
        pass

    async def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        progress: int = 0,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        operation_id: Optional[str] = None,
        progress_message: Optional[str] = None,
        stage: Optional[str] = None,
    ):
        """Update job status in database."""
        async with AsyncSessionLocal() as db:
            job_result = await db.execute(
                select(Job).where(Job.id == UUID(job_id))
            )
            job = job_result.scalar_one_or_none()

            if job:
                job.status = status
                job.progress = progress
                if result is not None:
                    job.result = result
                if error is not None:
                    job.error = error
                if operation_id is not None:
                    job.external_operation_id = operation_id
                
                # Store progress message and stage in result
                if progress_message is not None or stage is not None:
                    current_result = job.result or {}
                    if progress_message is not None:
                        current_result["progress_message"] = progress_message
                    if stage is not None:
                        current_result["stage"] = stage
                    job.result = current_result

                await db.commit()

    async def update_node_status(
        self,
        node_id: str,
        status: NodeStatus,
        data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ):
        """Update node status in database."""
        async with AsyncSessionLocal() as db:
            node_result = await db.execute(
                select(Node).where(Node.id == UUID(node_id))
            )
            node = node_result.scalar_one_or_none()

            if node:
                node.status = status
                if data is not None:
                    node.data = {**node.data, **data}
                if error_message is not None:
                    node.error_message = error_message

                await db.commit()

                return str(node.project_id)
        return None

    async def run_once(self) -> bool:
        """
        Process one job from the queue.

        Returns:
            True if a job was processed, False if queue was empty
        """
        job_data = await job_queue.dequeue()

        if not job_data:
            return False

        if job_data.get("type") != self.job_type:
            # Put it back at the end of the queue if it's not our job type
            # Use enqueue to add to end (FIFO order) - it will use existing job_id
            await job_queue.enqueue(job_data)
            return False

        job_id = job_data.get("job_id")
        node_id = job_data.get("node_id")

        logger.info(f"Processing job {job_id} of type {self.job_type}")

        try:
            # Update status to processing
            await self.update_job_status(job_id, JobStatus.PROCESSING, progress=0)
            await self.update_node_status(node_id, NodeStatus.PROCESSING)

            # Process the job
            result = await self.process(job_data)

            # Update with success
            await self.update_job_status(
                job_id, 
                JobStatus.COMPLETED, 
                progress=100, 
                result=result,
                progress_message="Video generation completed successfully",
                stage="completed"
            )
            await self.update_node_status(node_id, NodeStatus.COMPLETED, data=result)

            logger.info(f"Job {job_id} completed successfully")
            return True

        except Exception as e:
            import traceback
            error_details = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
            logger.error(f"Job {job_id} failed: {error_details}")

            # Update job and node with error details
            await self.update_job_status(
                job_id,
                JobStatus.FAILED,
                error=error_details,
                progress_message=f"Error: {str(e)}",
                stage="failed"
            )
            await self.update_node_status(
                node_id,
                NodeStatus.FAILED,
                error_message=str(e)
            )

            return True

    async def run(self, poll_interval: float = 1.0):
        """
        Run the worker continuously.

        Args:
            poll_interval: Seconds to wait between queue polls
        """
        self.running = True
        logger.info(f"Starting {self.job_type} worker")

        while self.running:
            try:
                processed = await self.run_once()
                if not processed:
                    await asyncio.sleep(poll_interval)
            except Exception as e:
                logger.error(f"Worker error: {str(e)}")
                await asyncio.sleep(poll_interval)

    def stop(self):
        """Stop the worker."""
        self.running = False
        logger.info(f"Stopping {self.job_type} worker")
