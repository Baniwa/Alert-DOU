"""add summary_en column to ai_summaries

Revision ID: 1918f3a228cf
Revises: 05b529bbf13e
Create Date: 2026-06-09

Adds nullable TEXT column `summary_en` to cache English translations.
Translated once via Gemini on first request, then served from DB.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "1918f3a228cf"
down_revision: Union[str, Sequence[str], None] = "05b529bbf13e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ai_summaries", sa.Column("summary_en", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("ai_summaries", "summary_en")
