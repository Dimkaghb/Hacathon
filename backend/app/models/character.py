import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Character(Base):
    __tablename__ = "characters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=True)
    source_image_url = Column(Text, nullable=True)  # Legacy single image
    source_images = Column(JSON, default=list)  # [{url, angle, is_primary}]
    prompt_dna = Column(Text, nullable=True)  # Refined character description for consistent Veo results
    voice_profile = Column(JSON, default=dict)  # {tone, energy, pacing, speech_patterns}
    performance_style = Column(JSON, default=dict)  # {gestures, camera_behavior, pauses}
    embedding_id = Column(String(255), nullable=True)  # Reference to Qdrant vector
    analysis_data = Column(JSON, default=dict)  # Facial features, analysis data
    metadata_ = Column("metadata", JSON, default=dict)  # {tags, category, notes}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="characters")
    project = relationship("Project", back_populates="characters")
    nodes = relationship("Node", back_populates="character")
    wardrobe_presets = relationship("WardrobePreset", back_populates="character", cascade="all, delete-orphan")
