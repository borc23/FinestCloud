import { StyleConfig } from "../../../shared/utils/styleConfig";
import { tagPanelWithGrid } from "@/features/solar-panels/utils/gridSnapping";
import { calculateCentroid } from "@/features/map-drawing/utils/polygonUtils";
import type { PanelGenerationResponse } from "@/features/solar-panels/types/panel";
import type { GeoTIFFData } from "@/features/solar-analysis/utils/geotiffParser";

interface GeneratePanelsParams {
  panelData: PanelGenerationResponse;
  map: google.maps.Map;
  onProgress?: (current: number, total: number) => void;
  onFirstPanelPlaced?: () => void;
  geotiffData?: GeoTIFFData | null; // Optional GeoTIFF data for sunshine values
}

const ANIMATION_DELAY = 15; // ms between each panel
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enrich panel data with annual sunshine values from GeoTIFF
 * Modifies panelData in place
 */
async function enrichPanelsWithSunshine(
  panelData: PanelGenerationResponse,
  geotiffData: GeoTIFFData,
): Promise<void> {
  // Dynamic import to avoid SSR/hydration issues with geotiff
  const { getValuesAtCoordinates } = await import(
    "@/features/solar-analysis/utils/geotiffParser"
  );

  for (const roof of panelData.roofs || []) {
    if (!Array.isArray(roof.panels)) continue;

    const sunshineValues = getValuesAtCoordinates(
      geotiffData,
      roof.panels.map((panel) => calculateCentroid(panel.coords || [])),
    );
    roof.panels.forEach((panel, index) => {
      const value = sunshineValues[index];
      if (value !== null) panel.annualSunshineKwh = value;
    });
  }
}

/**
 * Generate and animate solar panel polygons on the map
 *
 * @returns The created panel polygons, each tagged with its roof's grid
 */
export async function generateAndAnimatePanels({
  panelData,
  map,
  onProgress,
  onFirstPanelPlaced,
  geotiffData,
}: GeneratePanelsParams): Promise<google.maps.Polygon[]> {
  if (geotiffData) {
    await enrichPanelsWithSunshine(panelData, geotiffData);
  }

  // Collect all panel paths, tagging each with its roof's gridId
  const allPanels = (panelData.roofs || []).flatMap((roof, gridId) =>
    (Array.isArray(roof.panels) ? roof.panels : [])
      .filter((panel) => Array.isArray(panel.coords))
      .map((panel) => ({
        path: panel.coords.map(({ lat, lng }) => ({ lat, lng })),
        gridId,
      })),
  );

  const options = StyleConfig.getPanelOptions("default");
  const markers: google.maps.Polygon[] = [];

  // Animate panels appearing one by one
  for (let i = 0; i < allPanels.length; i++) {
    await sleep(ANIMATION_DELAY);
    onProgress?.(i + 1, allPanels.length);

    const polygon = new google.maps.Polygon({
      paths: allPanels[i].path,
      map,
      ...options,
      isPanelElement: true,
      fillOpacity: 0,
      strokeOpacity: 0,
    } as google.maps.PolygonOptions & { isPanelElement: boolean });
    tagPanelWithGrid(polygon, allPanels[i].gridId);

    await sleep(10);
    polygon.setOptions({
      fillOpacity: options.fillOpacity,
      strokeOpacity: options.strokeOpacity,
    });

    markers.push(polygon);
    if (i === 0) onFirstPanelPlaced?.();
  }

  return markers;
}
