import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

interface UseEditModeProps {
  map: google.maps.Map | null
  onDeletePolygons?: (polygons: google.maps.Polygon[]) => void
}

export function useEditMode({ map, onDeletePolygons }: UseEditModeProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedPolygons, setSelectedPolygons] = useState<Set<google.maps.Polygon>>(new Set())
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
  const [isClickable, setIsClickable] = useState(true)
  const [polygonEditMode, setPolygonEditMode] = useState<'roof' | 'object'>('roof')

  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const deleteSelectedRef = useRef<() => void>(() => {})
  const clearSelectionRef = useRef<() => void>(() => {})

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
    setSelectedPolygons(new Set()) // Clear selection when toggling
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

  // Handle map clicks to deselect
  useEffect(() => {
    if (!map) return

    if (isEditMode && !isDrawingPolygon) {
      mapClickListenerRef.current = map.addListener('click', () => {
        clearSelectionRef.current()
      })
    }

    return () => {
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current)
        mapClickListenerRef.current = null
      }
    }
  }, [map, isEditMode, isDrawingPolygon])

  return useMemo(() => ({
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    isDrawingPolygon,
    isClickable,
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
    isClickable,
    polygonEditMode,
    toggleEditMode,
    selectPolygon,
    clearSelection,
    deleteSelected
  ])
}