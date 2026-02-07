from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class SubscriptionStatusResponse(BaseModel):
    has_subscription: bool
    status: Optional[str] = None
    plan: Optional[str] = None
    credits_balance: int = 0
    credits_total: int = 0
    is_trial: bool = False
    trial_ends_at: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    canceled_at: Optional[datetime] = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    checkout_id: str


class PortalResponse(BaseModel):
    portal_url: str


class CreditTransactionResponse(BaseModel):
    id: UUID
    type: str
    amount: int
    balance_after: int
    operation_type: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CreditCostInfo(BaseModel):
    operation: str
    credits: int
