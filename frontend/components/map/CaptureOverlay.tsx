'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import styles from './CaptureOverlay.module.css'

interface CaptureOverlayProps {
  isVisible: boolean
  onCapture: (bounds: google.maps.LatLngBounds | null) => void
  onToggle: () => void
  map: google.maps.Map | null
}

export default function CaptureOverlay({ isVisible, onCapture, onToggle, map }: CaptureOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const updatePosition = useCallback(() => {
    if (!overlayRef.current || !map) return

    const mapContainer = map.getDiv()
    const containerRect = mapContainer.getBoundingClientRect()

    // Center the 640x640 capture square
    const squareSize = 640
    const maxSize = Math.min(containerRect.width, containerRect.height, squareSize)
    const left = (containerRect.width - maxSize) / 2
    const top = (containerRect.height - maxSize) / 2

    overlayRef.current.style.left = `${left}px`
    overlayRef.current.style.top = `${top}px`
    overlayRef.current.style.width = `${maxSize}px`
    overlayRef.current.style.height = `${maxSize}px`
  }, [map])

  useEffect(() => {
    if (isVisible && map) {
      updatePosition()

      // Update position when map changes
      const listeners = [
        google.maps.event.addListener(map, 'zoom_changed', updatePosition),
        google.maps.event.addListener(map, 'center_changed', updatePosition),
        google.maps.event.addListener(map, 'idle', updatePosition)
      ]

      return () => {
        listeners.forEach(listener => google.maps.event.removeListener(listener))
        listeners.length = 0
      }
    }
  }, [isVisible, map, updatePosition])

  // Add ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible && !isProcessing) {
        event.preventDefault()
        // Blur any focused button to prevent visual feedback
        if (document.activeElement instanceof HTMLButtonElement) {
          document.activeElement.blur()
        }
        // Reset processing state when closing
        setIsProcessing(false)
        onToggle()
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, isProcessing, onToggle])

  // Reset processing state when overlay becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setIsProcessing(false)
    }
  }, [isVisible])

  const isCalculatingRef = useRef(false)

  const getBounds = useCallback(async (): Promise<google.maps.LatLngBounds | null> => {
    if (!overlayRef.current || !map) return null
    if (isCalculatingRef.current) return null

    isCalculatingRef.current = true

    let overlay: google.maps.OverlayView | null = null

    try {
      overlay = new google.maps.OverlayView()
      overlay.draw = function() {}
      overlay.setMap(map)

      // Wait for overlay to be ready with timeout
      return new Promise((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 10 // Reduced from 40 to 10 attempts
        let animationFrameId: number | null = null
        let timeoutId: NodeJS.Timeout | null = null
        const startTime = Date.now()
        const maxWaitTime = 500 // Reduced from 2000ms to 500ms

        const cleanup = () => {
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId)
          }
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          if (overlay) {
            try {
              overlay.setMap(null)
            } catch (cleanupError) {
              console.warn('Overlay cleanup warning:', cleanupError)
            }
          }
        }

        const checkProjection = () => {
          const projection = overlay!.getProjection()
          if (projection) {
            try {
              const mapContainer = map.getDiv()
              const containerRect = mapContainer.getBoundingClientRect()
              const squareRect = overlayRef.current!.getBoundingClientRect()

              const topLeft = new google.maps.Point(
                squareRect.left - containerRect.left,
                squareRect.top - containerRect.top
              )
              const bottomRight = new google.maps.Point(
                squareRect.right - containerRect.left,
                squareRect.bottom - containerRect.top
              )

              const topLeftLatLng = projection.fromContainerPixelToLatLng(topLeft)
              const bottomRightLatLng = projection.fromContainerPixelToLatLng(bottomRight)

              const bounds = new google.maps.LatLngBounds()
              bounds.extend(topLeftLatLng)
              bounds.extend(bottomRightLatLng)

              cleanup()
              resolve(bounds)
            } catch (projectionError) {
              cleanup()
              reject(projectionError)
            }
          } else {
            attempts++
            const elapsedTime = Date.now() - startTime

            if (attempts >= maxAttempts || elapsedTime >= maxWaitTime) {
              cleanup()
              reject(new Error('Timeout waiting for Google Maps projection'))
            } else {
              // Use requestAnimationFrame for more efficient polling
              animationFrameId = requestAnimationFrame(checkProjection)
            }
          }
        }
        checkProjection()
      })
    } catch (error) {
      if (overlay) {
        try {
          overlay.setMap(null);
        } catch {
        }
      }

      isCalculatingRef.current = false;
      return null;
    }
    isCalculatingRef.current = false;
    return null;
  }, [map])

  const handleDetect = async () => {
    if (isProcessing) return

    setIsProcessing(true)

    try {
      const bounds = await getBounds()
      await onCapture(bounds)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* ARIA Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className={styles.srOnly}>
        {isProcessing ? "Processing capture" : ""}
      </div>

      {/* Capture Square */}
      <div
        ref={overlayRef}
        className={styles.captureSquare}
        data-processing={isProcessing}
      >
        <div className={styles.squareBorder}>
        </div>

        {isProcessing && (
          <div className={styles.processingOverlay}>
            <Spinner size="md" variant="primary" />
            <span>Processing</span>
          </div>
        )}

        {/* Action Button */}
        <div className={styles.actionContainer}>
        <Button
          variant="secondary"
          onClick={onToggle}
          disabled={isProcessing}
          aria-label="Cancel"
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          onClick={handleDetect}
          loading={isProcessing}
          aria-label={isProcessing ? "Processing" : "Start Capture"}
        >
          Capture
        </Button>
        </div>
      </div>
    </>
  )
}