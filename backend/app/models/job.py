import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class JobType(str, enum.Enum):
    FACE_ANALYSIS = "face_analysis"
    PROMPT_ENHANCEMENT = "prompt_enhancement"
    VIDEO_GENERATION = "video_generation"
    VIDEO_EXTENSION = "video_extension"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    progress = Column(Integer, default=0)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    external_operation_id = Column(String(255), nullable=True)  # Veo operation ID
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    node = relationship("Node", back_populates="jobs")
