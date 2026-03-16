from __future__ import annotations

import logging
from typing import Any, Dict

from app.graph.state import AxelGraphState, SettingState
from app.services.prompt_service import build_setting_context

logger = logging.getLogger(__name__)


async def setting_resolver_node(state: AxelGraphState) -> Dict[str, Any]:
    log = list(state.get("node_execution_log", []))
    log.append("setting_resolver")

    setting = state.get("setting")
    if not setting:
        return {"node_execution_log": log}

    resolved_prompt = build_setting_context(dict(setting))

    resolved: SettingState = {**setting, "resolved_prompt": resolved_prompt}
    logger.info(f"[setting_resolver] resolved: '{setting.get('location', '')}' (branch fork point)")

    return {"setting": resolved, "node_execution_log": log}
