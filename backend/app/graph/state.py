from __future__ import annotations

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class CharacterState(TypedDict, total=False):
    character_id: str
    embedding_id: Optional[str]
    embedding_threshold: float
    source_image_url: Optional[str]
    gemini_analysis: Dict[str, Any]
    prompt_description: str
    wardrobe_preset_id: Optional[str]
    wardrobe_snippet: Optional[str]
    performance_style: Optional[str]


class SettingState(TypedDict, total=False):
    location: str
    lighting: str
    camera_angle: str
    vibe: str
    custom_details: str
    resolved_prompt: str


class ProductState(TypedDict, total=False):
    product_name: str
    brand: str
    benefits: List[str]
    tone: str
    target_audience: str
    resolved_prompt: str


class VideoOutputState(TypedDict, total=False):
    job_id: str
    node_id: str
    celery_task_id: str
    veo_operation_name: str
    veo_video_uri: Optional[str]
    gcs_url: Optional[str]
    duration_seconds: float
    generation_type: str  # "text-to-video" | "image-to-video"
    identity_similarity_score: Optional[float]
    identity_verified: Optional[bool]


class AxelGraphState(TypedDict, total=False):
    # Routing
    project_id: str
    branch_id: str
    parent_branch_id: Optional[str]
    user_id: str

    # Input
    base_prompt: str
    image_url: Optional[str]
    generation_mode: str       # "standard" | "fast"
    aspect_ratio: str
    duration: int
    negative_prompt: Optional[str]
    seed: Optional[int]
    credit_cost: int

    # Node outputs
    character: Optional[CharacterState]
    setting: Optional[SettingState]
    product: Optional[ProductState]

    # Built by prompt_enricher
    enriched_prompt: str
    effective_image_url: Optional[str]

    # Built by video_dispatcher
    video_output: Optional[VideoOutputState]
    extension_chain: List[VideoOutputState]

    # Pipeline metadata
    error: Optional[str]
    node_execution_log: List[str]
