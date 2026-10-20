import logging
from datetime import date, datetime, timezone

from sqlalchemy import select

from database import get_session
from database.models import Edition
from scraper.pdf_extractor import extract_pdf_text

logger = logging.getLogger(__name__)

MAX_INDEX_ATTEMPTS = 5


def pending_edition_ids(limit: int) -> list[int]:
    with get_session() as session:
        stmt = (
            select(Edition.id)
            .where(Edition.pdf_url != "")
            .where(Edition.text_indexed_at.is_(None))
            .where(Edition.index_attempts < MAX_INDEX_ATTEMPTS)
            .order_by(Edition.pub_date.desc(), Edition.id)
            .limit(limit)
        )
        return list(session.scalars(stmt))


def index_edition(edition_id: int) -> str:
    """Extract every page of the edition's PDF and store it. Returns the indexed text."""
    with get_session() as session:
        edition = session.get(Edition, edition_id)
        if edition is None:
            raise LookupError(f"Edition {edition_id} not found")
        pdf_url = edition.pdf_url

    try:
        text, pages = extract_pdf_text(pdf_url)
    except Exception:
        with get_session() as session:
            edition = session.get(Edition, edition_id)
            edition.index_attempts += 1
        raise

    with get_session() as session:
        edition = session.get(Edition, edition_id)
        edition.full_text = text
        edition.text_pages = pages
        edition.text_indexed_at = datetime.now(timezone.utc)

    logger.info("index_edition: edition %d indexed (%d pages, %d chars)", edition_id, pages, len(text))
    return text


def refresh_pdf_urls(pub_date: date) -> None:
    from scraper.fetcher import fetch_dou_today, save_editions

    editions = fetch_dou_today(since=pub_date)
    if editions:
        save_editions(editions)


def index_pending(limit: int = 10, max_refreshes: int = 3) -> dict:
    """Index editions that have no full text yet. Signed PDF links expire, so a failed
    edition gets one retry after its date is scraped again for fresh links."""
    indexed, failed = 0, []
    for edition_id in pending_edition_ids(limit):
        try:
            index_edition(edition_id)
            indexed += 1
        except Exception as exc:
            logger.warning("index_pending: edition %d failed: %s", edition_id, exc)
            failed.append(edition_id)

    if failed:
        with get_session() as session:
            dates = sorted(
                {d for d in session.scalars(select(Edition.pub_date).where(Edition.id.in_(failed)))},
                reverse=True,
            )[:max_refreshes]
            retry_ids = list(session.scalars(select(Edition.id).where(Edition.id.in_(failed), Edition.pub_date.in_(dates))))

        for pub_date in dates:
            try:
                refresh_pdf_urls(pub_date)
            except Exception as exc:
                logger.warning("index_pending: could not refresh links for %s: %s", pub_date, exc)

        for edition_id in retry_ids:
            try:
                index_edition(edition_id)
                indexed += 1
                failed.remove(edition_id)
            except Exception as exc:
                logger.warning("index_pending: edition %d failed after refresh: %s", edition_id, exc)

    logger.info("index_pending: %d indexed, %d failed", indexed, len(failed))
    return {"indexed": indexed, "failed": failed}
