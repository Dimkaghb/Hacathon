import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


campaign_projects = Table(
    "campaign_projects",
    Base.metadata,
    Column("campaign_id", UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True),
    Column("project_id", UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("added_at", DateTime, default=datetime.utcnow),
)

campaign_characters = Table(
    "campaign_characters",
    Base.metadata,
    Column("campaign_id", UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True),
    Column("character_id", UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), primary_key=True),
    Column("added_at", DateTime, default=datetime.utcnow),
)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="draft")
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="campaigns")
    projects = relationship("Project", secondary=campaign_projects, backref="campaigns", lazy="selectin")
    characters = relationship("Character", secondary=campaign_characters, backref="campaigns", lazy="selectin")
