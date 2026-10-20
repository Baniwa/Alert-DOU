"""index the full text of every edition

Adds indexing state to editions and a trigram index for accent-insensitive substring search.
f_unaccent wraps unaccent as IMMUTABLE so it can be used in an index expression.

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
    op.add_column("editions", sa.Column("text_pages", sa.Integer(), nullable=True))
    op.add_column("editions", sa.Column("text_indexed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("editions", sa.Column("index_attempts", sa.Integer(), nullable=False, server_default="0"))

    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$
        """
    )
    op.execute(
        "CREATE INDEX ix_editions_full_text_trgm ON editions "
        "USING gin (f_unaccent(lower(full_text)) gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_editions_full_text_trgm")
    op.execute("DROP FUNCTION IF EXISTS f_unaccent(text)")
    op.drop_column("editions", "index_attempts")
    op.drop_column("editions", "text_indexed_at")
    op.drop_column("editions", "text_pages")
