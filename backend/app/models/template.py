import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Integer, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    is_system = Column(Boolean, default=False)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    thumbnail_url = Column(String(2048), nullable=True)
    scene_count = Column(Integer, default=0)
    estimated_duration = Column(String(50), nullable=True)
    best_for = Column(JSON, default=list)
    graph_definition = Column(JSON, nullable=False, default=dict)
    usage_count = Column(Integer, default=0)

    # Community / publish fields
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    remix_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
