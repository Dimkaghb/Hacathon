"""Add character, product, setting node types

Revision ID: a1b2c3d4e5f6
Revises: 1f9aa3ed2b2d
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '1f9aa3ed2b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLAlchemy sends enum member NAMES (uppercase) by default
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'CHARACTER'")
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'PRODUCT'")
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'SETTING'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values directly
    pass
