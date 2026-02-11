import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SceneDefinition(Base):
    __tablename__ = "scene_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # hook, body, closer
    subcategory = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    prompt_template = Column(Text, nullable=False)
    default_script = Column(Text, nullable=True)
    setting = Column(JSON, default=dict)  # {location, lighting, camera_angle, vibe}
    duration = Column(Integer, default=5)
    tone = Column(String(100), nullable=True)
    is_system = Column(Boolean, default=False)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    usage_count = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
