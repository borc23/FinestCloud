import { useMemo } from 'react'
import type { RoofPanelsData, PanelGenerationData } from '../types/result_dashboard'

interface AggregatedPanelData {
  totalPanels: number
  systemSize: number
  panelWattage: number
  avgPitch: number
  avgAzimuth: number
}

/**
 * Hook to aggregate panel data from multiple roofs
 * Calculates total panels, system size, and weighted averages for pitch/azimuth
 */
export function usePanelData(panelGenerationData: PanelGenerationData | null): AggregatedPanelData | null {
  return useMemo(() => {
    if (!panelGenerationData || !panelGenerationData.roofs.length) {
      return null
    }

    const totalPanels = panelGenerationData.roofs.reduce(
      (sum, roof) => sum + roof.panel_count,
      0
    )

    // Get panel wattage from first roof's module specs
    const firstRoof = panelGenerationData.roofs[0]
    const panelWattage = firstRoof?.module_specs?.power || 400

    // Calculate system size (kW)
    const systemSize = (totalPanels * panelWattage) / 1000

    // Get weighted average pitch and azimuth (weighted by panel count)
    let totalPitchWeight = 0
    let totalAzimuthWeight = 0
    let totalWeight = 0

    panelGenerationData.roofs.forEach((roof) => {
      totalPitchWeight += (roof.pitch || 20) * roof.panel_count
      totalAzimuthWeight += (roof.azimuth || 180) * roof.panel_count
      totalWeight += roof.panel_count
    })

    const avgPitch = totalWeight > 0 ? totalPitchWeight / totalWeight : 20
    const avgAzimuth = totalWeight > 0 ? totalAzimuthWeight / totalWeight : 180

    return {
      totalPanels,
      systemSize,
      panelWattage,
      avgPitch,
      avgAzimuth
    }
  }, [panelGenerationData])
}
