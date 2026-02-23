"""Add campaigns table and junction tables

Revision ID: h3c4d5e6f7g8
Revises: g2b3c4d5e6f7
Create Date: 2026-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'h3c4d5e6f7g8'
down_revision: Union[str, None] = 'g2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Create campaigns table (idempotent)
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'campaigns',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('status', sa.String(50), nullable=False, server_default='draft'),
            sa.Column('metadata', sa.JSON(), server_default='{}'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    def _index_exists(index_name):
        return conn.execute(sa.text(
            f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{index_name}')"
        )).scalar()

    if not _index_exists('ix_campaigns_user_id'):
        op.create_index('ix_campaigns_user_id', 'campaigns', ['user_id'])

    if not _index_exists('ix_campaigns_status'):
        op.create_index('ix_campaigns_status', 'campaigns', ['status'])

    # Create campaign_projects junction table (idempotent)
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_projects')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'campaign_projects',
            sa.Column('campaign_id', UUID(as_uuid=True), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('added_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    # Create campaign_characters junction table (idempotent)
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_characters')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'campaign_characters',
            sa.Column('campaign_id', UUID(as_uuid=True), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('character_id', UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('added_at', sa.DateTime(), server_default=sa.text('now()')),
        )


def downgrade() -> None:
    op.drop_table('campaign_characters')
    op.drop_table('campaign_projects')
    op.drop_index('ix_campaigns_status', table_name='campaigns')
    op.drop_index('ix_campaigns_user_id', table_name='campaigns')
    op.drop_table('campaigns')
