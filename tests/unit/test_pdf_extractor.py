import io
from unittest.mock import MagicMock, patch

import pytest

from scraper.pdf_extractor import extract_pdf_text, _validate_pdf_url


# ── helpers ───────────────────────────────────────────────────────────────────

DOU_URL = "https://download.in.gov.br/sgpub/do/secao1/2026/2026_06_02/2026_06_02_ASSINADO_do1.pdf"


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
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.content = content

    mock_session = MagicMock()
    mock_session.__enter__ = MagicMock(return_value=mock_session)
    mock_session.__exit__ = MagicMock(return_value=False)
    mock_session.get.return_value = mock_response
    return mock_session


# ── _validate_pdf_url ─────────────────────────────────────────────────────────

class TestValidatePdfUrl:
    @pytest.mark.parametrize("url", [
        "https://www.in.gov.br/pdf",
        "https://in.gov.br/arquivo.pdf",
        "https://pesquisa.in.gov.br/imprensa/core/file.pdf",
        "https://download.in.gov.br/sgpub/do/secao1/file.pdf",
        "http://download.in.gov.br/file.pdf",
    ])
    def test_allows_dou_hosts(self, url: str):
        _validate_pdf_url(url)  # must not raise

    @pytest.mark.parametrize("url", [
        "https://example.com/evil.pdf",
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost:5432/",
        "file:///etc/passwd",
        "ftp://download.in.gov.br/file.pdf",
        "https://evil.in.gov.br.attacker.com/file.pdf",
        "https://notdownload.in.gov.br/file.pdf",
    ])
    def test_blocks_disallowed_hosts(self, url: str):
        with pytest.raises(ValueError):
            _validate_pdf_url(url)


# ── extract_pdf_text ──────────────────────────────────────────────────────────

class TestExtractPdfText:
    def test_extracts_text_from_pages(self):
        mock_pdf = _make_mock_pdf(["Página 1 conteúdo", "Página 2 conteúdo"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text(DOU_URL)

        assert "Página 1 conteúdo" in text
        assert "Página 2 conteúdo" in text
        assert pages == 2

    def test_respects_max_pages(self):
        mock_pdf = _make_mock_pdf(["P1", "P2", "P3", "P4", "P5"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text(DOU_URL, max_pages=3)

        assert pages == 3
        assert "P4" not in text

    def test_raises_when_no_text_extracted(self):
        mock_pdf = _make_mock_pdf([None, None])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            with pytest.raises(RuntimeError, match="No text extracted"):
                extract_pdf_text(DOU_URL)

    def test_skips_empty_pages(self):
        mock_pdf = _make_mock_pdf(["Conteúdo real", "", None, "Mais conteúdo"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session), \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            text, pages = extract_pdf_text(DOU_URL)

        assert "Conteúdo real" in text
        assert "Mais conteúdo" in text

    def test_raises_on_non_200_status(self):
        mock_session = _mock_curl_session(status_code=403)

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session):
            with pytest.raises(RuntimeError, match="Failed to download PDF"):
                extract_pdf_text(DOU_URL)

    def test_raises_on_html_response_instead_of_pdf(self):
        """DOU server returns 200 + HTML when signed URL expires."""
        mock_session = _mock_curl_session(content=b"<html>Expired</html>")

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session):
            with pytest.raises(RuntimeError, match="non-PDF content"):
                extract_pdf_text(DOU_URL)

    def test_raises_on_ssrf_attempt(self):
        with pytest.raises(ValueError):
            extract_pdf_text("http://169.254.169.254/latest/meta-data/")

    def test_uses_chrome_impersonation_and_correct_timeout(self):
        mock_pdf = _make_mock_pdf(["texto"])
        mock_session = _mock_curl_session()

        with patch("scraper.pdf_extractor.requests.Session", return_value=mock_session) as mock_cls, \
             patch("scraper.pdf_extractor.pdfplumber.open", return_value=mock_pdf):
            extract_pdf_text(DOU_URL)

        mock_cls.assert_called_once_with(impersonate="chrome", timeout=180)
