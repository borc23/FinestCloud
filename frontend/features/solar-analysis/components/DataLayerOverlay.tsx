/**
 * Data Layer Overlay Component
 * Renders GeoTIFF data layers (like annual sunshine) as an overlay on Google Maps
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { parseGeoTIFFFromBuffer, geotiffToRGBA, type GeoTIFFData } from '../utils/geotiffParser'

interface DataLayerOverlayProps {
  map: google.maps.Map | null
  geotiffUrl: string | null
  visible: boolean
  colorScale?: 'viridis' | 'heat' | 'sunshine'
  opacity?: number
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
    opacity: number = 0.6
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
  visible,
  colorScale = 'sunshine',
  opacity = 0.6
}: DataLayerOverlayProps) {
  const overlayRef = useRef<GeoTIFFOverlay | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load and render GeoTIFF when URL changes
  useEffect(() => {
    if (!map || !geotiffUrl) {
      // Clean up existing overlay
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
      return
    }

    let isMounted = true

    const loadGeoTIFF = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log('Loading GeoTIFF from:', geotiffUrl)

        // Use proxy endpoint to fetch GeoTIFF with authentication
        const proxyUrl = `/api/solar-data-layers/geotiff?url=${encodeURIComponent(geotiffUrl)}`
        console.log('Fetching through proxy:', proxyUrl)

        // Fetch the GeoTIFF as array buffer
        const response = await fetch(proxyUrl)
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Proxy error response:', errorText)
          throw new Error(`Failed to fetch GeoTIFF: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        console.log('GeoTIFF downloaded, size:', arrayBuffer.byteLength, 'bytes')

        // Parse GeoTIFF from array buffer
        const geotiffData: GeoTIFFData = await parseGeoTIFFFromBuffer(arrayBuffer)

        if (!isMounted) return

        console.log('GeoTIFF loaded:', {
          width: geotiffData.width,
          height: geotiffData.height,
          bounds: geotiffData.bounds
        })

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

        // Create bounds for overlay
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(geotiffData.bounds.south, geotiffData.bounds.west),
          new google.maps.LatLng(geotiffData.bounds.north, geotiffData.bounds.east)
        )

        // Remove existing overlay
        if (overlayRef.current) {
          overlayRef.current.setMap(null)
        }

        // Create new overlay
        const overlay = new GeoTIFFOverlay(bounds, canvas, map, visible, opacity)
        overlayRef.current = overlay

        console.log('GeoTIFF overlay created successfully')
        setIsLoading(false)

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
  }, [map, geotiffUrl, colorScale, opacity])

  // Update visibility when visible prop changes
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setVisible(visible)
    }
  }, [visible])

  // Render loading/error states (optional - could be shown elsewhere)
  if (isLoading) {
    console.log('Loading data layer...')
  }

  if (error) {
    console.error('Data layer error:', error)
  }

  // This component doesn't render anything visible - it's a map overlay
  return null
}
