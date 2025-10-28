import { useState, useCallback, useRef, useEffect } from 'react'
import { RoofModel, CoordinateModel } from '../types/detection'
import { StyleConfig } from '../utils/styleConfig'

interface UsePolygonsReturn {
  roofPolygons: google.maps.Polygon[]
  objectPolygons: google.maps.Polygon[]
  renderPolygons: (polygonData: RoofModel[], isRoof: boolean, enableHover?: boolean) => void
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
      // Don't apply hover effect if polygon is selected (draggable means selected), being drag-selected, or not clickable
      const currentStrokeColor = polygon.get('strokeColor')
      if (!polygon.getDraggable() && polygon.get('clickable') && currentStrokeColor !== '#3498db') {
        polygon.setOptions({
          strokeColor: baseColor.HOVER,
          fillColor: baseColor.HOVER
        })
      }
    })

    const mouseoutListener = polygon.addListener('mouseout', () => {
      const currentStrokeColor = polygon.get('strokeColor')
      if (!polygon.getDraggable() && currentStrokeColor !== '#3498db') {
        polygon.setOptions(defaultOptions)
      }
    })

    const clickListener = polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!polygon.get('clickable')) {
        return
      }

      if (event.latLng && currentMap) {
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

    polygonListenersRef.current.set(polygon, listeners)
    interface PolygonWithClickListener extends google.maps.Polygon {
      __clickListener?: google.maps.MapsEventListener
    }
    ;(polygon as PolygonWithClickListener).__clickListener = clickListener
  }, [])

  const renderPolygons = useCallback((polygonData: RoofModel[], isRoof: boolean, enableHover: boolean = true) => {
    if (!map || !polygonData) return

    const newPolygons: google.maps.Polygon[] = []

    polygonData.forEach((roof, index) => {
      if (!roof || !roof.coords || roof.coords.length === 0) return

      const latLngCoords = convertCoordinatesToLatLng(roof.coords)
      if (latLngCoords.length === 0) return

      const options = createPolygonOptions(isRoof)

      const polygon = new google.maps.Polygon({
        paths: latLngCoords,
        ...options,
        map: map
      })

      if (enableHover) {
        addHoverEffects(polygon, isRoof, map)
      }
      newPolygons.push(polygon)
    })

    if (isRoof) {
      setRoofPolygons(prev => [...prev, ...newPolygons])
    } else {
      setObjectPolygons(prev => [...prev, ...newPolygons])
    }
  }, [map, convertCoordinatesToLatLng, createPolygonOptions, addHoverEffects])

  const clearPolygonGroup = useCallback((polygons: google.maps.Polygon[], type: string) => {
    polygons.forEach((polygon, index) => {
      if (polygon) {
        const path = polygon.getPath()
        if (path) {
          const coords = path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
        }

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
      clearPolygonGroup(prevRoof, 'ROOF')
      return []
    })
    setObjectPolygons(prevObj => {
      clearPolygonGroup(prevObj, 'OBJECT')
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

  useEffect(() => {
    return () => {
      polygonListenersRef.current.forEach((listeners) => {
        listeners.forEach(listener => google.maps.event.removeListener(listener))
      })
      polygonListenersRef.current.clear()

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
    interface PolygonWithClickListener extends google.maps.Polygon {
      __clickListener?: google.maps.MapsEventListener
    }
    const listeners = polygonListenersRef.current.get(polygon)
    if (listeners) {
      listeners.forEach(listener => google.maps.event.removeListener(listener))
      polygonListenersRef.current.delete(polygon)
      delete (polygon as PolygonWithClickListener).__clickListener
    }
  }, [])

  const removeClickListener = useCallback((polygon: google.maps.Polygon) => {
    interface PolygonWithClickListener extends google.maps.Polygon {
      __clickListener?: google.maps.MapsEventListener
    }
    const clickListener = (polygon as PolygonWithClickListener).__clickListener
    if (clickListener) {
      google.maps.event.removeListener(clickListener)
      delete (polygon as PolygonWithClickListener).__clickListener
    }
  }, [])

  const removePolygons = useCallback((polygonsToRemove: google.maps.Polygon[]) => {
    const polygonSet = new Set(polygonsToRemove)

    setRoofPolygons(prev => {
      const toRemove = prev.filter(p => polygonSet.has(p))
      toRemove.forEach((polygon, index) => {
        const path = polygon.getPath()
        if (path) {
          const coords = path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
        }
        clearPolygonGroup([polygon], 'ROOF-INDIVIDUAL')
      })
      const remaining = prev.filter(p => !polygonSet.has(p))
      remaining.forEach((polygon, index) => {
        const path = polygon.getPath()
        if (path) {
          const coords = path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
        }
      })
      return remaining
    })

    setObjectPolygons(prev => {
      const toRemove = prev.filter(p => polygonSet.has(p))
      toRemove.forEach(polygon => {
        clearPolygonGroup([polygon], 'OBJECT-INDIVIDUAL')
      })
      const remaining = prev.filter(p => !polygonSet.has(p))
      return remaining
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