#!/usr/bin/env python
"""
Worker runner script for processing async jobs.

Usage:
    python -m app.workers.runner --type video_generation
    python -m app.workers.runner --type all
"""

import asyncio
import argparse
import logging
import signal
from typing import List

from app.workers.face_worker import face_worker
from app.workers.prompt_worker import prompt_worker
from app.workers.video_worker import video_worker
from app.workers.extension_worker import extension_worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

WORKERS = {
    "face_analysis": face_worker,
    "prompt_enhancement": prompt_worker,
    "video_generation": video_worker,
    "video_extension": extension_worker,
}


async def run_workers(worker_types: List[str]):
    """Run specified workers concurrently."""
    workers = []

    for worker_type in worker_types:
        if worker_type in WORKERS:
            workers.append(WORKERS[worker_type])
        else:
            logger.warning(f"Unknown worker type: {worker_type}")

    if not workers:
        logger.error("No valid workers to run")
        return

    # Handle shutdown signals
    loop = asyncio.get_event_loop()

    def shutdown():
        logger.info("Shutting down workers...")
        for worker in workers:
            worker.stop()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown)

    # Start all workers
    logger.info(f"Starting workers: {[w.job_type for w in workers]}")

    tasks = [asyncio.create_task(worker.run()) for worker in workers]

    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        logger.info("Workers cancelled")


def main():
    parser = argparse.ArgumentParser(description="Run job workers")
    parser.add_argument(
        "--type",
        "-t",
        type=str,
        default="all",
        help="Worker type to run (face_analysis, prompt_enhancement, video_generation, video_extension, all)",
    )
    parser.add_argument(
        "--concurrency",
        "-c",
        type=int,
        default=1,
        help="Number of concurrent workers per type",
    )

    args = parser.parse_args()

    if args.type == "all":
        worker_types = list(WORKERS.keys())
    else:
        worker_types = [args.type]

    asyncio.run(run_workers(worker_types))


if __name__ == "__main__":
    main()
