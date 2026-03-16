from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def create_checkpointer(connection_string: Optional[str] = None):
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        from app.config import settings

        db_url = connection_string or settings.DATABASE_URL
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

        checkpointer = PostgresSaver.from_conn_string(db_url)
        logger.info("[checkpointer] PostgreSQL checkpointer ready")
        return checkpointer

    except ImportError:
        from langgraph.checkpoint.memory import MemorySaver
        logger.warning("[checkpointer] langgraph-checkpoint-postgres not installed — using MemorySaver")
        return MemorySaver()


def thread_id(project_id: str, branch_id: str) -> str:
    return f"project:{project_id}:branch:{branch_id}"


def fork_config(
    project_id: str,
    parent_branch_id: str,
    new_branch_id: str,
    fork_at_node: str,
) -> dict:
    return {
        "configurable": {
            "thread_id": thread_id(project_id, new_branch_id),
            "checkpoint_ns": thread_id(project_id, parent_branch_id),
            "checkpoint_id": fork_at_node,
        }
    }
