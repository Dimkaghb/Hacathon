from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Any


class HookCreate(BaseModel):
    category: str
    template_text: str
    example_filled: Optional[str] = None
    variables: Optional[List[Any]] = None


class HookResponse(BaseModel):
    id: UUID
    category: str
    template_text: str
    example_filled: Optional[str] = None
    variables: List[Any] = []
    performance_score: float = 0.0
    usage_count: int = 0
    is_system: bool = False
    creator_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HookGenerateRequest(BaseModel):
    product_name: str
    pain_point: str
    count: int = 5


class HookGenerateResponse(BaseModel):
    hooks: List[dict]  # [{category, template_text, example_filled}]
