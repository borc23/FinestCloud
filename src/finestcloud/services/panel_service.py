import math

import numpy as np

from finestcloud.utils.gps_utils import GPSCoordinateSystem

from .genetic_algorithm import PanelGeneticOptimizer


class PanelService:
    def __init__(
        self,
        bounds: dict[str, float],
        edge_padding_cm: int = 20,
        spacing_cm: float = 0.5,
        panel_orientation: str = "best",
        panel_specs: dict | None = None,
    ):
        if not panel_specs:
            raise ValueError("panel_specs are required. No default panels in backend.")

        self.bounds = bounds
        self.edge_padding_cm = edge_padding_cm
        self.spacing_cm = spacing_cm
        self.panel_orientation = panel_orientation

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

        self.genetic_optimizer = PanelGeneticOptimizer()

        center_lat = (bounds["north"] + bounds["south"]) / 2
        center_lng = (bounds["east"] + bounds["west"]) / 2
        self.gps_system = GPSCoordinateSystem(center_lat, center_lng)

    def generate_panels(
        self,
        roofs: list[dict],
        objects: list[dict],
        tune_params: bool = False,
    ) -> dict:
        """Generate all possible panels for all roofs."""
        all_roof_panels = [
            self._generate_roof_panels(i, roof, objects, tune_params)
            for i, roof in enumerate(roofs)
        ]
        total_max_panels = sum(roof["panel_count"] for roof in all_roof_panels)

        return {
            "roofs": all_roof_panels,
            "max_panels": total_max_panels,
            "module": self.module_dict["id"],
        }

    def _generate_roof_panels(
        self,
        roof_id: int,
        roof: dict,
        objects: dict,
        tune_params: bool = False,
    ) -> dict:
        """Generate panels for a single roof."""
        # Keys may be present with None (optional request fields), so .get() defaults
        # don't apply; azimuth 0 (north) is valid, hence the explicit None check
        pitch = roof.get("pitch") or 0
        azimuth = roof.get("azimuth")
        azimuth = 180 if azimuth is None else azimuth

        roof_panels = self._generate_panels_on_roof(
            roof["coords"], pitch, objects, tune_params
        )
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
            "pitch": pitch,
            "azimuth": azimuth,
        }

    def _generate_panels_on_roof(
        self,
        coords: list[dict[str, float]],
        pitch: float,
        objects: list[dict],
        tune_params: bool = False,
    ) -> list[list[dict[str, float]]]:
        """Generate panels on a roof, optimizing in cm and returning GPS coords."""
        roof_coords_cm = self.gps_system.gps_array_to_cm(coords)

        # Calculate dimensions for both orientations with pitch adjustment
        base_width = self.module_dict["width_cm"]
        base_height = self.module_dict["height_cm"]

        if pitch > 0:
            vertical_dims, horizontal_dims = self._resize_dimensions_due_pitch(
                base_width, base_height, pitch
            )
        else:
            vertical_dims = (base_width, base_height)
            horizontal_dims = (base_width, base_height)

        panels_cm = self.genetic_optimizer.optimize_panel_placement(
            roof_polygon=roof_coords_cm,
            objects=objects,
            vertical_dims=vertical_dims,
            horizontal_dims=horizontal_dims,
            spacing_cm=self.spacing_cm,
            angle=self._find_longest_edge(roof_coords_cm),
            padding_cm=self.edge_padding_cm,
            gps_system=self.gps_system,
            tune_parameters=tune_params,
            panel_orientation=self.panel_orientation,
        )

        return [self.gps_system.cm_array_to_gps(panel) for panel in panels_cm]

    @staticmethod
    def _find_longest_edge(points: np.ndarray) -> float:
        """Return the angle (radians) of the polygon's longest edge from horizontal."""
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
