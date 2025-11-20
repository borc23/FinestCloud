'use client'

import { useEffect, useState } from 'react'
import { useSolarShade } from '@/features/solar-analysis/hooks/useSolarShade'

interface AnnualSunshineLayerOverlayProps {
  map: google.maps.Map | null
  enabled: boolean
  location?: { lat: number; lng: number }
}

/**
 * Displays Google Solar API's annual sunshine/flux data layer directly on the map
 * Shows the raw heat map of solar potential across the entire roof
 */
export default function AnnualSunshineLayerOverlay({
  map,
  enabled,
  location
}: AnnualSunshineLayerOverlayProps) {
  const [overlay, setOverlay] = useState<google.maps.GroundOverlay | null>(null)
  const [showNoDataMessage, setShowNoDataMessage] = useState(false)

  // Fetch shade analysis data (includes data layers)
  const { shadeData, isLoading } = useSolarShade({
    latitude: location?.lat,
    longitude: location?.lng,
    autoFetch: enabled && !!location
  })

  useEffect(() => {
    console.log('[AnnualSunshineLayerOverlay] Effect triggered:', {
      map: !!map,
      enabled,
      hasShadeData: !!shadeData,
      hasDataLayers: !!shadeData?.dataLayers,
      annualFluxUrl: shadeData?.dataLayers?.annualFluxUrl,
      isLoading
    })

    if (!map || !enabled) {
      console.log('[AnnualSunshineLayerOverlay] Map not ready or not enabled')
      if (overlay) {
        overlay.setMap(null)
        setOverlay(null)
      }
      return
    }

    if (!shadeData?.dataLayers?.rgbUrl) {
      console.warn('[AnnualSunshineLayerOverlay] No RGB imagery available. ShadeData:', shadeData)
      if (!isLoading && shadeData) {
        setShowNoDataMessage(true)
        setTimeout(() => setShowNoDataMessage(false), 5000)
      }
      return
    }

    setShowNoDataMessage(false)

    // Use RGB URL (satellite imagery) instead of GeoTIFF
    // GeoTIFF files can't be displayed directly as images
    const imageUrl = shadeData.dataLayers.rgbUrl
    console.log('[AnnualSunshineLayerOverlay] Creating overlay with RGB URL:', imageUrl)

    // Get bounding box from building insights
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(
        shadeData.buildingInsights.boundingBox.sw.latitude,
        shadeData.buildingInsights.boundingBox.sw.longitude
      ),
      new google.maps.LatLng(
        shadeData.buildingInsights.boundingBox.ne.latitude,
        shadeData.buildingInsights.boundingBox.ne.longitude
      )
    )

    console.log('[AnnualSunshineLayerOverlay] Bounds:', {
      sw: { lat: bounds.getSouthWest().lat(), lng: bounds.getSouthWest().lng() },
      ne: { lat: bounds.getNorthEast().lat(), lng: bounds.getNorthEast().lng() }
    })

    // Remove old overlay if exists
    if (overlay) {
      console.log('[AnnualSunshineLayerOverlay] Removing old overlay')
      overlay.setMap(null)
    }

    // Create new overlay with RGB imagery (actual satellite photo)
    console.log('[AnnualSunshineLayerOverlay] Creating new ground overlay')
    const newOverlay = new google.maps.GroundOverlay(imageUrl, bounds, {
      opacity: 0.8,
      clickable: false
    })

    newOverlay.setMap(map)
    setOverlay(newOverlay)
    console.log('[AnnualSunshineLayerOverlay] Ground overlay created and added to map')

    // Test if the image can be loaded
    const testImage = new Image()
    testImage.onload = () => {
      console.log('[AnnualSunshineLayerOverlay] ✅ RGB Image loaded successfully!', {
        width: testImage.width,
        height: testImage.height
      })
    }
    testImage.onerror = (err) => {
      console.error('[AnnualSunshineLayerOverlay] ❌ RGB Image failed to load:', err)
      console.error('[AnnualSunshineLayerOverlay] URL:', imageUrl)
    }
    testImage.src = imageUrl

    // Zoom to fit the overlay bounds so it's visible
    map.fitBounds(bounds)

    // Add extra zoom out to ensure we can see it
    setTimeout(() => {
      const currentZoom = map.getZoom()
      if (currentZoom && currentZoom > 20) {
        map.setZoom(20)
        console.log('[AnnualSunshineLayerOverlay] Reduced zoom to 20 for better visibility')
      }
    }, 100)

    console.log('[AnnualSunshineLayerOverlay] Map fitted to overlay bounds')

    // Cleanup on unmount
    return () => {
      if (newOverlay) {
        console.log('[AnnualSunshineLayerOverlay] Cleanup: removing overlay')
        newOverlay.setMap(null)
      }
    }
  }, [map, enabled, shadeData])

  // Show message if data layers not available
  if (showNoDataMessage) {
    return (
      <div style={{
        position: 'absolute',
        top: '180px',
        right: '10px',
        background: '#ff9800',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        padding: '12px 16px',
        zIndex: 1001,
        maxWidth: '300px',
        fontSize: '13px'
      }}>
        <strong>Data Layers Not Available</strong>
        <br />
        Google Solar API data layers are not available for this location. Using panel-based shade analysis instead.
      </div>
    )
  }

  // Show active indicator when layer is loaded
  if (enabled && overlay && shadeData?.dataLayers?.rgbUrl) {
    return (
      <div style={{
        position: 'absolute',
        top: '180px',
        right: '10px',
        background: '#4caf50',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        padding: '8px 12px',
        zIndex: 1001,
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>☀️</span>
        <span><strong>Annual Sunshine Layer Active</strong></span>
      </div>
    )
  }

  return null // No visual component, just manages the map overlay
}
