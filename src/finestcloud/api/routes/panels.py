"""Panel generation API routes."""

from fastapi import APIRouter

from finestcloud.api.models import GeneratePanelsRequest, PanelGenerationResponse
from finestcloud.services.panel_service import PanelService

router = APIRouter()


@router.post("/generate_panels", response_model=PanelGenerationResponse)
def generate_panels(request: GeneratePanelsRequest) -> PanelGenerationResponse:
    """Generate optimally placed solar panels on the provided roof polygons."""
    generator = PanelService(
        bounds=request.map_bounds.model_dump(),
        edge_padding_cm=request.padding,
        spacing_cm=request.spacing,
        panel_orientation=request.panel_orientation,
        panel_specs=request.panel_specs.model_dump(),
    )
    results = generator.generate_panels(
        roofs=[roof.model_dump() for roof in request.roofs],
        objects=[obj.model_dump() for obj in request.objects],
    )
    return PanelGenerationResponse(**results)
