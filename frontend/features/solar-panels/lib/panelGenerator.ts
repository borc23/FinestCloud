import { StyleConfig } from '../../../shared/utils/styleConfig'
import { tagPanelWithGrid } from '@/features/solar-panels/utils/gridSnapping'
import type {
  PanelGenerationResponse,
  RoofPanelData,
  Panel,
  Coordinate,
  SolarDataSegment
} from '@/features/solar-panels/types/panel'
import type { GeoTIFFData } from '@/features/solar-analysis/utils/geotiffParser'
import { calculateCentroid, getValuesAtCoordinates } from '@/features/solar-analysis/utils/geotiffParser'

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
  geotiffData?: GeoTIFFData | null // Optional GeoTIFF data for sunshine values
}

interface PanelGenerationResult {
  markers: google.maps.Polygon[]
  totalPanels: number
}

/**
 * Enrich panel data with annual sunshine values from GeoTIFF
 * Modifies panelData in place
 */
function enrichPanelsWithSunshine(
  panelData: PanelGenerationResponse,
  geotiffData: GeoTIFFData
): void {
  console.log('Enriching panels with sunshine data...')

  panelData.roofs?.forEach((roof: RoofPanelData) => {
    if (!roof.panels || !Array.isArray(roof.panels)) return

    // Collect all panel centroids for batch query
    const centroids = roof.panels.map((panel: Panel) => {
      const coords = panel.coords || []
      return calculateCentroid(coords)
    })

    // Query all sunshine values at once (more efficient)
    const sunshineValues = getValuesAtCoordinates(geotiffData, centroids, 1) // 1m north offset

    // Assign sunshine values to panels
    roof.panels.forEach((panel: Panel, index: number) => {
      const sunshineValue = sunshineValues[index]
      if (sunshineValue !== null) {
        panel.annualSunshineKwh = sunshineValue
        console.log(`Panel ${index} sunshine: ${sunshineValue.toFixed(2)} kWh/m²/year`)
      } else {
        console.warn(`Panel ${index} has no sunshine data (out of bounds or no-data)`)
      }
    })
  })

  console.log('Panel sunshine enrichment complete')
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
  onFirstPanelPlaced,
  geotiffData
}: GeneratePanelsParams): Promise<PanelGenerationResult> {
  // Enrich panels with sunshine data if available
  if (geotiffData) {
    enrichPanelsWithSunshine(panelData, geotiffData)
  }
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

    tagPanelWithGrid(polygon, gridId)

    await new Promise(resolve => setTimeout(resolve, 10))
    polygon.setOptions({
      fillOpacity: options.fillOpacity,
      strokeOpacity: options.strokeOpacity
    })

    newMarkers.push(polygon)

    if (i === 0) {
      onFirstPanelPlaced?.()
    }
  }

  return { markers: newMarkers, totalPanels }
}

/**
 * Calculate system results from panel data
 * Uses per-panel sunshine values if available, falls back to solar API data
 */
export function calculateSystemResults(
  totalPanels: number,
  solarDataResults: SolarDataSegment[] | null,
  panelData?: PanelGenerationResponse | null
): {
  systemSize: number
  annualProduction?: number
} {
  const systemSize = (totalPanels * 400) / 1000

  // Try to calculate from per-panel sunshine data first (more accurate)
  if (panelData?.roofs) {
    let totalAnnualProduction = 0
    let panelsWithData = 0

    panelData.roofs.forEach((roof: RoofPanelData) => {
      const moduleSpecs = roof.module_specs
      const panelEfficiency = moduleSpecs?.efficiency || 0.2 // Default 20% efficiency
      const panelAreaM2 = ((moduleSpecs?.width_cm || 100) * (moduleSpecs?.height_cm || 170)) / 10000 // cm² to m²

      roof.panels?.forEach((panel: Panel) => {
        if (panel.annualSunshineKwh !== undefined && panel.annualSunshineKwh !== null) {
          // Energy = Solar radiation (kWh/m²/year) × Panel area (m²) × Efficiency
          const panelAnnualEnergy = panel.annualSunshineKwh * panelAreaM2 * panelEfficiency
          totalAnnualProduction += panelAnnualEnergy
          panelsWithData++
        }
      })
    })

    if (panelsWithData > 0) {
      console.log(`Calculated energy from ${panelsWithData} panels with sunshine data: ${totalAnnualProduction.toFixed(2)} kWh/year`)
      return {
        systemSize,
        annualProduction: totalAnnualProduction
      }
    }
  }

  // Fallback to old calculation method using Solar API data
  const annualProduction = solarDataResults?.reduce((sum: number, segment: SolarDataSegment) => {
    const stats = segment.solarData?.solarPotential?.solarPanels
    return sum + (stats?.yearlyEnergyDcKwh || 0)
  }, 0)

  return {
    systemSize,
    annualProduction: annualProduction || undefined
  }
}
