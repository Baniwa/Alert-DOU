import io
from unittest.mock import MagicMock, patch

import pytest

from scraper.pdf_extractor import extract_pdf_text


def _make_mock_pdf(pages_text: list[str | None]):
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


def _mock_http_client(content: bytes = b"%PDF fake"):
    mock_response = MagicMock()
    mock_response.content = content
    mock_response.raise_for_status = MagicMock()

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.return_value = mock_response
    return mock_client


class TestExtractPdfText:
    def test_extracts_text_from_pages(self):
        mock_pdf = _make_mock_pdf(["Página 1 conteúdo", "Página 2 conteúdo"])
        mock_client = _mock_http_client()

        with patch("scraper.pdf_extractor.httpx.Client", return_value=mock_client), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text("https://example.com/fake.pdf")

        assert "Página 1 conteúdo" in text
        assert "Página 2 conteúdo" in text
        assert pages == 2

    def test_respects_max_pages(self):
        mock_pdf = _make_mock_pdf(["P1", "P2", "P3", "P4", "P5"])
        mock_client = _mock_http_client()

        with patch("scraper.pdf_extractor.httpx.Client", return_value=mock_client), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text("https://example.com/fake.pdf", max_pages=3)

        assert pages == 3
        assert "P4" not in text

    def test_raises_when_no_text_extracted(self):
        mock_pdf = _make_mock_pdf([None, None])
        mock_client = _mock_http_client()

        with patch("scraper.pdf_extractor.httpx.Client", return_value=mock_client), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            with pytest.raises(RuntimeError, match="No text extracted"):
                extract_pdf_text("https://example.com/fake.pdf")

    def test_skips_empty_pages(self):
        mock_pdf = _make_mock_pdf(["Conteúdo real", "", None, "Mais conteúdo"])
        mock_client = _mock_http_client()

        with patch("scraper.pdf_extractor.httpx.Client", return_value=mock_client), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text("https://example.com/fake.pdf")

        assert "Conteúdo real" in text
        assert "Mais conteúdo" in text

    def test_uses_http2_client(self):
        mock_pdf = _make_mock_pdf(["texto"])
        mock_client = _mock_http_client()

        with patch("scraper.pdf_extractor.httpx.Client", return_value=mock_client) as mock_cls, \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            extract_pdf_text("https://example.com/fake.pdf")

        mock_cls.assert_called_once_with(http2=True, timeout=60)
