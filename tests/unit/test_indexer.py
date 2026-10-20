from contextlib import contextmanager
from datetime import date
from unittest.mock import MagicMock, patch

from scraper import indexer


def _session_returning(dates, retry_ids):
    session = MagicMock()
    session.scalars.side_effect = [dates, retry_ids]

    @contextmanager
    def _cm():
        yield session

    return _cm


def test_indexes_every_pending_edition():
    with patch.object(indexer, "pending_edition_ids", return_value=[1, 2]), \
         patch.object(indexer, "index_edition") as index:
        result = indexer.index_pending()

    assert result == {"indexed": 2, "failed": []}
    assert index.call_count == 2


def test_refreshes_links_and_retries_failed_edition_once():
    attempts = {"n": 0}

    def flaky(edition_id):
        attempts["n"] += 1
        if attempts["n"] == 1:
            raise RuntimeError("signed URL expired")
        return "texto"

    with patch.object(indexer, "pending_edition_ids", return_value=[7]), \
         patch.object(indexer, "index_edition", side_effect=flaky), \
         patch.object(indexer, "get_session", _session_returning([date(2026, 10, 1)], [7])), \
         patch.object(indexer, "refresh_pdf_urls") as refresh:
        result = indexer.index_pending()

    refresh.assert_called_once_with(date(2026, 10, 1))
    assert result == {"indexed": 1, "failed": []}


def test_keeps_failure_when_refresh_does_not_help():
    with patch.object(indexer, "pending_edition_ids", return_value=[7]), \
         patch.object(indexer, "index_edition", side_effect=RuntimeError("no PDF")), \
         patch.object(indexer, "get_session", _session_returning([date(2026, 10, 1)], [7])), \
         patch.object(indexer, "refresh_pdf_urls"):
        result = indexer.index_pending()

    assert result == {"indexed": 0, "failed": [7]}
