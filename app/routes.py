"""
Solar panel detection and configuration API routes.

This module contains routes for the solar panel detection and configuration API.
Routes are organized by functionality (detection, panel generation, utilities).
"""

import logging

import requests
from flask import (
    Blueprint,
    Response,
    current_app,
    jsonify,
    render_template,
    request,
    session,
)

from app.dataclasses.config import PanelModule
from app.services import schemas
from app.services.cache_service import CacheKeys, CacheManager
from app.services.config_service import ConfigService
from app.services.panel_service import PanelService
from app.services.session_service import SessionService
from app.utils.decorators import handle_exceptions
from app.utils.detection import process_detection
from app.utils.exceptions import APIRequestError, SessionDataError
from app.utils.panel_helpers import (
    cache_generation_results,
    create_panel_generator,
    execute_panel_generation,
    validate_cached_panels,
)
from app.utils.utils import (
    CustomModuleResult,
    DetectionResult,
    ModuleResult,
    PanelResult,
    ResetResult,
)

logger = logging.getLogger(__name__)
main = Blueprint("main", __name__)


def get_cache_manager() -> CacheManager:
    """Get cache manager instance for the current session."""
    session_id = SessionService.ensure_initialized()
    return CacheManager(current_app.cache, session_id)


#
# View Routes
#
@main.route("/")
def index() -> str:
    """Render the main map page."""
    try:
        api_key = ConfigService.get_google_maps_api_key()
        return render_template("map.html", api_key=api_key)
    except APIRequestError:
        logger.error("GOOGLE_MAPS_API_KEY not found in app config!")
        return "Server configuration error: Missing API Key", 500


#
# Detection Routes
#
@main.route("/detect", methods=["POST"])
@handle_exceptions
def detect() -> Response:
    schema = schemas.DetectSchema()
    data = schema.load(request.get_json() or {})

    (roofs, objects), _ = process_detection(
        image_data=data["image"], is_url=True, bounds=data["bounds"]
    )

    SessionService.ensure_initialized()
    cache_manager = get_cache_manager()
    cache_manager.delete(CacheKeys.IMAGE_SHAPE)

    result: DetectionResult = {"success": True, "roofs": roofs, "objects": objects}
    return jsonify(result)


@main.route("/detect_image", methods=["POST"])
@handle_exceptions
def detect_image() -> Response:
    schema = schemas.DetectImageSchema()
    data = schema.load(request.get_json() or {})
    (roofs, objects), image_shape = process_detection(
        image_data=data["image"], is_url=False, bounds=data["bounds"]
    )

    SessionService.ensure_initialized()
    cache_manager = get_cache_manager()
    cache_manager.set(CacheKeys.IMAGE_SHAPE, image_shape)

    result: DetectionResult = {"success": True, "roofs": roofs, "objects": objects}
    return jsonify(result)


#
# Panel Generation Routes
#
@main.route("/generate_panels", methods=["POST"])
@handle_exceptions
def generate_panels() -> Response:
    schema = schemas.GeneratePanelsSchema()
    data = schema.load(request.get_json() or {})

    session_id = SessionService.ensure_initialized()
    logger.debug(f"Generating panels for session {session_id}")

    cache_manager = get_cache_manager()
    generator = create_panel_generator(data, cache_manager)
    results = execute_panel_generation(generator, data, cache_manager)

    # Cache results for non-selective generation
    cache_generation_results(cache_manager, results, data)
    SessionService.mark_panels_generated()

    logger.info(f"Panels generated and stored in cache for session {session_id}")

    result: PanelResult = {"success": True, "results": results}
    return jsonify(result)


@main.route("/generate_panels_selective", methods=["POST"])
@handle_exceptions
def generate_panels_selective() -> Response:
    """Generate panels on selected roofs only while preserving existing panels on other roofs."""
    schema = schemas.GeneratePanelsSchema()
    data = schema.load(request.get_json() or {})

    session_id = SessionService.ensure_initialized()
    logger.debug(f"Generating panels selectively for session {session_id}")

    cache_manager = get_cache_manager()
    generator = create_panel_generator(data, cache_manager)
    results = execute_panel_generation(generator, data, cache_manager)

    logger.info(
        f"Selective panels generated for {len(data['roofs'])} roofs in session {session_id}"
    )

    result: PanelResult = {"success": True, "results": results}
    return jsonify(result)


