import { useCallback, useEffect, useRef } from 'react'
import { StyleConfig } from '../../../shared/utils/styleConfig'
import { usePanelGridDrag, handleNonPanelDrag } from './usePanelGridDrag'

interface ExtendedPolygon extends google.maps.Polygon {
  isPanelElement?: boolean
}

interface PolygonManagerProps {
  map: google.maps.Map | null
  isEditMode: boolean
  selectedPolygons: Set<google.maps.Polygon>
  isCtrlPressed: boolean
  isDrawing?: boolean
  onSelectPolygon: (polygon: google.maps.Polygon, ctrlKey: boolean) => void
  removeClickListener: (polygon: google.maps.Polygon) => void
}

export function usePolygonManager({
  map,
  isEditMode,
  selectedPolygons,
  isCtrlPressed,
  isDrawing = false,
  onSelectPolygon,
  removeClickListener: removePolygonClickListener
}: PolygonManagerProps) {
  const polygonListenersRef = useRef<Map<google.maps.Polygon, google.maps.MapsEventListener[]>>(new Map())
  const selectedPolygonsRef = useRef(selectedPolygons)
  const isCtrlPressedRef = useRef(isCtrlPressed)

  // Keep refs in sync without triggering re-renders
  useEffect(() => {
    selectedPolygonsRef.current = selectedPolygons
  }, [selectedPolygons])

  useEffect(() => {
    isCtrlPressedRef.current = isCtrlPressed
  }, [isCtrlPressed])

  // Use the extracted panel grid drag hook for clean separation of concerns
  const { handleDragStart, handleDrag, handleDragEnd } = usePanelGridDrag({
    selectedPolygonsRef
  })

  const updatePolygonState = useCallback((polygon: google.maps.Polygon, isRoof: boolean) => {
    const isSelected = selectedPolygonsRef.current.has(polygon)
    const extendedPolygon = polygon as ExtendedPolygon
    const isPanelElement = extendedPolygon.isPanelElement

    if (isPanelElement) {
      const state = isSelected ? 'selected' : 'default'
      const options = StyleConfig.getPanelOptions(state)

      polygon.setOptions({
        ...options,
        clickable: isEditMode && !isDrawing,
        draggable: isSelected && isEditMode && !isDrawing,
        editable: false
      })
    } else {
      const options = StyleConfig.getOptionsForType(isRoof, isSelected)

      polygon.setOptions({
        ...options,
        editable: isSelected && isEditMode && !isDrawing,
        draggable: isSelected && isEditMode && !isDrawing,
        clickable: isEditMode && !isDrawing
      })
    }
  }, [isEditMode, isDrawing])

  const removePolygonListeners = useCallback((polygon: google.maps.Polygon) => {
    // Remove listeners added by this manager
    const listeners = polygonListenersRef.current.get(polygon)
    if (!listeners) return

    listeners.forEach(listener => {
      google.maps.event.removeListener(listener)
    })
    polygonListenersRef.current.delete(polygon)
  }, [])

  const addPolygonListeners = useCallback((polygon: google.maps.Polygon, isRoof: boolean) => {
    if (!isEditMode || isDrawing) return

    const listeners: google.maps.MapsEventListener[] = []

    // Map change listener - cleanup when polygon is removed from map
    listeners.push(
      polygon.addListener('map_changed', () => {
        if (polygon.getMap() === null) {
          removePolygonListeners(polygon)
        }
      })
    )

    // Click listener - prevent event propagation to stop map from moving
    listeners.push(
      polygon.addListener('click', (e: google.maps.MapMouseEvent) => {
        // Only handle click if polygon is clickable
        if (!polygon.get('clickable')) {
          return
        }
        e.stop?.()
        // Use ref to get current value instead of closure capture
        onSelectPolygon(polygon, isCtrlPressedRef.current)
      })
    )

    // Multi-polygon drag support with grid snapping
    // Extracted to usePanelGridDrag hook for better maintainability
    const dragStartPositions = new WeakMap<google.maps.Polygon, google.maps.LatLng[]>()

    // Dragstart: Store initial positions and snap panels to grid
    listeners.push(
      polygon.addListener('dragstart', () => {
        // Use extracted hook for panel logic
        handleDragStart()

        // Also store positions for non-panel polygons
        selectedPolygonsRef.current.forEach(p => {
          if (!(p as ExtendedPolygon).isPanelElement) {
            const path = p.getPath().getArray()
            dragStartPositions.set(p, path.map(ll => new google.maps.LatLng(ll.lat(), ll.lng())))
          }
        })
      })
    )

    // Drag: Apply grid snapping for panels, simple translation for non-panels
    listeners.push(
      polygon.addListener('drag', () => {
        const extendedPolygon = polygon as ExtendedPolygon

        if (extendedPolygon.isPanelElement) {
          // Use extracted hook for complex panel grid snapping logic
          handleDrag(polygon)
        } else {
          // Simple lat/lng delta for non-panel polygons
          handleNonPanelDrag(polygon, selectedPolygonsRef, dragStartPositions)
        }
      })
    )

    // Dragend: Cleanup (snapping already handled during drag)
    listeners.push(
      polygon.addListener('dragend', () => {
        handleDragEnd()
      })
    )

    // Right-click for vertex removal
    listeners.push(
      polygon.addListener('rightclick', (e: any) => {
        if (selectedPolygonsRef.current.has(polygon) && e.vertex !== undefined) {
          const path = polygon.getPath()
          if (path.getLength() > 3) {
            path.removeAt(e.vertex)
          } else {
            polygon.setMap(null)
          }
        }
      })
    )

    // Double-click for vertex addition
    listeners.push(
      polygon.addListener('dblclick', (e: any) => {
        e.stop?.()
        if (selectedPolygonsRef.current.has(polygon) && e.vertex !== undefined) {
          const path = polygon.getPath()
          path.insertAt(e.vertex + 1, e.latLng)
        }
      })
    )

    // Panel hover effects
    const extendedPolygon = polygon as ExtendedPolygon
    if (extendedPolygon.isPanelElement) {
      listeners.push(
        polygon.addListener('mouseover', () => {
          if (!selectedPolygonsRef.current.has(polygon)) {
            const options = StyleConfig.getPanelOptions('hover')
            polygon.setOptions(options)
          }
        })
      )

      listeners.push(
        polygon.addListener('mouseout', () => {
          if (!selectedPolygonsRef.current.has(polygon)) {
            const options = StyleConfig.getPanelOptions('default')
            polygon.setOptions(options)
          }
        })
      )
    }

    polygonListenersRef.current.set(polygon, listeners)
  }, [isEditMode, isDrawing, onSelectPolygon, removePolygonListeners])

  const updateAllPolygons = useCallback((polygons: google.maps.Polygon[], isRoof: boolean) => {
    polygons.forEach(polygon => {
      removePolygonListeners(polygon)
      updatePolygonState(polygon, isRoof)
      if (isEditMode && !isDrawing) {
        // Remove the click listener from usePolygons (keeps hover effects)
        removePolygonClickListener(polygon)
        // Add edit mode listeners
        addPolygonListeners(polygon, isRoof)
      }
    })
  }, [isEditMode, isDrawing, addPolygonListeners, removePolygonListeners, updatePolygonState, removePolygonClickListener])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      polygonListenersRef.current.forEach((listeners) => {
        listeners.forEach(listener => {
          google.maps.event.removeListener(listener)
        })
      })
      polygonListenersRef.current.clear()
    }
  }, [])

  return {
    updateAllPolygons,
    addPolygonListeners,
    removePolygonListeners
  }
}