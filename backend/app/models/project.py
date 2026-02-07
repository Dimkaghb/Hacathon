import uuid
import secrets
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_share_token():
    """Generate a secure random share token"""
    return secrets.token_urlsafe(32)


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    canvas_state = Column(JSON, default=dict)  # Stores viewport, zoom, etc.
    
    # Sharing
    share_enabled = Column(Boolean, default=False)
    share_token = Column(String(64), unique=True, nullable=True, index=True)

    thumbnail_url = Column(String(2048), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="projects")
    nodes = relationship("Node", back_populates="project", cascade="all, delete-orphan")
    connections = relationship("Connection", back_populates="project", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="project", cascade="all, delete-orphan")
