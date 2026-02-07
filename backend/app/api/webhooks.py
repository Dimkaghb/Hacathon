"""Polar.sh webhook handler."""
import logging
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends

from app.core.database import get_db
from app.models.polar_event import PolarWebhookEvent
from app.models.subscription import Subscription
from app.models.user import User
from app.services.polar_service import polar_service
from app.services.subscription_service import subscription_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/polar")
async def handle_polar_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle incoming Polar.sh webhook events.

    This endpoint does NOT require JWT auth — it is authenticated
    by the Polar webhook signature.
    """
    payload = await request.body()
    headers = dict(request.headers)

    # Verify webhook signature
    try:
        event = polar_service.verify_webhook(payload, headers)
    except ValueError as e:
        logger.warning(f"Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_id = event.get("id") or event.get("event_id", "")
    event_type = event.get("type", "")
    data = event.get("data", {})

    logger.info(f"Received Polar webhook: {event_type} (id={event_id})")

    # Idempotency check
    if event_id:
        existing = await db.execute(
            select(PolarWebhookEvent).where(
                PolarWebhookEvent.polar_event_id == event_id
            )
        )
        if existing.scalar_one_or_none():
            logger.info(f"Duplicate webhook event: {event_id}")
            return {"status": "already_processed"}

    # Process event
    try:
        if event_type == "subscription.created":
            await _handle_subscription_created(db, data)
        elif event_type == "subscription.active":
            await _handle_subscription_active(db, data)
        elif event_type == "subscription.canceled":
            await _handle_subscription_canceled(db, data)
        elif event_type == "subscription.revoked":
            await _handle_subscription_revoked(db, data)
        elif event_type == "order.created":
            await _handle_order_created(db, data)
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Webhook processing error")

    # Record processed event for idempotency
    if event_id:
        webhook_event = PolarWebhookEvent(
            polar_event_id=event_id,
            event_type=event_type,
        )
        db.add(webhook_event)
        await db.commit()

    return {"status": "processed"}


async def _handle_subscription_created(db: AsyncSession, data: dict):
    """Handle subscription.created — create/link subscription record."""
    polar_sub_id = data.get("id", "")
    customer = data.get("customer", {})
    polar_customer_id = customer.get("id", "")
    metadata = data.get("metadata", {})
    user_id = metadata.get("user_id")
    product = data.get("product", {})
    polar_product_id = product.get("id", "")

    if not user_id:
        # Try to find user by customer email
        customer_email = customer.get("email")
        if customer_email:
            result = await db.execute(
                select(User).where(User.email == customer_email)
            )
            user = result.scalar_one_or_none()
            if user:
                user_id = str(user.id)

    if not user_id:
        logger.warning(f"Cannot find user for subscription {polar_sub_id}")
        return

    logger.info(f"Subscription created for user {user_id}: {polar_sub_id}")

    # Check if subscription already exists (e.g., from trial)
    from uuid import UUID

    existing = await db.execute(
        select(Subscription).where(Subscription.user_id == UUID(user_id))
    )
    subscription = existing.scalar_one_or_none()

    if subscription:
        subscription.polar_subscription_id = polar_sub_id
        subscription.polar_customer_id = polar_customer_id
        subscription.polar_product_id = polar_product_id
    else:
        # Will be fully activated on subscription.active event
        subscription = Subscription(
            user_id=UUID(user_id),
            polar_subscription_id=polar_sub_id,
            polar_customer_id=polar_customer_id,
            polar_product_id=polar_product_id,
        )
        db.add(subscription)

    await db.commit()


async def _handle_subscription_active(db: AsyncSession, data: dict):
    """Handle subscription.active — activate and allocate credits."""
    polar_sub_id = data.get("id", "")
    metadata = data.get("metadata", {})
    user_id = metadata.get("user_id")
    customer = data.get("customer", {})
    polar_customer_id = customer.get("id", "")
    product = data.get("product", {})
    polar_product_id = product.get("id", "")

    if not user_id:
        # Find by polar_subscription_id
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_sub_id
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            user_id = str(sub.user_id)

    if not user_id:
        customer_email = customer.get("email")
        if customer_email:
            result = await db.execute(
                select(User).where(User.email == customer_email)
            )
            user = result.scalar_one_or_none()
            if user:
                user_id = str(user.id)

    if not user_id:
        logger.warning(f"Cannot find user for active subscription {polar_sub_id}")
        return

    from uuid import UUID

    await subscription_service.activate_subscription(
        db=db,
        user_id=UUID(user_id),
        polar_subscription_id=polar_sub_id,
        polar_customer_id=polar_customer_id,
        polar_product_id=polar_product_id,
    )
    logger.info(f"Subscription activated for user {user_id}")


async def _handle_subscription_canceled(db: AsyncSession, data: dict):
    """Handle subscription.canceled — mark as canceled."""
    polar_sub_id = data.get("id", "")
    await subscription_service.cancel_subscription(db, polar_sub_id)
    logger.info(f"Subscription canceled: {polar_sub_id}")


async def _handle_subscription_revoked(db: AsyncSession, data: dict):
    """Handle subscription.revoked — immediately revoke."""
    polar_sub_id = data.get("id", "")
    await subscription_service.revoke_subscription(db, polar_sub_id)
    logger.info(f"Subscription revoked: {polar_sub_id}")


async def _handle_order_created(db: AsyncSession, data: dict):
    """Handle order.created — check for subscription renewals."""
    billing_reason = data.get("billing_reason", "")
    if billing_reason != "subscription_cycle":
        return

    subscription_data = data.get("subscription", {})
    polar_sub_id = subscription_data.get("id", "")
    order_id = data.get("id", "")

    if not polar_sub_id:
        logger.warning("Order created without subscription ID")
        return

    await subscription_service.handle_renewal(db, polar_sub_id, order_id)
    logger.info(f"Subscription renewed: {polar_sub_id} (order: {order_id})")
