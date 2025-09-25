import hashlib
import logging
from collections import OrderedDict
from typing import Any, Dict, List

import numpy as np
import torch
from rdp import rdp  # type: ignore
from ultralytics import YOLO  # type: ignore

logger = logging.getLogger(__name__)


class DetectionService:
    def __init__(self, model_path: str, cache_size: int = 100, enable_gpu: bool = True):
        try:
            logger.info(f"Attempting to load YOLO model from: {model_path}")
            self.model = YOLO(model_path)  # YOLO will handle local path or Hub ID
            logger.info(f"YOLO model loaded successfully from: {model_path}")
        except Exception as e:
            logger.error(
                f"Failed to load YOLO model from {model_path}. Error: {e}",
                exc_info=True,
            )
            raise

        self.cache: OrderedDict[str, Any] = OrderedDict()
        self.cache_size = cache_size

        self.device = self._get_optimal_device(enable_gpu)
        logger.info(f"Using device: {self.device}")

        if hasattr(self.model, "to"):
            self.model.to(self.device)

    def _get_optimal_device(self, enable_gpu: bool) -> str:
        """Select the optimal device for inference."""
        if not enable_gpu:
            return "cpu"

        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        else:
            logger.warning("GPU requested but not available, falling back to CPU")
            return "cpu"

    def detect_roofs(self, image, bounds=None, conf=0.5, epsilon=0.0075):
        cache_key = self._generate_cache_key(image, bounds, conf, epsilon)

        if cache_key in self.cache:
            self.cache.move_to_end(cache_key)
            return self.cache[cache_key]

        results = self.model(
            image,
            conf=conf,
            verbose=False,
            device=self.device,
        )
        processed_results = self._process_results(results, bounds, epsilon)

        self._cache_put(cache_key, processed_results)
        return processed_results

    def _generate_cache_key(self, image, bounds, conf: float, epsilon: float) -> str:
        """Generate efficient cache key using image shape and metadata."""
        if hasattr(image, "shape") and hasattr(image, "dtype"):
            img_signature = f"{image.shape}_{image.dtype}"
            if hasattr(image, "__array__"):
                arr = np.asarray(image)
                h, w = arr.shape[:2]
                sample_pixels = [
                    arr[0, 0],  # top-left
                    arr[0, w - 1],  # top-right
                    arr[h - 1, 0],  # bottom-left
                    arr[h - 1, w - 1],  # bottom-right
                    arr[h // 2, w // 2],  # center
                ]
                pixel_hash = hashlib.md5(str(sample_pixels).encode()).hexdigest()[:8]
                img_signature += f"_{pixel_hash}"
        else:
            img_signature = str(id(image))

        key_components = [img_signature, str(bounds), str(conf), str(epsilon)]
        return hashlib.md5("_".join(key_components).encode()).hexdigest()

    def _cache_put(self, key: str, value: Any) -> None:
        """Add item to cache with LRU eviction."""
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            self.cache[key] = value
            if len(self.cache) > self.cache_size:
                self.cache.popitem(last=False)

    def _process_results(self, results, bounds, epsilon):
        all_roof_polygons = []
        all_object_polygons = []

        for result in results:
            if result.masks is None:
                continue

            simplified_masks = [
                self._mask_simplified(mask.xyn[0], epsilon) for mask in result.masks
            ]

            if bounds:
                coords_list = [
                    self._convert_to_geo_coordinates(simplified, bounds)
                    for simplified in simplified_masks
                ]
            else:
                coords_list = [
                    self._convert_to_pixel_coordinates(simplified)
                    for simplified in simplified_masks
                ]

            all_roof_polygons.extend([{"coords": coords} for coords in coords_list])

        return all_roof_polygons, all_object_polygons

    @staticmethod
    def _convert_to_geo_coordinates(
        points: np.ndarray, bounds: Dict[str, float]
    ) -> List[Dict[str, float]]:
        """Vectorized conversion to geographic coordinates."""
        lat_scale = bounds["south"] - bounds["north"]
        lng_scale = bounds["east"] - bounds["west"]

        # Vectorized computation
        lats = bounds["north"] + lat_scale * points[:, 1]
        lngs = bounds["west"] + lng_scale * points[:, 0]

        coords = np.column_stack((lats, lngs))
        return [{"lat": float(coord[0]), "lng": float(coord[1])} for coord in coords]

    @staticmethod
    def _convert_to_pixel_coordinates(points: np.ndarray) -> List[Dict[str, float]]:
        """Vectorized conversion to pixel coordinates."""
        return [{"x": float(point[0]), "y": float(point[1])} for point in points]

    @staticmethod
    def _mask_simplified(mask, epsilon):
        points = mask.astype(float)
        closed_points = np.vstack((points, points[0]))
        simplified = rdp(closed_points, epsilon=epsilon)
        corners = simplified[:-1]
        return corners.astype(np.float32)
