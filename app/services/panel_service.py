import math
from typing import Dict, List, Tuple

import cv2
import numpy as np

from app.dataclasses.config import PanelConfig, RoofData
from app.utils.gps_utils import GPSCoordinateSystem

from .genetic_algorithm import PanelGeneticOptimizer
from .string_calculator import StringCalculator


class PanelService:
    def __init__(
        self,
        bounds: Dict[str, float],
        edge_padding_cm: int = 20,
        spacing_cm: float = 0.5,
        panel_orientation: str = "best",
        panel_specs: Dict = None,
    ):
        if not panel_specs:
            raise ValueError("panel_specs are required. No default panels in backend.")

        self.bounds = bounds
        self.edge_padding_cm = edge_padding_cm
        self.spacing_cm = spacing_cm
        self.panel_orientation = panel_orientation
        self.config = PanelConfig()

        # Always use panel_specs from frontend
        self.module_dict = {
            "id": panel_specs.get("id", "custom"),
            "name": panel_specs.get("name", "Custom Panel"),
            "width_cm": panel_specs.get("width", 1.046) * 100,  # Convert meters to cm
            "height_cm": panel_specs.get("height", 1.690) * 100,  # Convert meters to cm
            "power_w": panel_specs.get("power", 400),
            "efficiency": panel_specs.get("efficiency", 22.6),
            "color": "#7f8c8d",
            "path": "https://res.cloudinary.com/dajy5yo5a/image/upload/v1746527441/solar-panel_acv6hz.png",
            "description": panel_specs.get("name", "Custom panel from frontend"),
        }

        self.all_panels = []
        self.max_panels = 0
        self.genetic_optimizer = PanelGeneticOptimizer()
        self.string_calculator = StringCalculator()

        center_lat = (bounds["north"] + bounds["south"]) / 2
        center_lng = (bounds["east"] + bounds["west"]) / 2
        self.gps_system = GPSCoordinateSystem(center_lat, center_lng)

        cv2.setUseOptimized(True)
        cv2.setNumThreads(cv2.getNumberOfCPUs())

        self._mask_cache = {}

    def generate_panels(
        self,
        roofs: List[Dict],
        objects: List[Dict],
        tune_params: bool = False,
    ) -> Dict:
        """Generate all possible panels for all roofs."""
        all_roof_panels = [
            self._generate_roof_panels(i, roof, objects, tune_params)
            for i, roof in enumerate(roofs)
        ]
        total_max_panels = sum(roof["panel_count"] for roof in all_roof_panels)

        electrical_system = None

        self.all_panels, self.max_panels = all_roof_panels, total_max_panels
        return {
            "roofs": all_roof_panels,
            "max_panels": total_max_panels,
            "module": self.module_dict["id"],
            "electrical_system": electrical_system,
        }

    def _generate_roof_panels(
        self,
        roof_id: int,
        roof: Dict,
        objects: Dict,
        tune_params: bool = False,
    ) -> Dict:
        """Generate panels for a single roof."""
        roof_data = RoofData(
            coords=roof["coords"],
            bounds=self.bounds,
            pitch=roof.get("pitch", 0),
            azimuth=roof.get("azimuth", 180),
        )
        roof_panels = self._generate_panels_on_roof(roof_data, objects, tune_params)
        formatted_panels = [
            {"coords": panel, "roof_id": roof_id, "panel_id": i}
            for i, panel in enumerate(roof_panels)
        ]
        return {
            "roof_id": roof_id,
            "panels": formatted_panels,
            "panel_count": len(roof_panels),
            "module_type": self.module_dict["id"],
            "module_specs": self.module_dict,
            "coords": roof["coords"],
            "pitch": roof.get("pitch", 0),
            "azimuth": roof.get("azimuth", 180),
        }

    def get_visible_panels(self, panel_count: int) -> Dict:
        """Return subset of panels based on requested count."""
        if not isinstance(panel_count, int) or not (
            0 <= panel_count <= self.max_panels
        ):
            raise ValueError(
                f"Panel count must be an integer between 0 and {self.max_panels}"
            )

        visible_roofs = []
        remaining_count = panel_count
        module_power = self.module_dict["power_w"]

        for roof in self.all_panels:
            if remaining_count <= 0:
                break
            panels_to_show = min(remaining_count, len(roof["panels"]))
            if panels_to_show <= 0:
                continue

            visible_roofs.append(
                {
                    **roof,
                    "panels": roof["panels"][:panels_to_show],
                    "panel_count": panels_to_show,
                    "total_power_w": panels_to_show * module_power,
                }
            )
            remaining_count -= panels_to_show

        electrical_system = None
        if panel_count > 0:
            electrical_system = self.string_calculator.calculate_system_design(
                panel_count, self.module_dict["id"]
            )

        return {
            "roofs": visible_roofs,
            "total_panels": panel_count,
            "total_power_w": panel_count * module_power,
            "electrical_system": electrical_system.__dict__
            if electrical_system
            else None,
        }

    def _generate_panels_on_roof(
        self,
        roof_data: RoofData,
        objects: Dict,
        tune_params: bool = False,
    ) -> List[List[Dict[str, float]]]:
        """Generate panels on a roof in cm coordinates."""
        roof_coords_cm = self.gps_system.gps_array_to_cm(roof_data.coords)

        # Calculate dimensions for both orientations with pitch adjustment
        base_width = self.module_dict["width_cm"]
        base_height = self.module_dict["height_cm"]

        if roof_data.pitch is not None and roof_data.pitch > 0:
            vertical_dims, horizontal_dims = self._resize_dimensions_due_pitch(
                base_width, base_height, roof_data.pitch
            )
        else:
            vertical_dims = (base_width, base_height)
            horizontal_dims = (base_width, base_height)

        panels_cm = self._generate_panel_grid_cm(
            roof_polygon=roof_coords_cm,
            objects=objects,
            vertical_dims=vertical_dims,
            horizontal_dims=horizontal_dims,
            spacing=self.spacing_cm,
            padding=self.edge_padding_cm,
            tune_params=tune_params,
        )

        return self._cm_to_gps(panels_cm)

    def _cm_to_gps(
        self, panel_coords_cm: List[np.ndarray]
    ) -> List[List[Dict[str, float]]]:
        """Convert cm coordinates back to GPS coordinates."""
        result = []
        for panel in panel_coords_cm:
            if len(panel) == 0:
                result.append([])
                continue

            panel_gps = self.gps_system.cm_array_to_gps(panel)
            result.append(panel_gps)

        return result

    def _generate_panel_grid_cm(
        self,
        roof_polygon: np.ndarray,
        objects: List[Dict],
        vertical_dims: Tuple[float, float],
        horizontal_dims: Tuple[float, float],
        spacing: float,
        padding: float,
        tune_params: bool = True,
    ) -> List[np.ndarray]:
        """
        Generate panel grid in cm coordinates with support for both orientations.
        All dimensions are in cm.

        Args:
            roof_polygon: Roof polygon in cm coordinates (N x 2)
            objects: List of obstacle objects in GPS coordinates
            vertical_dims: (width, height) for vertical orientation with pitch adjustment
            horizontal_dims: (width, height) for horizontal orientation with pitch adjustment
            spacing: Base spacing between panels in cm
            padding: Edge padding in cm
            tune_params: Whether to use genetic algorithm optimization

        Returns:
            List of panels, each panel is a (4 x 2) array with corners in cm
        """

        angle = self._find_longest_edge(roof_polygon)

        panels = self.genetic_optimizer.optimize_panel_placement(
            roof_polygon=roof_polygon,
            objects=objects,
            vertical_dims=vertical_dims,
            horizontal_dims=horizontal_dims,
            spacing_cm=spacing,
            angle=angle,
            padding_cm=padding,
            gps_system=self.gps_system,
            tune_parameters=tune_params,
            panel_orientation=self.panel_orientation,
        )

        return panels

    def _find_longest_edge(self, points: np.ndarray) -> Tuple[Dict, float]:
        """Find the longest edge and its angle from horizontal."""
        rolled = np.roll(points, -1, axis=0)
        distances = np.linalg.norm(rolled - points, axis=1)
        max_idx = np.argmax(distances)
        p1, p2 = points[max_idx], rolled[max_idx]
        return np.arctan2(p2[1] - p1[1], p2[0] - p1[0])

    @staticmethod
    def _resize_dimensions_due_pitch(width, height, pitch_angle_degrees):
        """
        Calculate adjusted dimensions accounting for roof pitch.
        Returns dimensions for both vertical and horizontal orientations.

        Args:
            width: Panel width in cm (e.g., 104.5)
            height: Panel height in cm (e.g., 187.9)
            pitch_angle_degrees: Roof pitch in degrees

        Returns:
            tuple: ((vertical_width, vertical_height), (horizontal_width, horizontal_height))
                   - vertical: panel is tall (104.5 × 187.9*cos), aligned with longest edge
                   - horizontal: panel is wide (187.9 × 104.5*cos), perpendicular to longest edge
        """
        pitch_angle_radians = math.radians(pitch_angle_degrees)
        cos_pitch = math.cos(pitch_angle_radians)
        vertical_dims = (width, height * cos_pitch)
        horizontal_dims = (height, width * cos_pitch)

        return vertical_dims, horizontal_dims
