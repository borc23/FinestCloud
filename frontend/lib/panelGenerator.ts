import { StyleConfig } from '../utils/styleConfig'
import { tagPanelWithGrid } from '../utils/gridSnapping'
import type {
  PanelGenerationResponse,
  RoofPanelData,
  Panel,
  Coordinate,
  SolarDataSegment
} from '../types/panel'

interface PanelData {
  path: Coordinate[]
  options: google.maps.PolygonOptions
  gridId: number
}

interface GeneratePanelsParams {
  panelData: PanelGenerationResponse
  map: google.maps.Map
  onProgress?: (current: number, total: number) => void
  onFirstPanelPlaced?: () => void
}

interface PanelGenerationResult {
  markers: google.maps.Polygon[]
  totalPanels: number
}

/**
 * Generate and animate solar panel polygons on the map
 *
 * @param params - Panel generation parameters
 * @returns Array of created polygon markers and total panel count
 */
export async function generateAndAnimatePanels({
  panelData,
  map,
  onProgress,
  onFirstPanelPlaced
}: GeneratePanelsParams): Promise<PanelGenerationResult> {
  const allPanelData: PanelData[] = []
  let totalPanels = 0

  // Collect all panel data first, tagging each with its roof's gridId
  if (panelData.roofs) {
    panelData.roofs.forEach((roof: RoofPanelData, roofIndex: number) => {
      if (roof.panels && Array.isArray(roof.panels)) {
        totalPanels += roof.panels.length

        roof.panels.forEach((panel: Panel) => {
          const panelCoords = panel.coords || panel
          const path = Array.isArray(panelCoords)
            ? panelCoords.map((coord: Coordinate) => ({
                lat: coord.lat,
                lng: coord.lng
              }))
            : []

          const panelOptions = StyleConfig.getPanelOptions('default', 'STANDARD')
          allPanelData.push({ path, options: panelOptions, gridId: roofIndex })
        })
      }
    })
  }

  // Animate panels appearing one by one
  const newMarkers: google.maps.Polygon[] = []
  const ANIMATION_DELAY = 15 // ms between each panel

  for (let i = 0; i < allPanelData.length; i++) {
    await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY))

    onProgress?.(i + 1, allPanelData.length)

    const { path, options, gridId } = allPanelData[i]

    const polygon = new google.maps.Polygon({
      paths: path,
      map: map,
      ...options,
      clickable: true,
      isPanelElement: true,
      moduleType: 'STANDARD',
      fillOpacity: 0,
      strokeOpacity: 0
    } as google.maps.PolygonOptions & { isPanelElement: boolean; moduleType: string })

    // Tag panel with its grid ID for O(1) snapping lookup
    tagPanelWithGrid(polygon, gridId)

    // Snap-in animation - await to ensure deterministic timing
    await new Promise(resolve => setTimeout(resolve, 10))
    polygon.setOptions({
      fillOpacity: options.fillOpacity,
      strokeOpacity: options.strokeOpacity
    })

    newMarkers.push(polygon)

    // Call callback after first panel is placed
    if (i === 0) {
      onFirstPanelPlaced?.()
    }
  }

  return { markers: newMarkers, totalPanels }
}

/**
 * Calculate system results from panel data and solar data
 */
export function calculateSystemResults(
  totalPanels: number,
  solarDataResults: SolarDataSegment[] | null
): {
  systemSize: number
  annualProduction?: number
} {
  const systemSize = (totalPanels * 400) / 1000

  const annualProduction = solarDataResults?.reduce((sum: number, segment: SolarDataSegment) => {
    const stats = segment.solarData?.solarPotential?.solarPanels
    return sum + (stats?.yearlyEnergyDcKwh || 0)
  }, 0)

  return {
    systemSize,
    annualProduction: annualProduction || undefined
  }
}
