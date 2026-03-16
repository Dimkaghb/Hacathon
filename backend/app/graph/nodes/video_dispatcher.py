from __future__ import annotations

import logging
from typing import Any, Dict

from app.graph.state import AxelGraphState, VideoOutputState

logger = logging.getLogger(__name__)


async def video_dispatcher_node(state: AxelGraphState) -> Dict[str, Any]:
    log = list(state.get("node_execution_log", []))
    log.append("video_dispatcher")

    job_id = state.get("video_output", {}).get("job_id") if state.get("video_output") else None
    node_id = state.get("video_output", {}).get("node_id") if state.get("video_output") else None

    if not job_id or not node_id:
        logger.error("[video_dispatcher] job_id and node_id must be set in initial state")
        return {"error": "missing job_id or node_id", "node_execution_log": log}

    enriched_prompt = state.get("enriched_prompt") or state.get("base_prompt", "")
    effective_image_url = state.get("effective_image_url")
    character = state.get("character")
    extension_chain = list(state.get("extension_chain") or [])

    generation_type = "image-to-video" if effective_image_url else "text-to-video"

    from app.tasks.video_tasks import generate_video

    task = generate_video.delay(
        job_id=job_id,
        node_id=node_id,
        project_id=state["project_id"],
        prompt=enriched_prompt,
        image_url=effective_image_url,
        character_id=(character or {}).get("character_id"),
        wardrobe_preset_id=(character or {}).get("wardrobe_preset_id"),
        product_data=dict(state["product"]) if state.get("product") else None,
        setting_data=dict(state["setting"]) if state.get("setting") else None,
        resolution="720p",
        aspect_ratio=state.get("aspect_ratio", "16:9"),
        duration=state.get("duration", 8),
        negative_prompt=state.get("negative_prompt"),
        seed=state.get("seed"),
        num_videos=1,
        use_fast_model=state.get("generation_mode") == "fast",
        user_id=state.get("user_id"),
        credit_cost=state.get("credit_cost", 0),
    )

    logger.info(
        f"[video_dispatcher] dispatched job={job_id} task={task.id} "
        f"mode={state.get('generation_mode')} type={generation_type}"
    )

    video_output: VideoOutputState = {
        "job_id": job_id,
        "node_id": node_id,
        "celery_task_id": task.id,
        "veo_operation_name": "",
        "veo_video_uri": None,
        "gcs_url": None,
        "duration_seconds": float(state.get("duration", 8)),
        "generation_type": generation_type,
        "identity_similarity_score": None,
        "identity_verified": None,
    }

    return {
        "video_output": video_output,
        "extension_chain": extension_chain,
        "node_execution_log": log,
    }
