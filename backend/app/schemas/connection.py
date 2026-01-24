from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class ConnectionCreate(BaseModel):
    source_node_id: UUID
    target_node_id: UUID
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None


class ConnectionResponse(BaseModel):
    id: UUID
    project_id: UUID
    source_node_id: UUID
    target_node_id: UUID
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
