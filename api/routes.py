from datetime import date
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from api.schemas import EditionOut
from database import Edition, get_session

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
