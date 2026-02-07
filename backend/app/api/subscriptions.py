"""Subscription management API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.credit_transaction import CreditTransaction
from app.api.deps import get_current_user
from app.services.subscription_service import subscription_service, CREDIT_COSTS
from app.services.polar_service import polar_service
from app.schemas.subscription import (
    SubscriptionStatusResponse,
    CheckoutResponse,
    CreditTransactionResponse,
)

router = APIRouter()


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription status and credit balance."""
    subscription = await subscription_service.get_subscription(db, current_user.id)

    if not subscription:
        return SubscriptionStatusResponse(
            has_subscription=False,
            credits_balance=0,
            credits_total=0,
        )

    return SubscriptionStatusResponse(
        has_subscription=subscription.status
        in (
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.CANCELED,
        ),
        status=subscription.status.value,
        plan=subscription.plan.value,
        credits_balance=subscription.credits_balance,
        credits_total=subscription.credits_total,
        is_trial=subscription.is_trial,
        trial_ends_at=subscription.trial_ends_at,
        current_period_end=subscription.current_period_end,
        canceled_at=subscription.canceled_at,
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Polar checkout session for the Pro plan."""
    result = await polar_service.create_checkout(
        user_id=str(current_user.id),
        email=current_user.email,
    )
    return CheckoutResponse(**result)


@router.post("/start-trial", response_model=SubscriptionStatusResponse)
async def start_trial(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a 3-day free trial."""
    subscription = await subscription_service.create_trial(db, current_user.id)

    return SubscriptionStatusResponse(
        has_subscription=True,
        status=subscription.status.value,
        plan=subscription.plan.value,
        credits_balance=subscription.credits_balance,
        credits_total=subscription.credits_total,
        is_trial=subscription.is_trial,
        trial_ends_at=subscription.trial_ends_at,
        current_period_end=subscription.current_period_end,
    )


@router.get("/transactions", response_model=list[CreditTransactionResponse])
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated credit transaction history."""
    offset = (page - 1) * limit
    result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == current_user.id)
        .order_by(desc(CreditTransaction.created_at))
        .offset(offset)
        .limit(limit)
    )
    transactions = result.scalars().all()
    return [
        CreditTransactionResponse(
            id=tx.id,
            type=tx.type.value,
            amount=tx.amount,
            balance_after=tx.balance_after,
            operation_type=tx.operation_type,
            description=tx.description,
            created_at=tx.created_at,
        )
        for tx in transactions
    ]


@router.get("/credits-info")
async def get_credits_info():
    """Get credit costs for all operations (public endpoint)."""
    return {"credit_costs": CREDIT_COSTS}
