from datetime import date
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from api.schemas import EditionOut, SummaryOut
from database import Edition, get_session
from database.models import AISummary
from ai.client import GeminiClient, _detect_section
from scraper.pdf_extractor import extract_pdf_text

router = APIRouter(prefix="/editions", tags=["editions"])


@router.get("/", response_model=list[EditionOut])
def list_editions(pub_date: date | None = Query(default=None)):
    with get_session() as session:
        stmt = select(Edition).order_by(Edition.pub_date.desc())
        if pub_date:
            stmt = stmt.where(Edition.pub_date == pub_date)
        return session.scalars(stmt).all()


@router.get("/{edition_id}", response_model=EditionOut)
def get_edition(edition_id: int):
    with get_session() as session:
        edition = session.get(Edition, edition_id)
        if not edition:
            raise HTTPException(status_code=404, detail="Edition not found")
        return edition


@router.get("/{edition_id}/summary", response_model=SummaryOut)
def get_edition_summary(edition_id: int):
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
            raise HTTPException(status_code=502, detail=f"PDF extraction failed: {exc}") from exc

        try:
            client = GeminiClient()
            section = _detect_section(edition.title)
            summary_text = client.summarize(pdf_text, section)
        except EnvironmentError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"AI summarization failed: {exc}") from exc

        summary = AISummary(
            edition_id=edition_id,
            model=GeminiClient().model,
            summary=summary_text,
            pages_read=pages_read,
        )
        session.add(summary)
        return summary
