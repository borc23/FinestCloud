import math
from typing import Dict, List, Tuple

import cv2
import numpy as np

from app.dataclasses.config import PanelConfig, PanelModule, RoofData

from .genetic_algorithm import PanelGeneticOptimizer


class PanelService:
    def __init__(self, bounds: Dict[str, float], resolution: float, custom_module=None):
        self.bounds = bounds
        self.resolution = resolution
        self.custom_module = custom_module
        self.config = PanelConfig()
        self.module_dict = PanelModule.STANDARD.value
        self.all_panels = []
        self.max_panels = 0
        self.genetic_optimizer = PanelGeneticOptimizer()

    def set_module(self, module_name: str):
        """Set panel module type."""
        if module_name.upper() in PanelModule.__members__:
            self.module_dict = PanelModule[module_name.upper()].value
        elif module_name.upper() == "CUSTOM" and self.custom_module is not None:
            self.module_dict = self.custom_module
        else:
            raise ValueError(f"Invalid module type: {module_name}")

    def generate_panels(
        self,
        roofs: List[Dict],
        objects: List[Dict],
        map_dimensions: Dict[str, int],
        tune_params: bool = False,
    ) -> Dict:
        """Generate all possible panels for all roofs."""
        all_roof_panels = [
            self._generate_roof_panels(i, roof, objects, map_dimensions, tune_params)
            for i, roof in enumerate(roofs)
        ]
        total_max_panels = sum(roof["panel_count"] for roof in all_roof_panels)

        self.all_panels, self.max_panels = all_roof_panels, total_max_panels
        return {
            "roofs": all_roof_panels,
            "max_panels": total_max_panels,
            "module": self.module_dict["id"],
        }

    def _generate_roof_panels(
        self,
        roof_id: int,
        roof: Dict,
        objects: Dict,
        map_dimensions: Dict[str, int],
        tune_params: bool = False,
    ) -> Dict:
        """Generate panels for a single roof."""
        roof_data = RoofData(
            coords=roof["coords"],
            bounds=self.bounds,
            resolution=self.resolution,
            pitch=roof["pitch"],
            azimuth=roof["azimuth"],
        )
        roof_panels = self._generate_panels_on_roof(
            roof_data, objects, map_dimensions, tune_params
        )
        return {
            "roof_id": roof_id,
            "panels": roof_panels,
            "panel_count": len(roof_panels),
            "module_type": self.module_dict["id"],
            "module_specs": self.module_dict,
        }

    def get_visible_panels(self, panel_count: int) -> Dict:
        """Return subset of panels based on requested count."""
        if not 0 <= panel_count <= self.max_panels:
            raise ValueError(f"Panel count must be between 0 and {self.max_panels}")

        visible_roofs, remaining_count = [], panel_count
        module_power = self.module_dict["power_w"]

        for roof in self.all_panels:
            panels_to_show = min(remaining_count, len(roof["panels"]))
            if panels_to_show <= 0:
                break

            visible_roofs.append(
                {
                    **roof,
                    "panels": roof["panels"][:panels_to_show],
                    "panel_count": panels_to_show,
                    "total_power_w": panels_to_show * module_power,
                }
            )
            remaining_count -= panels_to_show
            if remaining_count <= 0:
                break

        return {
            "roofs": visible_roofs,
            "total_panels": panel_count,
            "total_power_w": panel_count * module_power,
        }

    def _generate_panels_on_roof(
        self,
        roof_data: RoofData,
        objects: Dict,
        map_dimensions: Dict[str, int],
        tune_params: bool = False,
    ) -> List[List[Dict[str, float]]]:
        """Generate panels on a roof with optimized placement using genetic algorithm."""
        pixel_coords = self._gps_to_pixels(roof_data.coords, map_dimensions)

        roof_mask = self._create_roof_mask(pixel_coords, map_dimensions)
        object_masks = self._create_objects_mask(objects, map_dimensions)
        valid_area_mask = cv2.bitwise_and(roof_mask, cv2.bitwise_not(object_masks))

        longest_edge, angle = self._find_longest_edge(pixel_coords)

        if roof_data.pitch is not None:
            panel_height_cm = self._resize_height_due_pitch(
                self.module_dict["height_cm"], roof_data.pitch
            )
            panel_size_px = (
                int(self.module_dict["width_cm"] / self.resolution),
                int(panel_height_cm / self.resolution),
            )
        else:
            panel_size_px = (
                int(self.module_dict["width_cm"] / self.resolution),
                int(self.module_dict["height_cm"] / self.resolution),
            )

        padding_px = int(self.config.edge_padding_cm / self.resolution)

        best_panels = self.genetic_optimizer.optimize_panel_placement(
            mask=valid_area_mask,
            panel_size=panel_size_px,
            spacing=self.config.panel_spacing_px,
            angle=angle,
            center=longest_edge["center"],
            padding_px=padding_px,
            generate_grid_fn=self._generate_grid_with_offset,
            tune_parameters=tune_params,
        )

        return self._pixels_to_gps(best_panels, map_dimensions)

    def _gps_to_pixels(
        self, coords: List[Dict[str, float]], map_dimensions: Dict[str, int]
    ) -> np.ndarray:
        """Convert GPS coordinates to pixel coordinates."""
        width, height = map_dimensions["width"], map_dimensions["height"]
        lng_scale = width / (self.bounds["east"] - self.bounds["west"])
        lat_scale = height / (self.bounds["north"] - self.bounds["south"])

        return np.array(
            [
                [
                    (c["lng"] - self.bounds["west"]) * lng_scale,
                    (self.bounds["north"] - c["lat"]) * lat_scale,
                ]
                for c in coords
            ],
            dtype=np.float32,
        )

    def _pixels_to_gps(
        self, pixel_coords: List[np.ndarray], map_dimensions: Dict[str, int]
    ) -> List[List[Dict[str, float]]]:
        """Convert pixel coordinates back to GPS coordinates."""
        width, height = map_dimensions["width"], map_dimensions["height"]
        lng_scale = (self.bounds["east"] - self.bounds["west"]) / width
        lat_scale = (self.bounds["north"] - self.bounds["south"]) / height

        return [
            [
                {
                    "lat": self.bounds["north"] - (py * lat_scale),
                    "lng": self.bounds["west"] + (px * lng_scale),
                }
                for px, py in panel
            ]
            for panel in pixel_coords
        ]

    def _create_roof_mask(
        self, pixel_coords: np.ndarray, map_dimensions: Dict[str, int]
    ) -> np.ndarray:
        """Create binary mask from roof coordinates."""
        mask = np.zeros(
            (map_dimensions["height"], map_dimensions["width"]), dtype=np.uint8
        )
        cv2.fillPoly(mask, [pixel_coords.astype(np.int32)], 255)
        return mask

    def _create_objects_mask(
        self, objects: List[Dict], map_dimensions: Dict[str, int]
    ) -> np.ndarray:
        """Create a binary mask for all objects."""
        mask = np.zeros(
            (map_dimensions["height"], map_dimensions["width"]), dtype=np.uint8
        )

        for obj in objects:
            pixel_coords = self._gps_to_pixels(obj, map_dimensions)
            cv2.fillPoly(mask, [pixel_coords.astype(np.int32)], 255)

        return mask

    def _find_longest_edge(self, points: np.ndarray) -> Tuple[Dict, float]:
        """Find the longest edge and its angle from horizontal."""
        rolled = np.roll(points, -1, axis=0)
        distances = np.linalg.norm(rolled - points, axis=1)
        max_idx = np.argmax(distances)
        p1, p2 = points[max_idx], rolled[max_idx]
        return {"start": p1, "end": p2, "center": (p1 + p2) / 2}, np.arctan2(
            p2[1] - p1[1], p2[0] - p1[0]
        )

    @staticmethod
    def _resize_height_due_pitch(original_height, pitch_angle_degrees):
        """Calculate adjusted height accounting for roof pitch."""
        pitch_angle_radians = math.radians(pitch_angle_degrees)
        bird_eye_view_height = original_height * math.cos(pitch_angle_radians)
        return bird_eye_view_height

    def _generate_grid_with_offset(
        self,
        rotated_mask: np.ndarray,
        panel_size: Tuple[int, int],
        spacing: int,
        x: int,
        y: int,
        w: int,
        h: int,
        padding_px: int,
        offset_x: int,
        offset_y: int,
        inv_rotation_matrix: np.ndarray,
    ) -> List[np.ndarray]:
        """Generate panel grid with specific offset."""
        panels = []
        panel_width, panel_height = panel_size

        start_x = x + padding_px + spacing + offset_x
        start_y = y + padding_px + spacing + offset_y

        working_width = w - (2 * padding_px)
        working_height = h - (2 * padding_px)

        end_x = x + working_width - panel_width - spacing
        end_y = y + working_height - panel_height - spacing

        if start_x >= end_x or start_y >= end_y:
            return []

        x_step = panel_width + spacing
        y_step = panel_height + spacing

        panel_template = np.array(
            [[0, 0], [panel_width, 0], [panel_width, panel_height], [0, panel_height]],
            dtype=np.float32,
        )

        panel_mask = np.zeros_like(rotated_mask)

        threshold = 1.0
        panel_area = panel_width * panel_height

        for row in range(start_y, end_y, y_step):
            for col in range(start_x, end_x, x_step):
                panel_mask.fill(0)

                cv2.rectangle(
                    panel_mask,
                    (col, row),
                    (col + panel_width, row + panel_height),
                    255,
                    -1,
                )

                intersection = cv2.bitwise_and(rotated_mask, panel_mask)
                intersection_area = cv2.countNonZero(intersection)

                if intersection_area / panel_area >= threshold:
                    corners = panel_template + [col, row]

                    corners = corners.reshape(-1, 1, 2)
                    rotated_corners = cv2.transform(corners, inv_rotation_matrix)

                    panels.append(rotated_corners.reshape(-1, 2))

        return panels
