import logging
import re
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from api.schemas import EditionOut, EditionSearchResult, SummaryOut
from database import Edition, get_session
from database.models import AISummary
from ai.client import GeminiClient, _detect_section
from scraper.indexer import index_edition, refresh_pdf_urls
from api.limiter import limiter

BACKFILL_MIN_DATE = date(2026, 1, 1)
BACKFILL_MAX_DAYS = 90

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/editions", tags=["editions"])
summary_router = APIRouter(prefix="/summaries", tags=["summaries"])

# Regex para detectar CPF (com ou sem formatação) — usado para redação no log de auditoria
_CPF_RE = re.compile(r'\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b')


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


_SEARCHABLE_TEXT = func.f_unaccent(func.lower(Edition.full_text))
_EXCERPT_BEFORE = 120
_EXCERPT_AFTER = 100


def _search_term(q: str) -> str:
    return " ".join(q.split())


@router.get("/search", response_model=list[EditionSearchResult])
@limiter.limit("20/minute")
def search_editions(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(default=20, le=50, ge=1),
):
    """Busca no texto integral dos PDFs do DOU (sem acento, sem diferenciar maiúsculas).

    Usa o índice trigram de f_unaccent(lower(full_text)); o trecho de contexto é recortado
    no banco para não trafegar o texto inteiro (alguns MB por edição).
    """
    term = _search_term(q)
    log_query = _CPF_RE.sub("[CPF]", term)
    logger.info("edition_search ip=%s q=%r", request.client.host, log_query[:50])

    needle = func.f_unaccent(func.lower(term))
    start = func.greatest(func.strpos(_SEARCHABLE_TEXT, needle) - _EXCERPT_BEFORE, 1)
    stmt = (
        select(
            Edition.id,
            Edition.title,
            Edition.edition_number,
            Edition.pub_date,
            start.label("start"),
            func.substr(Edition.full_text, start, _EXCERPT_BEFORE + len(term) + _EXCERPT_AFTER).label("snippet"),
            func.length(Edition.full_text).label("length"),
        )
        .where(Edition.full_text.isnot(None))
        .where(_SEARCHABLE_TEXT.like(func.f_unaccent(func.lower(f"%{_escape_like(term)}%")), escape="\\"))
        .order_by(Edition.pub_date.desc(), Edition.id.desc())
        .limit(limit)
    )

    with get_session() as session:
        rows = session.execute(stmt).all()

    return [
        EditionSearchResult(
            edition_id=row.id,
            title=row.title,
            edition_number=row.edition_number,
            pub_date=row.pub_date,
            excerpt=("…" if row.start > 1 else "")
            + row.snippet
            + ("…" if row.start + len(row.snippet) <= row.length else ""),
        )
        for row in rows
    ]


@router.get("/coverage")
@limiter.limit("30/minute")
def search_coverage(request: Request):
    """Quantas edições têm texto integral indexado, e de que período — mostrado junto da busca."""
    with get_session() as session:
        indexed, first, last = session.execute(
            select(func.count(Edition.id), func.min(Edition.pub_date), func.max(Edition.pub_date))
            .where(Edition.text_indexed_at.isnot(None))
        ).one()
        total = session.scalar(select(func.count(Edition.id)))
    return {"indexed_editions": indexed, "total_editions": total, "first_date": first, "last_date": last}


@summary_router.get("/search", response_model=list[SummaryOut])
@limiter.limit("20/minute")
def search_summaries(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100, description="Nome ou CPF a buscar nos resumos"),
    limit: int = Query(default=20, le=50, ge=1),
):
    """Busca por texto nos resumos IA gerados.

    Segurança:
    - Parâmetro q limitado a 2–100 chars pelo FastAPI/Pydantic antes de chegar aqui
    - LIKE parametrizado via SQLAlchemy — imune a SQL injection
    - CPF é redactado no log de auditoria (substitui dígitos por [CPF])
    - Rate limit: 20 req/min por IP para dificultar enumeração
    """
    query = q.strip()
    log_query = _CPF_RE.sub("[CPF]", query)
    logger.info("summary_search ip=%s q=%r", request.client.host, log_query[:50])

    with get_session() as session:
        escaped = _escape_like(query)
        stmt = (
            select(AISummary)
            .where(AISummary.summary.ilike(f"%{escaped}%", escape="\\"))
            .order_by(AISummary.created_at.desc())
            .limit(limit)
        )
        return session.scalars(stmt).all()


@summary_router.get("/", response_model=list[SummaryOut])
@limiter.limit("30/minute")
def list_summaries(request: Request, limit: int = Query(default=50, le=200), offset: int = Query(default=0, ge=0, le=50_000)):
    with get_session() as session:
        stmt = select(AISummary).order_by(AISummary.created_at.desc()).limit(limit).offset(offset)
        return session.scalars(stmt).all()


