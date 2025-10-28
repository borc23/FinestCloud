import { useState, useCallback, useRef } from 'react'
import { DetectionBounds, DetectionResponse, DetectionRequest } from '../types/detection'

interface DetectionError {
  code: 'NETWORK' | 'VALIDATION' | 'SERVER' | 'UNKNOWN'
  message: string
  isRetryable: boolean
  timestamp: number
}

interface UseDetectionReturn {
  error: DetectionError | null
  isDetecting: boolean
  detectRoofs: (
    map: google.maps.Map, 
    bounds: google.maps.LatLngBounds, 
    size?: { width: number; height: number }
  ) => Promise<DetectionResponse | null>
  clearError: () => void
}

export function useDetection(): UseDetectionReturn {
  const [error, setError] = useState<DetectionError | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)

  const createError = useCallback((
    code: DetectionError['code'],
    message: string,
    isRetryable: boolean
  ): DetectionError => ({
    code,
    message,
    isRetryable,
    timestamp: Date.now()
  }), [])

  const toDetectionBounds = useCallback((bounds: google.maps.LatLngBounds): DetectionBounds => {
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
    if (isDetecting) {
      setError(createError(
        'VALIDATION',
        'Detection already in progress',
        false
      ))
      return null
    }

    setIsDetecting(true)
    setError(null)

    try {
      const zoom = map.getZoom()

      if (!zoom) {
        throw createError(
          'VALIDATION',
          'Unable to get map zoom',
          false
        )
      }

      const detectionBounds = toDetectionBounds(bounds)
      const captureCenter = bounds.getCenter()
      const imageSize = size ? `${size.width}x${size.height}` : '640x640'
      
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
        const isServerError = response.status >= 500
        const isClientError = response.status >= 400 && response.status < 500
        
        throw createError(
          isServerError ? 'SERVER' : isClientError ? 'VALIDATION' : 'UNKNOWN',
          `Detection request failed: ${response.statusText}`,
          isServerError
        )
      }

      const result: DetectionResponse = await response.json()

      if (!result.success) {
        throw createError(
          'SERVER',
          result.error || 'Detection failed',
          true
        )
      }

      return result
    } catch (err) {
      if (isDetectionError(err)) {
        setError(err)
        console.error('Detection error:', err)
        return null
      }

      if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = createError(
          'NETWORK',
          'Network request failed. Please check your connection.',
          true
        )
        setError(networkError)
        console.error('Network error:', err)
        return null
      }

      const unknownError = createError(
        'UNKNOWN',
        err instanceof Error ? err.message : 'An unexpected error occurred',
        false
      )
      setError(unknownError)
      console.error('Unknown error:', err)
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [isDetecting, toDetectionBounds, createError])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    isDetecting,
    detectRoofs,
    clearError
  }
}

function isDetectionError(error: unknown): error is DetectionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'isRetryable' in error &&
    'timestamp' in error
  )
}
