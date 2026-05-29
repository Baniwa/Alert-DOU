import io
import logging

import httpx
import pdfplumber

logger = logging.getLogger(__name__)

_MAX_PAGES = 8
_REQUEST_TIMEOUT = 60
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


def _download_pdf(pdf_url: str) -> bytes:
    """Download PDF using HTTP/2 to match the DOU server's WAF requirements."""
    with httpx.Client(http2=True, timeout=_REQUEST_TIMEOUT) as client:
        response = client.get(pdf_url, headers=_HEADERS, follow_redirects=True)
        response.raise_for_status()

    logger.info("Downloaded %d bytes (%s)", len(response.content), pdf_url[:80])
    return response.content


def extract_pdf_text(pdf_url: str, max_pages: int = _MAX_PAGES) -> tuple[str, int]:
    """Download a DOU edition PDF and extract text from the first N pages.

    Returns (extracted_text, pages_read).
    Raises httpx.HTTPStatusError on download failure or RuntimeError if no
    text could be extracted.
    """
    pdf_bytes = _download_pdf(pdf_url)

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        total = len(pdf.pages)
        limit = min(max_pages, total)
        parts: list[str] = []
        for page in pdf.pages[:limit]:
            text = page.extract_text()
            if text:
                parts.append(text.strip())

    if not parts:
        raise RuntimeError(f"No text extracted from PDF (pages read: {limit})")

    logger.info("Extracted %d/%d pages", limit, total)
    return "\n\n".join(parts), limit