@router.post("/fetch-date", status_code=200)
@limiter.limit("6/minute")
def fetch_single_date(
    request: Request,
    pub_date: date = Query(..., alias="date", description="Date to scrape (YYYY-MM-DD)"),
):
    """Synchronously scrape DOU edition metadata for a single date.

    Runs fetch_dou_today() in-process (Playwright headless, ~10–30 s).
    Call this when a specific date has no Edition records yet.

    Security:
    - pub_date must be a weekday between 2026-01-01 and today
    - Rate limited to 6 req/min to prevent parallel Playwright instances
    - No PDF download, no AI — metadata only
    """
    from scraper.fetcher import fetch_dou_today, save_editions

    today = date.today()
    if pub_date < BACKFILL_MIN_DATE:
        raise HTTPException(status_code=422, detail=f"date cannot be before {BACKFILL_MIN_DATE}")
    if pub_date > today:
        raise HTTPException(status_code=422, detail="date cannot be in the future")
    if pub_date.weekday() >= 5:
        raise HTTPException(status_code=422, detail="date is a weekend — DOU is not published")

    editions_data = fetch_dou_today(since=pub_date)
    if not editions_data:
        return {"editions_found": 0, "message": "No DOU editions found (holiday or scrape failed)"}

    inserted = save_editions(editions_data)
    logger.info("fetch_single_date(%s): found=%d inserted=%d", pub_date, len(editions_data), inserted)
    return {"editions_found": len(editions_data), "inserted": inserted}


@router.post("/backfill", status_code=202)
@limiter.limit("3/hour")
def backfill_dates(
    request: Request,
    from_date: date = Query(default=BACKFILL_MIN_DATE),
    to_date: date | None = Query(default=None),
):
    """Enqueue lightweight metadata scrapes for weekdays missing from the database.

    Each queued task calls fetch_dou_today(since=date) — Playwright headless,
    NO PDF download, NO AI. Tasks are spread 8 s apart to avoid browser contention.

    Security:
    - from_date is capped at 2026-01-01 (no pre-deployment history)
    - Range capped at BACKFILL_MAX_DAYS to prevent runaway queuing
    - Rate limited to 3 calls/hour
    """
    from workers.tasks import scrape_date  # lazy import avoids Playwright at startup

    end = to_date or date.today()

    if from_date < BACKFILL_MIN_DATE:
        raise HTTPException(status_code=422, detail=f"from_date cannot be before {BACKFILL_MIN_DATE}")
    if from_date > end:
        raise HTTPException(status_code=422, detail="from_date must not be after to_date")
    if (end - from_date).days > BACKFILL_MAX_DAYS:
        raise HTTPException(status_code=422, detail=f"Date range cannot exceed {BACKFILL_MAX_DAYS} days")

    with get_session() as session:
        existing: set[str] = {
            d.isoformat()
            for d in session.scalars(
                select(Edition.pub_date).distinct()
                .where(Edition.pub_date >= from_date)
                .where(Edition.pub_date <= end)
            ).all()
        }

    missing: list[date] = []
    current = from_date
    while current <= end:
        if current.weekday() < 5 and current.isoformat() not in existing:
            missing.append(current)
        current += timedelta(days=1)

    # Spread tasks 8 s apart so only one Playwright instance is active at a time.
    for i, d in enumerate(missing):
        scrape_date.apply_async(args=[d.isoformat()], countdown=i * 8)

    logger.info(
        "backfill: enqueued %d tasks from=%s to=%s (already_present=%d)",
        len(missing), from_date, end, len(existing),
    )
    return {
        "enqueued": len(missing),
        "from_date": from_date.isoformat(),
        "to_date": end.isoformat(),
        "already_present": len(existing),
    }


@router.get("/dates", response_model=list[date])
@limiter.limit("30/minute")
def list_edition_dates(request: Request):
    with get_session() as session:
        stmt = select(Edition.pub_date).distinct().order_by(Edition.pub_date.desc())
        return session.scalars(stmt).all()


@router.get("/", response_model=list[EditionOut])
@limiter.limit("30/minute")
def list_editions(request: Request, pub_date: date | None = Query(default=None), limit: int = Query(default=50, le=200), offset: int = Query(default=0, ge=0, le=50_000)):
    with get_session() as session:
        stmt = select(Edition).order_by(Edition.pub_date.desc()).limit(limit).offset(offset)
        if pub_date:
            stmt = stmt.where(Edition.pub_date == pub_date)
        return session.scalars(stmt).all()


