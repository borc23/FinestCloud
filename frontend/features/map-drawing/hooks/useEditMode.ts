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

  const deleteSelectedRef = useRef<() => void>(() => {})
  const clearSelectionRef = useRef<() => void>(() => {})
  const trailRef = useRef<google.maps.LatLng[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const allPolygonsRef = useRef<google.maps.Polygon[]>([])
  const isDraggingRef = useRef(false)
  const selectedDuringDragRef = useRef<Set<google.maps.Polygon>>(new Set())
  const isCtrlPressedRef = useRef(false)
  const justCompletedDragRef = useRef(false)
  const dragHighlightedPolygonsRef = useRef<Map<google.maps.Polygon, { originalStroke: string, originalFill: string }>>(new Map())

  useEffect(() => {
    allPolygonsRef.current = allPolygons
  }, [allPolygons])

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

  // Update refs when callbacks change
  useEffect(() => {
    deleteSelectedRef.current = deleteSelected
    clearSelectionRef.current = clearSelection
  }, [deleteSelected, clearSelection])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return

      if (e.key === 'Control') {
        setIsCtrlPressed(true)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        deleteSelectedRef.current()
      } else if (e.key === 'Escape') {
        clearSelectionRef.current()
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
  }, [isEditMode])

  useEffect(() => {
    if (!map || !isEditMode || isDrawingPolygon) {
      // Clean up any ongoing drag operation when exiting edit mode or starting drawing
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }
      isDraggingRef.current = false
      selectedDuringDragRef.current = new Set()
      dragHighlightedPolygonsRef.current.clear()
      trailRef.current = []
      return
    }

    // Constants for drag-to-select behavior
    const TRAIL_SAMPLE_INTERVAL = 2  // Check polygon intersection every 2 points
    const MAX_TRAIL_LENGTH = 10      // Maximum trail points to keep in memory

    let trailPointCount = 0
    const polygonListeners: google.maps.MapsEventListener[] = []

    const checkPolygonIntersection = (point: google.maps.LatLng) => {
      allPolygonsRef.current.forEach((polygon) => {
        if (selectedDuringDragRef.current.has(polygon)) return

        if (google.maps.geometry.poly.containsLocation(point, polygon)) {
          selectedDuringDragRef.current.add(polygon)

          // Store original colors before applying blue highlight
          if (!dragHighlightedPolygonsRef.current.has(polygon)) {
            const originalStroke = polygon.get('strokeColor') || '#000000'
            const originalFill = polygon.get('fillColor') || '#000000'
            dragHighlightedPolygonsRef.current.set(polygon, { originalStroke, originalFill })
          }

          // Apply temporary blue highlight during drag (no editable vertices)
          polygon.setOptions({
            strokeColor: '#3498db',
            fillColor: '#3498db',
            strokeWeight: 2,
            fillOpacity: 0.3,
            editable: false,
            draggable: false
          })
        }
      })
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

      isDraggingRef.current = true
      selectedDuringDragRef.current = new Set()
      trailPointCount = 0

      map.setOptions({
        draggable: false
      })

      // Add mousemove listeners to all polygons for intersection detection
      allPolygonsRef.current.forEach((polygon) => {
        const listener = polygon.addListener('mousemove', handleMouseMove)
        polygonListeners.push(listener)
      })

      if (!isCtrlPressedRef.current) {
        setSelectedPolygons(new Set())
      }

      trailRef.current = [e.latLng]

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

      map.setOptions({
        draggable: !isEditMode
      })

      // Clean up polygon listeners immediately after drag completes
      cleanupPolygonListeners()

      // Restore original colors and add to selection
      dragHighlightedPolygonsRef.current.forEach((colors, polygon) => {
        // Restore original colors
        polygon.setOptions({
          strokeColor: colors.originalStroke,
          fillColor: colors.originalFill
        })
      })

      // Now add them to the actual selection state
      if (selectedDuringDragRef.current.size > 0) {
        setSelectedPolygons(prev => {
          const newSet = new Set(prev)
          selectedDuringDragRef.current.forEach(p => newSet.add(p))
          return newSet
        })
      }

      justCompletedDragRef.current = true
      setTimeout(() => {
        justCompletedDragRef.current = false
      }, 100)

      polylineRef.current?.setMap(null)
      polylineRef.current = null
      trailRef.current = []
      isDraggingRef.current = false
      selectedDuringDragRef.current = new Set()
      dragHighlightedPolygonsRef.current.clear()
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

      // Reset all state
      isDraggingRef.current = false
      selectedDuringDragRef.current = new Set()
      dragHighlightedPolygonsRef.current.clear()
      trailRef.current = []
    }
  }, [map, isEditMode, isDrawingPolygon])

  useSingleMapListener(
    isEditMode && !isDrawingPolygon ? map : null,
    'click',
    () => {
      if (justCompletedDragRef.current) return
      clearSelectionRef.current()
    },
    []
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
