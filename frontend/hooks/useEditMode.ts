import { useState, useCallback, useEffect, useRef } from 'react'

interface EditState {
  isEditMode: boolean
  selectedPolygons: Set<google.maps.Polygon>
  isCtrlPressed: boolean
  isDrawingPolygon: boolean
  isClickable: boolean
  polygonEditMode: 'roof' | 'object'
}

export function useEditMode(map: google.maps.Map | null) {
  const [editState, setEditState] = useState<EditState>({
    isEditMode: false,
    selectedPolygons: new Set(),
    isCtrlPressed: false,
    isDrawingPolygon: false,
    isClickable: true,
    polygonEditMode: 'roof'
  })

  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null)

  const toggleEditMode = useCallback(() => {
    setEditState(prev => {
      const newIsEditMode = !prev.isEditMode

      // Update map options based on edit mode
      if (map) {
        map.setOptions({
          draggable: !newIsEditMode,
          scrollwheel: !newIsEditMode,
          gestureHandling: newIsEditMode ? 'none' : 'auto',
          disableDoubleClickZoom: newIsEditMode
        })
      }

      return {
        ...prev,
        isEditMode: newIsEditMode,
        selectedPolygons: new Set() // Clear selection when toggling
      }
    })
  }, [map])

  const selectPolygon = useCallback((polygon: google.maps.Polygon, ctrlKey: boolean = false) => {
    setEditState(prev => {
      const newSelection = new Set(prev.selectedPolygons)

      if (!ctrlKey) {
        newSelection.clear()
      }

      if (newSelection.has(polygon)) {
        newSelection.delete(polygon)
      } else {
        newSelection.add(polygon)
      }

      return {
        ...prev,
        selectedPolygons: newSelection
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      selectedPolygons: new Set()
    }))
  }, [])

  const deleteSelected = useCallback(() => {
    editState.selectedPolygons.forEach(polygon => {
      polygon.setMap(null)
    })
    clearSelection()
  }, [editState.selectedPolygons, clearSelection])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editState.isEditMode) return

      if (e.key === 'Control') {
        setEditState(prev => ({ ...prev, isCtrlPressed: true }))
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected()
      } else if (e.key === 'Escape') {
        clearSelection()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setEditState(prev => ({ ...prev, isCtrlPressed: false }))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [editState.isEditMode, deleteSelected, clearSelection])

  // Handle map clicks to deselect
  useEffect(() => {
    if (!map) return

    if (editState.isEditMode && !editState.isDrawingPolygon) {
      mapClickListenerRef.current = map.addListener('click', () => {
        clearSelection()
      })
    }

    return () => {
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current)
        mapClickListenerRef.current = null
      }
    }
  }, [map, editState.isEditMode, editState.isDrawingPolygon, clearSelection])

  return {
    editState,
    toggleEditMode,
    selectPolygon,
    clearSelection,
    deleteSelected
  }
}