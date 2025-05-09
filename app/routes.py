"""
Solar panel detection and configuration API routes.

This module contains routes for the solar panel detection and configuration API.
Routes are organized by functionality (detection, panel generation, utilities).
"""

import logging
import uuid

import requests
from flask import (Blueprint, Response, current_app, jsonify, render_template,
                   request, session)

from app.dataclasses.config import PanelModule
from app.services import schemas
from app.services.panel_service import PanelService
from app.utils.decorators import handle_exceptions
from app.utils.detection import process_detection
from app.utils.exceptions import APIRequestError, SessionDataError
from app.utils.utils import (CustomModuleResult, DetectionResult, ModuleResult,
                             PanelResult, ResetResult)

logger = logging.getLogger(__name__)
main = Blueprint("main", __name__)

# Cache key patterns
def get_cache_key(key_type: str) -> str:
    """Generate a cache key for the current session."""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return f"{key_type}_{session['session_id']}"

# Helper functions
def ensure_session_initialized() -> str:
    """Ensure session is initialized and return session ID."""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return session['session_id']

def check_panels_exist() -> None:
    """Check if panels exist in the current session."""
    if 'session_id' not in session:
        raise SessionDataError("No active session. Please generate panels first")
    
    if not session.get('has_panels', False):
        raise SessionDataError("No panels generated. Please generate panels first")

#
# View Routes
#
@main.route("/")
def index() -> str:
    """Render the main map page."""
    api_key = current_app.config.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        logger.error("GOOGLE_MAPS_API_KEY not found in app config!")
        return "Server configuration error: Missing API Key", 500 
    return render_template(
        "map.html",
        api_key=api_key,
    )

#
# Detection Routes
#
@main.route("/detect", methods=["POST"])
@handle_exceptions
def detect() -> Response:
    schema = schemas.DetectSchema()
    data = schema.load(request.get_json() or {})

    (roofs, objects), _ = process_detection(
        image_data=data["image"], 
        is_url=True, 
        bounds=data["bounds"]
    )

    ensure_session_initialized()
    current_app.cache.delete(get_cache_key("image_shape"))

    result: DetectionResult = {
        "success": True, 
        "roofs": roofs, 
        "objects": objects
    }
    return jsonify(result)

@main.route("/detect_image", methods=["POST"])
@handle_exceptions
def detect_image() -> Response:
    schema = schemas.DetectImageSchema()
    data = schema.load(request.get_json() or {})

    (roofs, objects), image_shape = process_detection(
        image_data=data["image"], 
        is_url=False, 
        bounds=data["bounds"]
    )
    
    ensure_session_initialized()
    current_app.cache.set(get_cache_key("image_shape"), image_shape)

    result: DetectionResult = {
        "success": True, 
        "roofs": roofs, 
        "objects": objects
    }
    return jsonify(result)

#
# Panel Generation Routes
#
@main.route("/generate_panels", methods=["POST"])
@handle_exceptions
def generate_panels() -> Response:
    schema = schemas.GeneratePanelsSchema()
    data = schema.load(request.get_json() or {})

    session_id = ensure_session_initialized()
    logger.debug(f"Generating panels for session {session_id}")

    custom_module = current_app.cache.get(get_cache_key("custom_module"))

    generator = PanelService(
        bounds=data["mapBounds"], 
        resolution=data["resolution"], 
        custom_module=custom_module
    )
    generator.set_module(data["module"])

    image_shape = current_app.cache.get(get_cache_key("image_shape"))
    dims = image_shape if image_shape else data["mapDimensions"]
    # logging.info(f"==========================================================")
    # logging.info(f"data[roofs]: {data['roofs']}")
    # logging.info(f"==========================================================")
    results = generator.generate_panels(
        roofs=data["roofs"], 
        objects=data["objects"], 
        map_dimensions=dims, 
        tune_params=True
    )
    
    cache = current_app.cache
    cache.set(get_cache_key("all_panels"), results["roofs"])
    cache.set(get_cache_key("max_panels"), results["max_panels"])
    cache.set(get_cache_key("module"), data["module"])
    cache.set(get_cache_key("resolution"), data["resolution"])

    session['has_panels'] = True
    logger.info(f"Panels generated and stored in cache for session {session_id}")

    result: PanelResult = {"success": True, "results": results}
    return jsonify(result)

@main.route("/update_panel_count", methods=["POST"])
@handle_exceptions
def update_panel_count() -> Response:
    check_panels_exist()
    session_id = session['session_id']
    logger.debug(f"Updating panel count for session {session_id}")

    cache = current_app.cache
    all_panels = cache.get(get_cache_key("all_panels"))
    max_panels = cache.get(get_cache_key("max_panels"))
    module_data = cache.get(get_cache_key("module"))

    if not all_panels or not max_panels:
        session['has_panels'] = False
        raise SessionDataError("No panels generated. Please generate panels first")

    schema = schemas.UpdatePanelCountSchema()
    data = request.get_json()
    panel_count = int(data["panel_count"])

    if "resolution" in data:
        resolution = data["resolution"]
    else:
        resolution = cache.get(get_cache_key("resolution"))
        if not resolution:
            raise SessionDataError("No resolution found in session. Please generate panels first")

    custom_module = cache.get(get_cache_key("custom_module"))
    generator = PanelService(
        bounds=data["mapBounds"],
        resolution=resolution,
        custom_module=custom_module
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
    check_panels_exist()
    session_id = session['session_id']
    logger.debug(f"Updating max panel count for session {session_id}")

    cache = current_app.cache

    # Get the current values
    all_panels = cache.get(get_cache_key("all_panels"))
    current_max = cache.get(get_cache_key("max_panels"))

    if not all_panels or not current_max:
        session['has_panels'] = False
        raise SessionDataError("No panels generated. Please generate panels first")

    schema = schemas.UpdateMaxPanelCountSchema()
    data = schema.load(request.get_json() or {})
    new_panel_count = data["max_panel_count"]

    # Update the max panels count in the cache
    cache.set(get_cache_key("max_panels"), new_panel_count)
    logger.info(f"Max panel count updated to {new_panel_count} for session {session_id}")

    result = {
        "success": True,
        "max_panels": new_panel_count
    }
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

    ensure_session_initialized()
    current_app.cache.set(get_cache_key("custom_module"), custom_module_data)
    
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
        
    lat = data['latitude']
    lng = data['longitude']
    
    api_key = current_app.config.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        logger.error("GOOGLE_MAPS_API_KEY not found in app config during API proxy request!")
        raise APIRequestError("Server configuration error: Missing API Key")

    api_url = "https://solar.googleapis.com/v1/buildingInsights:findClosest"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "requiredQuality": "MEDIUM",
        "key": api_key
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
    if 'session_id' in session:
        cache_keys = [
            "image_shape",
            "custom_module",
            "all_panels",
            "max_panels",
            "module",
            "resolution",
        ]

        cache = current_app.cache
        for key in cache_keys:
            cache.delete(get_cache_key(key))

    session['session_id'] = str(uuid.uuid4())
    session['has_panels'] = False

    result: ResetResult = {
        "success": True, 
        "message": "Session reset successfully."
    }
    return jsonify(result)