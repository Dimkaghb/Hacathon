"""Evolve character to user-level library + wardrobe presets

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, table, column):
    return conn.execute(sa.text(
        f"SELECT EXISTS (SELECT 1 FROM information_schema.columns "
        f"WHERE table_name = '{table}' AND column_name = '{column}')"
    )).scalar()


def _constraint_exists(conn, constraint_name):
    return conn.execute(sa.text(
        f"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints "
        f"WHERE constraint_name = '{constraint_name}')"
    )).scalar()


def _index_exists(conn, index_name):
    return conn.execute(sa.text(
        f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{index_name}')"
    )).scalar()


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add new columns to characters table (idempotent)
    new_columns = {
        'user_id': sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        'source_images': sa.Column('source_images', sa.JSON(), server_default='[]'),
        'prompt_dna': sa.Column('prompt_dna', sa.Text(), nullable=True),
        'voice_profile': sa.Column('voice_profile', sa.JSON(), server_default='{}'),
        'performance_style': sa.Column('performance_style', sa.JSON(), server_default='{}'),
        'metadata': sa.Column('metadata', sa.JSON(), server_default='{}'),
    }
    for col_name, col in new_columns.items():
        if not _column_exists(conn, 'characters', col_name):
            op.add_column('characters', col)

    # 2. Migrate existing characters: set user_id from project.user_id
    op.execute("""
        UPDATE characters
        SET user_id = projects.user_id
        FROM projects
        WHERE characters.project_id = projects.id
          AND characters.user_id IS NULL
    """)

    # 3. Also populate source_images from source_image_url for existing rows
    op.execute("""
        UPDATE characters
        SET source_images = json_build_array(
            json_build_object('url', source_image_url, 'angle', 'front', 'is_primary', true)
        )
        WHERE source_image_url IS NOT NULL AND source_images::text = '[]'
    """)

    # 4. Make user_id NOT NULL now that all rows have been migrated
    op.alter_column('characters', 'user_id', nullable=False)

    # 5. Add FK constraint and index for user_id
    if not _constraint_exists(conn, 'fk_characters_user_id'):
        op.create_foreign_key('fk_characters_user_id', 'characters', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    if not _index_exists(conn, 'ix_characters_user_id'):
        op.create_index('ix_characters_user_id', 'characters', ['user_id'])

    # 6. Make project_id nullable (no longer required)
    op.alter_column('characters', 'project_id', nullable=True)

    # 7. Make source_image_url nullable (replaced by source_images)
    op.alter_column('characters', 'source_image_url', nullable=True)

    # 8. Change project_id FK ondelete from CASCADE to SET NULL
    if _constraint_exists(conn, 'characters_project_id_fkey'):
        op.drop_constraint('characters_project_id_fkey', 'characters', type_='foreignkey')
    if not _constraint_exists(conn, 'characters_project_id_fkey'):
        op.create_foreign_key('characters_project_id_fkey', 'characters', 'projects', ['project_id'], ['id'], ondelete='SET NULL')

    # 9. Create wardrobe_presets table (if not exists, for idempotency)
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wardrobe_presets')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'wardrobe_presets',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('character_id', UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('reference_images', sa.JSON(), server_default='[]'),
            sa.Column('clothing_details', sa.JSON(), server_default='{}'),
            sa.Column('prompt_snippet', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    # Create index only if it doesn't exist
    if not _index_exists(conn, 'ix_wardrobe_presets_character_id'):
        op.create_index('ix_wardrobe_presets_character_id', 'wardrobe_presets', ['character_id'])


def downgrade() -> None:
    op.drop_index('ix_wardrobe_presets_character_id', table_name='wardrobe_presets')
    op.drop_table('wardrobe_presets')

    op.drop_constraint('characters_project_id_fkey', 'characters', type_='foreignkey')
    op.create_foreign_key('characters_project_id_fkey', 'characters', 'projects', ['project_id'], ['id'], ondelete='CASCADE')

    op.alter_column('characters', 'source_image_url', nullable=False)
    op.alter_column('characters', 'project_id', nullable=False)

    op.drop_index('ix_characters_user_id', table_name='characters')
    op.drop_constraint('fk_characters_user_id', 'characters', type_='foreignkey')

    op.drop_column('characters', 'metadata')
    op.drop_column('characters', 'performance_style')
    op.drop_column('characters', 'voice_profile')
    op.drop_column('characters', 'prompt_dna')
    op.drop_column('characters', 'source_images')
    op.drop_column('characters', 'user_id')
