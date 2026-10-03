import numpy as np
import pytest

from finestcloud.utils.gps_utils import GPSCoordinateSystem


def test_meters_per_degree_matches_wgs84_at_45_degrees():
    # Published WGS84 values at 45°: 111,132 m per degree lat, 78,847 m per degree lng
    lng_cm, lat_cm = GPSCoordinateSystem(45, 0).cm_per_deg
    assert lat_cm / 100 == pytest.approx(111_132, abs=1)
    assert lng_cm / 100 == pytest.approx(78_847, abs=1)


def test_round_trip():
    gps = GPSCoordinateSystem(46.05, 14.5)
    coords = [{"lat": 46.0501, "lng": 14.4999}, {"lat": 46.0498, "lng": 14.5003}]

    cm = gps.gps_array_to_cm(coords)

    assert cm.shape == (2, 2)
    assert gps.cm_array_to_gps(cm) == [pytest.approx(c) for c in coords]
    assert np.allclose(gps.gps_array_to_cm([]), np.empty((0, 2)))
