'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
    const left = (containerRect.width - squareSize) / 2
    const top = (containerRect.height - squareSize) / 2

    overlayRef.current.style.left = `${left}px`
    overlayRef.current.style.top = `${top}px`
    overlayRef.current.style.width = `${squareSize}px`
    overlayRef.current.style.height = `${squareSize}px`
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
      }
    }
  }, [isVisible, map]) // Remove updatePosition from dependencies

  // Add ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible && !isProcessing) {
        event.preventDefault()
        // Blur any focused button to prevent visual feedback
        if (document.activeElement instanceof HTMLButtonElement) {
          document.activeElement.blur()
        }
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

  const getBounds = useCallback(async (): Promise<google.maps.LatLngBounds | null> => {
    if (!overlayRef.current || !map) {
      return null
    }

    try {
      const overlay = new google.maps.OverlayView()
      overlay.draw = function() {}
      overlay.setMap(map)

      // Wait for overlay to be ready with timeout
      return new Promise((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 40 // 2 seconds max wait

        const checkProjection = () => {
          const projection = overlay.getProjection()
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


              // Clean up overlay properly using a setTimeout to avoid timing issues
              setTimeout(() => {
                try {
                  overlay.setMap(null)
                } catch (cleanupError) {
                  console.warn('Overlay cleanup warning:', cleanupError)
                }
              }, 10)

              resolve(bounds)
            } catch (projectionError) {
              // Still try to clean up
              setTimeout(() => {
                try {
                  overlay.setMap(null)
                } catch (cleanupError) {
                  // Ignore cleanup errors
                }
              }, 10)
              reject(projectionError)
            }
          } else {
            attempts++
            if (attempts >= maxAttempts) {
              try {
                overlay.setMap(null)
              } catch (cleanupError) {
                // Ignore cleanup errors
              }
              reject(new Error('Timeout waiting for Google Maps projection'))
            } else {
              setTimeout(checkProjection, 50)
            }
          }
        }
        checkProjection()
      })
    } catch (error) {
      return null
    }
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
            <div className={styles.spinner} />
            <span>Processing</span>
          </div>
        )}

        {/* Action Button */}
        <div className={styles.actionContainer}>
        <button
          className={styles.primaryButton}
          onClick={handleDetect}
          disabled={isProcessing}
          aria-label={isProcessing ? "Processing" : "Start Capture"}
        >
          {isProcessing ? (
            <>
              <div className={styles.buttonSpinner} />
              Processing
            </>
          ) : (
            'Capture'
          )}
        </button>

        <button
          className={styles.secondaryButton}
          onClick={onToggle}
          disabled={isProcessing}
          aria-label="Cancel"
        >
          Cancel
        </button>
        </div>
      </div>
    </>
  )
}