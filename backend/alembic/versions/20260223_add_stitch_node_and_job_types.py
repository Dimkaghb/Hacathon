"""Add stitch node type and video_stitch job type

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # SQLAlchemy sends enum member NAMES (uppercase) by default — must match
    conn.execute(sa.text(
        "ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'STITCH'"
    ))

    conn.execute(sa.text(
        "ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'VIDEO_STITCH'"
    ))


def downgrade() -> None:
    # PostgreSQL does not support removing enum values cleanly.
    # A full enum recreation would be needed in production.
    pass
