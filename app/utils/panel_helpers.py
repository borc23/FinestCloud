"""
Panel generation utilities and helper functions.

This module contains utility functions for panel generation operations
that are shared across multiple routes.
"""

import logging
from typing import Any, Dict, Tuple

from app.services.cache_service import CacheKeys, CacheManager
from app.services.panel_service import PanelService

logger = logging.getLogger(__name__)


def create_panel_generator(
    data: Dict[str, Any], cache_manager: CacheManager
) -> PanelService:
    """
    Create and configure a PanelService instance.

    Args:
        data: Request data containing configuration
        cache_manager: Cache manager instance

    Returns:
        Configured PanelService instance
    """
    custom_module = cache_manager.get(CacheKeys.CUSTOM_MODULE)
    generator = PanelService(
        bounds=data["mapBounds"],
        resolution=data["resolution"],
        custom_module=custom_module,
        edge_padding_cm=data.get("edge_padding_cm", 20),
    )
    generator.set_module(data["module"])
    return generator


def get_map_dimensions(
    data: Dict[str, Any], cache_manager: CacheManager
) -> Tuple[int, int]:
    """
    Get map dimensions from cache or request data.

    Args:
        data: Request data
        cache_manager: Cache manager instance

    Returns:
        Tuple of (width, height) dimensions
    """
    image_shape = cache_manager.get(CacheKeys.IMAGE_SHAPE)
    return image_shape if image_shape else data["mapDimensions"]


def execute_panel_generation(
    generator: PanelService, data: Dict[str, Any], cache_manager: CacheManager
) -> Dict[str, Any]:
    """
    Execute panel generation with the given generator and data.

    Args:
        generator: Configured PanelService instance
        data: Request data
        cache_manager: Cache manager instance

    Returns:
        Panel generation results
    """
    dims = get_map_dimensions(data, cache_manager)
    return generator.generate_panels(
        roofs=data["roofs"],
        objects=data["objects"],
        map_dimensions=dims,
        tune_params=True,
    )


def cache_generation_results(
    cache_manager: CacheManager, results: Dict[str, Any], data: Dict[str, Any]
) -> None:
    """
    Cache panel generation results.

    Args:
        cache_manager: Cache manager instance
        results: Generation results to cache
        data: Request data containing configuration
    """
    cache_manager.set(CacheKeys.ALL_PANELS, results["roofs"])
    cache_manager.set(CacheKeys.MAX_PANELS, results["max_panels"])
    cache_manager.set(CacheKeys.MODULE, data["module"])
    cache_manager.set(CacheKeys.RESOLUTION, data["resolution"])


def validate_cached_panels(cache_manager: CacheManager) -> Tuple[Any, Any, Any]:
    """
    Validate and retrieve cached panel data.

    Args:
        cache_manager: Cache manager instance

    Returns:
        Tuple of (all_panels, max_panels, module_data)

    Raises:
        SessionDataError: If required cache data is missing
    """
    from flask import session

    from app.utils.exceptions import SessionDataError

    cached_data = cache_manager.get_multiple(
        CacheKeys.ALL_PANELS, CacheKeys.MAX_PANELS, CacheKeys.MODULE
    )

    all_panels = cached_data[CacheKeys.ALL_PANELS]
    max_panels = cached_data[CacheKeys.MAX_PANELS]
    module_data = cached_data[CacheKeys.MODULE]

    if not all_panels or not max_panels:
        session["has_panels"] = False
        raise SessionDataError("No panels generated. Please generate panels first")

    return all_panels, max_panels, module_data
