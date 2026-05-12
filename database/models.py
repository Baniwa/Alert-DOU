from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Edition(Base):
    __tablename__ = "editions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    edition_number: Mapped[str] = mapped_column(String(20))
    pub_date: Mapped[date] = mapped_column(Date, index=True)
    page_count: Mapped[int] = mapped_column(Integer)
    pdf_url: Mapped[str] = mapped_column(String(500), default="")
    scraped_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("edition_number", "pub_date", "title", name="uq_edition_per_day"),
    )

    def __repr__(self) -> str: # debug output
        return f"<Edition {self.title!r} #{self.edition_number} {self.pub_date}>"
