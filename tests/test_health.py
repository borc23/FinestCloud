import pytest
from fastapi.testclient import TestClient

from finestcloud.main import create_app


def test_health_is_public():
    # No context manager: skips lifespan, so models aren't loaded
    response = TestClient(create_app()).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.parametrize("headers", [{}, {"X-Backend-Token": "wrong-token"}])
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("post", "/api/detect"),
        ("post", "/api/generate_panels"),
        ("post", "/api/pvwatts/calculate"),
        ("get", "/api/solar_api_proxy?latitude=46&longitude=14"),
    ],
)
def test_api_routes_require_backend_token(method, path, headers):
    # Rejected before validation or any paid upstream call
    client = TestClient(create_app(), headers=headers)
    response = getattr(client, method)(
        path, **({"json": {}} if method == "post" else {})
    )
    assert response.status_code == 401
