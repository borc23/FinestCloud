import base64
import io
import logging
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
import requests
from PIL import Image

logger = logging.getLogger(__name__)


class ImageService:
    TARGET_SIZE = 640
    SAVE_DIR = Path("saved_images")
    SAVE_IMAGES = True  # Set to False to disable image saving

    @staticmethod
    def _ensure_save_directory():
        """Create the save directory if it doesn't exist."""
        if ImageService.SAVE_IMAGES:
            ImageService.SAVE_DIR.mkdir(parents=True, exist_ok=True)
            logger.info(
                f"Image save directory ensured at: {ImageService.SAVE_DIR.absolute()}"
            )

    @staticmethod
    def _save_image(image: np.ndarray, prefix: str = "capture") -> str:
        """
        Save image to disk with timestamp.

        Args:
            image: The image to save (numpy array in BGR format)
            prefix: Prefix for the filename

        Returns:
            The path where the image was saved
        """
        if not ImageService.SAVE_IMAGES:
            return ""

        try:
            ImageService._ensure_save_directory()

            # Generate timestamp-based filename
            timestamp = datetime.now().astimezone().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"{prefix}_{timestamp}.jpg"
            filepath = ImageService.SAVE_DIR / filename

            # Save the image
            cv2.imwrite(str(filepath), image)
            logger.info(f"Image saved to: {filepath.absolute()}")

            return str(filepath)
        except Exception:
            logger.exception("Failed to save image")
            return ""

    @staticmethod
    def _resize_and_pad_image(image: np.ndarray):
        """
        Resize and pad image to 640x640 while maintaining aspect ratio.
        Returns the processed image and transformation metadata.
        """
        height, width = image.shape[:2]

        # If already 640x640, no transformation needed
        if height == ImageService.TARGET_SIZE and width == ImageService.TARGET_SIZE:
            return image, None

        logger.info(
            f"Resizing image from {width}x{height} to {ImageService.TARGET_SIZE}x{ImageService.TARGET_SIZE}"
        )

        # Calculate scale to fit image within 640x640
        scale = min(ImageService.TARGET_SIZE / width, ImageService.TARGET_SIZE / height)
        new_width = int(width * scale)
        new_height = int(height * scale)

        logger.info(f"Scale: {scale}, new_width: {new_width}, new_height: {new_height}")

        # Resize image
        resized = cv2.resize(
            image, (new_width, new_height), interpolation=cv2.INTER_AREA
        )
        logger.info(f"Resized image shape: {resized.shape}")

        # Create 640x640 black canvas
        canvas = np.zeros(
            (ImageService.TARGET_SIZE, ImageService.TARGET_SIZE, 3), dtype=np.uint8
        )

        # Calculate padding offsets to center the image
        pad_top = (ImageService.TARGET_SIZE - new_height) // 2
        pad_left = (ImageService.TARGET_SIZE - new_width) // 2

        # Place resized image on canvas
        canvas[pad_top : pad_top + new_height, pad_left : pad_left + new_width] = (
            resized
        )

        # Return transformation metadata
        transform = {
            "original_width": width,
            "original_height": height,
            "new_width": new_width,
            "new_height": new_height,
            "pad_left": pad_left,
            "pad_top": pad_top,
            "scale": scale,
        }

        return canvas, transform

    @staticmethod
    def load_image_from_url(image_url):
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            raise ValueError(f"Failed to download image ({type(e).__name__})") from None
        image_bytes = io.BytesIO(response.content)
        pil_image = Image.open(image_bytes)
        numpy_image = np.array(pil_image)
        bgr_image = cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)

        # Save original image from URL
        # ImageService._save_image(bgr_image, prefix="original_url")

        processed_image, transform = ImageService._resize_and_pad_image(bgr_image)

        # Save processed image (resized and padded)
        ImageService._save_image(processed_image, prefix="processed_url")

        return processed_image, numpy_image.shape, transform

    @staticmethod
    def load_image_from_upload(base64_string):
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        image_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Save original uploaded image
        ImageService._save_image(image, prefix="original_upload")

        processed_image, transform = ImageService._resize_and_pad_image(image)

        # Save processed image (resized and padded)
        ImageService._save_image(processed_image, prefix="processed_upload")

        return (
            processed_image,
            {
                "width": image.shape[1],
                "height": image.shape[0],
            },
            transform,
        )
