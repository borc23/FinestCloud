import numpy as np
import pytest
from fastapi.testclient import TestClient

from finestcloud.main import create_app
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


def test_detect_requires_bounds():
    # Validation runs before the handler, so no model is needed
    response = TestClient(create_app()).post(
        "/api/detect", json={"image": "https://example.com/map.jpg"}
    )
    assert response.status_code == 422
