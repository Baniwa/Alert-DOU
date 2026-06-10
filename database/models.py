from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


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

    def __repr__(self) -> str:
        return f"<Edition {self.title!r} #{self.edition_number} {self.pub_date}>"


class AISummary(Base):
    __tablename__ = "ai_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    edition_id: Mapped[int] = mapped_column(ForeignKey("editions.id", ondelete="CASCADE"), nullable=False, unique=True)
    edition: Mapped["Edition"] = relationship("Edition", lazy="joined")
    model: Mapped[str] = mapped_column(String(60), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    pages_read: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<AISummary edition_id={self.edition_id} model={self.model!r}>"

    @property
    def edition_number(self) -> str | None:
        return self.edition.edition_number if self.edition else None

    @property
    def edition_title(self) -> str | None:
        return self.edition.title if self.edition else None
