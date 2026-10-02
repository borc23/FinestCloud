from dataclasses import dataclass

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
    coords: list[dict[str, float]]
    bounds: dict[str, float]
    pitch: float
    azimuth: float
