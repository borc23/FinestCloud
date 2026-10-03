import base64

import cv2
import numpy as np
import requests


def _decode(data: bytes) -> np.ndarray:
    """Decode image bytes to a 3-channel BGR array, the format YOLO expects."""
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    return image


def load_image_from_url(image_url: str) -> np.ndarray:
    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        # Exception type only: the URL carries the Maps API key
        raise ValueError(f"Failed to download image ({type(e).__name__})") from None
    return _decode(response.content)


def load_image_from_base64(data: str) -> np.ndarray:
    """Accepts raw base64 or a data URL ("data:image/png;base64,...")."""
    return _decode(base64.b64decode(data.split(",")[-1]))
