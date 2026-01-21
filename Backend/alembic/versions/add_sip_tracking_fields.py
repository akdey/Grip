"""Add SIP tracking fields to investment_snapshots

Revision ID: add_sip_tracking_fields
Revises: 
Create Date: 2026-01-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_sip_tracking_fields'
down_revision = None  # Update this with your latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to investment_snapshots table
    op.add_column('investment_snapshots', sa.Column('is_sip', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('investment_snapshots', sa.Column('sip_amount', sa.Float(), nullable=True))
    op.add_column('investment_snapshots', sa.Column('is_step_up', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('investment_snapshots', sa.Column('is_skip', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('investment_snapshots', sa.Column('skip_reason', sa.String(), nullable=True))
    op.add_column('investment_snapshots', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade():
    # Remove columns
    op.drop_column('investment_snapshots', 'metadata')
    op.drop_column('investment_snapshots', 'skip_reason')
    op.drop_column('investment_snapshots', 'is_skip')
    op.drop_column('investment_snapshots', 'is_step_up')
    op.drop_column('investment_snapshots', 'sip_amount')
    op.drop_column('investment_snapshots', 'is_sip')
