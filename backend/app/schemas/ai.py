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
    seed: Optional[int] = None  # For reproducibility
    num_videos: int = 1  # Generate multiple candidates (1-4)
    use_fast_model: bool = False  # Use faster but lower quality model


class VideoExtendRequest(BaseModel):
    node_id: UUID
    video_url: str
    prompt: str
    seed: Optional[int] = None
    extension_count: int = 1  # Track extension number (max 20)
    veo_video_uri: Optional[str] = None  # Original Veo video URI for extension
    veo_video_name: Optional[str] = None  # Original Veo file name for extension


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

    class Config:
        from_attributes = True
