import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SubscriptionStatus(str, enum.Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    CANCELED = "canceled"
    EXPIRED = "expired"
    REVOKED = "revoked"


class PlanType(str, enum.Enum):
    PRO = "pro"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Polar.sh references
    polar_subscription_id = Column(String(255), unique=True, nullable=True, index=True)
    polar_customer_id = Column(String(255), nullable=True)
    polar_product_id = Column(String(255), nullable=True)

    # Plan details
    plan = Column(Enum(PlanType), default=PlanType.PRO, nullable=False)
    status = Column(
        Enum(SubscriptionStatus),
        default=SubscriptionStatus.TRIALING,
        nullable=False,
        index=True,
    )

    # Credit balance
    credits_balance = Column(Integer, default=0, nullable=False)
    credits_total = Column(Integer, default=0, nullable=False)

    # Trial tracking
    is_trial = Column(Boolean, default=False)
    trial_started_at = Column(DateTime, nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)

    # Period tracking
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    canceled_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="subscription")
    credit_transactions = relationship(
        "CreditTransaction",
        back_populates="subscription",
        cascade="all, delete-orphan",
    )
