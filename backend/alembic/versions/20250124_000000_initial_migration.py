"""Initial migration

Revision ID: 001
Revises:
Create Date: 2025-01-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('canvas_state', postgresql.JSON(), nullable=True, default={}),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_projects_user_id', 'projects', ['user_id'])

    # Create characters table
    op.create_table(
        'characters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('source_image_url', sa.Text(), nullable=False),
        sa.Column('embedding_id', sa.String(255), nullable=True),
        sa.Column('analysis_data', postgresql.JSON(), nullable=True, default={}),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_characters_project_id', 'characters', ['project_id'])

    # Create node type enum
    node_type = postgresql.ENUM('image', 'prompt', 'video', name='nodetype', create_type=False)
    node_type.create(op.get_bind(), checkfirst=True)

    # Create node status enum
    node_status = postgresql.ENUM('idle', 'processing', 'completed', 'failed', name='nodestatus', create_type=False)
    node_status.create(op.get_bind(), checkfirst=True)

    # Create nodes table
    op.create_table(
        'nodes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', node_type, nullable=False),
        sa.Column('position_x', sa.Float(), nullable=True, default=0),
        sa.Column('position_y', sa.Float(), nullable=True, default=0),
        sa.Column('data', postgresql.JSON(), nullable=False, default={}),
        sa.Column('status', node_status, nullable=True, default='idle'),
        sa.Column('error_message', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_nodes_project_id', 'nodes', ['project_id'])

    # Create connections table
    op.create_table(
        'connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_node_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_node_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_handle', sa.String(50), nullable=True),
        sa.Column('target_handle', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_connections_project_id', 'connections', ['project_id'])
    op.create_index('ix_connections_source_node_id', 'connections', ['source_node_id'])
    op.create_index('ix_connections_target_node_id', 'connections', ['target_node_id'])

    # Create job type enum
    job_type = postgresql.ENUM('face_analysis', 'prompt_enhancement', 'video_generation', 'video_extension', name='jobtype', create_type=False)
    job_type.create(op.get_bind(), checkfirst=True)

    # Create job status enum
    job_status = postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='jobstatus', create_type=False)
    job_status.create(op.get_bind(), checkfirst=True)

    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('node_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', job_type, nullable=False),
        sa.Column('status', job_status, nullable=True, default='pending'),
        sa.Column('progress', sa.Integer(), nullable=True, default=0),
        sa.Column('result', postgresql.JSON(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('external_operation_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_jobs_node_id', 'jobs', ['node_id'])
    op.create_index('ix_jobs_status', 'jobs', ['status'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('jobs')
    op.drop_table('connections')
    op.drop_table('nodes')
    op.drop_table('characters')
    op.drop_table('projects')
    op.drop_table('users')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS jobstatus')
    op.execute('DROP TYPE IF EXISTS jobtype')
    op.execute('DROP TYPE IF EXISTS nodestatus')
    op.execute('DROP TYPE IF EXISTS nodetype')
