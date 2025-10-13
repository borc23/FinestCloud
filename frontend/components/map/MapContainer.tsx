'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './MapContainer.module.css'
import CaptureOverlay from './CaptureOverlay'
import EditDrawTabBar from './EditDrawTabBar'
import MapControls from './MapControls'
import PanelGenerationOverlay from '../panels/PanelGenerationOverlay'
import RoofAnglePanel from '../panels/RoofAnglePanel'
import SolarResultsDashboard from '../panels/SolarResultsDashboard'
import GridSelector from '../panels/GridSelector'
import { useMapInitialization } from '../../hooks/useMapInitialization'
import { useDetection } from '../../hooks/useDetection'
import { usePolygons } from '../../hooks/usePolygons'
import { useEditMode } from '../../hooks/useEditMode'
import { usePolygonManager } from '../../hooks/usePolygonManager'
import { useDrawingMode } from '../../hooks/useDrawingMode'
import { usePanelGeneration } from '../../hooks/usePanelGeneration'
import { usePanelPlacement } from '../../hooks/usePanelPlacement'
import { tagPanelWithGrid } from '../../utils/gridSnapping'
import EditModeIndicator from './EditModeIndicator'
import { usePanelContext } from '../../contexts/PanelContext'

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
  onDashboardMinimizeChange?: (minimized: boolean) => void
}

