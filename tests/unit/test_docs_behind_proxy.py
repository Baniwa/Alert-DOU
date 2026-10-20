import importlib

from fastapi.testclient import TestClient


def _app_with_root_path(monkeypatch, value):
    monkeypatch.setenv("ROOT_PATH", value)
    import api.main
    return importlib.reload(api.main).app


def test_swagger_points_to_prefixed_schema(monkeypatch):
    client = TestClient(_app_with_root_path(monkeypatch, "/api"))
    html = client.get("/docs").text
    assert "'/api/openapi.json'" in html


def test_schema_served_without_prefix_after_proxy_strips_it(monkeypatch):
    client = TestClient(_app_with_root_path(monkeypatch, "/api"))
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert response.json()["servers"] == [{"url": "/api"}]


def test_no_prefix_by_default(monkeypatch):
    client = TestClient(_app_with_root_path(monkeypatch, ""))
    assert "'/openapi.json'" in client.get("/docs").text
