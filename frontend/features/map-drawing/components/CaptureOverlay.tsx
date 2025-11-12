'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Button from '@/shared/components/ui/Button'
import Spinner from '@/shared/components/ui/Spinner'
import styles from './CaptureOverlay.module.css'
import { useTutorial } from '@/contexts/TutorialContext'

interface CaptureOverlayProps {
  isVisible: boolean
  onCapture: (bounds: google.maps.LatLngBounds | null, size?: { width: number; height: number }) => void
  onToggle: () => void
  map: google.maps.Map | null
}

export default function CaptureOverlay({ isVisible, onCapture, onToggle, map }: CaptureOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { showTooltip, markStepComplete } = useTutorial()

  const updatePosition = useCallback(() => {
    if (!overlayRef.current || !map) return

    const mapContainer = map.getDiv()
    const containerRect = mapContainer.getBoundingClientRect()

    // Calculate capture size based on available space
    // Reserve space for toolstrip at top (44px + padding) and buttons at bottom (120px)
    const reservedTopSpace = 60 // Toolstrip height + some padding
    const reservedBottomSpace = 120 // Space for Cancel/Capture buttons
    const availableHeight = containerRect.height - reservedTopSpace - reservedBottomSpace
    const availableWidth = containerRect.width

    // Use the smaller dimension to ensure it fits, with a max of 640px
    const maxSize = Math.min(availableWidth, availableHeight, 640)

    // Center the capture square horizontally
    const left = (containerRect.width - maxSize) / 2
    // Position vertically between toolstrip and buttons
    const top = reservedTopSpace + (availableHeight - maxSize) / 2

    overlayRef.current.style.left = `${left}px`
    overlayRef.current.style.top = `${top}px`
    overlayRef.current.style.width = `${maxSize}px`
    overlayRef.current.style.height = `${maxSize}px`
  }, [map])

  useEffect(() => {
    if (isVisible && map) {
      updatePosition()

      // Show tutorial tooltip when capture overlay becomes visible
      setTimeout(() => {
        showTooltip({
          id: 'capture_overlay',
          targetElement: '[data-tutorial="capture-square"]',
          content: 'Position this square over the roof and click Capture. Our AI will detect roofs and obstacles.',
          position: 'top',
          showNext: false,
          showSkip: true,
        })
      }, 500)

      // Mark search step as complete
      markStepComplete('search')

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
  }, [isVisible, map, updatePosition, showTooltip, markStepComplete])

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
            animationFrameId = null
          }
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          if (overlay) {
            try {
              // Check if overlay has setMap method before calling
              if (typeof overlay.setMap === 'function') {
                overlay.setMap(null)
              }
            } catch (cleanupError) {
              // Silently ignore cleanup errors as they don't affect functionality
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

              if (!topLeftLatLng || !bottomRightLatLng) {
                cleanup()
                reject(new Error('Failed to convert pixel coordinates to LatLng'))
                return
              }

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
          if (typeof overlay.setMap === 'function') {
            overlay.setMap(null);
          }
        } catch {
          // Silently ignore cleanup errors
        }
      }

      isCalculatingRef.current = false;
      return null;
    } finally {
      isCalculatingRef.current = false;
    }
  }, [map])

  const handleDetect = async () => {
    if (isProcessing) return

    setIsProcessing(true)

    try {
      const bounds = await getBounds()

      // Get the actual capture size
      const size = overlayRef.current ? {
        width: parseInt(overlayRef.current.style.width, 10),
        height: parseInt(overlayRef.current.style.height, 10)
      } : undefined

      await onCapture(bounds, size)

      // Mark capture step as complete after successful capture
      markStepComplete('capture')

      // Show edit mode tooltip to explain editing capabilities
      setTimeout(() => {
        showTooltip({
          id: 'edit_mode',
          targetElement: '[data-tool="polygon"]',
          content: 'Now you can edit, move, or draw more polygons to refine areas our AI might have missed. Use the drawing tools to add or adjust roof sections.',
          position: 'right',
          showNext: true,
          showSkip: true,
        })
      }, 1500)
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
        data-tutorial="capture-square"
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
          disabled={isProcessing}
          aria-label={isProcessing ? "Processing" : "Start Capture"}
        >
          Capture
        </Button>
        </div>
      </div>
    </>
  )
}