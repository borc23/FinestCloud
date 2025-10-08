'use client'

import { useEffect, useRef } from 'react'

interface GridOverlayProps {
  map: google.maps.Map | null
  panelData: any
  visible: boolean
  halfStepOffset?: number
}

/**
 * Grid overlay showing panel placement grid
 * halfStepOffset: 0 = normal grid, 0.5 = half step offset in X axis
 */
export default function GridOverlay({ map, panelData, visible, halfStepOffset = 0 }: GridOverlayProps) {
  const polylinesRef = useRef<google.maps.Polyline[]>([])

  useEffect(() => {
    if (!map || !visible || !panelData?.roofs) {
      // Clear existing grid
      polylinesRef.current.forEach(line => line.setMap(null))
      polylinesRef.current = []
      return
    }

    // Clear previous grid
    polylinesRef.current.forEach(line => line.setMap(null))
    polylinesRef.current = []

    // Extract all panel coordinates
    const allPanels: any[] = []
    panelData.roofs.forEach((roof: any) => {
      if (roof.panels && Array.isArray(roof.panels)) {
        roof.panels.forEach((panel: any) => {
          const coords = panel.coords || panel
          if (coords.length === 4) {
            allPanels.push(coords)
          }
        })
      }
    })

    if (allPanels.length === 0) return

    // Get reference panel to extract grid vectors
    const ref = allPanels[0]
    const p0 = { lat: ref[0].lat, lng: ref[0].lng }
    const p1 = { lat: ref[1].lat, lng: ref[1].lng }
    const p3 = { lat: ref[3].lat, lng: ref[3].lng }

    // Grid vectors (from p0 to adjacent corners)
    const vecX = { lat: p1.lat - p0.lat, lng: p1.lng - p0.lng } // width direction
    const vecY = { lat: p3.lat - p0.lat, lng: p3.lng - p0.lng } // height direction

    // Find all unique grid positions by projecting panels onto grid axes
    const gridPositions = new Set<string>()
    allPanels.forEach(panel => {
      const corner = { lat: panel[0].lat, lng: panel[0].lng }
      const fromOrigin = { lat: corner.lat - p0.lat, lng: corner.lng - p0.lng }

      // Project onto grid axes
      const magXSq = vecX.lat * vecX.lat + vecX.lng * vecX.lng
      const magYSq = vecY.lat * vecY.lat + vecY.lng * vecY.lng

      const dotX = fromOrigin.lat * vecX.lat + fromOrigin.lng * vecX.lng
      const dotY = fromOrigin.lat * vecY.lat + fromOrigin.lng * vecY.lng

      const gridX = Math.round(dotX / magXSq)
      const gridY = Math.round(dotY / magYSq)

      gridPositions.add(`${gridX},${gridY}`)
    })

    // Find grid bounds
    let minGridX = Infinity, maxGridX = -Infinity
    let minGridY = Infinity, maxGridY = -Infinity

    gridPositions.forEach(pos => {
      const [x, y] = pos.split(',').map(Number)
      minGridX = Math.min(minGridX, x)
      maxGridX = Math.max(maxGridX, x)
      minGridY = Math.min(minGridY, y)
      maxGridY = Math.max(maxGridY, y)
    })

    // Expand by 5 cells
    minGridX -= 5
    maxGridX += 5
    minGridY -= 5
    maxGridY += 5

    const newPolylines: google.maps.Polyline[] = []

    // Apply half-step offset in X direction
    const offsetVecX = { lat: vecX.lat * halfStepOffset, lng: vecX.lng * halfStepOffset }

    // Draw grid lines parallel to vecX (vertical lines in grid space)
    for (let gx = minGridX; gx <= maxGridX + 1; gx++) {
      const lineStart = {
        lat: p0.lat + gx * vecX.lat + minGridY * vecY.lat + offsetVecX.lat,
        lng: p0.lng + gx * vecX.lng + minGridY * vecY.lng + offsetVecX.lng
      }
      const lineEnd = {
        lat: p0.lat + gx * vecX.lat + (maxGridY + 1) * vecY.lat + offsetVecX.lat,
        lng: p0.lng + gx * vecX.lng + (maxGridY + 1) * vecY.lng + offsetVecX.lng
      }

      const line = new google.maps.Polyline({
        path: [lineStart, lineEnd],
        strokeColor: halfStepOffset > 0 ? '#ff00ff' : '#00ffff',
        strokeOpacity: 0.3,
        strokeWeight: 1,
        map
      })
      newPolylines.push(line)
    }

    // Draw grid lines parallel to vecY (horizontal lines in grid space)
    for (let gy = minGridY; gy <= maxGridY + 1; gy++) {
      const lineStart = {
        lat: p0.lat + minGridX * vecX.lat + gy * vecY.lat + offsetVecX.lat,
        lng: p0.lng + minGridX * vecX.lng + gy * vecY.lng + offsetVecX.lng
      }
      const lineEnd = {
        lat: p0.lat + (maxGridX + 1) * vecX.lat + gy * vecY.lat + offsetVecX.lat,
        lng: p0.lng + (maxGridX + 1) * vecX.lng + gy * vecY.lng + offsetVecX.lng
      }

      const line = new google.maps.Polyline({
        path: [lineStart, lineEnd],
        strokeColor: halfStepOffset > 0 ? '#ff00ff' : '#00ffff',
        strokeOpacity: 0.3,
        strokeWeight: 1,
        map
      })
      newPolylines.push(line)
    }

    polylinesRef.current = newPolylines
  }, [map, panelData, visible, halfStepOffset])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach(line => line.setMap(null))
    }
  }, [])

  return null
}
