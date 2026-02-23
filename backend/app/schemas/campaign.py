from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any, List


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "draft"
    metadata: Optional[Dict[str, Any]] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CampaignProjectSummary(BaseModel):
    id: UUID
    name: str
    thumbnail_url: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignCharacterSummary(BaseModel):
    id: UUID
    name: Optional[str] = None
    source_image_url: Optional[str] = None

    class Config:
        from_attributes = True


class CampaignResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    status: str
    metadata: Optional[Dict[str, Any]] = None
    project_count: int = 0
    character_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignDetailResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    status: str
    metadata: Optional[Dict[str, Any]] = None
    projects: List[CampaignProjectSummary] = []
    characters: List[CampaignCharacterSummary] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
