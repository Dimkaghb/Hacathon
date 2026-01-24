import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Float, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class NodeType(str, enum.Enum):
    IMAGE = "image"
    PROMPT = "prompt"
    VIDEO = "video"


class NodeStatus(str, enum.Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Node(Base):
    __tablename__ = "nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="SET NULL"), nullable=True)
    type = Column(Enum(NodeType), nullable=False)
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    data = Column(JSON, nullable=False, default=dict)
    status = Column(Enum(NodeStatus), default=NodeStatus.IDLE)
    error_message = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="nodes")
    character = relationship("Character", back_populates="nodes")
    jobs = relationship("Job", back_populates="node", cascade="all, delete-orphan")

    # Connection relationships
    outgoing_connections = relationship(
        "Connection",
        foreign_keys="Connection.source_node_id",
        back_populates="source_node",
        cascade="all, delete-orphan"
    )
    incoming_connections = relationship(
        "Connection",
        foreign_keys="Connection.target_node_id",
        back_populates="target_node",
        cascade="all, delete-orphan"
    )
