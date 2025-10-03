"""GPS coordinate system utilities with cm precision."""

from math import atan2, cos, radians, sin, sqrt
from typing import Dict, List, Tuple

import numpy as np


class GPSCoordinateSystem:
    """Handle GPS coordinate transformations using proper spherical geometry."""

    def __init__(self, reference_lat: float, reference_lng: float):
        """
        Initialize with a reference point (typically center of map).
        All coordinates will be converted relative to this point.

        Args:
            reference_lat: Reference latitude (degrees)
            reference_lng: Reference longitude (degrees)
        """
        self.ref_lat = reference_lat
        self.ref_lng = reference_lng
        self.ref_lat_rad = radians(reference_lat)

        # Meters per degree at reference latitude
        self.meters_per_deg_lat = 111132.92
        self.meters_per_deg_lng = 111132.92 * cos(self.ref_lat_rad)

        # Convert to cm per degree for better precision
        self.cm_per_deg_lat = self.meters_per_deg_lat * 100
        self.cm_per_deg_lng = self.meters_per_deg_lng * 100

    def gps_to_cm(self, lat: float, lng: float) -> Tuple[float, float]:
        """
        Convert GPS coordinates to local metric coordinates (cm).
        Returns (x_cm, y_cm) relative to reference point.

        Args:
            lat: Latitude in degrees
            lng: Longitude in degrees

        Returns:
            Tuple of (x_cm, y_cm)
        """
        x = (lng - self.ref_lng) * self.cm_per_deg_lng
        y = (lat - self.ref_lat) * self.cm_per_deg_lat
        return x, y

    def cm_to_gps(self, x_cm: float, y_cm: float) -> Tuple[float, float]:
        """
        Convert local metric coordinates back to GPS.
        Returns (lat, lng).

        Args:
            x_cm: X coordinate in cm
            y_cm: Y coordinate in cm

        Returns:
            Tuple of (lat, lng)
        """
        lng = self.ref_lng + (x_cm / self.cm_per_deg_lng)
        lat = self.ref_lat + (y_cm / self.cm_per_deg_lat)
        return lat, lng

    def gps_array_to_cm(self, coords: List[Dict]) -> np.ndarray:
        """
        Convert array of GPS coordinates to cm.

        Args:
            coords: List of dicts with 'lat' and 'lng' keys

        Returns:
            NumPy array of shape (N, 2) with [x_cm, y_cm]
        """
        result = np.zeros((len(coords), 2))
        for i, coord in enumerate(coords):
            result[i] = self.gps_to_cm(coord["lat"], coord["lng"])
        return result

    def cm_array_to_gps(self, coords: np.ndarray) -> List[Dict]:
        """
        Convert array of cm coordinates to GPS.

        Args:
            coords: NumPy array of shape (N, 2) with [x_cm, y_cm]

        Returns:
            List of dicts with 'lat' and 'lng' keys
        """
        result = []
        for x, y in coords:
            lat, lng = self.cm_to_gps(x, y)
            result.append({"lat": lat, "lng": lng})
        return result

    @staticmethod
    def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate accurate distance between two GPS points in cm.

        Args:
            lat1: First latitude in degrees
            lng1: First longitude in degrees
            lat2: Second latitude in degrees
            lng2: Second longitude in degrees

        Returns:
            Distance in cm
        """
        R = 6371000  # Earth radius in meters

        phi1 = radians(lat1)
        phi2 = radians(lat2)
        delta_phi = radians(lat2 - lat1)
        delta_lambda = radians(lng2 - lng1)

        a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c * 100  # Convert to cm
