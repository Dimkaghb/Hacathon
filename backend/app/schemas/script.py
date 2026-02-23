"""
Script Mode schemas.

Defines request/response models for converting a linear script
into a React Flow node graph.
"""
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel


class ScriptSceneBlock(BaseModel):
    category: str              # "hook" | "body" | "closer"
    script_text: str           # The spoken script
    duration: int = 5          # Seconds
    scene_name: Optional[str] = None
    tone: Optional[str] = None
    scene_definition_id: Optional[UUID] = None
    prompt_template: Optional[str] = None


class ScriptToGraphRequest(BaseModel):
    project_id: UUID
    scenes: List[ScriptSceneBlock]
    character_id: Optional[UUID] = None
    product_data: Optional[Dict[str, Any]] = None
    setting_data: Optional[Dict[str, Any]] = None
    offset_x: float = 0
    offset_y: float = 0


class ScriptToGraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]
