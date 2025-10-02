'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './MapContainer.module.css'
import CaptureOverlay from './CaptureOverlay'
import EditDrawTabBar from './EditDrawTabBar'
import { useDetection } from '../hooks/useDetection'
import { usePolygons } from '../hooks/usePolygons'
import { useEditMode } from '../hooks/useEditMode'
import { usePolygonManager } from '../hooks/usePolygonManager'
import { useDrawingMode } from '../hooks/useDrawingMode'
import { SolarPanelApiService } from '../lib/solarPanelApi'
import RoofAnglePanel from './RoofAnglePanel'
// import { StyleConfig } from '../utils/styleConfig'

declare global {
  interface Window {
    google: typeof google
    initMap: () => void
  }
}

interface MapContainerProps {
  activeTool: string
  onMapReady?: (map: any) => void
  onToolChange?: (tool: string) => void
  onPanelsAvailable?: (available: boolean) => void
}

export default function MapContainer({ activeTool, onMapReady, onToolChange, onPanelsAvailable }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isImageView, setIsImageView] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showCaptureOverlay, setShowCaptureOverlay] = useState(false)
  const [drawingTypeSelection, setDrawingTypeSelection] = useState<'roof' | 'object'>('roof')
  const [showAnglePanel, setShowAnglePanel] = useState(false)
  const [solarDataResults, setSolarDataResults] = useState<any>(null)
  const solarPanelApiRef = useRef(new SolarPanelApiService())

  const activeTab: 'edit' | 'draw' = activeTool === 'draw' ? 'draw' : 'edit'

  const { error: detectionError, detectRoofs, clearError } = useDetection()
  const { roofPolygons, objectPolygons, renderPolygons, clearAllPolygons, removeClickListener, removePolygons, hasRoofs } = usePolygons(map)

  // Edit mode hook
  const {
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    toggleEditMode,
    selectPolygon,
  } = useEditMode({
    map,
    onDeletePolygons: removePolygons
  })

  // Handle polygon creation from drawing
  const handlePolygonComplete = useCallback((path: google.maps.LatLng[], isRoof: boolean) => {
    if (!map) return

    // Convert path to coordinate format and render using the standard rendering function
    const coords = path.map(p => ({ lat: p.lat(), lng: p.lng() }))
    renderPolygons([{ coords }], isRoof)
  }, [map, renderPolygons])

  // Drawing mode hook
  const { isDrawing, startDrawing, stopDrawing } = useDrawingMode({
    map,
    isEditMode,
    onPolygonComplete: handlePolygonComplete
  })

  // Polygon manager hook
  const { updateAllPolygons } = usePolygonManager({
    map,
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    isDrawing,
    onSelectPolygon: selectPolygon,
    removeClickListener
  })

  // Effect to handle panels tool visibility based on roof polygon presence
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

  // Handle tab changes by updating the parent tool state
  const handleTabChange = useCallback((tab: 'edit' | 'draw') => {
    onToolChange?.(tab)
  }, [onToolChange])

  const handleDrawingTypeChange = useCallback((type: 'roof' | 'object') => {
    setDrawingTypeSelection(type)
    // If already drawing, switch to the new type
    if (isDrawing) {
      stopDrawing()
      startDrawing(type)
    }
  }, [isDrawing, stopDrawing, startDrawing])

  // Handle solar panel generation
  const handlePanelGeneration = useCallback(async () => {
    if (!map || roofPolygons.length === 0) {
      console.warn('No roof polygons available for panel generation')
      return
    }

    // Show panel immediately with null data (loading state)
    setSolarDataResults(null)
    setShowAnglePanel(true)

    try {
      const mapBounds = solarPanelApiRef.current.getMapBounds(map)
      const result = await solarPanelApiRef.current.fetchSolarDataForPolygons(roofPolygons, mapBounds)

      if (result.success && result.data) {
        setSolarDataResults(result.data)
      } else {
        console.error('Failed to fetch solar panel data:', result.error)
        // Keep panel open but with null data
      }
    } catch (err) {
      console.error('Panel generation failed:', err)
      // Keep panel open but with null data
    }
  }, [map, roofPolygons])

  const handleAngleConfirm = useCallback((data: { angles: number[]; edgePadding: number }) => {
    console.log('Confirmed angles and padding:', data)
    setShowAnglePanel(false)
  }, [])

  const handleAngleCancel = useCallback(() => {
    setShowAnglePanel(false)
    onToolChange?.('')
  }, [onToolChange])

  // Effect to manage edit/draw mode based on active tool
  useEffect(() => {
    if (activeTool === 'edit') {
      // Enter edit mode
      if (!isEditMode) {
        toggleEditMode()
      }
      // Stop any active drawing
      if (isDrawing) {
        stopDrawing()
      }
      // Hide angle panel when switching away from panels tool
      setShowAnglePanel(false)
    } else if (activeTool === 'draw') {
      // Enter draw mode
      if (!isEditMode) {
        toggleEditMode()
      }
      // Start drawing with the selected type
      if (!isDrawing) {
        startDrawing(drawingTypeSelection)
      }
      // Hide angle panel when switching away from panels tool
      setShowAnglePanel(false)
    } else if (activeTool === 'panels') {
      // Handle panels generation
      handlePanelGeneration()
      // Exit edit/draw mode
      if (isEditMode) {
        toggleEditMode()
      }
      if (isDrawing) {
        stopDrawing()
      }
    } else {
      // Exit edit/draw mode when switching to any other tool
      if (isEditMode) {
        toggleEditMode()
      }
      if (isDrawing) {
        stopDrawing()
      }
      // Hide angle panel when switching away from panels tool
      setShowAnglePanel(false)
    }
  }, [activeTool, isEditMode, isDrawing, drawingTypeSelection, toggleEditMode, stopDrawing, startDrawing])

  const roofPolygonsRef = useRef<google.maps.Polygon[]>([])
  const objectPolygonsRef = useRef<google.maps.Polygon[]>([])

  useEffect(() => {
    roofPolygonsRef.current = roofPolygons
    objectPolygonsRef.current = objectPolygons
  }, [roofPolygons, objectPolygons])

  useEffect(() => {
    const allPolygons = [...roofPolygonsRef.current, ...objectPolygonsRef.current]

    allPolygons.forEach(polygon => {
      if (polygon) {
        polygon.setOptions({ clickable: !isDrawing })
      }
    })

    if (roofPolygonsRef.current.length > 0) {
      updateAllPolygons(roofPolygonsRef.current, true)
    }
    if (objectPolygonsRef.current.length > 0) {
      updateAllPolygons(objectPolygonsRef.current, false)
    }
  }, [isEditMode, selectedPolygons, isDrawing, updateAllPolygons])

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
    let checkInterval: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null

    const initializeMap = () => {
      if (mapRef.current && window.google && window.google.maps && window.google.maps.Map) {
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
      }
    }

    if (window.google && window.google.maps && window.google.maps.Map) {
      initializeMap()
    } else {
      checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          if (checkInterval) clearInterval(checkInterval)
          if (timeoutId) clearTimeout(timeoutId)
          initializeMap()
        }
      }, 100)
      timeoutId = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval)
      }, 10000)
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [onMapReady])

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
      setIsImageView(true)
      // Handle image upload logic
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
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

      {/* Edit/Draw Tab Bar */}
      {isEditMode && (
        <EditDrawTabBar
          activeTab={activeTab}
          drawingType={drawingTypeSelection}
          onTabChange={handleTabChange}
          onDrawingTypeChange={handleDrawingTypeChange}
        />
      )}

      {/* Roof Angle Panel */}
      {showAnglePanel && (
        <RoofAnglePanel
          roofPolygons={roofPolygons}
          solarData={solarDataResults}
          onConfirm={handleAngleConfirm}
          onCancel={handleAngleCancel}
        />
      )}

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