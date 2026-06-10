import logging
import re
from datetime import date
from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import select
from api.schemas import EditionOut, SummaryOut
from database import Edition, get_session
from database.models import AISummary
from ai.client import GeminiClient, _detect_section
from scraper.pdf_extractor import extract_pdf_text
from api.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/editions", tags=["editions"])
summary_router = APIRouter(prefix="/summaries", tags=["summaries"])

# Regex para detectar CPF (com ou sem formatação) — usado para redação no log de auditoria
_CPF_RE = re.compile(r'\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2}\b')


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

    # Auditoria: redacta CPF antes de logar para não armazenar PII em logs
    log_query = _CPF_RE.sub("[CPF]", query)
    logger.info("summary_search ip=%s q=%r", request.client.host, log_query[:50])

    with get_session() as session:
        stmt = (
            select(AISummary)
            .where(AISummary.summary.ilike(f"%{query}%"))
            .order_by(AISummary.created_at.desc())
            .limit(limit)
        )
        return session.scalars(stmt).all()


@summary_router.get("/", response_model=list[SummaryOut])
@limiter.limit("60/minute")
def list_summaries(request: Request, limit: int = Query(default=100, le=500), offset: int = Query(default=0, ge=0)):
    with get_session() as session:
        stmt = select(AISummary).order_by(AISummary.created_at.desc()).limit(limit).offset(offset)
        return session.scalars(stmt).all()


@router.get("/dates", response_model=list[date])
@limiter.limit("30/minute")
def list_edition_dates(request: Request):
    with get_session() as session:
        stmt = select(Edition.pub_date).distinct().order_by(Edition.pub_date.desc())
        return session.scalars(stmt).all()


@router.get("/", response_model=list[EditionOut])
@limiter.limit("60/minute")
def list_editions(request: Request, pub_date: date | None = Query(default=None), limit: int = Query(default=100, le=500), offset: int = Query(default=0, ge=0)):
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


@router.get("/{edition_id}/summary", response_model=SummaryOut)
@limiter.limit("30/minute")
def get_edition_summary(edition_id: int, request: Request):
    with get_session() as session:
        edition = session.get(Edition, edition_id)
        if not edition:
            raise HTTPException(status_code=404, detail="Edition not found")

        cached = session.scalar(
            select(AISummary).where(AISummary.edition_id == edition_id)
        )
        if cached:
            return cached

        if not edition.pdf_url:
            raise HTTPException(status_code=422, detail="Edition has no PDF URL")

        try:
            pdf_text, pages_read = extract_pdf_text(edition.pdf_url)
        except Exception as exc:
            logger.warning(f"PDF extraction failed for edition {edition_id} (token probably expired): {exc}. Attempting to re-scrape...")
            try:
                # Token expired, let's re-scrape the editions for that specific date to get fresh URLs
                from scraper.fetcher import fetch_dou_today, save_editions
                fresh_editions = fetch_dou_today(since=edition.pub_date)
                if fresh_editions:
                    save_editions(fresh_editions)
                    session.refresh(edition) # Reload to get the fresh pdf_url
                    pdf_text, pages_read = extract_pdf_text(edition.pdf_url)
                else:
                    raise RuntimeError("Re-scrape returned no editions.")
            except Exception as inner_exc:
                logger.error(f"Re-scrape and re-extraction failed for edition {edition_id}: {inner_exc}", exc_info=True)
                raise HTTPException(status_code=502, detail="Falha de conexão com a Imprensa Nacional. O link expirou e não foi possível obter um novo no momento.")

        try:
            client = GeminiClient()
            section = _detect_section(edition.title)
            summary_text = client.summarize(pdf_text, section)
        except EnvironmentError as exc:
            logger.error(f"Environment error: {exc}", exc_info=True)
            raise HTTPException(status_code=503, detail="Service unavailable")
        except Exception as exc:
            logger.error(f"AI summarization failed for edition {edition_id}: {exc}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error during AI summarization")

        summary = AISummary(
            edition_id=edition_id,
            model=client.model,
            summary=summary_text,
            pages_read=pages_read,
        )
        session.add(summary)
        return summary
