'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './MapContainer.module.css'
import CaptureOverlay from './CaptureOverlay'
import { useDetection } from '../hooks/useDetection'
import { usePolygons } from '../hooks/usePolygons'

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

interface MapContainerProps {
  activeTool: string
  onMapReady?: (map: any) => void
  onPanelsAvailable?: (available: boolean) => void
  onToolChange?: (tool: string) => void
}

export default function MapContainer({ activeTool, onMapReady, onPanelsAvailable, onToolChange }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isImageView, setIsImageView] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showCaptureOverlay, setShowCaptureOverlay] = useState(false)

  // Hooks for detection and polygon management
  const { isDetecting, error: detectionError, detectRoofs, clearError } = useDetection()
  const { roofPolygons, objectPolygons, renderPolygons, clearAllPolygons, hasRoofs } = usePolygons(map)

  // Effect to handle panels tool visibility based on roof detection
  useEffect(() => {
    onPanelsAvailable?.(hasRoofs)
  }, [hasRoofs, onPanelsAvailable])

  // Effect to show/hide capture overlay based on active tool
  useEffect(() => {
    if (activeTool === 'select') {
      setShowCaptureOverlay(true)
    } else {
      setShowCaptureOverlay(false)
    }
  }, [activeTool])

  // Handle roof detection
  const handleDetection = useCallback(async (bounds: google.maps.LatLngBounds | null) => {
    if (!map || !bounds) {
      return
    }

    try {
      const result = await detectRoofs(map, bounds)

      if (result?.success) {
        // Clear existing polygons
        clearAllPolygons()

        // Render new polygons
        if (result.roofs) {
          renderPolygons(result.roofs, true) // isRoof = true
        }
        if (result.objects) {
          renderPolygons(result.objects, false) // isRoof = false
        }

        // Hide capture overlay after successful detection
        setShowCaptureOverlay(false)
      }
    } catch (err) {
      console.error('Detection failed:', err)
    }
  }, [map, detectRoofs, clearAllPolygons, renderPolygons])

  useEffect(() => {
    const initializeMap = () => {
      if (mapRef.current && window.google) {
        const mapOptions = {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 20,
          tilt: 0,
          mapTypeId: 'satellite',
          rotateControl: false,
          tiltInteractionEnabled: false,
          disableDefaultUI: true,
          zoomControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'road',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }

        const googleMap = new window.google.maps.Map(mapRef.current, mapOptions)
        setMap(googleMap)
        onMapReady?.(googleMap)
        console.log('Map initialized with enhanced settings')
      }
    }

    if (window.google && window.google.maps) {
      initializeMap()
    } else {
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps)
          initializeMap()
        }
      }, 100)
      setTimeout(() => clearInterval(checkGoogleMaps), 10000)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      console.log('Image file dropped:', files[0].name)
      setIsImageView(true)
      // Handle image upload logic
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('File selected:', files[0].name)
      setIsImageView(true)
    }
  }

  return (
    <div className={`${styles.mapContainer} ${isDragging ? styles.dragOver : ''}`}>
      {/* Full-screen immersive map */}
      <div
        ref={mapRef}
        className={styles.map}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      ></div>

      {/* Tool-specific overlays */}
      {activeTool === 'upload' && !isImageView && (
        <div className={styles.uploadPrompt}>
          <div className={styles.promptCard}>
            <div className={styles.promptIcon}>
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <h3>Upload Satellite Image</h3>
            <p>Drag and drop an image or click to browse</p>
            <button
              className="btn btn-primary"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              Choose File
            </button>
          </div>
        </div>
      )}

      {/* Capture Overlay for roof detection */}
      <CaptureOverlay
        isVisible={showCaptureOverlay}
        onCapture={handleDetection}
        onToggle={() => {
          setShowCaptureOverlay(false)
          onToolChange?.('')
        }}
        map={map}
      />

      {/* Error notification */}
      {detectionError && (
        <div className={styles.errorNotification}>
          <div className={styles.errorCard}>
            <i className="fas fa-exclamation-triangle"></i>
            <span>{detectionError}</span>
            <button onClick={clearError} className={styles.errorClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragContent}>
            <i className="fas fa-cloud-upload-alt"></i>
            <h3>Drop image to upload</h3>
            <p>Release to start processing</p>
          </div>
        </div>
      )}

      {/* Image view mode */}
      {isImageView && (
        <div className={styles.imageView}>
          <div className={styles.imageViewHeader}>
            <button
              className="btn btn-ghost"
              onClick={() => setIsImageView(false)}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Map
            </button>
          </div>
          <div className={styles.imageContainer}>
            <div className={styles.imagePlaceholder}>
              <i className="fas fa-image"></i>
              <p>Image will appear here</p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Floating zoom controls */}
      <div className={styles.mapControls}>
        <button className={styles.zoomControl} onClick={() => map?.setZoom(map.getZoom() + 1)}>
          <i className="fas fa-plus"></i>
        </button>
        <button className={styles.zoomControl} onClick={() => map?.setZoom(map.getZoom() - 1)}>
          <i className="fas fa-minus"></i>
        </button>
      </div>
    </div>
  )
}