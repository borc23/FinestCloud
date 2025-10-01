import { useState, useCallback, useRef, useEffect } from 'react'
import { RoofModel, CoordinateModel } from '../types/detection'
import { StyleConfig } from '../utils/styleConfig'

interface UsePolygonsReturn {
  roofPolygons: google.maps.Polygon[]
  objectPolygons: google.maps.Polygon[]
  renderPolygons: (polygonData: RoofModel[], isRoof: boolean) => void
  clearAllPolygons: () => void
  togglePolygonVisibility: (visible: boolean) => void
  removePolygonListeners: (polygon: google.maps.Polygon) => void
  removeClickListener: (polygon: google.maps.Polygon) => void
  removePolygons: (polygons: google.maps.Polygon[]) => void
  hasRoofs: boolean
  hasPolygons: boolean
}

export function usePolygons(map: google.maps.Map | null): UsePolygonsReturn {
  const [roofPolygons, setRoofPolygons] = useState<google.maps.Polygon[]>([])
  const [objectPolygons, setObjectPolygons] = useState<google.maps.Polygon[]>([])
  const polygonListenersRef = useRef<Map<google.maps.Polygon, google.maps.MapsEventListener[]>>(new Map())

  const convertCoordinatesToLatLng = useCallback((coords: CoordinateModel[]): google.maps.LatLng[] => {
    return coords
      .filter(coord => coord.lat !== undefined && coord.lng !== undefined)
      .map(coord => new google.maps.LatLng(coord.lat!, coord.lng!))
  }, [])

  const createPolygonOptions = useCallback((isRoof: boolean): google.maps.PolygonOptions => {
    return StyleConfig.getOptionsForType(isRoof, false)
  }, [])

  const addHoverEffects = useCallback((polygon: google.maps.Polygon, isRoof: boolean, currentMap: google.maps.Map) => {
    const baseColor = isRoof ? StyleConfig.COLORS.ROOF : StyleConfig.COLORS.OBJECT
    const defaultOptions = StyleConfig.getOptionsForType(isRoof, false)

    const listeners: google.maps.MapsEventListener[] = []

    // Hover effects - simple and efficient
    const mouseoverListener = polygon.addListener('mouseover', () => {
      // Don't apply hover effect if polygon is selected (draggable means selected)
      if (!polygon.getDraggable?.()) {
        polygon.setOptions({
          strokeColor: baseColor.HOVER,
          fillColor: baseColor.HOVER
        })
      }
    })

    const mouseoutListener = polygon.addListener('mouseout', () => {
      // Don't revert hover effect if polygon is selected
      if (!polygon.getDraggable?.()) {
        polygon.setOptions(defaultOptions)
      }
    })

    // Click to zoom - this gets removed in edit mode
    const clickListener = polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng && currentMap) {
        // Fit bounds to clicked polygon (only when NOT in edit mode)
        const bounds = new google.maps.LatLngBounds()
        const path = polygon.getPath()

        if (path) {
          path.forEach((latLng: google.maps.LatLng) => {
            bounds.extend(latLng)
          })
          currentMap.fitBounds(bounds)
        }
      }
    })

    listeners.push(mouseoverListener, mouseoutListener, clickListener)

    // Store listeners so they can be removed later
    // Store click listener separately so it can be removed independently
    polygonListenersRef.current.set(polygon, listeners)
    ;(polygon as any).__clickListener = clickListener
  }, [])

  const renderPolygons = useCallback((polygonData: RoofModel[], isRoof: boolean) => {
    if (!map || !polygonData) return

    const newPolygons: google.maps.Polygon[] = []

    polygonData.forEach(roof => {
      if (!roof || !roof.coords || roof.coords.length === 0) return

      const latLngCoords = convertCoordinatesToLatLng(roof.coords)
      if (latLngCoords.length === 0) return

      const options = createPolygonOptions(isRoof)

      const polygon = new google.maps.Polygon({
        paths: latLngCoords,
        ...options,
        map: map
      })

      addHoverEffects(polygon, isRoof, map)
      newPolygons.push(polygon)
    })

    if (isRoof) {
      setRoofPolygons(prev => [...prev, ...newPolygons])
    } else {
      setObjectPolygons(prev => [...prev, ...newPolygons])
    }
  }, [map, convertCoordinatesToLatLng, createPolygonOptions, addHoverEffects])

  const clearPolygonGroup = useCallback((polygons: google.maps.Polygon[]) => {
    polygons.forEach(polygon => {
      if (polygon) {
        // Remove listeners first
        const listeners = polygonListenersRef.current.get(polygon)
        if (listeners) {
          listeners.forEach(listener => google.maps.event.removeListener(listener))
          polygonListenersRef.current.delete(polygon)
        }
        polygon.setMap(null)
      }
    })
  }, [])

  const clearAllPolygons = useCallback(() => {
    setRoofPolygons(prevRoof => {
      clearPolygonGroup(prevRoof)
      return []
    })
    setObjectPolygons(prevObj => {
      clearPolygonGroup(prevObj)
      return []
    })
  }, [clearPolygonGroup])

  const setPolygonGroupVisibility = useCallback((polygons: google.maps.Polygon[], visible: boolean) => {
    polygons.forEach(polygon => {
      if (polygon) {
        polygon.setVisible(visible)
      }
    })
  }, [])

  const togglePolygonVisibility = useCallback((visible: boolean) => {
    setRoofPolygons(prevRoof => {
      setPolygonGroupVisibility(prevRoof, visible)
      return prevRoof
    })
    setObjectPolygons(prevObj => {
      setPolygonGroupVisibility(prevObj, visible)
      return prevObj
    })
  }, [setPolygonGroupVisibility])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all listeners
      polygonListenersRef.current.forEach((listeners) => {
        listeners.forEach(listener => google.maps.event.removeListener(listener))
      })
      polygonListenersRef.current.clear()

      // Clear polygons directly to avoid dependency issues
      setRoofPolygons(prevRoof => {
        prevRoof.forEach(polygon => polygon.setMap(null))
        return []
      })
      setObjectPolygons(prevObj => {
        prevObj.forEach(polygon => polygon.setMap(null))
        return []
      })
    }
  }, [])

  const removePolygonListeners = useCallback((polygon: google.maps.Polygon) => {
    const listeners = polygonListenersRef.current.get(polygon)
    if (listeners) {
      listeners.forEach(listener => google.maps.event.removeListener(listener))
      polygonListenersRef.current.delete(polygon)
      delete (polygon as any).__clickListener
    }
  }, [])

  const removeClickListener = useCallback((polygon: google.maps.Polygon) => {
    // Only remove the click listener (for edit mode), keep hover effects
    const clickListener = (polygon as any).__clickListener
    if (clickListener) {
      google.maps.event.removeListener(clickListener)
      delete (polygon as any).__clickListener
    }
  }, [])

  const removePolygons = useCallback((polygonsToRemove: google.maps.Polygon[]) => {
    const polygonSet = new Set(polygonsToRemove)

    setRoofPolygons(prev => {
      const toRemove = prev.filter(p => polygonSet.has(p))
      toRemove.forEach(polygon => {
        clearPolygonGroup([polygon])
      })
      return prev.filter(p => !polygonSet.has(p))
    })

    setObjectPolygons(prev => {
      const toRemove = prev.filter(p => polygonSet.has(p))
      toRemove.forEach(polygon => {
        clearPolygonGroup([polygon])
      })
      return prev.filter(p => !polygonSet.has(p))
    })
  }, [clearPolygonGroup])

  const hasRoofs = roofPolygons.length > 0
  const hasPolygons = roofPolygons.length > 0 || objectPolygons.length > 0

  return {
    roofPolygons,
    objectPolygons,
    renderPolygons,
    clearAllPolygons,
    togglePolygonVisibility,
    removePolygonListeners,
    removeClickListener,
    removePolygons,
    hasRoofs,
    hasPolygons
  }
}