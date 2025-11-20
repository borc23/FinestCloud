'use client'

import { useEffect, useState } from 'react'
import { useSolarShade } from '@/features/solar-analysis/hooks/useSolarShade'

interface RoofSegmentShadeOverlayProps {
  map: google.maps.Map | null
  enabled: boolean
  roofPolygons: google.maps.Polygon[]
  location?: { lat: number; lng: number }
}

/**
 * DRY/KISS: Color YOUR drawn roof polygons based on their shade from Google Solar API
 * Matches each user polygon to Google's roof segment data
 */
export default function RoofSegmentShadeOverlay({
  map,
  enabled,
  roofPolygons,
  location
}: RoofSegmentShadeOverlayProps) {
  const [originalColors, setOriginalColors] = useState<Map<google.maps.Polygon, string>>(new Map())

  // Fetch shade analysis data
  const { shadeData, isLoading } = useSolarShade({
    latitude: location?.lat,
    longitude: location?.lng,
    autoFetch: enabled && !!location
  })

  useEffect(() => {
    console.log('[RoofSegmentShadeOverlay] Effect triggered:', {
      map: !!map,
      enabled,
      hasShadeData: !!shadeData,
      roofPolygonCount: roofPolygons.length
    })

    if (!map || !enabled || !shadeData || roofPolygons.length === 0) {
      // Restore original colors when disabled
      if (originalColors.size > 0) {
        originalColors.forEach((color, polygon) => {
          if (polygon.getMap()) {
            polygon.setOptions({ fillColor: color, fillOpacity: 0.5 })
          }
        })
        setOriginalColors(new Map())
      }
      return
    }

    // Save original colors first time
    if (originalColors.size === 0) {
      const colors = new Map<google.maps.Polygon, string>()
      roofPolygons.forEach(polygon => {
        const currentColor = (polygon as any).fillColor || '#1E90FF'
        colors.set(polygon, currentColor)
      })
      setOriginalColors(colors)
    }

    // Color each user's roof polygon based on its shade data
    roofPolygons.forEach((polygon, index) => {
      if (!polygon.getMap()) return

      // Get polygon center
      const path = polygon.getPath()
      if (!path || path.getLength() === 0) return

      let sumLat = 0, sumLng = 0, count = 0
      path.forEach((point: google.maps.LatLng) => {
        sumLat += point.lat()
        sumLng += point.lng()
        count++
      })
      const centerLat = sumLat / count
      const centerLng = sumLng / count

      // Find matching Google roof segment
      let matchedShadeInfo = null
      let minDistance = Infinity

      shadeData.buildingInsights.solarPotential.roofSegmentStats.forEach((segment, segIndex) => {
        if (segment.boundingBox) {
          // Check if center is within bounding box
          const { sw, ne } = segment.boundingBox
          if (centerLat >= sw.latitude && centerLat <= ne.latitude &&
              centerLng >= sw.longitude && centerLng <= ne.longitude) {
            matchedShadeInfo = shadeData.roofSegmentShade[segIndex]
          }
        }

        // Fallback: use closest segment by distance
        if (!matchedShadeInfo && segment.center) {
          const distance = Math.sqrt(
            Math.pow(centerLat - segment.center.latitude, 2) +
            Math.pow(centerLng - segment.center.longitude, 2)
          )
          if (distance < minDistance) {
            minDistance = distance
            matchedShadeInfo = shadeData.roofSegmentShade[segIndex]
          }
        }
      })

      // Apply shade color to user's polygon
      if (matchedShadeInfo) {
        polygon.setOptions({
          fillColor: getShadeColor(matchedShadeInfo.shadePercentage),
          fillOpacity: 0.7,
          strokeWeight: 3,
          strokeColor: '#000000'
        })

        // Add click listener for info
        google.maps.event.clearListeners(polygon, 'click')
        polygon.addListener('click', () => {
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; font-family: Arial;">
                <strong>Your Roof Polygon ${index + 1}</strong><br/>
                <strong>Shade:</strong> ${matchedShadeInfo.shadePercentage.toFixed(1)}%<br/>
                <strong>Pitch:</strong> ${matchedShadeInfo.pitchDegrees.toFixed(0)}°<br/>
                <strong>Azimuth:</strong> ${matchedShadeInfo.azimuthDegrees.toFixed(0)}°<br/>
                <strong>Sunshine:</strong> ${matchedShadeInfo.sunshineHoursPerYear.toLocaleString()} hrs/year
              </div>
            `,
            position: { lat: centerLat, lng: centerLng }
          })
          infoWindow.open(map)
        })
      }
    })

    console.log(`[RoofSegmentShadeOverlay] Applied shade to ${roofPolygons.length} user roof polygons`)

    // Cleanup
    return () => {
      roofPolygons.forEach(polygon => {
        google.maps.event.clearListeners(polygon, 'click')
      })
    }
  }, [map, enabled, shadeData, roofPolygons])

  // Show active indicator
  if (enabled && roofPolygons.length > 0 && shadeData) {
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
        <span style={{ fontSize: '16px' }}>🏠</span>
        <span><strong>Shade on {roofPolygons.length} Roof{roofPolygons.length > 1 ? 's' : ''}</strong></span>
      </div>
    )
  }

  // Show loading message
  if (enabled && isLoading) {
    return (
      <div style={{
        position: 'absolute',
        top: '180px',
        right: '10px',
        background: '#2196f3',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        padding: '8px 12px',
        zIndex: 1001,
        fontSize: '12px'
      }}>
        Loading roof segments...
      </div>
    )
  }

  return null
}

/**
 * Get color based on shade percentage
 */
function getShadeColor(shadePercentage: number): string {
  if (shadePercentage < 5) {
    return '#00C853' // Excellent - bright green
  } else if (shadePercentage < 15) {
    return '#64DD17' // Good - yellow-green
  } else if (shadePercentage < 25) {
    return '#FFD600' // Moderate - yellow
  } else if (shadePercentage < 40) {
    return '#FF6D00' // Significant - orange
  } else {
    return '#DD2C00' // High shade - red
  }
}
