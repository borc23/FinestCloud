import httpx
import pytest
from fastapi.testclient import TestClient

from finestcloud.main import create_app
from finestcloud.services import pvwatts_service

REQUEST = {
    "latitude": 46.05,
    "longitude": 14.5,
    "panel_count": 10,
    "panel_wattage": 430,
}
OUTPUTS = {
    "ac_monthly": [100.0] * 12,
    "ac_annual": 1200.0,
    "capacity_factor": 14.2,
    "solrad_annual": 3.9,
}


@pytest.fixture
def nrel(monkeypatch):
    """Route PVWatts calls to a fake NREL; the test sets the response."""
    reply = {}

    def handler(request: httpx.Request) -> httpx.Response:
        reply["params"] = dict(request.url.params)
        return httpx.Response(reply["status"], json=reply["json"])

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        pvwatts_service.httpx,
        "AsyncClient",
        lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw),
    )
    return reply


def test_calculate_maps_pvwatts_outputs(nrel):
    nrel.update(status=200, json={"outputs": OUTPUTS, "station_info": {"city": "X"}})

    response = TestClient(create_app()).post("/api/pvwatts/calculate", json=REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert body["annual_production"] == 1200.0
    assert body["system_capacity_kw"] == 4.3
    assert body["station_info"] == {"city": "X", "state": "", "distance": 0}
    assert nrel["params"]["system_capacity"] == "4.3"


@pytest.mark.parametrize(
    ("status", "json"),
    [
        (429, {"error": {"code": "OVER_RATE_LIMIT"}}),
        (200, {"errors": ["lat out of range"]}),
    ],
)
def test_calculate_failure_is_502_without_details(nrel, status, json):
    nrel.update(status=status, json=json)

    response = TestClient(create_app()).post("/api/pvwatts/calculate", json=REQUEST)

    assert response.status_code == 502
    assert response.json() == {"detail": "Solar production calculation failed"}
