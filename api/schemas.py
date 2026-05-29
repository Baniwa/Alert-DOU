from datetime import date, datetime
from pydantic import BaseModel


class EditionOut(BaseModel):
    id: int
    title: str
    edition_number: str
    pub_date: date
    page_count: int
    pdf_url: str
    scraped_at: datetime

    model_config = {"from_attributes": True}


class SummaryOut(BaseModel):
    id: int
    edition_id: int
    edition_number: str | None = None
    edition_title: str | None = None
    model: str
    summary: str
    pages_read: int
    created_at: datetime

    model_config = {"from_attributes": True}
