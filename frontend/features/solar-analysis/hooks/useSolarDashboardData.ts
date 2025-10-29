import { useMemo } from 'react'
import { usePanelData } from '@/features/solar-panels/hooks/usePanelData'
import { usePVWatts } from '@/features/solar-analysis/hooks/usePVWatts'
import { useSolarShade } from '@/features/solar-analysis/hooks/useSolarShade'
import { isComplexData } from '@/features/solar-analysis/types/result_dashboard'
import type { SolarResultsDashboardProps } from '@/features/solar-analysis/types/result_dashboard'

interface PanelData {
  totalPanels: number
  systemSize: number
  panelWattage: number
  avgPitch: number
  avgAzimuth: number
}

interface Location {
  lat: number
  lng: number
}

/**
 * Custom hook that prepares and aggregates all data needed for the solar dashboard
 */
export function useSolarDashboardData(props: SolarResultsDashboardProps) {
  // Extract and process panel data
  const generatedPanelData = isComplexData(props) ? usePanelData(props.panelGenerationData) : null

  const panelData: PanelData | null = useMemo(() => {
    if (isComplexData(props) && generatedPanelData) {
      return {
        ...generatedPanelData,
        totalPanels: props.currentPanelCount ?? generatedPanelData.totalPanels,
        systemSize: props.currentPanelCount
          ? (props.currentPanelCount * generatedPanelData.panelWattage) / 1000
          : generatedPanelData.systemSize
      }
    }

    // Handle SimpleDataProps
    if (!isComplexData(props)) {
      return {
        totalPanels: props.panelCount,
        systemSize: props.systemSize,
        panelWattage: props.panelWattage || 400,
        avgPitch: props.tilt || 20,
        avgAzimuth: props.azimuth || 180
      }
    }

    return null
  }, [props, generatedPanelData])

  // Extract location data
  const location: Location | undefined = useMemo(() => {
    if (isComplexData(props)) {
      return props.mapCenter
    }
    if (props.latitude && props.longitude) {
      return { lat: props.latitude, lng: props.longitude }
    }
    return undefined
  }, [props])

  // Fetch PVWatts data
  const { data: pvwattsData, isLoading } = usePVWatts({
    latitude: location?.lat,
    longitude: location?.lng,
    panelCount: panelData?.totalPanels || 0,
    panelWattage: panelData?.panelWattage || 400,
    roofData: {
      pitch: panelData?.avgPitch,
      azimuth: panelData?.avgAzimuth
    },
    autoFetch: true
  })

  // Fetch shade analysis
  const { shadeData, getShadeImpact } = useSolarShade({
    latitude: location?.lat,
    longitude: location?.lng,
    autoFetch: true
  })

  // Calculate production with shade adjustment
  const rawAnnualProduction = pvwattsData?.annual_production ||
    (!isComplexData(props) ? props.annualProduction : undefined)

  const shadeLossFactor = shadeData?.shadeLossFactor ?? 1.0
  const annualProduction = rawAnnualProduction
    ? Math.round(rawAnnualProduction * shadeLossFactor)
    : undefined

  // Calculate shade impact
  const shadeImpact = annualProduction && shadeData && panelData
    ? getShadeImpact(panelData.totalPanels, rawAnnualProduction!, 0.37)
    : null

  return {
    panelData,
    location,
    pvwattsData,
    isLoading,
    annualProduction,
    shadeImpact,
    costEstimate: props.costEstimate
  }
}
