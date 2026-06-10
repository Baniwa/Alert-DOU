"""Security regression tests — validates OWASP-relevant controls on the API."""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app, raise_server_exceptions=False)


def _mock_empty_session():
    session = MagicMock()
    session.__enter__ = MagicMock(return_value=session)
    session.__exit__ = MagicMock(return_value=False)
    session.scalars.return_value.all.return_value = []
    session.get.return_value = None
    session.scalar.return_value = None
    return session


# ── Security Headers ──────────────────────────────────────────────────────────

class TestSecurityHeaders:
    """Every response must include the required defensive HTTP headers."""

    def test_x_content_type_options(self):
        assert client.get("/health").headers.get("x-content-type-options") == "nosniff"

    def test_x_frame_options(self):
        assert client.get("/health").headers.get("x-frame-options") == "DENY"

    def test_referrer_policy(self):
        assert client.get("/health").headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    def test_permissions_policy_present(self):
        assert "camera=()" in client.get("/health").headers.get("permissions-policy", "")

    def test_coop_header(self):
        assert client.get("/health").headers.get("cross-origin-opener-policy") == "same-origin"

    def test_request_id_is_8_hex_chars(self):
        rid = client.get("/health").headers.get("x-request-id", "")
        assert len(rid) == 8
        assert all(c in "0123456789abcdef" for c in rid)

    def test_request_id_changes_per_request(self):
        r1 = client.get("/health").headers.get("x-request-id")
        r2 = client.get("/health").headers.get("x-request-id")
        assert r1 != r2

    def test_headers_present_on_404(self):
        r = client.get("/this-route-does-not-exist")
        assert r.headers.get("x-content-type-options") == "nosniff"
        assert r.headers.get("x-frame-options") == "DENY"

    def test_headers_present_on_422(self):
        r = client.get("/summaries/search")   # missing required q
        assert r.headers.get("x-content-type-options") == "nosniff"


# ── Input Validation / Injection ──────────────────────────────────────────────

class TestInputValidation:
    """Injection payloads must be rejected or return empty results without error."""

    @pytest.mark.parametrize("payload", [
        "' OR '1'='1",
        "'; DROP TABLE editions; --",
        "\" OR 1=1 --",
        "1; exec xp_cmdshell('id')",
        "UNION SELECT * FROM users --",
    ])
    def test_sql_injection_returns_empty_not_error(self, payload):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/summaries/search", params={"q": payload[:100]})
        # Must not 500 — either valid empty result or 422 from validation
        assert r.status_code in (200, 422)
        if r.status_code == 200:
            assert r.json() == []

    @pytest.mark.parametrize("payload", [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
    ])
    def test_xss_payload_does_not_reflect_in_error_body(self, payload):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/summaries/search", params={"q": payload[:100]})
        assert r.status_code in (200, 422)
        # Script tags must never appear verbatim in the JSON response body
        assert "<script>" not in r.text
        assert "onerror=" not in r.text

    def test_query_over_100_chars_rejected(self):
        assert client.get("/summaries/search", params={"q": "x" * 101}).status_code == 422

    def test_single_char_query_rejected(self):
        assert client.get("/summaries/search", params={"q": "a"}).status_code == 422

    def test_empty_query_rejected(self):
        assert client.get("/summaries/search").status_code == 422

    def test_limit_above_50_rejected(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/summaries/search", params={"q": "test", "limit": 51})
        assert r.status_code == 422

    def test_negative_limit_rejected(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/summaries/search", params={"q": "test", "limit": 0})
        assert r.status_code == 422


# ── IDOR — Insecure Direct Object Reference ───────────────────────────────────

class TestIDOR:
    """Numeric route parameters must be validated; missing resources return 404."""

    def test_nonexistent_edition_returns_404(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/editions/999999")
        assert r.status_code == 404

    def test_string_edition_id_returns_422(self):
        assert client.get("/editions/abc").status_code == 422

    def test_float_edition_id_returns_422(self):
        assert client.get("/editions/1.5").status_code == 422

    def test_negative_edition_id_returns_404_not_500(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/editions/-1")
        assert r.status_code == 404

    def test_zero_edition_id_returns_404_not_500(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/editions/0")
        assert r.status_code == 404

    def test_summary_en_nonexistent_edition_returns_404(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/editions/999999/summary/en")
        assert r.status_code == 404

    def test_summary_nonexistent_edition_returns_404(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/editions/999999/summary")
        assert r.status_code == 404


# ── Request Size Limit ────────────────────────────────────────────────────────

class TestRequestSizeLimit:
    """Bodies over 64 KB must be rejected before any processing."""

    def test_oversized_body_returns_413(self):
        large_body = b"x" * (65 * 1024)
        r = client.post(
            "/editions/",
            content=large_body,
            headers={
                "content-length": str(len(large_body)),
                "content-type": "application/json",
            },
        )
        assert r.status_code == 413

    def test_normal_request_allowed(self):
        assert client.get("/health").status_code == 200


# ── HTTP Method Restriction ───────────────────────────────────────────────────

class TestHTTPMethods:
    """Only GET endpoints are exposed — other verbs must be rejected."""

    @pytest.mark.parametrize("method", ["POST", "PUT", "DELETE", "PATCH"])
    def test_write_methods_on_editions_rejected(self, method):
        r = client.request(method, "/editions/")
        assert r.status_code in (405, 422)

    @pytest.mark.parametrize("method", ["POST", "PUT", "DELETE", "PATCH"])
    def test_write_methods_on_summaries_rejected(self, method):
        r = client.request(method, "/summaries/")
        assert r.status_code in (405, 422)


# ── Error Handling — No Internal Leakage ─────────────────────────────────────

class TestErrorHandling:
    """Unhandled exceptions must return generic 500 without leaking internals."""

    def test_500_does_not_expose_traceback(self):
        with patch("api.routes.get_session", side_effect=RuntimeError("DB connection lost")):
            r = client.get("/editions/")
        assert r.status_code == 500
        assert "Traceback" not in r.text
        assert "RuntimeError" not in r.text
        assert "DB connection lost" not in r.text
        assert "site-packages" not in r.text

    def test_500_body_is_generic(self):
        with patch("api.routes.get_session", side_effect=Exception("secret internal state")):
            r = client.get("/editions/")
        assert r.status_code == 500
        body = r.json()
        assert "detail" in body
        assert body["detail"] == "Internal server error."

    def test_404_detail_does_not_leak_internals(self):
        with patch("api.routes.get_session") as ctx:
            ctx.return_value = _mock_empty_session()
            r = client.get("/editions/999999")
        assert r.status_code == 404
        assert "Traceback" not in r.text
        assert "site-packages" not in r.text


# ── SSRF via PDF URL — already covered in test_pdf_extractor.py ──────────────
# ── CPF redaction in logs — already covered in test_search_endpoint.py ───────
