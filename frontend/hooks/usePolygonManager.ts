import { useCallback, useEffect, useRef } from 'react'
import { StyleConfig } from '../utils/styleConfig'

interface ExtendedPolygon extends google.maps.Polygon {
  isPanelElement?: boolean
  moduleType?: 'STANDARD' | 'PREMIUM' | string
}

interface PolygonManagerProps {
  map: google.maps.Map | null
  isEditMode: boolean
  selectedPolygons: Set<google.maps.Polygon>
  isCtrlPressed: boolean
  onSelectPolygon: (polygon: google.maps.Polygon, ctrlKey: boolean) => void
  removeClickListener: (polygon: google.maps.Polygon) => void
}

export function usePolygonManager({
  map,
  isEditMode,
  selectedPolygons,
  isCtrlPressed,
  onSelectPolygon,
  removeClickListener: removePolygonClickListener
}: PolygonManagerProps) {
  const polygonListenersRef = useRef<Map<google.maps.Polygon, google.maps.MapsEventListener[]>>(new Map())
  const selectedPolygonsRef = useRef(selectedPolygons)

  // Keep ref in sync without triggering re-renders
  useEffect(() => {
    selectedPolygonsRef.current = selectedPolygons
  }, [selectedPolygons])

  const updatePolygonState = useCallback((polygon: google.maps.Polygon, isRoof: boolean) => {
    const isSelected = selectedPolygonsRef.current.has(polygon)
    const extendedPolygon = polygon as ExtendedPolygon
    const isPanelElement = extendedPolygon.isPanelElement

    if (isPanelElement) {
      const moduleType = extendedPolygon.moduleType || 'STANDARD'
      const state = isSelected ? 'selected' : 'default'
      const options = StyleConfig.getPanelOptions(state, moduleType)

      polygon.setOptions({
        ...options,
        clickable: isEditMode
      })
    } else {
      const options = StyleConfig.getOptionsForType(isRoof, isSelected)

      polygon.setOptions({
        ...options,
        editable: isSelected && isEditMode,
        draggable: isSelected && isEditMode,
        clickable: isEditMode
      })
    }
  }, [isEditMode])

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
    if (!isEditMode) return

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
        e.stop?.()
        onSelectPolygon(polygon, isCtrlPressed)
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
            const moduleType = extendedPolygon.moduleType || 'STANDARD'
            const options = StyleConfig.getPanelOptions('hover', moduleType)
            polygon.setOptions(options)
          }
        })
      )

      listeners.push(
        polygon.addListener('mouseout', () => {
          if (!selectedPolygonsRef.current.has(polygon)) {
            const moduleType = extendedPolygon.moduleType || 'STANDARD'
            const options = StyleConfig.getPanelOptions('default', moduleType)
            polygon.setOptions(options)
          }
        })
      )
    }

    polygonListenersRef.current.set(polygon, listeners)
  }, [isEditMode, isCtrlPressed, onSelectPolygon, removePolygonListeners])

  const updateAllPolygons = useCallback((polygons: google.maps.Polygon[], isRoof: boolean) => {
    polygons.forEach(polygon => {
      removePolygonListeners(polygon)
      updatePolygonState(polygon, isRoof)
      if (isEditMode) {
        // Remove the click listener from usePolygons (keeps hover effects)
        removePolygonClickListener(polygon)
        // Add edit mode listeners
        addPolygonListeners(polygon, isRoof)
      }
    })
  }, [isEditMode, addPolygonListeners, removePolygonListeners, updatePolygonState, removePolygonClickListener])

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