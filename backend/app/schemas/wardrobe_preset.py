from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any, List


class WardrobePresetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    reference_images: List[str] = []
    clothing_details: Optional[Dict[str, Any]] = None
    prompt_snippet: Optional[str] = None


class WardrobePresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    reference_images: Optional[List[str]] = None
    clothing_details: Optional[Dict[str, Any]] = None
    prompt_snippet: Optional[str] = None


class WardrobePresetResponse(BaseModel):
    id: UUID
    character_id: UUID
    name: str
    description: Optional[str] = None
    reference_images: List[str] = []
    clothing_details: Dict[str, Any] = {}
    prompt_snippet: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
