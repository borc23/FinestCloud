from dataclasses import dataclass
from enum import Enum
from typing import Dict, List

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class PanelConfig:
    epsilon_ratio: float = 0.02
    panel_spacing_px: int = 0
    min_panels: int = 0
    edge_padding_cm: int = 20


class PanelModule(Enum):
    STANDARD = {
        "id": "standard",
        "name": "Standard",
        "width_cm": 104.5,
        "height_cm": 187.9,
        "power_w": 400,
        "efficiency": 20.4,
        "color": "#2980b9",
        "path": "https://res.cloudinary.com/dajy5yo5a/image/upload/v1746527441/Polycrystalline_Solar_Panel_xmagmv.png",
        "description": "Standard panels are the most common type of solar panel. They are a good choice for most residential installations.",
    }
    PREMIUM = {
        "id": "premium",
        "name": "Premium",
        "width_cm": 110,
        "height_cm": 175,
        "power_w": 450,
        "efficiency": 22.8,
        "color": "#16a085",
        "path": "https://res.cloudinary.com/dajy5yo5a/image/upload/v1746527441/Polycrystalline_Solar_Panel_xmagmv.png",
        "description": "High efficiency, premium quality",
    }
    COMPACT = {
        "id": "compact",
        "name": "Compact",
        "width_cm": 90,
        "height_cm": 150,
        "power_w": 350,
        "efficiency": 19.2,
        "color": "#3498db",
        "path": "https://res.cloudinary.com/dajy5yo5a/image/upload/v1746527441/Polycrystalline_Solar_Panel_xmagmv.png",
        "description": "Ideal for limited space",
    }

    @classmethod
    def create_custom(cls, specs: dict):
        """Create a custom module with given specifications"""
        return {
            "id": "custom",
            "name": "Custom",
            **specs,
            "color": "#7f8c8d",
            "path": "https://res.cloudinary.com/dajy5yo5a/image/upload/v1746527441/solar-panel_acv6hz.png",
            "description": f"Custom module {specs['width_cm']}cm x {specs['height_cm']}cm",
        }

    def get_by_id(cls, module_id: str):
        """Get module by ID string"""
        for module in cls:
            if module.value["id"] == module_id:
                return module
        return cls.STANDARD


@dataclass
class RoofData:
    coords: List[Dict[str, float]]
    bounds: Dict[str, float]
    resolution: float
    pitch: float
    azimuth: float
