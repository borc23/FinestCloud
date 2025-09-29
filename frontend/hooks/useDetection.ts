import { useState, useCallback } from 'react'
import { DetectionBounds, DetectionResponse, DetectionRequest } from '../types/detection'

interface UseDetectionReturn {
  isDetecting: boolean
  error: string | null
  detectRoofs: (map: google.maps.Map, bounds: google.maps.LatLngBounds) => Promise<DetectionResponse | null>
  clearError: () => void
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyArFZ4SYEzNAsmUgD0ss-kEScpZSC-1jh0'

export function useDetection(): UseDetectionReturn {
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateStaticMapUrl = useCallback((map: google.maps.Map): string => {
    const center = map.getCenter()
    const zoom = map.getZoom()

    if (!center) {
      throw new Error('Unable to get map center')
    }

    const params = new URLSearchParams({
      center: `${center.lat()},${center.lng()}`,
      size: '640x640',
      maptype: 'satellite',
      zoom: zoom.toString(),
      format: 'jpg',
      style: 'feature:all|color:0xffffff',
      key: GOOGLE_MAPS_API_KEY
    })

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
  }, [])

  const convertBoundsToDetectionBounds = useCallback((bounds: google.maps.LatLngBounds): DetectionBounds => {
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    return {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng()
    }
  }, [])

  const detectRoofs = useCallback(async (
    map: google.maps.Map,
    bounds: google.maps.LatLngBounds
  ): Promise<DetectionResponse | null> => {
    if (isDetecting) return null

    setIsDetecting(true)
    setError(null)

    try {
      const staticMapUrl = generateStaticMapUrl(map)
      const detectionBounds = convertBoundsToDetectionBounds(bounds)

      const requestData: DetectionRequest = {
        image: staticMapUrl,
        bounds: detectionBounds,
        conf: 0.5,
        epsilon: 0.0075
      }

      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`Detection request failed: ${response.statusText}`)
      }

      const result: DetectionResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Detection failed')
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Detection failed'
      setError(errorMessage)
      console.error('Detection error:', err)
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [isDetecting, generateStaticMapUrl, convertBoundsToDetectionBounds])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isDetecting,
    error,
    detectRoofs,
    clearError
  }
}