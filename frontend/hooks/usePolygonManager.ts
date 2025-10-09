import { useCallback, useEffect, useRef } from 'react'
import { StyleConfig } from '../utils/styleConfig'
import {
  snapPolygonToGrid,
  getPolygonGridId,
  calculateGridDelta,
  applyGridDelta,
  worldToGrid,
  type LatLng,
  type GridDelta
} from '../utils/gridSnapping'

interface ExtendedPolygon extends google.maps.Polygon {
  isPanelElement?: boolean
  moduleType?: 'STANDARD' | 'PREMIUM' | string
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
        onSelectPolygon(polygon, isCtrlPressed)
      })
    )

    // Multi-polygon drag support - pure grid-space mathematics
    const dragStartPositions = new WeakMap<google.maps.Polygon, google.maps.LatLng[]>()

    listeners.push(
      polygon.addListener('dragstart', () => {
        // Store original paths for all selected polygons
        selectedPolygonsRef.current.forEach(p => {
          const extP = p as ExtendedPolygon
          let path = p.getPath().getArray()
          const gridId = getPolygonGridId(p)
          const isPanel = extP.isPanelElement === true

          // Snap panels to grid BEFORE storing start positions
          // This ensures we start from integer grid coordinates
          if (isPanel && gridId !== undefined) {
            const snapped = snapPolygonToGrid(path, p)
            const firstCorner = { lat: path[0].lat(), lng: path[0].lng() }
            const gridCoords = worldToGrid(firstCorner, gridId)

            if (gridCoords) {
              const isOffGrid = Math.abs(gridCoords.x - Math.round(gridCoords.x)) > 0.01 ||
                               Math.abs(gridCoords.y - Math.round(gridCoords.y)) > 0.01

              if (isOffGrid) {
                p.setPath(snapped)
                path = snapped
              }
            }
          }

          dragStartPositions.set(p, path.map(ll => new google.maps.LatLng(ll.lat(), ll.lng())))
        })
      })
    )

    listeners.push(
      polygon.addListener('drag', () => {
        const extendedPolygon = polygon as ExtendedPolygon
        if (extendedPolygon.isPanelElement) {
          // Snap primary panel to its grid
          const currentPath = polygon.getPath().getArray()
          const snappedPath = snapPolygonToGrid(currentPath, polygon)

          // Only update if position changed (avoid infinite loop)
          if (currentPath[0].lat() !== snappedPath[0].lat() || currentPath[0].lng() !== snappedPath[0].lng()) {
            polygon.setPath(snappedPath)
          }

          // Multi-polygon drag - pure grid-space mathematics
          if (selectedPolygonsRef.current.size > 1) {
            const primaryGridId = getPolygonGridId(polygon)
            const primaryStartPath = dragStartPositions.get(polygon)

            if (primaryGridId !== undefined && primaryStartPath) {
              // Calculate grid delta: how many grid steps the primary panel moved
              const primaryStartPos: LatLng = { lat: primaryStartPath[0].lat(), lng: primaryStartPath[0].lng() }
              const primaryCurrentPos: LatLng = { lat: snappedPath[0].lat(), lng: snappedPath[0].lng() }

              const gridDelta = calculateGridDelta(primaryStartPos, primaryCurrentPos, primaryGridId)

              if (gridDelta) {
                const { dx, dy } = gridDelta

                // Early exit if no movement
                if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return

                // Apply same grid delta to all other panels in their own grid space
                selectedPolygonsRef.current.forEach(p => {
                  if (p === polygon) return

                  const pGridId = getPolygonGridId(p)
                  const pStartPath = dragStartPositions.get(p)

                  if (pGridId !== undefined && pStartPath) {
                    const pStartPos: LatLng = { lat: pStartPath[0].lat(), lng: pStartPath[0].lng() }

                    // Apply grid delta in this panel's grid space
                    const newPos = applyGridDelta(pStartPos, { dx, dy }, pGridId, true)

                    if (newPos) {
                      // Calculate offset from original first corner
                      const offsetLat = newPos.lat - pStartPos.lat
                      const offsetLng = newPos.lng - pStartPos.lng

                      // Apply offset to entire polygon
                      const newPath = pStartPath.map(ll =>
                        new google.maps.LatLng(ll.lat() + offsetLat, ll.lng() + offsetLng)
                      )
                      p.setPath(newPath)
                    }
                  }
                })
              }
            }
          }
        } else {
          // Non-panel polygons: original multi-drag behavior
          if (selectedPolygonsRef.current.size <= 1) return

          const draggedPath = polygon.getPath().getArray()
          const draggedStart = dragStartPositions.get(polygon)
          if (!draggedStart) return

          const latDiff = draggedPath[0].lat() - draggedStart[0].lat()
          const lngDiff = draggedPath[0].lng() - draggedStart[0].lng()

          selectedPolygonsRef.current.forEach(p => {
            if (p === polygon) return

            const startPath = dragStartPositions.get(p)
            if (!startPath) return

            const newPath = startPath.map(ll => new google.maps.LatLng(ll.lat() + latDiff, ll.lng() + lngDiff))
            p.setPath(newPath)
          })
        }
      })
    )

    // Dragend - cleanup (snapping already handled during drag)
    listeners.push(
      polygon.addListener('dragend', () => {
        // All snapping happens during drag for smooth UX
        // This listener is kept for potential future dragend-specific logic
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
  }, [isEditMode, isDrawing, isCtrlPressed, onSelectPolygon, removePolygonListeners])

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