@main.route("/update_panel_count", methods=["POST"])
@handle_exceptions
def update_panel_count() -> Response:
    SessionService.validate_panels_exist()
    session_id = SessionService.get_session_id()
    logger.debug(f"Updating panel count for session {session_id}")

    cache_manager = get_cache_manager()
    all_panels, max_panels, module_data = validate_cached_panels(cache_manager)

    # schema = schemas.UpdatePanelCountSchema()
    data = request.get_json()
    panel_count = int(data["panel_count"])

    if "resolution" in data:
        resolution = data["resolution"]
    else:
        resolution = cache_manager.get(CacheKeys.RESOLUTION)
        if not resolution:
            raise SessionDataError(
                "No resolution found in session. Please generate panels first"
            )

    custom_module = cache_manager.get(CacheKeys.CUSTOM_MODULE)
    generator = PanelService(
        bounds=data["mapBounds"], resolution=resolution, custom_module=custom_module
    )
    generator.set_module(module_data)
    generator.all_panels = all_panels
    generator.max_panels = max_panels

    visible_panels = generator.get_visible_panels(panel_count)
    result: PanelResult = {"success": True, "results": visible_panels}
    return jsonify(result)


@main.route("/update_max_panel_count", methods=["POST"])
@handle_exceptions
def update_max_panel_count() -> Response:
    SessionService.validate_panels_exist()
    session_id = SessionService.get_session_id()
    logger.debug(f"Updating max panel count for session {session_id}")

    cache_manager = get_cache_manager()

    # Get the current values
    cached_data = cache_manager.get_multiple(CacheKeys.ALL_PANELS, CacheKeys.MAX_PANELS)
    all_panels = cached_data[CacheKeys.ALL_PANELS]
    current_max = cached_data[CacheKeys.MAX_PANELS]

    if not all_panels or not current_max:
        session["has_panels"] = False
        raise SessionDataError("No panels generated. Please generate panels first")

    schema = schemas.UpdateMaxPanelCountSchema()
    data = schema.load(request.get_json() or {})
    new_panel_count = data["max_panel_count"]

    # Update the max panels count in the cache
    cache_manager.set(CacheKeys.MAX_PANELS, new_panel_count)
    logger.info(
        f"Max panel count updated to {new_panel_count} for session {session_id}"
    )

    result = {"success": True, "max_panels": new_panel_count}
    return jsonify(result)


#
# Module Configuration Routes
#
@main.route("/get_panel_modules", methods=["GET"])
@handle_exceptions
def get_panel_modules() -> Response:
    modules = {module.name: module.value for module in PanelModule}
    result: ModuleResult = {"success": True, "modules": modules}
    return jsonify(result)


@main.route("/custom_module", methods=["POST"])
@handle_exceptions
def custom_module() -> Response:
    specs = request.get_json()
    custom_module_data = PanelModule.create_custom(specs)

    SessionService.ensure_initialized()
    cache_manager = get_cache_manager()
    cache_manager.set(CacheKeys.CUSTOM_MODULE, custom_module_data)

    result: CustomModuleResult = {"success": True, "module": custom_module_data}
    return jsonify(result)


#
# External API and Utility Routes
#
@main.route("/solar_api_proxy", methods=["GET"])
@handle_exceptions
def solar_api_proxy() -> Response:
    schema = schemas.SolarApiSchema()
    data = schema.load(request.args)

    lat = data["latitude"]
    lng = data["longitude"]

    api_key = ConfigService.get_google_maps_api_key()

    api_url = "https://solar.googleapis.com/v1/buildingInsights:findClosest"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "requiredQuality": "MEDIUM",
        "key": api_key,
    }

    try:
        response = requests.get(api_url, params=params, timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        logger.error(f"Google Solar API request failed: {str(e)}")
        raise APIRequestError(f"Failed to fetch solar data: {str(e)}")


@main.route("/reset_session", methods=["POST"])
@handle_exceptions
def reset_session() -> Response:
    if "session_id" in session:
        cache_manager = get_cache_manager()
        cache_manager.clear_all()

    SessionService.reset()

    result: ResetResult = {"success": True, "message": "Session reset successfully."}
    return jsonify(result)
