"""Add templates table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if table already exists (idempotent)
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'templates',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('category', sa.String(100), nullable=False),
            sa.Column('is_system', sa.Boolean(), server_default='false'),
            sa.Column('creator_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('thumbnail_url', sa.String(2048), nullable=True),
            sa.Column('scene_count', sa.Integer(), server_default='0'),
            sa.Column('estimated_duration', sa.String(50), nullable=True),
            sa.Column('best_for', sa.JSON(), server_default='[]'),
            sa.Column('graph_definition', sa.JSON(), nullable=False),
            sa.Column('usage_count', sa.Integer(), server_default='0'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    # Create indexes (idempotent)
    def _index_exists(index_name):
        return conn.execute(sa.text(
            f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{index_name}')"
        )).scalar()

    if not _index_exists('ix_templates_category'):
        op.create_index('ix_templates_category', 'templates', ['category'])

    if not _index_exists('ix_templates_is_system'):
        op.create_index('ix_templates_is_system', 'templates', ['is_system'])


def downgrade() -> None:
    op.drop_index('ix_templates_is_system', table_name='templates')
    op.drop_index('ix_templates_category', table_name='templates')
    op.drop_table('templates')
