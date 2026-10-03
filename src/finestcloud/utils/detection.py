from finestcloud.services.detection_service import get_detection_service
from finestcloud.services.image_service import ImageService


def process_detection(image_data, is_url=True, bounds=None, conf=0.5, epsilon=0.0075):
    """Common detection logic for both detection routes"""
    image, shape, transform = (
        ImageService.load_image_from_url(image_data)
        if is_url
        else ImageService.load_image_from_upload(image_data)
    )

    return (
        get_detection_service().detect_roofs(
            image, bounds, conf=conf, epsilon=epsilon, transform=transform
        ),
        shape,
    )
