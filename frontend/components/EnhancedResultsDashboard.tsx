'use client'

import { useMemo } from 'react'
import ResultsDashboard from './ResultsDashboard'
import { usePVWatts } from '@/hooks/usePVWatts'

interface RoofPanelsData {
  roof_id: number
  panels: any[]
  panel_count: number
  module_type: string
  module_specs: any
  coords: any[]
  pitch: number
  azimuth: number
}

interface EnhancedResultsDashboardProps {
  panelGenerationData: {
    roofs: RoofPanelsData[]
    max_panels: number
    module: string
  } | null
  mapCenter?: {
    lat: number
    lng: number
  }
}

/**
 * Enhanced Results Dashboard that automatically uses roof pitch/azimuth for PVWatts
 * This component extracts roof data from panel generation response and passes it to PVWatts
 */
export default function EnhancedResultsDashboard({
  panelGenerationData,
  mapCenter
}: EnhancedResultsDashboardProps) {
  // Calculate aggregated panel data
  const aggregatedData = useMemo(() => {
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

  // Fetch PVWatts data using the hook
  const { data: pvwattsData, isLoading } = usePVWatts({
    latitude: mapCenter?.lat,
    longitude: mapCenter?.lng,
    panelCount: aggregatedData?.totalPanels || 0,
    panelWattage: aggregatedData?.panelWattage || 400,
    roofData: {
      pitch: aggregatedData?.avgPitch,
      azimuth: aggregatedData?.avgAzimuth
    },
    autoFetch: true
  })

  if (!aggregatedData) {
    return null
  }

  return (
    <ResultsDashboard
      panelCount={aggregatedData.totalPanels}
      systemSize={aggregatedData.systemSize}
      annualProduction={pvwattsData?.annual_production}
      latitude={mapCenter?.lat}
      longitude={mapCenter?.lng}
      panelWattage={aggregatedData.panelWattage}
      tilt={aggregatedData.avgPitch}
      azimuth={aggregatedData.avgAzimuth}
    />
  )
}
