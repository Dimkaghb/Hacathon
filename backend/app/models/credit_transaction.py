import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class TransactionType(str, enum.Enum):
    ALLOCATION = "allocation"
    TRIAL_ALLOCATION = "trial_allocation"
    DEDUCTION = "deduction"
    REFUND = "refund"
    EXPIRATION = "expiration"
    ADJUSTMENT = "adjustment"


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)

    # Context
    description = Column(String(500), nullable=True)
    operation_type = Column(String(100), nullable=True)
    job_id = Column(UUID(as_uuid=True), nullable=True)
    polar_order_id = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subscription = relationship("Subscription", back_populates="credit_transactions")
