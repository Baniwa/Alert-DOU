import logging
from datetime import date, datetime, timezone

from sqlalchemy import delete, insert, select

from database import get_session
from database.models import Edition, EditionPage
from scraper.pdf_extractor import extract_pdf_pages

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


def index_edition(edition_id: int) -> int:
    """Extract every page of the edition's PDF and store one row per page. Returns the page count."""
    with get_session() as session:
        edition = session.get(Edition, edition_id)
        if edition is None:
            raise LookupError(f"Edition {edition_id} not found")
        pdf_url = edition.pdf_url

    try:
        pages = extract_pdf_pages(pdf_url)
    except Exception:
        with get_session() as session:
            session.get(Edition, edition_id).index_attempts += 1
        raise

    with get_session() as session:
        session.execute(delete(EditionPage).where(EditionPage.edition_id == edition_id))
        session.execute(
            insert(EditionPage),
            [
                {"edition_id": edition_id, "page_number": number, "text": text}
                for number, text in enumerate(pages, start=1)
                if text
            ],
        )
        edition = session.get(Edition, edition_id)
        edition.text_pages = len(pages)
        edition.text_indexed_at = datetime.now(timezone.utc)

    logger.info("index_edition: edition %d indexed (%d pages)", edition_id, len(pages))
    return len(pages)


def edition_text(edition_id: int, max_chars: int) -> str:
    """Indexed text of the edition in page order, stopping once max_chars is reached."""
    parts: list[str] = []
    size = 0
    with get_session() as session:
        rows = session.scalars(
            select(EditionPage.text)
            .where(EditionPage.edition_id == edition_id)
            .order_by(EditionPage.page_number)
            .execution_options(yield_per=20)
        )
        for text in rows:
            parts.append(text)
            size += len(text) + 1
            if size >= max_chars:
                break
    return " ".join(parts)[:max_chars]


def refresh_pdf_urls(pub_date: date) -> None:
    from scraper.fetcher import fetch_dou_today, save_editions

    editions = fetch_dou_today(since=pub_date)
    if editions:
        save_editions(editions)


def index_pending(limit: int = 10, max_refreshes: int = 3) -> dict:
    """Index editions that have no text yet. Signed PDF links expire, so a failed
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
