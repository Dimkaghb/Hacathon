from pydantic import BaseModel, field_validator
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
    thumbnail_url: Optional[str] = None


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
    share_enabled: bool = False
    share_token: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('share_enabled', mode='before')
    @classmethod
    def default_share_enabled(cls, v):
        """Convert None to False for share_enabled"""
        return v if v is not None else False

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    nodes: List[NodeSummary] = []
    connections: List[ConnectionSummary] = []


class ShareLinkResponse(BaseModel):
    share_enabled: bool
    share_token: Optional[str] = None
    share_url: Optional[str] = None
