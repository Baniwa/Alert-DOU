import io
import logging

import httpx
import pdfplumber

logger = logging.getLogger(__name__)

_MAX_PAGES = 8
_REQUEST_TIMEOUT = 30


def extract_pdf_text(pdf_url: str, max_pages: int = _MAX_PAGES) -> tuple[str, int]:
    """Download a DOU edition PDF and extract text from the first N pages.

    Returns (extracted_text, pages_read). Raises httpx.HTTPError on download
    failure and RuntimeError if no text could be extracted.
    """
    logger.info("Downloading PDF: %s", pdf_url)
    response = httpx.get(pdf_url, follow_redirects=True, timeout=_REQUEST_TIMEOUT)
    response.raise_for_status()

    with pdfplumber.open(io.BytesIO(response.content)) as pdf:
        total = len(pdf.pages)
        limit = min(max_pages, total)
        parts: list[str] = []
        for page in pdf.pages[:limit]:
            text = page.extract_text()
            if text:
                parts.append(text.strip())

    if not parts:
        raise RuntimeError(f"No text extracted from PDF (pages read: {limit})")

    logger.info("Extracted %d pages from PDF (%d total)", limit, total)
    return "\n\n".join(parts), limit
