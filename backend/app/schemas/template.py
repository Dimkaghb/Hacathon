from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any, List


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    graph_definition: Dict[str, Any]
    scene_count: int = 0
    estimated_duration: Optional[str] = None
    best_for: List[str] = []
    thumbnail_url: Optional[str] = None


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    category: str
    is_system: bool = False
    creator_id: Optional[UUID] = None
    thumbnail_url: Optional[str] = None
    scene_count: int = 0
    estimated_duration: Optional[str] = None
    best_for: List[str] = []
    graph_definition: Dict[str, Any] = {}
    usage_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateInstantiateRequest(BaseModel):
    project_id: UUID
    offset_x: float = 0
    offset_y: float = 0
    variables: Optional[Dict[str, str]] = None


class TemplateInstantiateResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]
