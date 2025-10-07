import { useState, useCallback, useRef } from 'react'
import { SolarPanelApiService } from '../lib/solarPanelApi'
import { generateAndAnimatePanels, calculateSystemResults } from '../lib/panelGenerator'

interface UsePanelGenerationProps {
  map: google.maps.Map | null
  roofPolygons: google.maps.Polygon[]
  objectPolygons: google.maps.Polygon[]
  onPanelsGenerated?: (data: any) => void
}

interface PanelGenerationState {
  isGenerating: boolean
  progress: { current: number; total: number } | null
  solarData: any | null
  panelData: any | null
  showAnglePanel: boolean
  showCompletionAnimation: boolean
  markers: google.maps.Polygon[]
  resultsData: {
    panelCount: number
    systemSize: number
    annualProduction?: number
  } | null
}

/**
 * Hook to manage solar panel generation workflow
 *
 * Responsibilities:
 * - Fetch solar data for roof polygons
 * - Handle angle panel state
 * - Generate and animate panels
 * - Calculate system results
 */
export function usePanelGeneration({
  map,
  roofPolygons,
  objectPolygons,
  onPanelsGenerated
}: UsePanelGenerationProps) {
  const solarPanelApiRef = useRef(new SolarPanelApiService())

  const [state, setState] = useState<PanelGenerationState>({
    isGenerating: false,
    progress: null,
    solarData: null,
    panelData: null,
    showAnglePanel: false,
    showCompletionAnimation: false,
    markers: [],
    resultsData: null
  })

  /**
   * Start the panel generation workflow
   * Fetches solar data and shows angle panel
   */
  const startPanelGeneration = useCallback(async () => {
    if (!map || roofPolygons.length === 0) {
      console.warn('No roof polygons available for panel generation')
      return
    }

    // Reset state and show angle panel
    setState(prev => ({
      ...prev,
      resultsData: null,
      solarData: null,
      showAnglePanel: true
    }))

    try {
      const mapBounds = solarPanelApiRef.current.getMapBounds(map)
      const result = await solarPanelApiRef.current.fetchSolarDataForPolygons(roofPolygons, mapBounds)

      if (result.success && result.data) {
        setState(prev => ({ ...prev, solarData: result.data }))
      } else {
        console.error('Failed to fetch solar panel data:', result.error)
      }
    } catch (err) {
      console.error('Panel generation failed:', err)
    }
  }, [map, roofPolygons])

  /**
   * Handle angle panel confirmation
   * Generates panels with provided configuration
   */
  const handleAngleConfirm = useCallback(async (data: {
    angles: number[]
    edgePadding: number
    panelData?: any
    _requestBody?: any
  }) => {
    if (!map) return

    // Hide angle panel and start generation
    setState(prev => ({
      ...prev,
      showAnglePanel: false,
      isGenerating: true
    }))

    // Clear existing markers
    state.markers.forEach(marker => marker.setMap(null))

    try {
      let panelData = data.panelData

      // Make API call if request body is provided
      if (data._requestBody) {
        const response = await fetch('/api/generate_panels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data._requestBody)
        })
        const responseData = await response.json()
        panelData = responseData.results || responseData
      }

      // Generate and animate panels
      if (panelData) {
        const { markers, totalPanels } = await generateAndAnimatePanels({
          panelData,
          map,
          onProgress: (current, total) => {
            setState(prev => ({ ...prev, progress: { current, total } }))
          }
        })

        // Calculate results
        const results = calculateSystemResults(totalPanels, state.solarData)

        // Update state with final results
        setState(prev => ({
          ...prev,
          markers,
          panelData,
          resultsData: {
            panelCount: totalPanels,
            ...results
          },
          progress: null,
          showCompletionAnimation: true
        }))

        // Hide completion animation after delay
        setTimeout(() => {
          setState(prev => ({ ...prev, showCompletionAnimation: false }))
        }, 1500)

        // Notify parent
        onPanelsGenerated?.(panelData)
      }
    } catch (error) {
      console.error('Error generating panels:', error)
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }))
    }
  }, [map, state.markers, state.solarData, onPanelsGenerated])

  /**
   * Cancel angle panel
   */
  const handleAngleCancel = useCallback(() => {
    setState(prev => ({ ...prev, showAnglePanel: false }))
  }, [])

  /**
   * Clear all generated panels
   */
  const clearPanels = useCallback(() => {
    state.markers.forEach(marker => marker.setMap(null))
    setState(prev => ({
      ...prev,
      markers: [],
      panelData: null,
      resultsData: null
    }))
  }, [state.markers])

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,
    solarData: state.solarData,
    panelData: state.panelData,
    showAnglePanel: state.showAnglePanel,
    showCompletionAnimation: state.showCompletionAnimation,
    resultsData: state.resultsData,

    // Actions
    startPanelGeneration,
    handleAngleConfirm,
    handleAngleCancel,
    clearPanels
  }
}
