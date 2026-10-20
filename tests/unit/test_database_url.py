import pytest

from database.session import database_url


@pytest.mark.parametrize("raw, expected", [
    ("postgresql://u:p@db:5432/x", "postgresql+psycopg2://u:p@db:5432/x"),
    ("postgres://u:p@db:5432/x", "postgresql+psycopg2://u:p@db:5432/x"),
    ("postgresql+psycopg2://u:p@db/x", "postgresql+psycopg2://u:p@db/x"),
])
def test_driver_is_explicit(monkeypatch, raw, expected):
    monkeypatch.setenv("DATABASE_URL", raw)
    assert database_url() == expected
