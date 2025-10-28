'use client'

import { useEffect, useState } from 'react'
import { useSolarShade } from '@/hooks/useSolarShade'
import ShadeTooltip from './ShadeTooltip'

interface PanelStats {
  excellent: number
  good: number
  moderate: number
  significant: number
  high: number
  total: number
  averageShade: number
}

interface ShadeVisualizationOverlayProps {
  map: google.maps.Map | null
  panels: google.maps.Polygon[]
  enabled: boolean
  location?: { lat: number; lng: number }
  onStatsUpdate?: (stats: PanelStats | null) => void
}

/**
 * Color-codes solar panels based on shade analysis from Google Solar API
 * Green = minimal shade, Yellow = moderate shade, Red = high shade
 */
export default function ShadeVisualizationOverlay({
  map,
  panels,
  enabled,
  location,
  onStatsUpdate
}: ShadeVisualizationOverlayProps) {
  const [originalColors, setOriginalColors] = useState<Map<google.maps.Polygon, string>>(new Map())
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean
    x: number
    y: number
    data: any
  }>({ visible: false, x: 0, y: 0, data: null })

  // Fetch shade analysis data
  const { shadeData, getPanelShadeData, isLoading } = useSolarShade({
    latitude: location?.lat,
    longitude: location?.lng,
    autoFetch: enabled && !!location
  })

  useEffect(() => {
    if (!map || !panels.length || !enabled || !shadeData) {
      // Restore original colors when disabled with smooth transition
      if (!enabled && originalColors.size > 0) {
        originalColors.forEach((color, panel) => {
          if (panel.getMap()) {
            const currentColor = panel.get('fillColor') || color
            animateColorTransition(panel, currentColor, color, 400)
          }
        })
        setOriginalColors(new Map())
        onStatsUpdate?.(null)
      }
      return
    }

    // Save original colors on first enable
    if (originalColors.size === 0) {
      const colors = new Map<google.maps.Polygon, string>()
      panels.forEach(panel => {
        const currentColor = (panel as any).fillColor || '#1E90FF'
        colors.set(panel, currentColor)
      })
      setOriginalColors(colors)
    }

    // Calculate statistics and apply colors
    const stats: PanelStats = {
      excellent: 0,
      good: 0,
      moderate: 0,
      significant: 0,
      high: 0,
      total: panels.length,
      averageShade: 0
    }

    let totalShade = 0

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

      let shadePercentage: number
      if (!panelShade) {
        // No specific shade data, use average
        shadePercentage = shadeData.shadePercentage
      } else {
        shadePercentage = panelShade.shadePercentage
      }

      // Update statistics
      totalShade += shadePercentage
      if (shadePercentage < 5) {
        stats.excellent++
      } else if (shadePercentage < 15) {
        stats.good++
      } else if (shadePercentage < 25) {
        stats.moderate++
      } else if (shadePercentage < 40) {
        stats.significant++
      } else {
        stats.high++
      }

      // Apply color with smooth transition
      const targetColor = getShadeColor(shadePercentage)
      const currentColor = panel.get('fillColor') || originalColors.get(panel) || '#1E90FF'

      // Animate color transition
      animateColorTransition(panel, currentColor, targetColor, 500)

      // Add hover listeners for tooltip
      const mousemoveListener = google.maps.event.addListener(panel, 'mousemove', (event: google.maps.PolyMouseEvent) => {
        if (!event.domEvent) return
        const mouseEvent = event.domEvent as MouseEvent

        // Find roof segment data if available
        const panelShadeInfo = getPanelShadeData(center.lat(), center.lng())
        const segment = shadeData.roofSegmentShade.find((seg) => {
          // Match by comparing shade percentages (rough match)
          return panelShadeInfo && Math.abs(seg.shadePercentage - panelShadeInfo.shadePercentage) < 0.1
        })

        setTooltipData({
          visible: true,
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
          data: {
            panelIndex: index,
            shadePercentage,
            shadeLossFactor: panelShadeInfo?.shadeLossFactor || shadeData.shadeLossFactor,
            sunshineHours: segment?.sunshineHoursPerYear,
            segmentInfo: segment ? {
              pitch: segment.pitchDegrees,
              azimuth: segment.azimuthDegrees
            } : undefined
          }
        })
      })

      const mouseoutListener = google.maps.event.addListener(panel, 'mouseout', () => {
        setTooltipData({ visible: false, x: 0, y: 0, data: null })
      })

      // Store listeners for cleanup
      ;(panel as any).__shadeListeners = [mousemoveListener, mouseoutListener]
    })

    // Calculate average shade
    stats.averageShade = totalShade / panels.length

    // Pass statistics to parent
    onStatsUpdate?.(stats)

    // Cleanup function
    return () => {
      // Cancel any ongoing color animations
      panels.forEach((panel) => {
        const animationId = (panel as any).__colorAnimation
        if (animationId) {
          cancelAnimationFrame(animationId)
          delete (panel as any).__colorAnimation
        }

        // Remove event listeners
        const listeners = (panel as any).__shadeListeners
        if (listeners) {
          listeners.forEach((listener: google.maps.MapsEventListener) => {
            google.maps.event.removeListener(listener)
          })
          delete (panel as any).__shadeListeners
        }
      })

      // Restore colors when component unmounts (no animation on unmount for better performance)
      if (originalColors.size > 0) {
        originalColors.forEach((color, panel) => {
          if (panel.getMap()) {
            panel.setOptions({ fillColor: color })
          }
        })
      }

      // Hide tooltip
      setTooltipData({ visible: false, x: 0, y: 0, data: null })
    }
  }, [map, panels, enabled, shadeData, getPanelShadeData, originalColors])

  return (
    <ShadeTooltip
      visible={tooltipData.visible}
      x={tooltipData.x}
      y={tooltipData.y}
      data={tooltipData.data}
    />
  )
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

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)

  const r = c1.r + (c2.r - c1.r) * factor
  const g = c1.g + (c2.g - c1.g) * factor
  const b = c1.b + (c2.b - c1.b) * factor

  return rgbToHex(r, g, b)
}

/**
 * Animate color transition for a polygon
 */
function animateColorTransition(
  panel: google.maps.Polygon,
  startColor: string,
  endColor: string,
  duration: number
): void {
  // Clear any existing animation
  const existingAnimation = (panel as any).__colorAnimation
  if (existingAnimation) {
    cancelAnimationFrame(existingAnimation)
  }

  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Easing function (ease-out)
    const easeProgress = 1 - Math.pow(1 - progress, 3)

    const currentColor = interpolateColor(startColor, endColor, easeProgress)
    panel.setOptions({ fillColor: currentColor })

    if (progress < 1) {
      const animationId = requestAnimationFrame(animate)
      ;(panel as any).__colorAnimation = animationId
    } else {
      delete (panel as any).__colorAnimation
    }
  }

  animate()
}
