from __future__ import annotations

import logging
from typing import Any, Dict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.graph.state import AxelGraphState, CharacterState
from app.services.face_service import face_service
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)


async def character_loader_node(state: AxelGraphState) -> Dict[str, Any]:
    log = list(state.get("node_execution_log", []))
    log.append("character_loader")

    character_input = state.get("character")
    if not character_input or not character_input.get("character_id"):
        return {"node_execution_log": log}

    character_id = character_input["character_id"]
    logger.info(f"[character_loader] loading character_id={character_id}")

    # Pull Gemini analysis + ArcFace embedding reference from Qdrant
    embedding_data = await vector_service.get_embedding(character_id)

    prompt_description = ""
    gemini_analysis: Dict[str, Any] = {}
    source_image_url = ""
    embedding_id = None

    if embedding_data:
        embedding_id = character_id
        meta = embedding_data.get("metadata", {})
        prompt_description = meta.get("video_prompt_description", "")
        source_image_url = meta.get("image_url", "")
        gemini_analysis = {
            k: v for k, v in meta.items()
            if k not in {"character_id", "image_url", "embedding_type", "video_prompt_description", "original_id"}
        }
        logger.info(f"[character_loader] ArcFace embedding found for {character_id}")
    else:
        logger.warning(f"[character_loader] no embedding in Qdrant for {character_id}, falling back to DB")

    # DB fallback: character.analysis_data / prompt_dna, wardrobe, performance
    wardrobe_snippet = character_input.get("wardrobe_snippet")
    performance_style = None
    wardrobe_preset_id = character_input.get("wardrobe_preset_id")

    try:
        from app.tasks.video_tasks import sync_engine
        from app.models.character import Character
        from app.models.wardrobe_preset import WardrobePreset

        with Session(sync_engine) as db:
            char = db.execute(
                select(Character).where(Character.id == UUID(character_id))
            ).scalar_one_or_none()

            if char:
                if not prompt_description and char.analysis_data:
                    prompt_description = char.analysis_data.get("video_prompt_description", "")
                    if not gemini_analysis:
                        gemini_analysis = char.analysis_data

                if not prompt_description and char.prompt_dna:
                    prompt_description = char.prompt_dna

                if not source_image_url and char.source_images:
                    first = char.source_images[0]
                    source_image_url = first.get("url") if isinstance(first, dict) else first

                if char.performance_style:
                    from app.services.prompt_service import format_performance
                    performance_style = format_performance(char.performance_style)

            if wardrobe_preset_id and not wardrobe_snippet:
                wp = db.execute(
                    select(WardrobePreset).where(WardrobePreset.id == UUID(wardrobe_preset_id))
                ).scalar_one_or_none()
                if wp and wp.prompt_snippet:
                    wardrobe_snippet = wp.prompt_snippet

    except Exception as e:
        logger.warning(f"[character_loader] DB lookup failed: {e}")

    # source image → effective_image_url activates Veo image-to-video mode
    effective_image_url = state.get("image_url") or source_image_url or None

    character_state: CharacterState = {
        "character_id": character_id,
        "embedding_id": embedding_id,
        "embedding_threshold": 0.5,
        "source_image_url": source_image_url or None,
        "gemini_analysis": gemini_analysis,
        "prompt_description": prompt_description,
        "wardrobe_preset_id": wardrobe_preset_id,
        "wardrobe_snippet": wardrobe_snippet,
        "performance_style": performance_style,
    }

    return {
        "character": character_state,
        "effective_image_url": effective_image_url,
        "node_execution_log": log,
    }
