import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class WardrobePreset(Base):
    __tablename__ = "wardrobe_presets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    reference_images = Column(JSON, default=list)  # Array of image URLs
    clothing_details = Column(JSON, default=dict)  # {top, bottom, shoes, accessories, colors, style}
    prompt_snippet = Column(Text, nullable=True)  # Pre-written prompt fragment
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    character = relationship("Character", back_populates="wardrobe_presets")
