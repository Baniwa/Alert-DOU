from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest


def _ctx(session):
    @contextmanager
    def _cm():
        yield session
    return _cm


def _mock_select():
    q = MagicMock()
    q.where.return_value = q
    return MagicMock(return_value=q)


def _make_stubs():
    ai_stub = MagicMock()
    ai_stub.GeminiClient = MagicMock
    ai_stub._detect_section = MagicMock(return_value="secao1")

    pdf_stub = MagicMock()
    pdf_stub.extract_pdf_text = MagicMock(return_value=("texto", 3))

    ai_pkg_stub = MagicMock()

    return {
        "ai": ai_pkg_stub,
        "ai.client": ai_stub,
        "scraper.pdf_extractor": pdf_stub,
    }, ai_stub, pdf_stub


@pytest.fixture(autouse=True)
def _patch_heavy_modules(monkeypatch):
    stubs, _, _ = _make_stubs()
    with patch.dict("sys.modules", stubs):
        # Ensure workers.tasks is re-imported with the patched modules
        import sys
        sys.modules.pop("workers.tasks", None)
        yield
        sys.modules.pop("workers.tasks", None)


def _current_stubs():
    import sys
    return sys.modules.get("ai.client"), sys.modules.get("scraper.pdf_extractor")


class TestScrapeToday:
    def test_returns_zero_when_no_editions(self):
        with patch("scraper.fetcher.fetch_dou_today", return_value=[]), \
             patch("scraper.fetcher.save_editions") as mock_save:
            from workers.tasks import scrape_today
            result = scrape_today.run()

        mock_save.assert_not_called()
        assert result == {"inserted": 0}

    def test_saves_editions_and_returns_count(self):
        fake = [{"title": "DOU", "edition": "100", "date": "29/05/2026",
                 "pages": "200", "pdf_url": "https://..."}]
        with patch("scraper.fetcher.fetch_dou_today", return_value=fake), \
             patch("scraper.fetcher.save_editions", return_value=3) as mock_save:
            from workers.tasks import scrape_today
            result = scrape_today.run()

        mock_save.assert_called_once_with(fake)
        assert result["inserted"] == 3
        assert result["total_found"] == 1


class TestSummarizeEdition:
    def test_returns_cached_when_summary_exists(self):
        session = MagicMock()
        session.get.return_value = MagicMock(pdf_url="https://...", title="DOU Secao 1")
        session.scalar.return_value = MagicMock()

        with patch("database.get_session", _ctx(session)), \
             patch("sqlalchemy.select", _mock_select()):
            from workers.tasks import summarize_edition
            result = summarize_edition.run(edition_id=1)

        assert result == {"cached": True}

    def test_returns_error_when_edition_not_found(self):
        session = MagicMock()
        session.get.return_value = None

        with patch("database.get_session", _ctx(session)), \
             patch("sqlalchemy.select", _mock_select()):
            from workers.tasks import summarize_edition
            result = summarize_edition.run(edition_id=999)

        assert result == {"error": "edition not found"}

    def test_generates_summary_when_not_cached(self):
        import sys
        ai_stub = sys.modules["ai.client"]
        pdf_stub = sys.modules["scraper.pdf_extractor"]

        session = MagicMock()
        session.get.return_value = MagicMock(pdf_url="https://...", title="DOU Secao 2", id=5)
        session.scalar.return_value = None

        mock_client = MagicMock()
        mock_client.model = "gemini-2.0-flash"
        mock_client.summarize.return_value = "Resumo gerado"

        with patch("database.get_session", _ctx(session)), \
             patch("sqlalchemy.select", _mock_select()), \
             patch.object(pdf_stub, "extract_pdf_text", return_value=("texto pdf", 4)), \
             patch.object(ai_stub, "GeminiClient", return_value=mock_client):
            from workers.tasks import summarize_edition
            result = summarize_edition.run(edition_id=5)

        assert result["edition_id"] == 5
        assert result["pages_read"] == 4
        session.add.assert_called_once()