@router.get("/{edition_id}", response_model=EditionOut)
@limiter.limit("60/minute")
def get_edition(edition_id: int, request: Request):
    with get_session() as session:
        edition = session.get(Edition, edition_id)
        if not edition:
            raise HTTPException(status_code=404, detail="Edition not found")
        return edition


@router.get("/{edition_id}/summary/en", response_model=SummaryOut)
@limiter.limit("10/minute")
def get_edition_summary_en(edition_id: int, request: Request):
    """English translation of an AI summary — generated once via Gemini, cached in DB.

    Security:
    - Rate limited to 10/min (tighter than PT — each miss costs Gemini tokens)
    - Requires the PT summary to exist first (no orphan translation calls)
    - Translation prompt includes an explicit prompt-injection guard
    - DB cache: subsequent calls return instantly at zero Gemini cost
    """
    with get_session() as session:
        cached = session.scalar(
            select(AISummary).where(AISummary.edition_id == edition_id)
        )
        if not cached:
            raise HTTPException(
                status_code=404,
                detail="No summary found. Generate the Portuguese summary first.",
            )

        if cached.summary_en:
            logger.info("translation_cache_hit", extra={"edition_id": edition_id})
            return cached

        logger.info("translation_cache_miss", extra={"edition_id": edition_id})
        try:
            client = GeminiClient()
            summary_en = client.translate_to_english(cached.summary)
        except EnvironmentError as exc:
            logger.error("translation_env_error", exc_info=exc)
            raise HTTPException(status_code=503, detail="Service unavailable")
        except Exception as exc:
            exc_str = str(exc)
            if "503" in exc_str or "UNAVAILABLE" in exc_str or "high demand" in exc_str:
                logger.warning("translation_gemini_unavailable", extra={"edition_id": edition_id})
                raise HTTPException(status_code=503, detail="Gemini temporarily unavailable — please try again in a moment.")
            logger.error("translation_failed", extra={"edition_id": edition_id}, exc_info=exc)
            raise HTTPException(status_code=500, detail="Internal server error during translation")

        cached.summary_en = summary_en
        session.commit()  # expire_on_commit=False keeps the object + joined edition in memory
        return cached


def _indexed_text(edition_id: int) -> tuple[str, int]:
    with get_session() as session:
        edition = session.get(Edition, edition_id)
        if edition.text_indexed_at:
            return edition.full_text or "", edition.text_pages or 0
        pub_date = edition.pub_date

    try:
        text = index_edition(edition_id)
    except Exception as exc:
        logger.warning(f"PDF extraction failed for edition {edition_id} (link probably expired): {exc}. Refreshing links...")
        try:
            refresh_pdf_urls(pub_date)
            text = index_edition(edition_id)
        except Exception as inner_exc:
            logger.error(f"Re-scrape and re-extraction failed for edition {edition_id}: {inner_exc}", exc_info=True)
            raise HTTPException(status_code=502, detail="Falha de conexão com a Imprensa Nacional. O link expirou e não foi possível obter um novo no momento.")

    with get_session() as session:
        return text, session.get(Edition, edition_id).text_pages or 0


@router.get("/{edition_id}/summary", response_model=SummaryOut)
@limiter.limit("30/minute")
def get_edition_summary(
    edition_id: int,
    request: Request,
    generate: bool = Query(default=True, description="false = só devolve o resumo salvo, sem chamar a IA"),
):
    with get_session() as session:
        edition = session.get(Edition, edition_id)
        if not edition:
            raise HTTPException(status_code=404, detail="Edition not found")

        cached = session.scalar(
            select(AISummary).where(AISummary.edition_id == edition_id)
        )
        if cached:
            return cached

        if not generate:
            raise HTTPException(status_code=404, detail="Summary not generated yet")

        if not edition.pdf_url:
            raise HTTPException(status_code=422, detail="Edition has no PDF URL")

        title = edition.title

    text, pages_read = _indexed_text(edition_id)

    try:
        client = GeminiClient()
        summary_text = client.summarize(text, _detect_section(title))
    except EnvironmentError as exc:
        logger.error(f"Environment error: {exc}", exc_info=True)
        raise HTTPException(status_code=503, detail="Service unavailable")
    except Exception as exc:
        logger.error(f"AI summarization failed for edition {edition_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during AI summarization")

    try:
        with get_session() as session:
            summary = AISummary(
                edition=session.get(Edition, edition_id),
                model=client.model,
                summary=summary_text,
                pages_read=pages_read,
            )
            session.add(summary)
        return summary
    except IntegrityError:
        with get_session() as session:
            return session.scalar(select(AISummary).where(AISummary.edition_id == edition_id))
