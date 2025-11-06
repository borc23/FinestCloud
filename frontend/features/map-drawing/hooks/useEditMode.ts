import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSingleMapListener } from './useMapListener'

interface UseEditModeProps {
  map: google.maps.Map | null
  onDeletePolygons?: (polygons: google.maps.Polygon[]) => void
  allPolygons?: google.maps.Polygon[]
}

export function useEditMode({ map, onDeletePolygons, allPolygons = [] }: UseEditModeProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedPolygons, setSelectedPolygons] = useState<Set<google.maps.Polygon>>(new Set())
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
  const [polygonEditMode, setPolygonEditMode] = useState<'roof' | 'object'>('roof')

  // Legitimate refs for temporary UI tracking (don't need re-renders)
  const trailRef = useRef<google.maps.LatLng[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)

  // Use refs for drag state to avoid useEffect re-runs during interaction
  const isDraggingRef = useRef(false)
  const [justCompletedDrag, setJustCompletedDrag] = useState(false)

  // Refs for values that change during interaction
  const selectedPolygonsRef = useRef(selectedPolygons)
  const isCtrlPressedRef = useRef(isCtrlPressed)

  // Keep refs in sync
  useEffect(() => {
    selectedPolygonsRef.current = selectedPolygons
  }, [selectedPolygons])

  useEffect(() => {
    isCtrlPressedRef.current = isCtrlPressed
  }, [isCtrlPressed])

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      const newIsEditMode = !prev

      // Update map options based on edit mode
      if (map) {
        map.setOptions({
          draggable: !newIsEditMode,
          scrollwheel: !newIsEditMode,
          gestureHandling: newIsEditMode ? 'none' : 'auto',
          disableDoubleClickZoom: newIsEditMode
        })
      }

      return newIsEditMode
    })
    setSelectedPolygons(new Set())
  }, [map])

  const selectPolygon = useCallback((polygon: google.maps.Polygon, ctrlKey: boolean = false) => {
    setSelectedPolygons(prev => {
      const newSelection = new Set(prev)

      if (!ctrlKey) {
        newSelection.clear()
      }

      if (newSelection.has(polygon)) {
        newSelection.delete(polygon)
      } else {
        newSelection.add(polygon)
      }

      return newSelection
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedPolygons(new Set())
  }, [])

  const deleteSelected = useCallback(() => {
    setSelectedPolygons(prev => {
      const polygonsToDelete = Array.from(prev)
      polygonsToDelete.forEach(polygon => polygon.setMap(null))
      onDeletePolygons?.(polygonsToDelete)
      return new Set()
    })
  }, [onDeletePolygons])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return

      if (e.key === 'Control') {
        setIsCtrlPressed(true)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        deleteSelected()
      } else if (e.key === 'Escape') {
        clearSelection()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isEditMode, deleteSelected, clearSelection])

  useEffect(() => {
    if (!map || !isEditMode || isDrawingPolygon) {
      // Clean up any ongoing drag operation when exiting edit mode or starting drawing
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }
      isDraggingRef.current = false
      trailRef.current = []
      return
    }

    // Constants for drag-to-select behavior
    const TRAIL_SAMPLE_INTERVAL = 2  // Check polygon intersection every 2 points
    const MAX_TRAIL_LENGTH = 10      // Maximum trail points to keep in memory

    let trailPointCount = 0
    const polygonListeners: google.maps.MapsEventListener[] = []

    const checkPolygonIntersection = (point: google.maps.LatLng) => {
      const newlySelected: google.maps.Polygon[] = []

      allPolygons.forEach((polygon) => {
        // Skip if already selected
        if (selectedPolygonsRef.current.has(polygon)) return

        if (google.maps.geometry.poly.containsLocation(point, polygon)) {
          newlySelected.push(polygon)
        }
      })

      // Add to selection immediately - StyleConfig will handle visual updates
      if (newlySelected.length > 0) {
        setSelectedPolygons(prev => {
          const newSet = new Set(prev)
          newlySelected.forEach(p => newSet.add(p))
          return newSet
        })
      }
    }

    const cleanupPolygonListeners = () => {
      polygonListeners.forEach(listener => {
        google.maps.event.removeListener(listener)
      })
      polygonListeners.length = 0
    }

    const handleMouseMove = (e: google.maps.MapMouseEvent) => {
      if (!isDraggingRef.current || !e.latLng || !polylineRef.current) return

      trailRef.current.push(e.latLng)
      if (trailRef.current.length > MAX_TRAIL_LENGTH) {
        trailRef.current.shift()
      }

      polylineRef.current.setPath(trailRef.current)

      trailPointCount++
      if (trailPointCount % TRAIL_SAMPLE_INTERVAL === 0) {
        checkPolygonIntersection(e.latLng)
      }
    }

    const onMouseDown = (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return

      // KISS: Don't start drag-to-select if polygons are selected
      // User expects to drag the selected polygons, not draw a selection trail
      if (selectedPolygonsRef.current.size > 0) {
        return
      }

      isDraggingRef.current = true
      trailPointCount = 0

      // Disable map dragging during selection
      map.setOptions({
        draggable: false
      })

      // Add mousemove listeners to all polygons for intersection detection
      allPolygons.forEach((polygon) => {
        const listener = polygon.addListener('mousemove', handleMouseMove)
        polygonListeners.push(listener)
      })

      // Clear previous selection if Ctrl is not pressed
      if (!isCtrlPressedRef.current) {
        setSelectedPolygons(new Set())
      }

      // Initialize trail
      trailRef.current = [e.latLng]

      // Create visual trail polyline
      polylineRef.current = new google.maps.Polyline({
        map,
        path: trailRef.current,
        strokeColor: '#4285F4',
        strokeWeight: 2,
        strokeOpacity: 0.7,
        clickable: false,
        zIndex: 1000
      })
    }

    const onMouseUp = () => {
      if (!isDraggingRef.current) return

      // Re-enable map dragging
      map.setOptions({
        draggable: !isEditMode
      })

      // Clean up polygon listeners
      cleanupPolygonListeners()

      // Clean up visual trail
      polylineRef.current?.setMap(null)
      polylineRef.current = null
      trailRef.current = []

      // Reset drag state
      isDraggingRef.current = false

      // Prevent accidental map click from clearing selection
      setJustCompletedDrag(true)
      setTimeout(() => {
        setJustCompletedDrag(false)
      }, 100)
    }

    const downListener = map.addListener('mousedown', onMouseDown)
    const moveListener = map.addListener('mousemove', handleMouseMove)
    const upListener = map.addListener('mouseup', onMouseUp)

    document.addEventListener('mouseup', onMouseUp)

    return () => {
      // Cleanup when effect re-runs or component unmounts
      google.maps.event.removeListener(downListener)
      google.maps.event.removeListener(moveListener)
      google.maps.event.removeListener(upListener)
      document.removeEventListener('mouseup', onMouseUp)

      // Clean up any remaining polygon listeners (important for memory leak prevention)
      cleanupPolygonListeners()

      // Clean up visual artifacts
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }

      // Restore map draggability
      map.setOptions({
        draggable: true
      })

      // Reset drag state
      isDraggingRef.current = false
      trailRef.current = []
    }
  }, [map, isEditMode, isDrawingPolygon, allPolygons])

  useSingleMapListener(
    isEditMode && !isDrawingPolygon ? map : null,
    'click',
    () => {
      if (justCompletedDrag) return
      clearSelection()
    },
    [justCompletedDrag, clearSelection]
  )

  return useMemo(() => ({
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    isDrawingPolygon,
    polygonEditMode,
    setIsDrawingPolygon,
    setPolygonEditMode,
    toggleEditMode,
    selectPolygon,
    clearSelection,
    deleteSelected
  }), [
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    isDrawingPolygon,
    polygonEditMode,
    toggleEditMode,
    selectPolygon,
    clearSelection,
    deleteSelected
  ])
}
