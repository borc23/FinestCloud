"""Local metric coordinates (cm) around a reference point, for roof-scale geometry."""

from math import cos, radians

import numpy as np


class GPSCoordinateSystem:
    """Flat projection around a reference point; accurate to mm over a few hundred m."""

    def __init__(self, reference_lat: float, reference_lng: float):
        phi = radians(reference_lat)
        # WGS84 meters per degree at this latitude
        m_per_deg_lat = 111132.92 - 559.82 * cos(2 * phi) + 1.175 * cos(4 * phi)
        m_per_deg_lng = 111412.84 * cos(phi) - 93.5 * cos(3 * phi)
        self.origin = np.array([reference_lng, reference_lat])
        self.cm_per_deg = np.array([m_per_deg_lng, m_per_deg_lat]) * 100

    def gps_array_to_cm(self, coords: list[dict]) -> np.ndarray:
        """[{"lat", "lng"}, ...] -> (N, 2) array of [x_cm, y_cm]."""
        lng_lat = np.array([(c["lng"], c["lat"]) for c in coords], dtype=float)
        return (lng_lat.reshape(-1, 2) - self.origin) * self.cm_per_deg

    def cm_array_to_gps(self, coords: np.ndarray) -> list[dict]:
        """(N, 2) array of [x_cm, y_cm] -> [{"lat", "lng"}, ...]."""
        lng, lat = (np.asarray(coords) / self.cm_per_deg + self.origin).T
        return [{"lat": float(a), "lng": float(o)} for a, o in zip(lat, lng)]
