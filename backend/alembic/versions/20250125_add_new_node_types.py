"""Add container, ratio, scene node types

Revision ID: 002
Revises: 001
Create Date: 2025-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new values to the nodetype enum
    # Note: ALTER TYPE ADD VALUE cannot run inside a transaction block in PostgreSQL
    # We use commit_option for this
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'container'")
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'ratio'")
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'scene'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum type without these values
    # For simplicity, we'll leave them in place
    pass
