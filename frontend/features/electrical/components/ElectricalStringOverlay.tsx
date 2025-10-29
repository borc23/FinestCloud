/**
 * Electrical String Overlay Component
 * Displays string groupings and wiring paths on the map between solar panels
 */

'use client'

import { useEffect, useState } from 'react'
import { calculateStringConfiguration } from '../utils/electricalCalculations'
import { STANDARD_PANEL_SPECS } from '../utils/electricalCalculations'
import type { PanelSpecs } from '../types/electrical'

interface ElectricalStringOverlayProps {
  map: google.maps.Map | null
  panelMarkers: google.maps.Polygon[] // Panels are polygons, not markers
  panelWattage: number
  inverterType: 'string' | 'microinverter' | 'optimizer'
  showLabels?: boolean
  onClose?: () => void
}

const STRING_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
]

// Helper function to get center of a polygon
function getPolygonCenter(polygon: google.maps.Polygon): google.maps.LatLng | null {
  const path = polygon.getPath()
  if (!path || path.getLength() === 0) return null

  const bounds = new google.maps.LatLngBounds()
  path.forEach((point: google.maps.LatLng) => {
    bounds.extend(point)
  })
  return bounds.getCenter()
}

export default function ElectricalStringOverlay({
  map,
  panelMarkers,
  panelWattage,
  inverterType,
  showLabels = true,
  onClose,
}: ElectricalStringOverlayProps) {
  const [overlays, setOverlays] = useState<{
    polylines: google.maps.Polyline[]
    labels: google.maps.Marker[]
    inverterMarker?: google.maps.Marker
  }>({ polylines: [], labels: [] })

  useEffect(() => {
    if (!map || !panelMarkers.length) return

    // Get panel specs
    const closestWattage = [400, 450, 500].reduce((prev, curr) =>
      Math.abs(curr - panelWattage) < Math.abs(prev - panelWattage) ? curr : prev
    )
    const panelSpecs: PanelSpecs = STANDARD_PANEL_SPECS[closestWattage]

    // Calculate string configuration
    const stringConfig = calculateStringConfiguration(
      panelSpecs,
      panelMarkers.length,
      inverterType
    )

    // Group panels into strings
    const strings: google.maps.Polygon[][] = []
    for (let i = 0; i < stringConfig.numberOfStrings; i++) {
      const stringPanels: google.maps.Polygon[] = []
      for (let j = 0; j < stringConfig.panelsPerString; j++) {
        const panelIndex = i * stringConfig.panelsPerString + j
        if (panelIndex < panelMarkers.length) {
          stringPanels.push(panelMarkers[panelIndex])
        }
      }
      if (stringPanels.length > 0) {
        strings.push(stringPanels)
      }
    }

    // Calculate inverter position (center of all panels)
    const bounds = new google.maps.LatLngBounds()
    panelMarkers.forEach(panel => {
      const pos = getPolygonCenter(panel)
      if (pos) bounds.extend(pos)
    })
    const inverterPosition = bounds.getCenter()

    const newPolylines: google.maps.Polyline[] = []
    const newLabels: google.maps.Marker[] = []

    // Draw strings
    strings.forEach((stringPanels, stringIndex) => {
      const color = STRING_COLORS[stringIndex % STRING_COLORS.length]

      // Draw connections within string
      if (inverterType === 'string') {
        // For string inverters: connect panels in series, then to inverter
        const path: google.maps.LatLng[] = []

        // Start from first panel
        stringPanels.forEach((panel, idx) => {
          const pos = getPolygonCenter(panel)
          if (pos) {
            path.push(pos)

            // Add panel label
            if (showLabels) {
              const label = new google.maps.Marker({
                position: pos,
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: color,
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                },
                label: {
                  text: `S${stringIndex + 1}-${idx + 1}`,
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                },
                zIndex: 1000,
              })
              newLabels.push(label)
            }
          }
        })

        // Connect last panel to inverter
        path.push(inverterPosition)

        // Draw base polyline for string (thicker, darker)
        const basePolyline = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: color,
          strokeOpacity: 0.6,
          strokeWeight: 5,
          map,
          zIndex: 100,
        })
        newPolylines.push(basePolyline)

        // Draw animated current flow line (on top)
        const flowPolyline = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: '#ffffff',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          map,
          zIndex: 101,
          icons: [{
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: '#ffeb3b',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1,
            },
            offset: '0%',
            repeat: '10%'
          }]
        })
        newPolylines.push(flowPolyline)

        // Animate the current flow
        let offset = 0
        const animateFlow = setInterval(() => {
          offset = (offset + 2) % 100
          const icons = flowPolyline.get('icons')
          if (icons && icons.length > 0) {
            icons[0].offset = offset + '%'
            flowPolyline.set('icons', icons)
          }
        }, 50)

        // Store interval for cleanup
        ;(flowPolyline as any).__animationInterval = animateFlow

        // Add string label at midpoint
        if (showLabels && path.length > 1) {
          const midIndex = Math.floor(path.length / 2)
          const stringLabel = new google.maps.Marker({
            position: path[midIndex],
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 0,
            },
            label: {
              text: `String ${stringIndex + 1}\n${stringConfig.panelsPerString}×${panelWattage}W`,
              color: color,
              fontSize: '11px',
              fontWeight: 'bold',
            },
            zIndex: 999,
          })
          newLabels.push(stringLabel)
        }
      } else if (inverterType === 'microinverter') {
        // For microinverters: each panel connects directly to AC bus
        stringPanels.forEach((panel, idx) => {
          const pos = getPolygonCenter(panel)
          if (pos) {
            const microPath = [pos, inverterPosition]

            // Draw base line from panel to inverter position (AC bus)
            const basePolyline = new google.maps.Polyline({
              path: microPath,
              geodesic: false,
              strokeColor: '#2196f3',
              strokeOpacity: 0.5,
              strokeWeight: 3,
              map,
              zIndex: 100,
            })
            newPolylines.push(basePolyline)

            // Draw animated AC current flow
            const flowPolyline = new google.maps.Polyline({
              path: microPath,
              geodesic: false,
              strokeColor: '#ffffff',
              strokeOpacity: 0.7,
              strokeWeight: 1.5,
              map,
              zIndex: 101,
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 3,
                  fillColor: '#00e5ff',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 1,
                },
                offset: '0%',
                repeat: '15%'
              }]
            })
            newPolylines.push(flowPolyline)

            // Animate AC flow (faster for AC)
            let offset = idx * 10 // Stagger start positions
            const animateFlow = setInterval(() => {
              offset = (offset + 3) % 100
              const icons = flowPolyline.get('icons')
              if (icons && icons.length > 0) {
                icons[0].offset = offset + '%'
                flowPolyline.set('icons', icons)
              }
            }, 40)
            ;(flowPolyline as any).__animationInterval = animateFlow

            // Add panel label
            if (showLabels) {
              const label = new google.maps.Marker({
                position: pos,
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: '#2196f3',
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                },
                label: {
                  text: `μ${stringIndex * stringConfig.panelsPerString + idx + 1}`,
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 'bold',
                },
                zIndex: 1000,
              })
              newLabels.push(label)
            }
          }
        })
      } else if (inverterType === 'optimizer') {
        // For optimizers: similar to string but with optimizer indication
        const path: google.maps.LatLng[] = []

        stringPanels.forEach((panel, idx) => {
          const pos = getPolygonCenter(panel)
          if (pos) {
            path.push(pos)

            // Add panel label with optimizer icon
            if (showLabels) {
              const label = new google.maps.Marker({
                position: pos,
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: '#ff9800',
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                },
                label: {
                  text: `O${stringIndex + 1}-${idx + 1}`,
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 'bold',
                },
                zIndex: 1000,
              })
              newLabels.push(label)
            }
          }
        })

        // Connect to inverter
        path.push(inverterPosition)

        // Draw base polyline for optimizer string
        const basePolyline = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: '#ff9800',
          strokeOpacity: 0.6,
          strokeWeight: 5,
          map,
          zIndex: 100,
        })
        newPolylines.push(basePolyline)

        // Draw animated optimizer flow
        const flowPolyline = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: '#ffffff',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          map,
          zIndex: 101,
          icons: [{
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: '#ffc107',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1,
            },
            offset: '0%',
            repeat: '12%'
          }]
        })
        newPolylines.push(flowPolyline)

        // Animate optimizer flow
        let offset = stringIndex * 15 // Stagger different strings
        const animateFlow = setInterval(() => {
          offset = (offset + 2.5) % 100
          const icons = flowPolyline.get('icons')
          if (icons && icons.length > 0) {
            icons[0].offset = offset + '%'
            flowPolyline.set('icons', icons)
          }
        }, 45)
        ;(flowPolyline as any).__animationInterval = animateFlow
      }
    })

    // Add inverter marker
    const inverterMarker = new google.maps.Marker({
      position: inverterPosition,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#1976d2',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      label: {
        text: inverterType === 'microinverter' ? '🔌' : inverterType === 'optimizer' ? '⚙️' : '🔋',
        color: '#ffffff',
        fontSize: '16px',
      },
      title: inverterType === 'string' ? 'String Inverter' : inverterType === 'microinverter' ? 'AC Bus' : 'Central Inverter',
      zIndex: 2000,
    })

    // Add inverter info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; font-family: system-ui; color: #333;">
          <strong style="font-size: 14px;">${inverterType === 'string' ? 'String Inverter' : inverterType === 'microinverter' ? 'AC Junction Box' : 'Central Inverter'}</strong>
          <div style="margin-top: 4px; font-size: 12px;">
            ${stringConfig.numberOfStrings} strings × ${stringConfig.panelsPerString} panels<br/>
            System voltage: ${Math.round(stringConfig.totalSystemVoltage)}V<br/>
            System current: ${stringConfig.totalSystemCurrent.toFixed(1)}A
          </div>
        </div>
      `,
    })

    inverterMarker.addListener('click', () => {
      infoWindow.open(map, inverterMarker)
    })

    setOverlays({ polylines: newPolylines, labels: newLabels, inverterMarker })

    // Cleanup function - called when dependencies change or component unmounts
    return () => {
      try {
        // Clear animation intervals
        newPolylines.forEach(p => {
          const interval = (p as any).__animationInterval
          if (interval) {
            clearInterval(interval)
          }
          if (p.getMap()) p.setMap(null)
        })

        // Remove labels
        newLabels.forEach(l => {
          if (l.getMap()) l.setMap(null)
        })

        // Remove inverter marker
        if (inverterMarker.getMap()) {
          inverterMarker.setMap(null)
        }
      } catch (error) {
        // Silently ignore cleanup errors if markers already removed
        console.warn('Cleanup error (safe to ignore):', error)
      }
    }
  }, [map, panelMarkers, panelWattage, inverterType, showLabels])

  return null // This component only manages map overlays, no DOM rendering
}
