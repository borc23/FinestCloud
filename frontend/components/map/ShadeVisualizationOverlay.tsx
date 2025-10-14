'use client'

import { useEffect, useState } from 'react'
import { useSolarShade } from '@/hooks/useSolarShade'

interface ShadeVisualizationOverlayProps {
  map: google.maps.Map | null
  panels: google.maps.Polygon[]
  enabled: boolean
  location?: { lat: number; lng: number }
}

/**
 * Color-codes solar panels based on shade analysis from Google Solar API
 * Green = minimal shade, Yellow = moderate shade, Red = high shade
 */
export default function ShadeVisualizationOverlay({
  map,
  panels,
  enabled,
  location
}: ShadeVisualizationOverlayProps) {
  const [originalColors, setOriginalColors] = useState<Map<google.maps.Polygon, string>>(new Map())

  // Fetch shade analysis data
  const { shadeData, getPanelShadeData } = useSolarShade({
    latitude: location?.lat,
    longitude: location?.lng,
    autoFetch: enabled && !!location
  })

  useEffect(() => {
    if (!map || !panels.length || !enabled || !shadeData) {
      // Restore original colors when disabled
      if (!enabled && originalColors.size > 0) {
        originalColors.forEach((color, panel) => {
          if (panel.getMap()) {
            panel.setOptions({ fillColor: color })
          }
        })
        setOriginalColors(new Map())
      }
      return
    }

    console.log('🌤️ Shade Analysis Data:', {
      averageShade: shadeData.shadePercentage.toFixed(1) + '%',
      shadeLossFactor: shadeData.shadeLossFactor.toFixed(2),
      roofSegments: shadeData.roofSegmentShade.length
    })

    // Save original colors on first enable
    if (originalColors.size === 0) {
      const colors = new Map<google.maps.Polygon, string>()
      panels.forEach(panel => {
        const currentColor = (panel as any).fillColor || '#1E90FF'
        colors.set(panel, currentColor)
      })
      setOriginalColors(colors)
    }

    // Apply shade-based colors to panels
    panels.forEach((panel, index) => {
      if (!panel.getMap()) return

      // Get panel center
      const path = panel.getPath()
      if (!path || path.getLength() === 0) return

      const bounds = new google.maps.LatLngBounds()
      path.forEach((point: google.maps.LatLng) => {
        bounds.extend(point)
      })
      const center = bounds.getCenter()

      // Get shade data for this panel location
      const panelShade = getPanelShadeData(center.lat(), center.lng())

      if (!panelShade) {
        // No specific shade data, use average
        const avgShade = shadeData.shadePercentage
        const color = getShadeColor(avgShade)
        panel.setOptions({ fillColor: color })
        return
      }

      // Color based on shade percentage
      const color = getShadeColor(panelShade.shadePercentage)
      panel.setOptions({ fillColor: color })
    })

    // Cleanup function
    return () => {
      // Restore colors when component unmounts
      if (originalColors.size > 0) {
        originalColors.forEach((color, panel) => {
          if (panel.getMap()) {
            panel.setOptions({ fillColor: color })
          }
        })
      }
    }
  }, [map, panels, enabled, shadeData, getPanelShadeData, originalColors])

  // No visual elements - this is just a logic component
  return null
}

/**
 * Get color based on shade percentage
 * 0-5%: Excellent (Green)
 * 5-15%: Good (Light Green/Yellow-Green)
 * 15-25%: Moderate (Yellow/Orange)
 * 25-40%: Significant (Orange/Red-Orange)
 * 40%+: High (Red)
 */
function getShadeColor(shadePercentage: number): string {
  if (shadePercentage < 5) {
    return '#00C853' // Bright green - excellent
  } else if (shadePercentage < 15) {
    return '#64DD17' // Yellow-green - good
  } else if (shadePercentage < 25) {
    return '#FFD600' // Yellow - moderate
  } else if (shadePercentage < 40) {
    return '#FF6D00' // Orange - significant
  } else {
    return '#DD2C00' // Red - high shade
  }
}
