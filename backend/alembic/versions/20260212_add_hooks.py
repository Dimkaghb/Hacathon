"""Add hooks table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-02-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if table already exists (idempotent)
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hooks')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'hooks',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('category', sa.String(50), nullable=False),
            sa.Column('template_text', sa.Text(), nullable=False),
            sa.Column('example_filled', sa.Text(), nullable=True),
            sa.Column('variables', sa.JSON(), server_default='[]'),
            sa.Column('performance_score', sa.Float(), server_default='0.0'),
            sa.Column('usage_count', sa.Integer(), server_default='0'),
            sa.Column('is_system', sa.Boolean(), server_default='false'),
            sa.Column('creator_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    # Create indexes (idempotent)
    def _index_exists(index_name):
        return conn.execute(sa.text(
            f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{index_name}')"
        )).scalar()

    if not _index_exists('ix_hooks_category'):
        op.create_index('ix_hooks_category', 'hooks', ['category'])

    if not _index_exists('ix_hooks_is_system'):
        op.create_index('ix_hooks_is_system', 'hooks', ['is_system'])


def downgrade() -> None:
    op.drop_index('ix_hooks_is_system', table_name='hooks')
    op.drop_index('ix_hooks_category', table_name='hooks')
    op.drop_table('hooks')
