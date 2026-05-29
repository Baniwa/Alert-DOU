import io
from unittest.mock import MagicMock, patch

import pytest

from scraper.pdf_extractor import extract_pdf_text


def _make_mock_pdf(pages_text: list[str]):
    mock_pages = []
    for text in pages_text:
        page = MagicMock()
        page.extract_text.return_value = text
        mock_pages.append(page)

    mock_pdf = MagicMock()
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    mock_pdf.pages = mock_pages
    return mock_pdf


class TestExtractPdfText:
    def test_extracts_text_from_pages(self):
        mock_pdf = _make_mock_pdf(["Página 1 conteúdo", "Página 2 conteúdo"])

        with patch("scraper.pdf_extractor.httpx.get") as mock_get, \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            mock_get.return_value = MagicMock(content=b"fake-pdf", raise_for_status=MagicMock())
            text, pages = extract_pdf_text("https://example.com/fake.pdf")

        assert "Página 1 conteúdo" in text
        assert "Página 2 conteúdo" in text
        assert pages == 2

    def test_respects_max_pages(self):
        mock_pdf = _make_mock_pdf(["P1", "P2", "P3", "P4", "P5"])

        with patch("scraper.pdf_extractor.httpx.get") as mock_get, \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            mock_get.return_value = MagicMock(content=b"fake-pdf", raise_for_status=MagicMock())
            text, pages = extract_pdf_text("https://example.com/fake.pdf", max_pages=3)

        assert pages == 3
        assert "P4" not in text

    def test_raises_when_no_text_extracted(self):
        mock_pdf = _make_mock_pdf([None, None])

        with patch("scraper.pdf_extractor.httpx.get") as mock_get, \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            mock_get.return_value = MagicMock(content=b"fake-pdf", raise_for_status=MagicMock())
            with pytest.raises(RuntimeError, match="No text extracted"):
                extract_pdf_text("https://example.com/fake.pdf")

    def test_skips_empty_pages(self):
        mock_pdf = _make_mock_pdf(["Conteúdo real", "", None, "Mais conteúdo"])

        with patch("scraper.pdf_extractor.httpx.get") as mock_get, \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            mock_get.return_value = MagicMock(content=b"fake-pdf", raise_for_status=MagicMock())
            text, pages = extract_pdf_text("https://example.com/fake.pdf")

        assert "Conteúdo real" in text
        assert "Mais conteúdo" in text
