import logging
import threading
from functools import lru_cache

import cv2
import numpy as np
from ultralytics import YOLO  # type: ignore

from finestcloud.utils.model_loader import get_model_path

logger = logging.getLogger(__name__)


class DetectionService:
    def __init__(self, model_path: str):
        self.model = YOLO(model_path)
        # Routes run in a threadpool and YOLO predictors aren't thread-safe
        self._lock = threading.Lock()
        logger.info(f"YOLO model loaded from: {model_path}")

    def detect_roofs(
        self,
        image: np.ndarray,
        bounds: dict[str, float],
        conf: float = 0.5,
        epsilon: float = 0.0075,
    ) -> list[dict]:
        """
        Detect roof polygons and map them onto the image's geographic bounds.

        YOLO letterboxes the image itself and masks.xyn is normalized to the
        original image, so the points map straight onto the bounds.
        """
        with self._lock:
            results = self.model(image, conf=conf, verbose=False)

        polygons = [
            _simplify(xyn, epsilon)
            for result in results
            if result.masks is not None
            for xyn in result.masks.xyn
            if len(xyn) >= 3
        ]
        return [{"coords": _to_geo(p, bounds)} for p in polygons if len(p) >= 3]


def _simplify(points: np.ndarray, epsilon: float) -> np.ndarray:
    """
    Douglas-Peucker on a closed contour: split at the point farthest from the
    first (as rdp does on a closed polyline), then simplify both halves.
    Plain approxPolyDP(closed=True) picks another start point and can drift
    far from the previous rdp output; this stays within IoU ~0.98 of it.
    """
    points = points.astype(np.float32)
    distances = np.linalg.norm(points - points[0], axis=1)
    k = int(np.argmax(distances))
    if distances[k] <= epsilon:
        return points[:1]
    closed = np.vstack((points, points[:1]))
    first = cv2.approxPolyDP(closed[: k + 1], epsilon, closed=False)[:, 0]
    second = cv2.approxPolyDP(closed[k:], epsilon, closed=False)[:, 0]
    return np.vstack((first[:-1], second[:-1]))


def _to_geo(points: np.ndarray, bounds: dict[str, float]) -> list[dict[str, float]]:
    """Map normalized (x, y) image points to lat/lng within the bounds."""
    lats = bounds["north"] + (bounds["south"] - bounds["north"]) * points[:, 1]
    lngs = bounds["west"] + (bounds["east"] - bounds["west"]) * points[:, 0]
    return [{"lat": float(lat), "lng": float(lng)} for lat, lng in zip(lats, lngs)]


@lru_cache
def get_detection_service() -> DetectionService:
    """Shared DetectionService; first called from the app lifespan at startup."""
    return DetectionService(get_model_path())
