"""Add video_export job type

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'g2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLAlchemy sends enum member NAMES (uppercase) by default — must match
    op.execute("ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'VIDEO_EXPORT'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values cleanly.
    pass
