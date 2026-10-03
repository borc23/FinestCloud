import cv2
import httpx
import numpy as np


def load_image_from_url(image_url: str) -> np.ndarray:
    """Download an image as a 3-channel BGR array, the format YOLO expects."""
    try:
        response = httpx.get(image_url, timeout=30, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as e:
        # Exception type only: the URL carries the Maps API key
        raise ValueError(f"Failed to download image ({type(e).__name__})") from None

    image = cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    return image
