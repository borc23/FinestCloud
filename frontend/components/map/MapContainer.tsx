'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './MapContainer.module.css'
import CaptureOverlay from './CaptureOverlay'
import EditDrawTabBar from './EditDrawTabBar'
import MapControls from './MapControls'
import PanelGenerationOverlay from '../panels/PanelGenerationOverlay'
import RoofAnglePanel from '../panels/RoofAnglePanel'
import SolarResultsDashboard from '../panels/SolarResultsDashboard'
import GridOverlay from '../panels/GridOverlay'
import { useMapInitialization } from '../../hooks/useMapInitialization'
import { useDetection } from '../../hooks/useDetection'
import { usePolygons } from '../../hooks/usePolygons'
import { useEditMode } from '../../hooks/useEditMode'
import { usePolygonManager } from '../../hooks/usePolygonManager'
import { useDrawingMode } from '../../hooks/useDrawingMode'
import { usePanelGeneration } from '../../hooks/usePanelGeneration'
import EditModeIndicator from './EditModeIndicator'

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

export default function MapContainer({
  activeTool,
  onMapReady,
  onToolChange,
  onPanelsAvailable
}: MapContainerProps) {
  // ========================================
  // Refs and State
  // ========================================
  const mapRef = useRef<HTMLDivElement>(null)
  const [isImageView, setIsImageView] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showCaptureOverlay, setShowCaptureOverlay] = useState(false)
  const [drawingTypeSelection, setDrawingTypeSelection] = useState<'roof' | 'object'>('roof')
  const [showGrid, setShowGrid] = useState(false)
  const [showHalfStepGrid, setShowHalfStepGrid] = useState(false)

  const activeTab: 'edit' | 'draw' = activeTool === 'draw' ? 'draw' : 'edit'

  // ========================================
  // Custom Hooks
  // ========================================

  // Map initialization
  const map = useMapInitialization(mapRef, { onMapReady })

  // Detection
  const { error: detectionError, detectRoofs, clearError } = useDetection()

  // Polygons
  const {
    roofPolygons,
    objectPolygons,
    renderPolygons,
    clearAllPolygons,
    togglePolygonVisibility,
    removeClickListener,
    removePolygons,
    hasRoofs
  } = usePolygons(map)

  // Get panel markers first (temporary workaround - will be populated after panels are generated)
  const [allPolygonsForEdit, setAllPolygonsForEdit] = useState<google.maps.Polygon[]>([])

  // Edit mode
  const {
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    toggleEditMode,
    selectPolygon,
    deleteSelected
  } = useEditMode({
    map,
    onDeletePolygons: removePolygons,
    allPolygons: allPolygonsForEdit
  })

  // Handle polygon creation from drawing
  const handlePolygonComplete = useCallback((path: google.maps.LatLng[], isRoof: boolean) => {
    if (!map) return
    const coords = path.map(p => ({ lat: p.lat(), lng: p.lng() }))
    const enableHover = activeTool !== 'draw'
    renderPolygons([{ coords }], isRoof, enableHover)
  }, [map, renderPolygons, activeTool])

  // Drawing mode
  const { isDrawing, startDrawing, stopDrawing } = useDrawingMode({
    map,
    isEditMode,
    onPolygonComplete: handlePolygonComplete
  })

  // Polygon manager
  const { updateAllPolygons } = usePolygonManager({
    map,
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    isDrawing,
    onSelectPolygon: selectPolygon,
    removeClickListener
  })

  // Panel generation
  const {
    isGenerating,
    progress,
    solarData,
    panelData,
    showAnglePanel,
    panelMarkers,
    startPanelGeneration,
    handleAngleConfirm: handleAngleConfirmHook,
    handleAngleCancel: handleAngleCancelHook,
    clearPanels
  } = usePanelGeneration({
    map,
    roofPolygons,
    objectPolygons,
    onPanelsGenerated: (data) => togglePolygonVisibility(false)
  })

  // ========================================
  // Event Handlers
  // ========================================

  const handleTabChange = useCallback((tab: 'edit' | 'draw') => {
    onToolChange?.(tab)
  }, [onToolChange])

  const handleDrawingTypeChange = useCallback((type: 'roof' | 'object') => {
    setDrawingTypeSelection(type)
    if (isDrawing) {
      stopDrawing()
      startDrawing(type)
    }
  }, [isDrawing, stopDrawing, startDrawing])

  const handleAngleConfirm = useCallback(async (data: any) => {
    await handleAngleConfirmHook(data)
    togglePolygonVisibility(false)
  }, [handleAngleConfirmHook, togglePolygonVisibility])

  const handleAngleCancel = useCallback(() => {
    handleAngleCancelHook()
    onToolChange?.('')
  }, [handleAngleCancelHook, onToolChange])

  const handleReset = useCallback(() => {
    // Clear all polygons
    clearAllPolygons()

    // Clear panel markers
    clearPanels()

    // Clear capture overlay
    setShowCaptureOverlay(false)

    // Reset tool to default
    onToolChange?.('')

    // Exit edit/draw mode if active
    if (isEditMode) toggleEditMode()
    if (isDrawing) stopDrawing()
  }, [clearAllPolygons, clearPanels, onToolChange, isEditMode, isDrawing, toggleEditMode, stopDrawing])

  const handleDetection = useCallback(async (bounds: google.maps.LatLngBounds | null) => {
    if (!map || !bounds) return

    try {
      const result = await detectRoofs(map, bounds)

      if (result?.success) {
        clearAllPolygons()
        const enableHover = activeTool !== 'draw'

        if (result.roofs) {
          renderPolygons(result.roofs, true, enableHover)
        }
        if (result.objects) {
          renderPolygons(result.objects, false, enableHover)
        }

        setShowCaptureOverlay(false)
      }
    } catch (err) {
      console.error('Detection failed:', err)
    }
  }, [map, detectRoofs, clearAllPolygons, renderPolygons, activeTool])

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
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setIsImageView(true)
    }
  }

  // ========================================
  // Effects
  // ========================================

  // Show/hide capture overlay based on active tool
  useEffect(() => {
    setShowCaptureOverlay(activeTool === 'select')
  }, [activeTool])

  // Notify parent about panels availability
  useEffect(() => {
    onPanelsAvailable?.(hasRoofs)
  }, [hasRoofs, onPanelsAvailable])

  // Manage edit/draw mode based on active tool
  useEffect(() => {
    if (activeTool === 'edit') {
      if (!isEditMode) toggleEditMode()
      if (isDrawing) stopDrawing()
    } else if (activeTool === 'draw') {
      if (!isEditMode) toggleEditMode()
      if (!isDrawing) startDrawing(drawingTypeSelection)
    } else if (activeTool === 'panels') {
      startPanelGeneration()
      if (isEditMode) toggleEditMode()
      if (isDrawing) stopDrawing()
    } else {
      if (isEditMode) toggleEditMode()
      if (isDrawing) stopDrawing()
    }
  }, [activeTool, isEditMode, isDrawing, drawingTypeSelection, toggleEditMode, stopDrawing, startDrawing, startPanelGeneration])

  // Sync polygon refs and update polygon states
  const roofPolygonsRef = useRef<google.maps.Polygon[]>([])
  const objectPolygonsRef = useRef<google.maps.Polygon[]>([])
  const panelMarkersRef = useRef<google.maps.Polygon[]>([])

  useEffect(() => {
    roofPolygonsRef.current = roofPolygons
    objectPolygonsRef.current = objectPolygons
    panelMarkersRef.current = panelMarkers
  }, [roofPolygons, objectPolygons, panelMarkers])

  // Update all polygons including panels
  useEffect(() => {
    const allPolygons = [...roofPolygonsRef.current, ...objectPolygonsRef.current, ...panelMarkersRef.current]

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
    if (panelMarkersRef.current.length > 0) {
      // Treat panels as "non-roof" but they'll be identified by isPanelElement
      updateAllPolygons(panelMarkersRef.current, false)
    }
  }, [isEditMode, selectedPolygons, isDrawing, updateAllPolygons, panelMarkers])

  // Update allPolygonsForEdit when any polygon set changes
  useEffect(() => {
    setAllPolygonsForEdit([...roofPolygons, ...objectPolygons, ...panelMarkers])
  }, [roofPolygons, objectPolygons, panelMarkers])

  // ========================================
  // Render
  // ========================================

  return (
    <div className={`${styles.mapContainer} ${isDragging ? styles.dragOver : ''}`}>
      {/* Map */}
      <div
        ref={mapRef}
        className={styles.map}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {/* Upload Prompt */}
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

      {/* Capture Overlay */}
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

      {/* Edit Mode Indicator with Trash Zone */}
      <EditModeIndicator
        isActive={isEditMode}
        selectedCount={selectedPolygons.size}
        onDeleteSelected={deleteSelected}
      />

      {/* Roof Angle Panel */}
      {showAnglePanel && (
        <RoofAnglePanel
          roofPolygons={roofPolygons}
          objectPolygons={objectPolygons}
          solarData={solarData}
          onConfirm={handleAngleConfirm}
          onCancel={handleAngleCancel}
        />
      )}

      {/* Results Dashboard */}
      {panelData && map && (
        <SolarResultsDashboard
          panelGenerationData={panelData}
          mapCenter={map.getCenter() ? {
            lat: map.getCenter()!.lat(),
            lng: map.getCenter()!.lng()
          } : undefined}
          onToggleGrid={() => setShowGrid(prev => !prev)}
          showGrid={showGrid}
          onToggleHalfStepGrid={() => setShowHalfStepGrid(prev => !prev)}
          showHalfStepGrid={showHalfStepGrid}
        />
      )}

      {/* Grid Overlay */}
      <GridOverlay
        map={map}
        panelData={panelData}
        visible={showGrid}
        halfStepOffset={0}
      />

      {/* Half Step Grid Overlay */}
      <GridOverlay
        map={map}
        panelData={panelData}
        visible={showHalfStepGrid}
        halfStepOffset={0.5}
      />

      {/* Panel Generation Overlay */}
      <PanelGenerationOverlay
        isVisible={isGenerating}
        progress={progress}
      />

      {/* Error Notification */}
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

      {/* Drag Overlay */}
      {isDragging && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragContent}>
            <i className="fas fa-cloud-upload-alt"></i>
            <h3>Drop image to upload</h3>
            <p>Release to start processing</p>
          </div>
        </div>
      )}

      {/* Image View */}
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

      {/* Hidden File Input */}
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Map Controls */}
      <MapControls
        map={map}
        hasPolygons={roofPolygons.length > 0 || objectPolygons.length > 0 || panelData !== null}
        onClearAll={handleReset}
      />
    </div>
  )
}
