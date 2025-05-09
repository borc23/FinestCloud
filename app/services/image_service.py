import base64
import io

import cv2
import numpy as np
import requests
from PIL import Image


class ImageService:
    @staticmethod
    def load_image_from_url(image_url):
        response = requests.get(image_url)
        image_bytes = io.BytesIO(response.content)
        pil_image = Image.open(image_bytes)
        numpy_image = np.array(pil_image)
        return cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR), numpy_image.shape

    @staticmethod
    def load_image_from_upload(base64_string):
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        image_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return image, {
            "width": image.shape[1],
            "height": image.shape[0],
        }  # image.shape (H, W, C)
