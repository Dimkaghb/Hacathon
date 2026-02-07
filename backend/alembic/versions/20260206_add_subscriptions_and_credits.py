"""add_subscriptions_and_credits

Revision ID: 5bb6eb38bb15
Revises: 4aa5da27aa04
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5bb6eb38bb15'
down_revision: Union[str, None] = '4aa5da27aa04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types with conditional existence check (safe for re-runs)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptionstatus') THEN
                CREATE TYPE subscriptionstatus AS ENUM ('trialing', 'active', 'canceled', 'expired', 'revoked');
            END IF;
        END$$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plantype') THEN
                CREATE TYPE plantype AS ENUM ('pro');
            END IF;
        END$$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactiontype') THEN
                CREATE TYPE transactiontype AS ENUM ('allocation', 'trial_allocation', 'deduction', 'refund', 'expiration', 'adjustment');
            END IF;
        END$$;
    """)

    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('polar_subscription_id', sa.String(length=255), nullable=True),
        sa.Column('polar_customer_id', sa.String(length=255), nullable=True),
        sa.Column('polar_product_id', sa.String(length=255), nullable=True),
        sa.Column('plan', sa.Enum('pro', name='plantype', create_type=False), nullable=False),
        sa.Column('status', sa.Enum('trialing', 'active', 'canceled', 'expired', 'revoked', name='subscriptionstatus', create_type=False), nullable=False),
        sa.Column('credits_balance', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('credits_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_trial', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('trial_started_at', sa.DateTime(), nullable=True),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('canceled_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_subscriptions_user_id'), 'subscriptions', ['user_id'], unique=True)
    op.create_index(op.f('ix_subscriptions_polar_subscription_id'), 'subscriptions', ['polar_subscription_id'], unique=True)
    op.create_index(op.f('ix_subscriptions_status'), 'subscriptions', ['status'], unique=False)

    # Create credit_transactions table
    op.create_table(
        'credit_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('subscription_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.Enum('allocation', 'trial_allocation', 'deduction', 'refund', 'expiration', 'adjustment', name='transactiontype', create_type=False), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('balance_after', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('operation_type', sa.String(length=100), nullable=True),
        sa.Column('job_id', sa.UUID(), nullable=True),
        sa.Column('polar_order_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_credit_transactions_subscription_id'), 'credit_transactions', ['subscription_id'], unique=False)
    op.create_index(op.f('ix_credit_transactions_user_id'), 'credit_transactions', ['user_id'], unique=False)

    # Create polar_webhook_events table
    op.create_table(
        'polar_webhook_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('polar_event_id', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_polar_webhook_events_polar_event_id'), 'polar_webhook_events', ['polar_event_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_polar_webhook_events_polar_event_id'), table_name='polar_webhook_events')
    op.drop_table('polar_webhook_events')

    op.drop_index(op.f('ix_credit_transactions_user_id'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_subscription_id'), table_name='credit_transactions')
    op.drop_table('credit_transactions')

    op.drop_index(op.f('ix_subscriptions_status'), table_name='subscriptions')
    op.drop_index(op.f('ix_subscriptions_polar_subscription_id'), table_name='subscriptions')
    op.drop_index(op.f('ix_subscriptions_user_id'), table_name='subscriptions')
    op.drop_table('subscriptions')

    sa.Enum(name='transactiontype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='plantype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='subscriptionstatus').drop(op.get_bind(), checkfirst=True)
