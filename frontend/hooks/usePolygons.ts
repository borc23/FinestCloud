import { useState, useCallback, useRef, useEffect } from 'react'
import { RoofModel, CoordinateModel } from '../types/detection'

interface PolygonOptions {
  strokeColor: string
  strokeOpacity: number
  strokeWeight: number
  fillColor: string
  fillOpacity: number
  clickable?: boolean
}

interface UsePolygonsReturn {
  roofPolygons: google.maps.Polygon[]
  objectPolygons: google.maps.Polygon[]
  renderPolygons: (polygonData: RoofModel[], isRoof: boolean) => void
  clearAllPolygons: () => void
  togglePolygonVisibility: (visible: boolean) => void
  hasRoofs: boolean
}

const POLYGON_STYLES = {
  roof: {
    default: {
      strokeColor: '#22c55e',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#22c55e',
      fillOpacity: 0.2,
      clickable: true
    },
    hover: {
      strokeColor: '#16a34a',
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: '#16a34a',
      fillOpacity: 0.3
    }
  },
  object: {
    default: {
      strokeColor: '#f59e0b',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.2,
      clickable: true
    },
    hover: {
      strokeColor: '#d97706',
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: '#d97706',
      fillOpacity: 0.3
    }
  }
}

export function usePolygons(map: google.maps.Map | null): UsePolygonsReturn {
  const [roofPolygons, setRoofPolygons] = useState<google.maps.Polygon[]>([])
  const [objectPolygons, setObjectPolygons] = useState<google.maps.Polygon[]>([])
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const convertCoordinatesToLatLng = useCallback((coords: CoordinateModel[]): google.maps.LatLng[] => {
    return coords
      .filter(coord => coord.lat !== undefined && coord.lng !== undefined)
      .map(coord => new google.maps.LatLng(coord.lat!, coord.lng!))
  }, [])

  const createPolygonOptions = useCallback((isRoof: boolean): PolygonOptions => {
    return isRoof ? POLYGON_STYLES.roof.default : POLYGON_STYLES.object.default
  }, [])

  const addHoverEffects = useCallback((polygon: google.maps.Polygon, isRoof: boolean, currentMap: google.maps.Map) => {
    const hoverStyle = isRoof ? POLYGON_STYLES.roof.hover : POLYGON_STYLES.object.hover
    const defaultStyle = isRoof ? POLYGON_STYLES.roof.default : POLYGON_STYLES.object.default

    polygon.addListener('mouseover', () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      polygon.setOptions(hoverStyle)
    })

    polygon.addListener('mouseout', () => {
      hoverTimeoutRef.current = setTimeout(() => {
        polygon.setOptions(defaultStyle)
      }, 100)
    })

    polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng && currentMap) {
        // Fit bounds to clicked polygon
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
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
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

  const hasRoofs = roofPolygons.length > 0

  return {
    roofPolygons,
    objectPolygons,
    renderPolygons,
    clearAllPolygons,
    togglePolygonVisibility,
    hasRoofs
  }
}