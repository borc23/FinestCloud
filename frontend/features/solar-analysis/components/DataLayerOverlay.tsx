/**
 * Data Layer Overlay Component
 * Renders GeoTIFF data layers (like annual sunshine) as an overlay on Google Maps
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { parseGeoTIFFFromBuffer, geotiffToRGBA, type GeoTIFFData } from '../utils/geotiffParser'

interface DataLayerOverlayProps {
  map: google.maps.Map | null
  geotiffUrl?: string | null
  geotiffData?: GeoTIFFData | null // Optional: pre-loaded GeoTIFF data (overrides geotiffUrl)
  visible: boolean
  colorScale?: 'viridis' | 'heat' | 'sunshine'
  opacity?: number
  clipToPolygons?: google.maps.Polygon[] // Optional: clip overlay to these polygons
}

/**
 * Custom overlay class that extends Google Maps OverlayView
 */
class GeoTIFFOverlay extends google.maps.OverlayView {
  private bounds: google.maps.LatLngBounds
  private canvas: HTMLCanvasElement
  private div: HTMLDivElement | null = null
  private visible: boolean
  private opacity: number

  constructor(
    bounds: google.maps.LatLngBounds,
    canvas: HTMLCanvasElement,
    map: google.maps.Map,
    visible: boolean = true,
    opacity: number = 1.0
  ) {
    super()
    this.bounds = bounds
    this.canvas = canvas
    this.visible = visible
    this.opacity = opacity
    this.setMap(map)
  }

  onAdd() {
    const div = document.createElement('div')
    div.style.borderStyle = 'none'
    div.style.borderWidth = '0px'
    div.style.position = 'absolute'
    div.style.opacity = this.opacity.toString()

    // Add canvas to div
    div.appendChild(this.canvas)
    this.div = div

    // Add to overlay layer
    const panes = this.getPanes()
    if (panes) {
      panes.overlayLayer.appendChild(div)
    }
  }

  draw() {
    if (!this.div) return

    const overlayProjection = this.getProjection()
    if (!overlayProjection) return

    // Get pixel coordinates of bounds
    const sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest())
    const ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast())

    if (!sw || !ne) return

    // Position the div
    this.div.style.left = sw.x + 'px'
    this.div.style.top = ne.y + 'px'
    this.div.style.width = (ne.x - sw.x) + 'px'
    this.div.style.height = (sw.y - ne.y) + 'px'

    // Update canvas size to match
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
  }

  onRemove() {
    if (this.div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div)
      this.div = null
    }
  }

  setVisible(visible: boolean) {
    this.visible = visible
    if (this.div) {
      this.div.style.display = visible ? 'block' : 'none'
    }
  }

  setOpacity(opacity: number) {
    this.opacity = opacity
    if (this.div) {
      this.div.style.opacity = opacity.toString()
    }
  }
}

