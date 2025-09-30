import { useCallback, useEffect, useRef } from 'react'
import { StyleConfig } from '../utils/styleConfig'

interface PolygonManagerProps {
  map: google.maps.Map | null
  isEditMode: boolean
  selectedPolygons: Set<google.maps.Polygon>
  isCtrlPressed: boolean
  onSelectPolygon: (polygon: google.maps.Polygon, ctrlKey: boolean) => void
}

export function usePolygonManager({
  map,
  isEditMode,
  selectedPolygons,
  isCtrlPressed,
  onSelectPolygon
}: PolygonManagerProps) {
  const polygonListenersRef = useRef<Map<google.maps.Polygon, google.maps.MapsEventListener[]>>(new Map())

  const updatePolygonState = useCallback((polygon: google.maps.Polygon, isRoof: boolean) => {
    const isSelected = selectedPolygons.has(polygon)
    const isPanelElement = (polygon as any).isPanelElement

    if (isPanelElement) {
      const moduleType = (polygon as any).moduleType || 'STANDARD'
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
  }, [selectedPolygons, isEditMode])

  const addPolygonListeners = useCallback((polygon: google.maps.Polygon, isRoof: boolean) => {
    if (!isEditMode) return

    const listeners: google.maps.MapsEventListener[] = []

    // Click listener
    listeners.push(
      polygon.addListener('click', (e: google.maps.MapMouseEvent) => {
        e.stop?.()
        onSelectPolygon(polygon, isCtrlPressed)
      })
    )

    // Right-click for vertex removal
    listeners.push(
      polygon.addListener('rightclick', (e: any) => {
        if (selectedPolygons.has(polygon) && e.vertex !== undefined) {
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
        if (selectedPolygons.has(polygon) && e.vertex !== undefined) {
          const path = polygon.getPath()
          path.insertAt(e.vertex + 1, e.latLng)
        }
      })
    )

    // Panel hover effects
    if ((polygon as any).isPanelElement) {
      listeners.push(
        polygon.addListener('mouseover', () => {
          if (!selectedPolygons.has(polygon)) {
            const moduleType = (polygon as any).moduleType || 'STANDARD'
            const options = StyleConfig.getPanelOptions('hover', moduleType)
            polygon.setOptions(options)
          }
        })
      )

      listeners.push(
        polygon.addListener('mouseout', () => {
          if (!selectedPolygons.has(polygon)) {
            const moduleType = (polygon as any).moduleType || 'STANDARD'
            const options = StyleConfig.getPanelOptions('default', moduleType)
            polygon.setOptions(options)
          }
        })
      )
    }

    polygonListenersRef.current.set(polygon, listeners)
  }, [isEditMode, isCtrlPressed, onSelectPolygon, selectedPolygons])

  const removePolygonListeners = useCallback((polygon: google.maps.Polygon) => {
    const listeners = polygonListenersRef.current.get(polygon)
    if (listeners) {
      listeners.forEach(listener => {
        google.maps.event.removeListener(listener)
      })
      polygonListenersRef.current.delete(polygon)
    }
  }, [])

  const updateAllPolygons = useCallback((polygons: google.maps.Polygon[], isRoof: boolean) => {
    polygons.forEach(polygon => {
      removePolygonListeners(polygon)
      updatePolygonState(polygon, isRoof)
      if (isEditMode) {
        addPolygonListeners(polygon, isRoof)
      }
    })
  }, [isEditMode, addPolygonListeners, removePolygonListeners, updatePolygonState])

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