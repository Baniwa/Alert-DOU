import logging
from datetime import date as date_type

from workers.celery_app import app

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3, default_retry_delay=300)
def scrape_today(self):
    """Fetch today's DOU editions and persist to the database."""
    try:
        from scraper.fetcher import fetch_dou_today, save_editions

        editions = fetch_dou_today()
        if not editions:
            logger.info("scrape_today: no editions found (holiday or weekend)")
            return {"inserted": 0}

        inserted = save_editions(editions)
        logger.info("scrape_today: inserted %d new editions", inserted)
        return {"inserted": inserted, "total_found": len(editions)}

    except Exception as exc:
        logger.exception("scrape_today failed: %s", exc)
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=2, default_retry_delay=120)
def scrape_date(self, pub_date_str: str):
    """Scrape DOU edition metadata for a specific date — no PDF download, no AI.

    Used by the backfill endpoint to populate the Edition table for historical
    dates without running the full summarization pipeline.
    """
    try:
        from scraper.fetcher import fetch_dou_today, save_editions

        target = date_type.fromisoformat(pub_date_str)
        editions = fetch_dou_today(since=target)
        if not editions:
            logger.info("scrape_date(%s): no editions found (holiday or weekend)", pub_date_str)
            return {"inserted": 0, "date": pub_date_str}

        inserted = save_editions(editions)
        logger.info("scrape_date(%s): inserted %d editions", pub_date_str, inserted)
        return {"inserted": inserted, "date": pub_date_str, "total_found": len(editions)}

    except Exception as exc:
        logger.exception("scrape_date(%s) failed: %s", pub_date_str, exc)
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=2, default_retry_delay=60)
def summarize_edition(self, edition_id: int):
    """Generate and cache an AI summary for the given edition."""
    try:
        from sqlalchemy import select

        from ai.client import GeminiClient, _detect_section
        from database import get_session
        from database.models import AISummary, Edition
        from scraper.pdf_extractor import extract_pdf_text

        with get_session() as session:
            edition = session.get(Edition, edition_id)
            if not edition:
                logger.warning("summarize_edition: edition %d not found", edition_id)
                return {"error": "edition not found"}

            already = session.scalar(
                select(AISummary).where(AISummary.edition_id == edition_id)
            )
            if already:
                logger.info("summarize_edition: cache hit for edition %d", edition_id)
                return {"cached": True}

            pdf_text, pages_read = extract_pdf_text(edition.pdf_url)
            client = GeminiClient()
            section = _detect_section(edition.title)
            summary_text = client.summarize(pdf_text, section)

            summary = AISummary(
                edition_id=edition_id,
                model=client.model,
                summary=summary_text,
                pages_read=pages_read,
            )
            session.add(summary)

        logger.info("summarize_edition: done for edition %d (%d pages)", edition_id, pages_read)
        return {"edition_id": edition_id, "pages_read": pages_read}

    except Exception as exc:
        logger.exception("summarize_edition failed for edition %d: %s", edition_id, exc)
        raise self.retry(exc=exc)
