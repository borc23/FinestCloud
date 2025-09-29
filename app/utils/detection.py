from app.services.service_factory import ServiceFactory

# import cv2


def process_detection(image_data, is_url=True, bounds=None, conf=0.5, epsilon=0.0075):
    """Common detection logic for both detection routes"""
    image_service = ServiceFactory.get_image_service()
    detection_service = ServiceFactory.get_detection_service()

    image, shape = (
        image_service.load_image_from_url(image_data)
        if is_url
        else image_service.load_image_from_upload(image_data)
    )

    # cv2.imwrite("temp_image.jpg", image)

    return (
        detection_service.detect_roofs(
            image, bounds or None, conf=conf, epsilon=epsilon
        ),
        shape,
    )
