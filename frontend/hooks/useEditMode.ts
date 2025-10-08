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
  const [isDraggingPolygon, setIsDraggingPolygon] = useState(false)

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

  // Drag selection with trail - COMPLETELY REFACTORED
  useEffect(() => {
    if (!map || !isEditMode || isDrawingPolygon) return

    const TRAIL_SAMPLE_INTERVAL = 2 // Check every N trail points
    let trailPointCount = 0
    const polygonListeners: google.maps.MapsEventListener[] = []

    const checkPolygonIntersection = (point: google.maps.LatLng) => {
      allPolygonsRef.current.forEach((polygon) => {
        if (selectedDuringDragRef.current.has(polygon)) return

        // Use containsLocation - reliable polygon intersection test
        if (google.maps.geometry.poly.containsLocation(point, polygon)) {
          console.log('[checkPolygonIntersection] Polygon selected!')
          selectedDuringDragRef.current.add(polygon)

          // Immediate visual feedback during drag
          polygon.setOptions({
            strokeColor: '#3498db',
            strokeWeight: 3,
            fillColor: '#3498db',
            fillOpacity: 0.4
          })
        }
      })
    }

    const handleMouseMove = (e: google.maps.MapMouseEvent) => {
      if (!isDraggingRef.current || !e.latLng || !polylineRef.current) return

      // Update trail visualization
      trailRef.current.push(e.latLng)
      if (trailRef.current.length > 10) {
        trailRef.current.shift()
      }

      polylineRef.current.setPath(trailRef.current)

      // Check for polygon intersection (throttled)
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

      // Disable map dragging
      map.setOptions({
        draggable: false
      })

      // Add mousemove listeners to polygons (for trail continuity)
      allPolygonsRef.current.forEach((polygon) => {
        const listener = polygon.addListener('mousemove', handleMouseMove)
        polygonListeners.push(listener)
      })

      // Clear previous selection if Ctrl not pressed
      if (!isCtrlPressedRef.current) {
        setSelectedPolygons(new Set())
      }

      trailRef.current = [e.latLng]

      // Create trail visualization
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

      const polygonsToAdd = Array.from(selectedDuringDragRef.current)

      // Restore map settings
      map.setOptions({
        draggable: !isEditMode
      })

      // Remove polygon mousemove listeners
      polygonListeners.forEach(listener => {
        google.maps.event.removeListener(listener)
      })
      polygonListeners.length = 0

      // Flag that we just completed a drag to prevent click from clearing
      justCompletedDragRef.current = true
      setTimeout(() => {
        justCompletedDragRef.current = false
      }, 100)

      // Finalize selection
      if (polygonsToAdd.length > 0) {
        setSelectedPolygons(prev => {
          const newSet = new Set(isCtrlPressedRef.current ? prev : [])
          polygonsToAdd.forEach(p => newSet.add(p))  // ✅ Use captured array
          return newSet
        })
      }

      // Cleanup
      polylineRef.current?.setMap(null)
      polylineRef.current = null
      trailRef.current = []
      isDraggingRef.current = false
      selectedDuringDragRef.current = new Set()
    }

    const downListener = map.addListener('mousedown', onMouseDown)
    const moveListener = map.addListener('mousemove', handleMouseMove)
    const upListener = map.addListener('mouseup', onMouseUp)

    document.addEventListener('mouseup', onMouseUp)

    return () => {
      google.maps.event.removeListener(downListener)
      google.maps.event.removeListener(moveListener)
      google.maps.event.removeListener(upListener)
      document.removeEventListener('mouseup', onMouseUp)

      // Clean up polygon listeners
      polygonListeners.forEach(listener => {
        google.maps.event.removeListener(listener)
      })

      polylineRef.current?.setMap(null)
      map.setOptions({
        draggable: true
      })
      isDraggingRef.current = false
    }
  }, [map, isEditMode, isDrawingPolygon])

  // Handle map clicks to deselect using the custom hook
  useSingleMapListener(
    isEditMode && !isDrawingPolygon ? map : null,
    'click',
    () => {
      // Don't clear if we just completed a drag selection
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
