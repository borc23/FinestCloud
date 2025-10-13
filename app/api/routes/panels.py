"""Panel generation API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_cache_manager, get_session_service
from app.api.models import (
    GeneratePanelsRequest,
    MaxPanelCountResponse,
    PanelGenerationResponse,
    UpdateMaxPanelCountRequest,
    UpdatePanelCountRequest,
)
from app.services.cache_service import CacheKeys, CacheManager
from app.services.panel_service import PanelService
from app.services.session_service import SessionService
from app.utils.exceptions import SessionDataError
from app.utils.panel_helpers import (
    cache_generation_results,
    create_panel_generator,
    execute_panel_generation,
    validate_cached_panels,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate_panels", response_model=PanelGenerationResponse)
async def generate_panels(
    request: GeneratePanelsRequest,
    cache_manager: CacheManager = Depends(get_cache_manager),
    session_service: SessionService = Depends(get_session_service),
) -> PanelGenerationResponse:
    """
    Generate solar panels on detected roofs.

    Generates optimally placed solar panels on the provided roof polygons.
    """
    try:
        session_id = session_service.ensure_initialized()
        logger.debug(f"Generating panels for session {session_id}")

        data = {
            "roofs": [roof.dict() for roof in request.roofs],
            "objects": [obj.dict() for obj in request.objects],
            "mapBounds": request.mapBounds.dict(),
            "spacing": request.spacing,
            "max_panels": request.max_panels,
            "padding": request.padding,
            "panelOrientation": request.panelOrientation,
            "panel_specs": request.panel_specs.dict() if request.panel_specs else None,
        }

        logger.info(f"Received roofs data: {data['roofs']}")
        generator = create_panel_generator(data, cache_manager)
        results = execute_panel_generation(generator, data)

        cache_generation_results(cache_manager, results, data)
        session_service.mark_panels_generated()

        logger.info(f"Panels generated and stored in cache for session {session_id}")

        return PanelGenerationResponse(**results)

    except Exception as e:
        logger.error(f"Panel generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Panel generation failed: {str(e)}"
        )


@router.post("/generate_panels_selective", response_model=PanelGenerationResponse)
async def generate_panels_selective(
    request: GeneratePanelsRequest,
    cache_manager: CacheManager = Depends(get_cache_manager),
    session_service: SessionService = Depends(get_session_service),
) -> PanelGenerationResponse:
    """
    Generate panels on selected roofs only.

    Generates panels on selected roofs while preserving existing panels on other roofs.
    """
    try:
        session_id = session_service.ensure_initialized()
        logger.debug(f"Generating panels selectively for session {session_id}")

        # Convert Pydantic models to dict format
        data = {
            "roofs": [roof.dict() for roof in request.roofs],
            "objects": [obj.dict() for obj in request.objects],
            "mapBounds": request.mapBounds.dict(),
            "spacing": request.spacing,
            "max_panels": request.max_panels,
            "padding": request.padding,
            "panel_specs": request.panel_specs.dict() if request.panel_specs else None,
        }

        generator = create_panel_generator(data, cache_manager)
        results = execute_panel_generation(generator, data)

        logger.info(
            f"Selective panels generated for {len(request.roofs)} roofs in session {session_id}"
        )

        return PanelGenerationResponse(**results)

    except Exception as e:
        logger.error(f"Selective panel generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Selective panel generation failed: {str(e)}"
        )


@router.post("/update_panel_count", response_model=PanelGenerationResponse)
async def update_panel_count(
    request: UpdatePanelCountRequest,
    cache_manager: CacheManager = Depends(get_cache_manager),
    session_service: SessionService = Depends(get_session_service),
) -> PanelGenerationResponse:
    """
    Update the number of visible panels.

    Adjusts the panel count while maintaining optimal placement.
    """
    try:
        session_service.validate_panels_exist()
        session_id = session_service.get_session_id()
        logger.debug(f"Updating panel count for session {session_id}")

        all_panels, max_panels = validate_cached_panels(cache_manager)

        generator = PanelService(
            bounds=request.mapBounds.dict(),
        )
        generator.all_panels = all_panels
        generator.max_panels = max_panels

        visible_panels = generator.get_visible_panels(request.panel_count)

        return PanelGenerationResponse(**visible_panels)

    except SessionDataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Panel count update failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Panel count update failed: {str(e)}"
        )


@router.post("/update_max_panel_count", response_model=MaxPanelCountResponse)
async def update_max_panel_count(
    request: UpdateMaxPanelCountRequest,
    cache_manager: CacheManager = Depends(get_cache_manager),
    session_service: SessionService = Depends(get_session_service),
) -> MaxPanelCountResponse:
    """
    Update the maximum panel count limit.

    Sets a new upper limit for the number of panels per roof.
    """
    try:
        session_service.validate_panels_exist()
        session_id = session_service.get_session_id()
        logger.debug(f"Updating max panel count for session {session_id}")

        # Get current values
        cached_data = cache_manager.get_multiple(
            CacheKeys.ALL_PANELS, CacheKeys.MAX_PANELS
        )
        all_panels = cached_data[CacheKeys.ALL_PANELS]
        current_max = cached_data[CacheKeys.MAX_PANELS]

        if not all_panels or not current_max:
            raise SessionDataError("No panels generated. Please generate panels first")

        # Update the max panels count in the cache
        cache_manager.set(CacheKeys.MAX_PANELS, request.max_panel_count)
        logger.info(
            f"Max panel count updated to {request.max_panel_count} for session {session_id}"
        )

        return MaxPanelCountResponse(max_panels=request.max_panel_count)

    except SessionDataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Max panel count update failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Max panel count update failed: {str(e)}"
        )
