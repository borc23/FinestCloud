"""Panel module configuration API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_cache_manager, get_session_service
from app.api.models import CustomModuleRequest, CustomModuleResponse, ModulesResponse
from app.dataclasses.config import PanelModule
from app.services.cache_service import CacheKeys, CacheManager
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/panel_modules", response_model=ModulesResponse)
async def get_panel_modules() -> ModulesResponse:
    """
    Get available panel module types.

    Returns a list of predefined solar panel module specifications.
    """
    try:
        modules = {module.name: module.value for module in PanelModule}
        return ModulesResponse(modules=modules)

    except Exception as e:
        logger.error(f"Failed to get panel modules: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to get panel modules: {str(e)}"
        )


@router.post("/custom_module", response_model=CustomModuleResponse)
async def create_custom_module(
    request: CustomModuleRequest,
    cache_manager: CacheManager = Depends(get_cache_manager),
    session_service: SessionService = Depends(get_session_service),
) -> CustomModuleResponse:
    """
    Create a custom solar panel module.

    Creates a custom panel module with user-defined specifications.
    """
    try:
        # Convert Pydantic model to dict format expected by existing logic
        specs = request.specs.dict()
        custom_module_data = PanelModule.create_custom(specs)

        session_service.ensure_initialized()
        cache_manager.set(CacheKeys.CUSTOM_MODULE, custom_module_data)

        logger.info(f"Custom module created: {request.specs.name}")

        return CustomModuleResponse(module=custom_module_data)

    except Exception as e:
        logger.error(f"Custom module creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Custom module creation failed: {str(e)}"
        )
