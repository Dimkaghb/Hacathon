from __future__ import annotations

import logging
from typing import Any, Dict

from app.graph.state import AxelGraphState
from app.services.prompt_service import build_product_context, build_setting_context

logger = logging.getLogger(__name__)

_MAX_PROMPT_LEN = 2000


async def prompt_enricher_node(state: AxelGraphState) -> Dict[str, Any]:
    log = list(state.get("node_execution_log", []))
    log.append("prompt_enricher")

    sections: list[str] = [state.get("base_prompt", "")]

    character = state.get("character")
    if character:
        if character.get("prompt_description"):
            sections.append(f"Character: {character['prompt_description']}")
        if character.get("wardrobe_snippet"):
            sections.append(character["wardrobe_snippet"])
        if character.get("performance_style"):
            sections.append(f"Performance: {character['performance_style']}")

    product = state.get("product")
    if product:
        product_ctx = build_product_context(dict(product))
        if product_ctx:
            sections.append(f"Product context: {product_ctx}")

    setting = state.get("setting")
    if setting and setting.get("resolved_prompt"):
        sections.append(setting["resolved_prompt"])

    enriched = "\n\n".join(filter(None, sections))
    if len(enriched) > _MAX_PROMPT_LEN:
        enriched = enriched[:_MAX_PROMPT_LEN]

    logger.info(f"[prompt_enricher] prompt length={len(enriched)}")

    return {"enriched_prompt": enriched, "node_execution_log": log}
