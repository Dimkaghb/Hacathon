import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Integer, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Hook(Base):
    __tablename__ = "hooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(50), nullable=False)  # curiosity, controversy, social-proof, pov, relatable, urgency, challenge
    template_text = Column(Text, nullable=False)
    example_filled = Column(Text, nullable=True)
    variables = Column(JSON, default=list)  # [{key, label, placeholder}]
    performance_score = Column(Float, default=0.0)
    usage_count = Column(Integer, default=0)
    is_system = Column(Boolean, default=False)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
