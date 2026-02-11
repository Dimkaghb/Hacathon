"""Add scene_definitions table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if table already exists (idempotent)
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scene_definitions')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'scene_definitions',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('category', sa.String(50), nullable=False),
            sa.Column('subcategory', sa.String(100), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('thumbnail_url', sa.Text(), nullable=True),
            sa.Column('prompt_template', sa.Text(), nullable=False),
            sa.Column('default_script', sa.Text(), nullable=True),
            sa.Column('setting', sa.JSON(), server_default='{}'),
            sa.Column('duration', sa.Integer(), server_default='5'),
            sa.Column('tone', sa.String(100), nullable=True),
            sa.Column('is_system', sa.Boolean(), server_default='false'),
            sa.Column('creator_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('usage_count', sa.Integer(), server_default='0'),
            sa.Column('sort_order', sa.Integer(), server_default='0'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    # Create indexes (idempotent)
    def _index_exists(index_name):
        return conn.execute(sa.text(
            f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{index_name}')"
        )).scalar()

    if not _index_exists('ix_scene_definitions_category'):
        op.create_index('ix_scene_definitions_category', 'scene_definitions', ['category'])

    if not _index_exists('ix_scene_definitions_is_system'):
        op.create_index('ix_scene_definitions_is_system', 'scene_definitions', ['is_system'])


def downgrade() -> None:
    op.drop_index('ix_scene_definitions_is_system', table_name='scene_definitions')
    op.drop_index('ix_scene_definitions_category', table_name='scene_definitions')
    op.drop_table('scene_definitions')
