'use client'

import { useEffect, useState } from 'react'
import ShadeTooltip from './ShadeTooltip'

interface PanelStats {
  excellent: number  // > 1400 kWh/kW/year
  good: number       // 1200-1400 kWh/kW/year
  moderate: number   // 1000-1200 kWh/kW/year
  significant: number // 800-1000 kWh/kW/year
  high: number       // < 800 kWh/kW/year
  total: number
  averageShade: number // Average annual flux
}

interface ShadeVisualizationOverlayProps {
  map: google.maps.Map | null
  panels: google.maps.Polygon[]
  enabled: boolean
  location?: { lat: number; lng: number }
  onStatsUpdate?: (stats: PanelStats | null) => void
}

/**
 * Color-codes solar panels based on annual solar flux from GeoTIFF data
 * Red = low flux, Yellow = moderate flux, Green = high flux
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

  useEffect(() => {
    if (!map || !panels.length || !enabled) {
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

    let totalFlux = 0
    let panelsWithData = 0

    // Apply flux-based colors to panels
    panels.forEach((panel, index) => {
      if (!panel.getMap()) return

      // Get annual sunshine value stored on the panel
      const annualFlux = (panel as any).annualSunshineKwh

      if (annualFlux === undefined || annualFlux === null) {
        // No flux data available for this panel, skip coloring
        return
      }

      // Update statistics
      totalFlux += annualFlux
      panelsWithData++

      // Categorize based on annual flux (kWh/m²/year)
      // Typical ranges for solar flux:
      // Excellent: > 1400 kWh/m²/year
      // Good: 1200-1400
      // Moderate: 1000-1200
      // Significant shade: 800-1000
      // High shade: < 800
      if (annualFlux > 1400) {
        stats.excellent++
      } else if (annualFlux > 1200) {
        stats.good++
      } else if (annualFlux > 1000) {
        stats.moderate++
      } else if (annualFlux > 800) {
        stats.significant++
      } else {
        stats.high++
      }

      // Apply color with smooth transition
      const targetColor = getFluxColor(annualFlux)
      const currentColor = panel.get('fillColor') || originalColors.get(panel) || '#1E90FF'

      // Animate color transition
      animateColorTransition(panel, currentColor, targetColor, 500)

      // Add hover listeners for tooltip
      const mousemoveListener = google.maps.event.addListener(panel, 'mousemove', (event: google.maps.PolyMouseEvent) => {
        if (!event.domEvent) return
        const mouseEvent = event.domEvent as MouseEvent

        setTooltipData({
          visible: true,
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
          data: {
            panelIndex: index,
            annualFlux: annualFlux
          }
        })
      })

      const mouseoutListener = google.maps.event.addListener(panel, 'mouseout', () => {
        setTooltipData({ visible: false, x: 0, y: 0, data: null })
      })

      // Store listeners for cleanup
      ;(panel as any).__shadeListeners = [mousemoveListener, mouseoutListener]
    })

    // Calculate average flux
    stats.averageShade = panelsWithData > 0 ? totalFlux / panelsWithData : 0

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
  }, [map, panels, enabled, originalColors, onStatsUpdate])

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
 * Get color based on annual solar flux (kWh/m²/year)
 * > 1400: Excellent (Bright Green)
 * 1200-1400: Good (Yellow-Green)
 * 1000-1200: Moderate (Yellow)
 * 800-1000: Significant shade (Orange)
 * < 800: High shade (Red)
 */
function getFluxColor(annualFlux: number): string {
  if (annualFlux > 1400) {
    return '#00C853' // Bright green - excellent
  } else if (annualFlux > 1200) {
    return '#64DD17' // Yellow-green - good
  } else if (annualFlux > 1000) {
    return '#FFD600' // Yellow - moderate
  } else if (annualFlux > 800) {
    return '#FF6D00' // Orange - significant shade
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
