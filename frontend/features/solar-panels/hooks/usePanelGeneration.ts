import { useState, useCallback, useRef } from 'react'
import { SolarPanelApiService } from '@/features/solar-panels/lib/solarPanelApi'
import { generateAndAnimatePanels, calculateSystemResults } from '@/features/solar-panels/lib/panelGenerator'
import { setGridVectors, clearGridVectors } from '@/features/solar-panels/utils/gridSnapping'
import { usePanelContext } from '../context/PanelContext'
import type { PanelGenerationResponse, SolarDataSegment, AngleConfirmData } from '@/features/solar-panels/types/panel'
import type { GeoTIFFData } from '@/features/solar-analysis/utils/geotiffParser'
import { parseGeoTIFFFromBuffer } from '@/features/solar-analysis/utils/geotiffParser'

interface UsePanelGenerationProps {
  map: google.maps.Map | null
  roofPolygons: google.maps.Polygon[]
  objectPolygons: google.maps.Polygon[]
  onPanelsGenerated?: (data: PanelGenerationResponse) => void
}

interface PanelGenerationState {
  isGenerating: boolean
  progress: { current: number; total: number } | null
  solarData: SolarDataSegment[] | null
  panelData: PanelGenerationResponse | null
  showAnglePanel: boolean
  showCompletionAnimation: boolean
  markers: google.maps.Polygon[]
  resultsData: {
    panelCount: number
    systemSize: number
    annualProduction?: number
  } | null
  geotiffData: GeoTIFFData | null // Cached GeoTIFF data for sunshine values
  isLoadingGeotiff: boolean
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
  const { selectedPanel } = usePanelContext()
  const solarPanelApiRef = useRef(new SolarPanelApiService())

  const [state, setState] = useState<PanelGenerationState>({
    isGenerating: false,
    progress: null,
    solarData: null,
    panelData: null,
    showAnglePanel: false,
    showCompletionAnimation: false,
    markers: [],
    resultsData: null,
    geotiffData: null,
    isLoadingGeotiff: false
  })

  /**
   * Calculate center of roof polygons for GeoTIFF data request
   */
  const getRoofCenter = useCallback(() => {
    if (roofPolygons.length === 0) return null

    let totalLat = 0
    let totalLng = 0
    let pointCount = 0

    roofPolygons.forEach(polygon => {
      const path = polygon.getPath()
      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i)
        totalLat += point.lat()
        totalLng += point.lng()
        pointCount++
      }
    })

    if (pointCount === 0) return null

    return {
      lat: totalLat / pointCount,
      lng: totalLng / pointCount
    }
  }, [roofPolygons])

  /**
   * Load GeoTIFF data for annual sunshine
   */
  const loadGeotiffData = useCallback(async () => {
    const roofCenter = getRoofCenter()
    if (!roofCenter) {
      console.warn('No roof center available for GeoTIFF request')
      return null
    }

    setState(prev => ({ ...prev, isLoadingGeotiff: true }))

    try {
      console.log('Fetching GeoTIFF data for roof at:', roofCenter)

      // Fetch data layers from Solar API
      const response = await fetch('/api/solar-data-layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: {
            latitude: roofCenter.lat,
            longitude: roofCenter.lng
          },
          radiusMeters: 100,
          requiredQuality: 'HIGH'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Data layers API error:', errorText)
        throw new Error(`Failed to fetch data layers: ${response.status}`)
      }

      const dataLayersResponse = await response.json()
      console.log('Data layers response:', dataLayersResponse)

      // Handle both direct response and wrapped response
      const dataLayers = dataLayersResponse.data || dataLayersResponse
      const annualFluxUrl = dataLayers.annualFluxUrl

      if (!annualFluxUrl) {
        console.warn('No annual flux URL available')
        return null
      }

      // Fetch the GeoTIFF through proxy
      const proxyUrl = `/api/solar-data-layers/geotiff?url=${encodeURIComponent(annualFluxUrl)}`
      const geotiffResponse = await fetch(proxyUrl)

      if (!geotiffResponse.ok) {
        throw new Error(`Failed to fetch GeoTIFF: ${geotiffResponse.status}`)
      }

      const arrayBuffer = await geotiffResponse.arrayBuffer()
      const geotiffData = await parseGeoTIFFFromBuffer(arrayBuffer)

      console.log('GeoTIFF data loaded successfully:', {
        width: geotiffData.width,
        height: geotiffData.height,
        valueRange: [geotiffData.min, geotiffData.max]
      })

      setState(prev => ({ ...prev, geotiffData, isLoadingGeotiff: false }))
      return geotiffData

    } catch (err) {
      console.error('Failed to load GeoTIFF data:', err)
      setState(prev => ({ ...prev, isLoadingGeotiff: false }))
      return null
    }
  }, [getRoofCenter])

  /**
   * Start the panel generation workflow
   * Fetches solar data, GeoTIFF data, and shows angle panel
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
      // Fetch solar data
      const mapBounds = solarPanelApiRef.current.getMapBounds(map)
      const result = await solarPanelApiRef.current.fetchSolarDataForPolygons(roofPolygons, mapBounds)

      if (result.success && result.data) {
        setState(prev => ({ ...prev, solarData: result.data || null }))
      } else {
        console.error('Failed to fetch solar panel data:', result.error)
      }

      // Load GeoTIFF data for sunshine values
      await loadGeotiffData()

    } catch (err) {
      console.error('Panel generation failed:', err)
    }
  }, [map, roofPolygons, loadGeotiffData])

  /**
   * Handle angle panel confirmation
   * Generates panels with provided configuration
   */
  const handleAngleConfirm = useCallback(async (data: AngleConfirmData) => {
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
        // Include selected panel specs in the request
        const requestBody = {
          ...data._requestBody,
          panel_specs: selectedPanel ? {
            width: selectedPanel.width,
            height: selectedPanel.height,
            power: selectedPanel.power,
            efficiency: selectedPanel.efficiency
          } : undefined
        }

        const response = await fetch('/api/generate_panels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        const responseData = await response.json()
        panelData = responseData.results || responseData
      }

      // Generate and animate panels
      if (panelData) {
        // Hide loading overlay before starting panel placement animation
        setState(prev => ({ ...prev, isGenerating: false }))

        const { markers, totalPanels } = await generateAndAnimatePanels({
          panelData,
          map,
          geotiffData: state.geotiffData, // Pass GeoTIFF data for sunshine enrichment
          onProgress: (current, total) => {
            setState(prev => ({ ...prev, progress: { current, total } }))
          },
          onFirstPanelPlaced: () => {
            // Hide roof polygons when first panel is placed
            onPanelsGenerated?.(panelData)
          }
        })

        // Calculate results using per-panel sunshine data if available
        const results = calculateSystemResults(totalPanels, state.solarData, panelData)

        // Set grid vectors for snapping
        setGridVectors(panelData)

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
    clearGridVectors()
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
    panelMarkers: state.markers,
    geotiffData: state.geotiffData, // Expose cached GeoTIFF data
    isLoadingGeotiff: state.isLoadingGeotiff,

    // Actions
    startPanelGeneration,
    handleAngleConfirm,
    handleAngleCancel,
    clearPanels
  }
}
