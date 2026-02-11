from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any


class SceneDefinitionCreate(BaseModel):
    name: str
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    prompt_template: str
    default_script: Optional[str] = None
    setting: Optional[Dict[str, Any]] = None
    duration: int = 5
    tone: Optional[str] = None


class SceneDefinitionResponse(BaseModel):
    id: UUID
    name: str
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    prompt_template: str
    default_script: Optional[str] = None
    setting: Dict[str, Any] = {}
    duration: int = 5
    tone: Optional[str] = None
    is_system: bool = False
    creator_id: Optional[UUID] = None
    usage_count: int = 0
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
