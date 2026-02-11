from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any, List

from app.schemas.wardrobe_preset import WardrobePresetResponse


class CharacterLibraryCreate(BaseModel):
    name: str
    source_images: List[Dict[str, Any]] = []  # [{url, angle, is_primary}]
    voice_profile: Optional[Dict[str, Any]] = None
    performance_style: Optional[Dict[str, Any]] = None


class CharacterLibraryUpdate(BaseModel):
    name: Optional[str] = None
    prompt_dna: Optional[str] = None
    source_images: Optional[List[Dict[str, Any]]] = None
    voice_profile: Optional[Dict[str, Any]] = None
    performance_style: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class CharacterLibraryResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: Optional[UUID] = None
    name: Optional[str] = None
    source_image_url: Optional[str] = None
    source_images: List[Dict[str, Any]] = []
    prompt_dna: Optional[str] = None
    voice_profile: Dict[str, Any] = {}
    performance_style: Dict[str, Any] = {}
    embedding_id: Optional[str] = None
    analysis_data: Dict[str, Any] = {}
    wardrobe_presets: List[WardrobePresetResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