export default function MapContainer({
  activeTool,
  onMapReady,
  onToolChange,
  onPanelsAvailable,
  onDashboardMinimizeChange
}: MapContainerProps) {
  // ========================================
  // Refs and State
  // ========================================
  const mapRef = useRef<HTMLDivElement>(null)
  const [isImageView, setIsImageView] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showCaptureOverlay, setShowCaptureOverlay] = useState(false)
  const [drawingTypeSelection, setDrawingTypeSelection] = useState<'roof' | 'object' | 'panel'>('roof')
  const [isDashboardMinimized, setIsDashboardMinimized] = useState(true)

  const activeTab: 'edit' | 'draw' = activeTool === 'draw' ? 'draw' : 'edit'

  // Panel context
  const { registerPanelChangeCallback } = usePanelContext()

  // Notify parent when dashboard minimize state changes
  useEffect(() => {
    onDashboardMinimizeChange?.(isDashboardMinimized)
  }, [isDashboardMinimized, onDashboardMinimizeChange])

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
    onDeletePolygons: (deletedPolygons) => {
      removePolygons(deletedPolygons)
      // Remove from unified panel array
      setAllPanels(prev => prev.filter(p => !deletedPolygons.includes(p)))
    },
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

  // Unified panel state - single source of truth for all panels
  const [allPanels, setAllPanels] = useState<google.maps.Polygon[]>([])

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

  // Sync generated panels to unified array
  useEffect(() => {
    setAllPanels(prev => {
      // Remove old generated panels, keep manually placed ones
      const manualPanels = prev.filter(p => !(p as any).__isGenerated)
      // Add new generated panels with marker
      const markedGeneratedPanels = panelMarkers.map(p => {
        (p as any).__isGenerated = true
        return p
      })
      return [...manualPanels, ...markedGeneratedPanels]
    })
  }, [panelMarkers])

  // Panel placement
  const {
    isPlacing,
    startPlacement,
    stopPlacement,
    selectedGridId,
    availableGrids,
    setSelectedGridId
  } = usePanelPlacement({
    map,
    isEditMode,
    existingPanels: allPanels,
    panelData,
    onPanelPlaced: (panel, gridId) => {
      tagPanelWithGrid(panel, gridId)
      setAllPanels(prev => [...prev, panel])
    }
  })

  // ========================================
  // Event Handlers
  // ========================================

  const handleTabChange = useCallback((tab: 'edit' | 'draw') => {
    onToolChange?.(tab)
  }, [onToolChange])

  const handleDrawingTypeChange = useCallback((type: 'roof' | 'object' | 'panel') => {
    setDrawingTypeSelection(type)
    if (type === 'panel') {
      if (isDrawing) stopDrawing()
      startPlacement()
    } else {
      if (isPlacing) stopPlacement()
      if (isDrawing) {
        stopDrawing()
      }
      startDrawing(type)
    }
  }, [isDrawing, isPlacing, stopDrawing, startDrawing, startPlacement, stopPlacement])

  const handleAngleConfirm = useCallback(async (data: any) => {
    await handleAngleConfirmHook(data)
    togglePolygonVisibility(false)
  }, [handleAngleConfirmHook, togglePolygonVisibility])

  const handleAngleCancel = useCallback(() => {
    handleAngleCancelHook()
    onToolChange?.('')
  }, [handleAngleCancelHook, onToolChange])

  const handlePanelConfigChange = useCallback(() => {
    // Only regenerate if panels are already generated
    if (panelData && solarData && roofPolygons.length > 0) {
      // Clear existing panels
      clearPanels()
      allPanels.forEach(panel => panel.setMap(null))
      setAllPanels([])

      // Show angle panel to regenerate
      startPanelGeneration()
    }
  }, [panelData, solarData, roofPolygons, clearPanels, allPanels, startPanelGeneration])

  // Register callback for panel config changes
  useEffect(() => {
    registerPanelChangeCallback(handlePanelConfigChange)
  }, [registerPanelChangeCallback, handlePanelConfigChange])

  const handleReset = useCallback(() => {
    // Clear all polygons
    clearAllPolygons()

    // Clear panel markers
    clearPanels()

    // Clear all panels
    allPanels.forEach(panel => panel.setMap(null))
    setAllPanels([])

    // Clear capture overlay
    setShowCaptureOverlay(false)

    // Reset tool to default
    onToolChange?.('')

    // Exit edit/draw mode if active
    if (isEditMode) toggleEditMode()
    if (isDrawing) stopDrawing()
    if (isPlacing) stopPlacement()
  }, [clearAllPolygons, clearPanels, allPanels, onToolChange, isEditMode, isDrawing, isPlacing, toggleEditMode, stopDrawing, stopPlacement])

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
      if (isPlacing) stopPlacement()
    } else if (activeTool === 'draw') {
      if (!isEditMode) toggleEditMode()
      if (drawingTypeSelection === 'panel') {
        if (!isPlacing) startPlacement()
        if (isDrawing) stopDrawing()
      } else {
        if (!isDrawing) startDrawing(drawingTypeSelection as 'roof' | 'object')
        if (isPlacing) stopPlacement()
      }
    } else if (activeTool === 'panels') {
      startPanelGeneration()
      if (isEditMode) toggleEditMode()
      if (isDrawing) stopDrawing()
      if (isPlacing) stopPlacement()
    } else {
      if (isEditMode) toggleEditMode()
      if (isDrawing) stopDrawing()
      if (isPlacing) stopPlacement()
    }
  }, [activeTool, isEditMode, isDrawing, isPlacing, drawingTypeSelection, toggleEditMode, stopDrawing, stopPlacement, startDrawing, startPanelGeneration])

  // Sync polygon refs and update polygon states
  const roofPolygonsRef = useRef<google.maps.Polygon[]>([])
  const objectPolygonsRef = useRef<google.maps.Polygon[]>([])
  const allPanelsRef = useRef<google.maps.Polygon[]>([])

  useEffect(() => {
    roofPolygonsRef.current = roofPolygons
    objectPolygonsRef.current = objectPolygons
    allPanelsRef.current = allPanels
  }, [roofPolygons, objectPolygons, allPanels])

  // Update all polygons including panels
  useEffect(() => {
    const allPolygons = [...roofPolygonsRef.current, ...objectPolygonsRef.current, ...allPanelsRef.current]

    allPolygons.forEach(polygon => {
      if (polygon) {
        polygon.setOptions({ clickable: !isDrawing && !isPlacing })
      }
    })

    if (roofPolygonsRef.current.length > 0) {
      updateAllPolygons(roofPolygonsRef.current, true)
    }
    if (objectPolygonsRef.current.length > 0) {
      updateAllPolygons(objectPolygonsRef.current, false)
    }
    if (allPanelsRef.current.length > 0) {
      // Treat panels as "non-roof" but they'll be identified by isPanelElement
      updateAllPolygons(allPanelsRef.current, false)
    }
  }, [isEditMode, selectedPolygons, isDrawing, isPlacing, updateAllPolygons, allPanels])

  // Update allPolygonsForEdit when any polygon set changes
  useEffect(() => {
    setAllPolygonsForEdit([...roofPolygons, ...objectPolygons, ...allPanels])
  }, [roofPolygons, objectPolygons, allPanels])

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

      {/* Grid Selector */}
      <GridSelector
        selectedGridId={selectedGridId}
        availableGrids={availableGrids}
        onGridSelect={setSelectedGridId}
        isVisible={isPlacing}
      />

      {/* Edit/Draw Tab Bar */}
      {isEditMode && (
        <EditDrawTabBar
          activeTab={activeTab}
          drawingType={drawingTypeSelection}
          onTabChange={handleTabChange}
          onDrawingTypeChange={handleDrawingTypeChange}
          hasPanels={allPanels.length > 0}
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
          isEditMode={isEditMode || (activeTool !== '' && activeTool !== 'panels')}
          onMinimizeChange={setIsDashboardMinimized}
          currentPanelCount={allPanels.length}
        />
      )}

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
