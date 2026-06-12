from datetime import date, datetime
from pydantic import BaseModel, computed_field


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
    summary_en: str | None = None
    pages_read: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EditionSearchResult(BaseModel):
    edition_id: int
    title: str
    edition_number: str
    pub_date: date
    excerpt: str

    model_config = {"from_attributes": False}
