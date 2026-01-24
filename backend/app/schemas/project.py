from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any, List


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    canvas_state: Optional[Dict[str, Any]] = None


class NodeSummary(BaseModel):
    id: UUID
    type: str
    position_x: float
    position_y: float
    status: str
    data: Dict[str, Any]

    class Config:
        from_attributes = True


class ConnectionSummary(BaseModel):
    id: UUID
    source_node_id: UUID
    target_node_id: UUID
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    canvas_state: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    nodes: List[NodeSummary] = []
    connections: List[ConnectionSummary] = []