export default function DataLayerOverlay({
  map,
  geotiffUrl,
  geotiffData: preloadedGeotiffData,
  visible,
  colorScale = 'sunshine',
  opacity = 0.6,
  clipToPolygons
}: DataLayerOverlayProps) {
  const overlayRef = useRef<GeoTIFFOverlay | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Render GeoTIFF overlay from data
  const renderOverlay = async (geotiffData: GeoTIFFData) => {
    if (!map) return

    try {
      // Create canvas and render data
      const canvas = document.createElement('canvas')
      canvas.width = geotiffData.width
      canvas.height = geotiffData.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Convert GeoTIFF data to RGBA
      const rgbaData = geotiffToRGBA(
        geotiffData.rasters[0],
        geotiffData.width,
        geotiffData.height,
        geotiffData.min,
        geotiffData.max,
        colorScale
      )

      // Create ImageData and put on canvas
      const imageData = new ImageData(rgbaData, geotiffData.width, geotiffData.height)
      ctx.putImageData(imageData, 0, 0)

      // Apply polygon clipping if provided
      if (clipToPolygons && clipToPolygons.length > 0) {
        // Create a second canvas for clipping
        const clippedCanvas = document.createElement('canvas')
        clippedCanvas.width = geotiffData.width
        clippedCanvas.height = geotiffData.height
        const clippedCtx = clippedCanvas.getContext('2d')

        if (clippedCtx) {
          // Create clipping path from polygons
          clippedCtx.beginPath()

          clipToPolygons.forEach(polygon => {
            const path = polygon.getPath()
            for (let i = 0; i < path.getLength(); i++) {
              const point = path.getAt(i)
              const lat = point.lat()
              const lng = point.lng()

              // Convert lat/lng to canvas pixel coordinates
              const x = ((lng - geotiffData.bounds.west) / (geotiffData.bounds.east - geotiffData.bounds.west)) * geotiffData.width
              const y = ((geotiffData.bounds.north - lat) / (geotiffData.bounds.north - geotiffData.bounds.south)) * geotiffData.height

              if (i === 0) {
                clippedCtx.moveTo(x, y)
              } else {
                clippedCtx.lineTo(x, y)
              }
            }
            clippedCtx.closePath()
          })

          // Clip and draw the original canvas
          clippedCtx.clip()
          clippedCtx.drawImage(canvas, 0, 0)

          // Use the clipped canvas instead
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(clippedCanvas, 0, 0)
        }
      }

      // Apply 1 meter offset towards north
      // 1 meter latitude offset ≈ 0.000009 degrees
      const OFFSET_METERS = 1
      const LATITUDE_OFFSET = OFFSET_METERS * 0.000009

      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(geotiffData.bounds.south + LATITUDE_OFFSET, geotiffData.bounds.west),
        new google.maps.LatLng(geotiffData.bounds.north + LATITUDE_OFFSET, geotiffData.bounds.east)
      )

      // Remove existing overlay
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
      }

      // Create new overlay
      const overlay = new GeoTIFFOverlay(bounds, canvas, map, visible, opacity)
      overlayRef.current = overlay

      setIsLoading(false)

    } catch (err) {
      console.error('Error rendering GeoTIFF:', err)
      setError(err instanceof Error ? err.message : 'Failed to render data layer')
      setIsLoading(false)
    }
  }

  // Load and render GeoTIFF when data changes and visible is true
  useEffect(() => {
    if (!map || !visible) {
      // Clean up existing overlay if not visible
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
      return
    }

    // Prefer preloaded data over fetching from URL
    if (preloadedGeotiffData) {
      renderOverlay(preloadedGeotiffData)
      return
    }

    if (!geotiffUrl) {
      // No data or URL provided, clean up
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
      return
    }

    // Fetch from URL if no preloaded data
    let isMounted = true

    const loadGeoTIFF = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Use proxy endpoint to fetch GeoTIFF with authentication
        const proxyUrl = `/api/solar-data-layers/geotiff?url=${encodeURIComponent(geotiffUrl)}`

        // Fetch the GeoTIFF as array buffer
        const response = await fetch(proxyUrl)
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Proxy error response:', errorText)
          throw new Error(`Failed to fetch GeoTIFF: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()

        // Parse GeoTIFF from array buffer
        const geotiffData: GeoTIFFData = await parseGeoTIFFFromBuffer(arrayBuffer)

        if (!isMounted) return

        await renderOverlay(geotiffData)

      } catch (err) {
        console.error('Error loading GeoTIFF:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data layer')
          setIsLoading(false)
        }
      }
    }

    loadGeoTIFF()

    return () => {
      isMounted = false
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
    }
  }, [map, geotiffUrl, preloadedGeotiffData, visible, colorScale, opacity, clipToPolygons])

  // Note: Visibility is now handled in the main useEffect above
  // This separate effect is no longer needed but kept for backwards compatibility
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setVisible(visible)
    }
  }, [visible])

  if (error) {
    console.error('Data layer error:', error)
  }

  // This component doesn't render anything visible - it's a map overlay
  return null
}
