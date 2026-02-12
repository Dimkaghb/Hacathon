from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any, List
from enum import Enum


class NodeType(str, Enum):
    IMAGE = "image"
    PROMPT = "prompt"
    VIDEO = "video"
    CONTAINER = "container"
    RATIO = "ratio"
    SCENE = "scene"
    EXTENSION = "extension"
    CHARACTER = "character"
    PRODUCT = "product"
    SETTING = "setting"


class NodeStatus(str, Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class NodeCreate(BaseModel):
    type: NodeType
    position_x: float = 0
    position_y: float = 0
    data: Dict[str, Any] = {}
    character_id: Optional[UUID] = None


class NodeUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    data: Optional[Dict[str, Any]] = None
    character_id: Optional[UUID] = None


class NodeResponse(BaseModel):
    id: UUID
    project_id: UUID
    character_id: Optional[UUID] = None
    type: NodeType
    position_x: float
    position_y: float
    data: Dict[str, Any]
    status: NodeStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NodeBatchUpdate(BaseModel):
    nodes: List[NodeUpdate]


class BranchConfig(BaseModel):
    offset_y: float = 250
    modifications: Optional[Dict[str, Dict[str, Any]]] = None
    # e.g., {"ref_id_of_branch_point": {"script_text": "Different hook..."}}


class ConnectionResponse(BaseModel):
    id: UUID
    project_id: UUID
    source_node_id: UUID
    target_node_id: UUID
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None

    class Config:
        from_attributes = True


class BranchResponse(BaseModel):
    cloned_nodes: List[NodeResponse]
    cloned_connections: List[ConnectionResponse]
    branch_group_id: str
