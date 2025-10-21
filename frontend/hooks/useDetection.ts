import { useState, useCallback, useRef } from 'react'
import { DetectionBounds, DetectionResponse, DetectionRequest } from '../types/detection'

interface UseDetectionReturn {
  error: string | null
  detectRoofs: (map: google.maps.Map, bounds: google.maps.LatLngBounds, size?: { width: number; height: number }) => Promise<DetectionResponse | null>
  clearError: () => void
}

export function useDetection(): UseDetectionReturn {
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
    bounds: google.maps.LatLngBounds,
    size?: { width: number; height: number }
  ): Promise<DetectionResponse | null> => {
    if (isDetectingRef.current) return null

    isDetectingRef.current = true
    setError(null)

    try {
      const zoom = map.getZoom()

      if (!zoom) {
        throw new Error('Unable to get map zoom')
      }

      const detectionBounds = convertBoundsToDetectionBounds(bounds)

      // Calculate the center of the capture overlay bounds, not the entire map
      const captureCenter = bounds.getCenter()

      // Use actual capture size - the bounds match this size
      const imageSize = size ? `${size.width}x${size.height}` : '640x640'

      console.log(`🌐 REQUESTING GOOGLE MAPS IMAGE:`, {
        size: imageSize,
        center: `${captureCenter.lat()},${captureCenter.lng()}`,
        zoom: zoom,
        bounds: detectionBounds
      })

      const requestData: DetectionRequest = {
        image: {
          center: `${captureCenter.lat()},${captureCenter.lng()}`,
          zoom: zoom,
          size: imageSize,
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
    }
  }, [convertBoundsToDetectionBounds])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    detectRoofs,
    clearError
  }
}