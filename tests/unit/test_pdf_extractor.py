import io
from unittest.mock import MagicMock, patch, call

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


def _mock_curl_session(content: bytes = b"%PDF fake", status_code: int = 200):
    """Returns a mock curl_cffi Session context manager."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.content = content

    mock_session = MagicMock()
    mock_session.__enter__ = MagicMock(return_value=mock_session)
    mock_session.__exit__ = MagicMock(return_value=False)
    mock_session.get.return_value = mock_response
    return mock_session


class TestExtractPdfText:
    def test_extracts_text_from_pages(self):
        mock_pdf = _make_mock_pdf(["Página 1 conteúdo", "Página 2 conteúdo"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text("https://example.com/fake.pdf")

        assert "Página 1 conteúdo" in text
        assert "Página 2 conteúdo" in text
        assert pages == 2

    def test_respects_max_pages(self):
        mock_pdf = _make_mock_pdf(["P1", "P2", "P3", "P4", "P5"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text("https://example.com/fake.pdf", max_pages=3)

        assert pages == 3
        assert "P4" not in text

    def test_raises_when_no_text_extracted(self):
        mock_pdf = _make_mock_pdf([None, None])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            with pytest.raises(RuntimeError, match="No text extracted"):
                extract_pdf_text("https://example.com/fake.pdf")

    def test_skips_empty_pages(self):
        mock_pdf = _make_mock_pdf(["Conteúdo real", "", None, "Mais conteúdo"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text("https://example.com/fake.pdf")

        assert "Conteúdo real" in text
        assert "Mais conteúdo" in text

    def test_raises_on_non_200_status(self):
        mock_pdf = _make_mock_pdf(["texto"])
        mock_session = _mock_curl_session(status_code=403)

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            with pytest.raises(RuntimeError, match="Failed to download PDF"):
                extract_pdf_text("https://example.com/fake.pdf")

    def test_uses_chrome_impersonation(self):
        mock_pdf = _make_mock_pdf(["texto"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session) as mock_cls, \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            extract_pdf_text("https://example.com/fake.pdf")

        mock_cls.assert_called_once_with(impersonate="chrome", timeout=60)
