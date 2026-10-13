import cv2
import httpx
import numpy as np
import pytest

from finestcloud.services import image_service
from finestcloud.services.detection_service import _simplify, _to_geo

BOUNDS = {"north": 46.0505, "south": 46.0495, "east": 14.5007, "west": 14.4993}


def test_simplify_noisy_square_to_corners():
    side = np.linspace(0.2, 0.8, 50)
    square = np.concatenate(
        [
            np.c_[side, np.full(50, 0.2)],
            np.c_[np.full(50, 0.8), side],
            np.c_[side[::-1], np.full(50, 0.8)],
            np.c_[np.full(50, 0.2), side[::-1]],
        ]
    )
    noisy = square + np.random.default_rng(0).normal(0, 0.001, square.shape)

    corners = _simplify(noisy, epsilon=0.0075)

    assert len(corners) == 4
    expected = {(0.2, 0.2), (0.8, 0.2), (0.8, 0.8), (0.2, 0.8)}
    assert {tuple(np.round(c.astype(float), 1)) for c in corners} == expected


def test_to_geo_maps_image_corners_to_bounds():
    top_left, bottom_right = _to_geo(np.array([[0.0, 0.0], [1.0, 1.0]]), BOUNDS)

    assert top_left == pytest.approx({"lat": 46.0505, "lng": 14.4993})
    assert bottom_right == pytest.approx({"lat": 46.0495, "lng": 14.5007})


VIEW = {"lat": 46.05, "lng": 14.5, "zoom": 20, "width": 500, "height": 500}


@pytest.mark.parametrize(
    "body",
    [
        {"view": VIEW},  # no bounds
        # A client-supplied URL (e.g. cloud metadata) is no longer accepted at all
        {"image": "http://169.254.169.254/latest/meta-data/", "bounds": BOUNDS},
        {"view": {**VIEW, "width": 4000}, "bounds": BOUNDS},  # beyond Static Maps max
    ],
)
def test_detect_rejects_invalid_requests(client, body):
    # Validation runs before the handler, so no model is needed
    response = client.post("/api/detect", json=body)
    assert response.status_code == 422


@pytest.fixture
def static_maps(monkeypatch):
    """Fake Google Static Maps; records the request, the test sets the status."""
    seen = {"status": 200}
    jpeg = cv2.imencode(".jpg", np.zeros((500, 500, 3), np.uint8))[1].tobytes()

    def fake_get(url, params, timeout):
        request = httpx.Request("GET", url, params=params)
        seen["url"] = request.url
        return httpx.Response(seen["status"], content=jpeg, request=request)

    monkeypatch.setattr(image_service.httpx, "get", fake_get)
    return seen


def test_static_map_url_is_built_server_side(static_maps):
    image = image_service.load_static_map(**VIEW)

    url = static_maps["url"]
    assert image.shape == (500, 500, 3)
    assert (url.scheme, url.host, url.path) == (
        "https",
        "maps.googleapis.com",
        "/maps/api/staticmap",
    )
    assert url.params["center"] == "46.05,14.5"
    assert url.params["zoom"] == "20"
    assert url.params["size"] == "500x500"
    assert url.params["key"] == "test-google-key"


def test_static_map_errors_never_include_the_key(static_maps):
    static_maps["status"] = 403

    with pytest.raises(ValueError, match="Static Maps returned 403") as error:
        image_service.load_static_map(**VIEW)
    assert "test-google-key" not in str(error.value)
