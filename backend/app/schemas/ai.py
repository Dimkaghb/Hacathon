from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict, Any, List
from enum import Enum


class VideoResolution(str, Enum):
    RES_720P = "720p"
    RES_1080P = "1080p"
    RES_4K = "4k"


class AspectRatio(str, Enum):
    RATIO_16_9 = "16:9"
    RATIO_9_16 = "9:16"
    RATIO_1_1 = "1:1"


class FaceAnalysisRequest(BaseModel):
    image_url: str
    project_id: UUID
    character_name: Optional[str] = None


class FaceAnalysisResponse(BaseModel):
    character_id: UUID
    embedding_id: str
    analysis_data: Dict[str, Any]


class PromptEnhanceRequest(BaseModel):
    prompt: str
    style: Optional[str] = None
    mood: Optional[str] = None


class PromptEnhanceResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    suggestions: List[str] = []


class VideoGenerateRequest(BaseModel):
    node_id: UUID
    prompt: str
    image_url: Optional[str] = None
    character_id: Optional[UUID] = None
    resolution: VideoResolution = VideoResolution.RES_1080P
    aspect_ratio: AspectRatio = AspectRatio.RATIO_16_9
    duration: int = 8
    negative_prompt: Optional[str] = None


class VideoExtendRequest(BaseModel):
    node_id: UUID
    video_url: str
    prompt: str


class JobStatusResponse(BaseModel):
    job_id: UUID
    node_id: UUID
    type: str
    status: str
    progress: int
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress_message: Optional[str] = None  # Detailed progress message
    stage: Optional[str] = None  # Current processing stage


class CharacterCreate(BaseModel):
    name: Optional[str] = None
    source_image_url: str


class CharacterResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: Optional[str] = None
    source_image_url: str
    embedding_id: Optional[str] = None
    analysis_data: Dict[str, Any]

    class Config:
        from_attributes = True
