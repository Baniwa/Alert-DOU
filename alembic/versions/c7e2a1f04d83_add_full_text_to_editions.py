"""add full_text column to editions and unaccent extension

Revision ID: c7e2a1f04d83
Revises: 1918f3a228cf
Create Date: 2026-06-12

Stores the full extracted PDF text for each edition so the Name Tracker
can search the complete DOU content, not just AI summaries.
unaccent extension enables accent-insensitive search (e.g. "Gusmao" finds "Gusmão").
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c7e2a1f04d83"
down_revision: Union[str, Sequence[str], None] = "1918f3a228cf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.add_column("editions", sa.Column("full_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("editions", "full_text")
