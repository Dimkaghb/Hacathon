"""Subscription and credit management service."""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import InsufficientCreditsError
from app.models.subscription import Subscription, SubscriptionStatus, PlanType
from app.models.credit_transaction import CreditTransaction, TransactionType

logger = logging.getLogger(__name__)

# Credit costs per operation
CREDIT_COSTS = {
    "video_generation_standard": 25,
    "video_generation_fast": 10,
    "video_extension_standard": 25,
    "video_extension_fast": 10,
    "face_analysis": 5,
    "prompt_enhancement": 0,
}


class SubscriptionService:

    async def get_active_subscription(
        self, db: AsyncSession, user_id: UUID
    ) -> Optional[Subscription]:
        """Get a user's active subscription (active, trialing, or canceled but still in period)."""
        result = await db.execute(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.status.in_([
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.TRIALING,
                    SubscriptionStatus.CANCELED,
                ]),
            )
        )
        return result.scalar_one_or_none()

    async def get_subscription(
        self, db: AsyncSession, user_id: UUID
    ) -> Optional[Subscription]:
        """Get a user's subscription regardless of status."""
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_trial(self, db: AsyncSession, user_id: UUID) -> Subscription:
        """Create a 3-day trial subscription with trial credits."""
        # Check if user already has a subscription
        existing = await self.get_subscription(db, user_id)
        if existing:
            return existing

        now = datetime.utcnow()
        trial_end = now + timedelta(days=settings.TRIAL_DAYS)

        subscription = Subscription(
            user_id=user_id,
            plan=PlanType.PRO,
            status=SubscriptionStatus.TRIALING,
            credits_balance=settings.CREDITS_TRIAL,
            credits_total=settings.CREDITS_TRIAL,
            is_trial=True,
            trial_started_at=now,
            trial_ends_at=trial_end,
            current_period_start=now,
            current_period_end=trial_end,
        )
        db.add(subscription)
        await db.flush()

        # Log the credit allocation
        transaction = CreditTransaction(
            subscription_id=subscription.id,
            user_id=user_id,
            type=TransactionType.TRIAL_ALLOCATION,
            amount=settings.CREDITS_TRIAL,
            balance_after=settings.CREDITS_TRIAL,
            description=f"Trial allocation: {settings.CREDITS_TRIAL} credits for {settings.TRIAL_DAYS}-day trial",
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(subscription)
        return subscription

    async def activate_subscription(
        self,
        db: AsyncSession,
        user_id: UUID,
        polar_subscription_id: str,
        polar_customer_id: Optional[str] = None,
        polar_product_id: Optional[str] = None,
    ) -> Subscription:
        """Activate a subscription after Polar checkout, allocating full credits."""
        subscription = await self.get_subscription(db, user_id)
        now = datetime.utcnow()
        period_end = now + timedelta(days=30)

        if subscription:
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.polar_subscription_id = polar_subscription_id
            subscription.polar_customer_id = polar_customer_id
            subscription.polar_product_id = polar_product_id
            subscription.is_trial = False
            subscription.credits_balance = settings.CREDITS_PRO_MONTHLY
            subscription.credits_total = settings.CREDITS_PRO_MONTHLY
            subscription.current_period_start = now
            subscription.current_period_end = period_end
        else:
            subscription = Subscription(
                user_id=user_id,
                plan=PlanType.PRO,
                status=SubscriptionStatus.ACTIVE,
                polar_subscription_id=polar_subscription_id,
                polar_customer_id=polar_customer_id,
                polar_product_id=polar_product_id,
                credits_balance=settings.CREDITS_PRO_MONTHLY,
                credits_total=settings.CREDITS_PRO_MONTHLY,
                is_trial=False,
                current_period_start=now,
                current_period_end=period_end,
            )
            db.add(subscription)
            await db.flush()

        transaction = CreditTransaction(
            subscription_id=subscription.id,
            user_id=user_id,
            type=TransactionType.ALLOCATION,
            amount=settings.CREDITS_PRO_MONTHLY,
            balance_after=subscription.credits_balance,
            description=f"Pro plan activation: {settings.CREDITS_PRO_MONTHLY} credits",
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(subscription)
        return subscription

    async def handle_renewal(
        self,
        db: AsyncSession,
        polar_subscription_id: str,
        polar_order_id: Optional[str] = None,
    ) -> Optional[Subscription]:
        """Reset credits on subscription renewal."""
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            logger.warning(f"Renewal for unknown subscription: {polar_subscription_id}")
            return None

        now = datetime.utcnow()
        old_balance = subscription.credits_balance

        # Expire remaining credits
        if old_balance > 0:
            expire_tx = CreditTransaction(
                subscription_id=subscription.id,
                user_id=subscription.user_id,
                type=TransactionType.EXPIRATION,
                amount=-old_balance,
                balance_after=0,
                description=f"Period expired: {old_balance} unused credits",
            )
            db.add(expire_tx)

        # Reset credits
        subscription.credits_balance = settings.CREDITS_PRO_MONTHLY
        subscription.credits_total = settings.CREDITS_PRO_MONTHLY
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.current_period_start = now
        subscription.current_period_end = now + timedelta(days=30)

        alloc_tx = CreditTransaction(
            subscription_id=subscription.id,
            user_id=subscription.user_id,
            type=TransactionType.ALLOCATION,
            amount=settings.CREDITS_PRO_MONTHLY,
            balance_after=settings.CREDITS_PRO_MONTHLY,
            polar_order_id=polar_order_id,
            description=f"Renewal allocation: {settings.CREDITS_PRO_MONTHLY} credits",
        )
        db.add(alloc_tx)
        await db.commit()
        await db.refresh(subscription)
        return subscription

    async def cancel_subscription(
        self, db: AsyncSession, polar_subscription_id: str
    ) -> Optional[Subscription]:
        """Mark subscription as canceled (still active until period end)."""
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return None

        subscription.status = SubscriptionStatus.CANCELED
        subscription.canceled_at = datetime.utcnow()
        await db.commit()
        await db.refresh(subscription)
        return subscription

    async def revoke_subscription(
        self, db: AsyncSession, polar_subscription_id: str
    ) -> Optional[Subscription]:
        """Immediately revoke a subscription."""
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return None

        subscription.status = SubscriptionStatus.REVOKED
        subscription.canceled_at = datetime.utcnow()
        await db.commit()
        await db.refresh(subscription)
        return subscription

    async def deduct_credits(
        self,
        db: AsyncSession,
        user_id: UUID,
        amount: int,
        operation_type: str,
        job_id: Optional[UUID] = None,
    ) -> CreditTransaction:
        """Atomically deduct credits. Uses SELECT FOR UPDATE to prevent races."""
        result = await db.execute(
            select(Subscription)
            .where(
                Subscription.user_id == user_id,
                Subscription.status.in_([
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.TRIALING,
                    SubscriptionStatus.CANCELED,
                ]),
            )
            .with_for_update()
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            raise InsufficientCreditsError(required=amount, available=0)

        if subscription.credits_balance < amount:
            raise InsufficientCreditsError(
                required=amount, available=subscription.credits_balance
            )

        subscription.credits_balance -= amount

        transaction = CreditTransaction(
            subscription_id=subscription.id,
            user_id=user_id,
            type=TransactionType.DEDUCTION,
            amount=-amount,
            balance_after=subscription.credits_balance,
            operation_type=operation_type,
            job_id=job_id,
            description=f"Used {amount} credits for {operation_type}",
        )
        db.add(transaction)
        # Don't commit here — caller manages the transaction
        await db.flush()
        return transaction

    async def reward_credits(
        self,
        db: AsyncSession,
        user_id: UUID,
        amount: int,
        description: str,
    ) -> Optional[CreditTransaction]:
        """Award bonus credits (e.g. template remix reward). Non-blocking if no subscription."""
        result = await db.execute(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.status.in_([
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.TRIALING,
                    SubscriptionStatus.CANCELED,
                ]),
            )
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            logger.info(f"Skipping reward for user {user_id}: no active subscription")
            return None

        subscription.credits_balance += amount

        transaction = CreditTransaction(
            subscription_id=subscription.id,
            user_id=user_id,
            type=TransactionType.ADJUSTMENT,
            amount=amount,
            balance_after=subscription.credits_balance,
            operation_type="template_remix_reward",
            description=description,
        )
        db.add(transaction)
        await db.flush()
        return transaction

    async def refund_credits(
        self,
        db: AsyncSession,
        user_id: UUID,
        amount: int,
        job_id: Optional[UUID] = None,
        operation_type: Optional[str] = None,
    ) -> Optional[CreditTransaction]:
        """Refund credits for a failed job."""
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return None

        subscription.credits_balance += amount

        transaction = CreditTransaction(
            subscription_id=subscription.id,
            user_id=user_id,
            type=TransactionType.REFUND,
            amount=amount,
            balance_after=subscription.credits_balance,
            operation_type=operation_type,
            job_id=job_id,
            description=f"Refund {amount} credits for failed {operation_type}",
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(subscription)
        return transaction


def refund_credits_sync(
    sync_engine,
    user_id: str,
    amount: int,
    job_id: str,
    operation_type: str,
) -> None:
    """Synchronous credit refund for use in Celery workers."""
    from app.models.subscription import Subscription

    with Session(sync_engine) as db:
        subscription = db.execute(
            select(Subscription).where(
                Subscription.user_id == UUID(user_id),
            )
        ).scalar_one_or_none()

        if not subscription:
            logger.warning(f"No subscription found for user {user_id} during refund")
            return

        subscription.credits_balance += amount

        transaction = CreditTransaction(
            subscription_id=subscription.id,
            user_id=UUID(user_id),
            type=TransactionType.REFUND,
            amount=amount,
            balance_after=subscription.credits_balance,
            operation_type=operation_type,
            job_id=UUID(job_id) if job_id else None,
            description=f"Refund {amount} credits for failed {operation_type}",
        )
        db.add(transaction)
        db.commit()
        logger.info(f"Refunded {amount} credits to user {user_id} for failed {operation_type}")


subscription_service = SubscriptionService()
