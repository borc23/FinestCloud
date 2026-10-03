import cv2
import httpx
import numpy as np

from finestcloud.core.config import get_settings

STATIC_MAPS_URL = "https://maps.googleapis.com/maps/api/staticmap"


def load_static_map(
    lat: float, lng: float, zoom: float, width: int, height: int
) -> np.ndarray:
    """
    Download the satellite image of a map view as a 3-channel BGR array (YOLO's
    input format). The URL is built here so clients can't make the server fetch
    arbitrary addresses.
    """
    params = {
        "center": f"{lat},{lng}",
        "zoom": f"{zoom:g}",  # 20.0 -> "20", as the frontend used to send it
        "size": f"{width}x{height}",
        "maptype": "satellite",
        "format": "jpg",
        "style": "feature:all|color:0xffffff",
        "key": get_settings().google_maps_api_key.get_secret_value(),
    }
    try:
        response = httpx.get(STATIC_MAPS_URL, params=params, timeout=30)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Static Maps returned {e.response.status_code}") from None
    except httpx.RequestError as e:
        # Type only: the request URL carries the API key
        raise ValueError(f"Static Maps request failed ({type(e).__name__})") from None

    image = cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    return image
