from __future__ import annotations

import logging
from typing import Optional

from app.graph.checkpointer import create_checkpointer, thread_id, fork_config
from app.graph.state import AxelGraphState
from app.graph.nodes import (
    character_loader_node,
    prompt_enricher_node,
    setting_resolver_node,
    video_dispatcher_node,
)

logger = logging.getLogger(__name__)

_pipeline = None


def build_pipeline(checkpointer=None):
    from langgraph.graph import StateGraph, START, END

    cp = checkpointer or create_checkpointer()

    graph = StateGraph(AxelGraphState)
    graph.add_node("character_loader", character_loader_node)
    graph.add_node("prompt_enricher", prompt_enricher_node)
    graph.add_node("setting_resolver", setting_resolver_node)
    graph.add_node("video_dispatcher", video_dispatcher_node)

    graph.add_edge(START, "character_loader")
    graph.add_edge("character_loader", "prompt_enricher")
    graph.add_edge("prompt_enricher", "setting_resolver")
    graph.add_edge("setting_resolver", "video_dispatcher")
    graph.add_edge("video_dispatcher", END)

    pipeline = graph.compile(checkpointer=cp)
    logger.info("[pipeline] compiled: character_loader → prompt_enricher → setting_resolver → video_dispatcher")
    return pipeline


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_pipeline()
    return _pipeline


async def invoke(state: AxelGraphState, project_id: str, branch_id: str) -> AxelGraphState:
    pipeline = get_pipeline()
    config = {"configurable": {"thread_id": thread_id(project_id, branch_id)}}
    return await pipeline.ainvoke(state, config)


async def invoke_fork(
    state: AxelGraphState,
    project_id: str,
    parent_branch_id: str,
    new_branch_id: str,
    fork_at: str = "prompt_enricher",
) -> AxelGraphState:
    pipeline = get_pipeline()
    config = fork_config(project_id, parent_branch_id, new_branch_id, fork_at)
    return await pipeline.ainvoke(state, config)
