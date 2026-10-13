import pytest

BOUNDS = {"north": 46.0505, "south": 46.0495, "east": 14.5007, "west": 14.4993}
# ~6.5 x 4.5 m rectangle around the map center
COORDS = [
    {"lat": 46.04998, "lng": 14.49996},
    {"lat": 46.04998, "lng": 14.50004},
    {"lat": 46.05002, "lng": 14.50004},
    {"lat": 46.05002, "lng": 14.49996},
]
SPECS = {"width": 1.134, "height": 1.722, "power": 430, "efficiency": 22}


@pytest.mark.parametrize(
    ("roof_extra", "expected_pitch", "expected_azimuth"),
    [
        ({}, 0, 180),
        ({"pitch": None, "azimuth": None}, 0, 180),
        ({"pitch": 30, "azimuth": 0}, 30, 0),  # north-facing must stay 0
    ],
)
def test_generate_panels_roof_defaults(
    client, roof_extra, expected_pitch, expected_azimuth
):
    response = client.post(
        "/api/generate_panels",
        json={
            "roofs": [{"coords": COORDS, **roof_extra}],
            "map_bounds": BOUNDS,
            "panel_specs": SPECS,
        },
    )
    assert response.status_code == 200
    roof = response.json()["roofs"][0]
    assert roof["pitch"] == expected_pitch
    assert roof["azimuth"] == expected_azimuth
    assert roof["panel_count"] > 0
