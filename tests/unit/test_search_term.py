import pytest

from api.routes import _search_term


@pytest.mark.parametrize("query, expected", [
    ("12345678909", "***.456.789-**"),
    ("123.456.789-09", "***.456.789-**"),
    ("12345678000190", "12.345.678/0001-90"),
    ("12.345.678/0001-90", "12.345.678/0001-90"),
    ("  João   da Silva ", "João da Silva"),
    ("Pregão 90012/2026", "Pregão 90012/2026"),
])
def test_converts_to_the_published_form(query, expected):
    assert _search_term(query) == expected
