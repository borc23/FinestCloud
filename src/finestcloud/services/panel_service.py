import math

from finestcloud.utils.gps_utils import GPSCoordinateSystem

from .panel_layout import place_panels


class PanelService:
    def __init__(
        self,
        bounds: dict[str, float],
        panel_specs: dict,
        edge_padding_cm: float = 20,
        spacing_cm: float = 0.5,
        panel_orientation: str = "best",
    ):
        self.edge_padding_cm = edge_padding_cm
        self.spacing_cm = spacing_cm
        self.panel_orientation = panel_orientation
        # Panel dimensions arrive in meters from the frontend
        self.module_dict = {
            "id": "custom",
            "name": "Custom Panel",
            "width_cm": panel_specs["width"] * 100,
            "height_cm": panel_specs["height"] * 100,
            "power_w": panel_specs["power"],
            "efficiency": panel_specs["efficiency"],
        }
        self.gps_system = GPSCoordinateSystem(
            (bounds["north"] + bounds["south"]) / 2,
            (bounds["east"] + bounds["west"]) / 2,
        )

    def generate_panels(self, roofs: list[dict], objects: list[dict]) -> dict:
        """Generate all possible panels for all roofs."""
        obstacles = [self.gps_system.gps_array_to_cm(obj["coords"]) for obj in objects]
        all_roof_panels = [
            self._generate_roof_panels(i, roof, obstacles)
            for i, roof in enumerate(roofs)
        ]
        total_max_panels = sum(roof["panel_count"] for roof in all_roof_panels)

        return {
            "roofs": all_roof_panels,
            "max_panels": total_max_panels,
            "module": self.module_dict["id"],
        }

    def _generate_roof_panels(self, roof_id: int, roof: dict, obstacles: list) -> dict:
        """Generate panels for a single roof."""
        # Keys may be present with None (optional request fields), so .get() defaults
        # don't apply; azimuth 0 (north) is valid, hence the explicit None check
        pitch = roof.get("pitch") or 0
        azimuth = roof.get("azimuth")
        azimuth = 180 if azimuth is None else azimuth

        roof_panels = self._generate_panels_on_roof(roof["coords"], pitch, obstacles)
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
        self, coords: list[dict[str, float]], pitch: float, obstacles: list
    ) -> list[list[dict[str, float]]]:
        """Place panels in cm on the roof and return their corners as GPS coords."""
        width, height = self.module_dict["width_cm"], self.module_dict["height_cm"]
        # Seen from above, a panel is foreshortened along the slope by cos(pitch)
        cos_pitch = math.cos(math.radians(pitch))
        orientations = {
            "vertical": (width, height * cos_pitch),
            "horizontal": (height, width * cos_pitch),
        }
        dims = (
            [orientations[self.panel_orientation]]
            if self.panel_orientation in orientations
            else list(orientations.values())  # "best": try both
        )

        panels_cm = place_panels(
            self.gps_system.gps_array_to_cm(coords),
            obstacles,
            dims,
            self.spacing_cm,
            self.edge_padding_cm,
        )
        return [self.gps_system.cm_array_to_gps(panel) for panel in panels_cm]
