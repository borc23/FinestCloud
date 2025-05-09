import logging

import numpy as np
from rdp import rdp  # type: ignore
from ultralytics import YOLO  # type: ignore

logger = logging.getLogger(__name__)

class DetectionService:
    def __init__(self, model_path):
        try:
            logger.info(f"Attempting to load YOLO model from: {model_path}")
            self.model = YOLO(model_path) # YOLO will handle local path or Hub ID
            logger.info(f"YOLO model loaded successfully from: {model_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model from {model_path}. Error: {e}", exc_info=True)
            raise
        self.cache = {}

    def detect_roofs(self, image, bounds=None, conf=0.5, epsilon=0.0075):
        cache_key = hash(image.tobytes()) if hasattr(image, "tobytes") else id(image)
        cache_key = (cache_key, str(bounds), conf)

        if cache_key in self.cache:
            return self.cache[cache_key]

        results = self.model(
            image,
            conf=conf,
            verbose=False,
            device="cpu",
        )
        processed_results = self._process_results(results, bounds, epsilon)

        self.cache[cache_key] = processed_results
        return processed_results

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
    def _convert_to_geo_coordinates(points, bounds):
        lat_scale = bounds["south"] - bounds["north"]
        lng_scale = bounds["east"] - bounds["west"]

        lats = bounds["north"] + lat_scale * points[:, 1]
        lngs = bounds["west"] + lng_scale * points[:, 0]

        return [{"lat": float(lat), "lng": float(lng)} for lat, lng in zip(lats, lngs)]

    @staticmethod
    def _convert_to_pixel_coordinates(points):
        return [{"x": float(x), "y": float(y)} for x, y in points]

    @staticmethod
    def _mask_simplified(mask, epsilon):
        points = mask.astype(float)
        closed_points = np.vstack((points, points[0]))
        simplified = rdp(closed_points, epsilon=epsilon)
        corners = simplified[:-1]
        return corners.astype(np.float32)
