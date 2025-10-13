from dataclasses import dataclass
from typing import Dict, List

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class PanelConfig:
    epsilon_ratio: float = 0.02
    panel_spacing_px: int = 0
    min_panels: int = 0
    edge_padding_cm: int = 20


@dataclass
class RoofData:
    coords: List[Dict[str, float]]
    bounds: Dict[str, float]
    pitch: float
    azimuth: float
