import pytest

import re

from api.routes import _search_term, _word_pattern


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


def _posix_to_python(pattern: str) -> str:
    return pattern.replace("[:alnum:]", "\\w")


@pytest.mark.parametrize("text, term, found", [
    ("presidente do ibama, no uso", "ibama", True),
    ("sao jose do ribamar (ma)", "ibama", False),
    ("cpf ***.453.107-** ana", "***.453.107-**", True),
    ("joana silvana", "ana silva", False),
    ("nomear ana silva para", "ana silva", True),
])
def test_word_pattern_matches_whole_words(text, term, found):
    assert bool(re.search(_posix_to_python(_word_pattern(term)), text)) is found
