"""Add community template fields (is_published, published_at, remix_count, rating)

Revision ID: i4d5e6f7g8h9
Revises: h3c4d5e6f7g8
Create Date: 2026-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'i4d5e6f7g8h9'
down_revision: Union[str, None] = 'h3c4d5e6f7g8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    def _column_exists(table, column):
        return conn.execute(sa.text(
            f"SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            f"WHERE table_name = '{table}' AND column_name = '{column}')"
        )).scalar()

    if not _column_exists('templates', 'is_published'):
        op.add_column('templates', sa.Column('is_published', sa.Boolean(), server_default='false'))

    if not _column_exists('templates', 'published_at'):
        op.add_column('templates', sa.Column('published_at', sa.DateTime(), nullable=True))

    if not _column_exists('templates', 'remix_count'):
        op.add_column('templates', sa.Column('remix_count', sa.Integer(), server_default='0'))

    if not _column_exists('templates', 'rating'):
        op.add_column('templates', sa.Column('rating', sa.Float(), server_default='0.0'))

    if not _column_exists('templates', 'rating_count'):
        op.add_column('templates', sa.Column('rating_count', sa.Integer(), server_default='0'))

    def _index_exists(index_name):
        return conn.execute(sa.text(
            f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{index_name}')"
        )).scalar()

    if not _index_exists('ix_templates_is_published'):
        op.create_index('ix_templates_is_published', 'templates', ['is_published'])


def downgrade() -> None:
    op.drop_index('ix_templates_is_published', table_name='templates')
    op.drop_column('templates', 'rating_count')
    op.drop_column('templates', 'rating')
    op.drop_column('templates', 'remix_count')
    op.drop_column('templates', 'published_at')
    op.drop_column('templates', 'is_published')
