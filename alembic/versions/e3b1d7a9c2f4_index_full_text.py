"""index the full text of every edition, one row per page

Adds indexing state to editions and an edition_pages table with a trigram index for
accent-insensitive substring search. Pages instead of one text per edition: a 250-page
edition contains nearly every trigram, which made an edition-level index useless.

f_unaccent wraps unaccent as IMMUTABLE so it can be used in an index expression. unaccent is
created here as well: the earlier migration that should have created it was stamped without running.

editions.full_text is dropped. It held at most 8 pages per edition and is rebuilt by the indexer.

Revision ID: e3b1d7a9c2f4
Revises: c7e2a1f04d83
Create Date: 2026-10-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3b1d7a9c2f4"
down_revision: Union[str, Sequence[str], None] = "c7e2a1f04d83"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$
        """
    )

    op.add_column("editions", sa.Column("text_pages", sa.Integer(), nullable=True))
    op.add_column("editions", sa.Column("text_indexed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("editions", sa.Column("index_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.drop_column("editions", "full_text")

    op.create_table(
        "edition_pages",
        sa.Column("edition_id", sa.Integer(), sa.ForeignKey("editions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("page_number", sa.Integer(), primary_key=True),
        sa.Column("text", sa.Text(), nullable=False),
    )
    op.execute(
        "CREATE INDEX ix_edition_pages_text_trgm ON edition_pages "
        "USING gin (f_unaccent(lower(text)) gin_trgm_ops)"
    )


def downgrade() -> None:
    op.drop_table("edition_pages")
    op.add_column("editions", sa.Column("full_text", sa.Text(), nullable=True))
    op.drop_column("editions", "index_attempts")
    op.drop_column("editions", "text_indexed_at")
    op.drop_column("editions", "text_pages")
    op.execute("DROP FUNCTION IF EXISTS f_unaccent(text)")
