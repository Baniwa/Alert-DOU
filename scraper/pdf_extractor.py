import logging
import re

from curl_cffi import requests
import pypdfium2 as pdfium

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = 180
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/136.0.0.0 Safari/537.36"
    ),
    "Accept": "application/pdf,*/*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Referer": "https://www.in.gov.br/",
}

_HYPHENATED_LINE_BREAK = re.compile(r"([^\W\d_])-[ \t]*\r?\n\s*([^\W\d_])")
_WHITESPACE = re.compile(r"\s+")


_ALLOWED_HOSTS = {"www.in.gov.br", "in.gov.br", "pesquisa.in.gov.br", "download.in.gov.br"}

def _validate_pdf_url(url: str) -> None:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"PDF URL scheme not allowed: {parsed.scheme!r}")
    if not parsed.hostname or parsed.hostname not in _ALLOWED_HOSTS:
        raise ValueError(f"PDF URL host not allowed: {parsed.hostname!r}")
    if parsed.port is not None:
        raise ValueError(f"Non-standard port not allowed in PDF URL: {parsed.port}")


def _download_pdf(pdf_url: str) -> bytes:
    """Download PDF using curl_cffi to match the DOU server's WAF requirements."""
    _validate_pdf_url(pdf_url)
    with requests.Session(impersonate="chrome", timeout=_REQUEST_TIMEOUT) as client:
        response = client.get(pdf_url, headers=_HEADERS)

    if response.status_code != 200:
        raise RuntimeError(f"Failed to download PDF. HTTP {response.status_code}")

    # DOU server returns HTTP 200 with an HTML expiration page when a signed URL
    # expires. Validate the PDF magic bytes before handing to the parser.
    if not response.content.startswith(b"%PDF"):
        content_type = response.headers.get("content-type", "unknown")
        raise RuntimeError(
            f"Server returned non-PDF content (content-type: {content_type}). "
            "The signed URL has likely expired."
        )

    logger.info("Downloaded %d bytes (%s)", len(response.content), pdf_url[:80])
    return response.content


def normalise_text(raw: str) -> str:
    """Rejoin words split across lines and collapse whitespace, so a name broken by the
    PDF layout ("JOÃO DA\\nSILVA", "SIL-\\nVA") still matches a plain search."""
    return _WHITESPACE.sub(" ", _HYPHENATED_LINE_BREAK.sub(r"\1\2", raw)).strip()


def extract_pdf_pages(pdf_url: str, max_pages: int | None = None) -> list[str]:
    """Download the PDF and return the normalised text of each page, in order. Reads every page by default."""
    pdf_bytes = _download_pdf(pdf_url)

    document = pdfium.PdfDocument(pdf_bytes)
    try:
        total = len(document)
        limit = total if max_pages is None else min(max_pages, total)
        pages: list[str] = []
        for index in range(limit):
            page = document[index]
            textpage = page.get_textpage()
            try:
                text = textpage.get_text_bounded()
            finally:
                textpage.close()
                page.close()
            pages.append(normalise_text(text or ""))
    finally:
        document.close()

    if not any(pages):
        raise RuntimeError(f"No text extracted from PDF (pages read: {limit})")

    logger.info("Extracted %d/%d pages", limit, total)
    return pages
