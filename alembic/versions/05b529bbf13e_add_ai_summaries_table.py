"""add ai_summaries table

Revision ID: 05b529bbf13e
Revises:
Create Date: 2026-05-29 11:00:09.475179

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "05b529bbf13e"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_summaries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("edition_id", sa.Integer(), sa.ForeignKey("editions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("model", sa.String(60), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("pages_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_summaries_edition_id", "ai_summaries", ["edition_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_summaries_edition_id", "ai_summaries")
    op.drop_table("ai_summaries")
