from fastapi.testclient import TestClient

from finestcloud.main import create_app


def test_health():
    # No context manager: skips lifespan, so models aren't loaded
    client = TestClient(create_app())
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
