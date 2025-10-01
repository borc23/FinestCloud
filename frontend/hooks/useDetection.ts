import { useState, useCallback, useRef } from 'react'
import { DetectionBounds, DetectionResponse, DetectionRequest } from '../types/detection'

interface UseDetectionReturn {
  isDetecting: boolean
  error: string | null
  detectRoofs: (map: google.maps.Map, bounds: google.maps.LatLngBounds) => Promise<DetectionResponse | null>
  clearError: () => void
}

export function useDetection(): UseDetectionReturn {
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDetectingRef = useRef(false)

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
    if (isDetectingRef.current) return null

    isDetectingRef.current = true
    setIsDetecting(true)
    setError(null)

    try {
      const center = map.getCenter()
      const zoom = map.getZoom()

      if (!center) {
        throw new Error('Unable to get map center')
      }

      const detectionBounds = convertBoundsToDetectionBounds(bounds)

      const requestData: DetectionRequest = {
        image: {
          center: `${center.lat()},${center.lng()}`,
          zoom: zoom,
          size: '640x640',
          maptype: 'satellite',
          format: 'jpg',
          style: 'feature:all|color:0xffffff'
        },
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
      isDetectingRef.current = false
      setIsDetecting(false)
    }
  }, [convertBoundsToDetectionBounds])

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