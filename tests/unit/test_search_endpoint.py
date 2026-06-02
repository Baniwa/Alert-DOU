"""Tests for GET /summaries/search — input validation, rate limiting, audit logging."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app, raise_server_exceptions=False)


class TestSearchValidation:
    def test_rejects_missing_query(self):
        r = client.get("/summaries/search")
        assert r.status_code == 422

    def test_rejects_single_char_query(self):
        r = client.get("/summaries/search?q=a")
        assert r.status_code == 422

    def test_rejects_query_over_100_chars(self):
        r = client.get(f"/summaries/search?q={'x' * 101}")
        assert r.status_code == 422

    def test_accepts_valid_name(self):
        with patch("api.routes.get_session") as mock_session_ctx:
            mock_session = MagicMock()
            mock_session.__enter__ = MagicMock(return_value=mock_session)
            mock_session.__exit__ = MagicMock(return_value=False)
            mock_session.scalars.return_value.all.return_value = []
            mock_session_ctx.return_value = mock_session

            r = client.get("/summaries/search?q=João+da+Silva")
        assert r.status_code == 200

    def test_accepts_two_char_minimum(self):
        with patch("api.routes.get_session") as mock_session_ctx:
            mock_session = MagicMock()
            mock_session.__enter__ = MagicMock(return_value=mock_session)
            mock_session.__exit__ = MagicMock(return_value=False)
            mock_session.scalars.return_value.all.return_value = []
            mock_session_ctx.return_value = mock_session

            r = client.get("/summaries/search?q=ab")
        assert r.status_code == 200

    def test_limit_capped_at_50(self):
        with patch("api.routes.get_session") as mock_session_ctx:
            mock_session = MagicMock()
            mock_session.__enter__ = MagicMock(return_value=mock_session)
            mock_session.__exit__ = MagicMock(return_value=False)
            mock_session.scalars.return_value.all.return_value = []
            mock_session_ctx.return_value = mock_session

            r = client.get("/summaries/search?q=test&limit=51")
        assert r.status_code == 422


class TestSearchAuditLog:
    def test_cpf_is_redacted_in_logs(self, caplog):
        import logging
        with patch("api.routes.get_session") as mock_session_ctx:
            mock_session = MagicMock()
            mock_session.__enter__ = MagicMock(return_value=mock_session)
            mock_session.__exit__ = MagicMock(return_value=False)
            mock_session.scalars.return_value.all.return_value = []
            mock_session_ctx.return_value = mock_session

            with caplog.at_level(logging.INFO, logger="api.routes"):
                client.get("/summaries/search?q=123.456.789-09")

        assert "123.456.789-09" not in caplog.text
        assert "[CPF]" in caplog.text
