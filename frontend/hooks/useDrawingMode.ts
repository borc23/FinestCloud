import { useState, useCallback, useEffect, useRef } from 'react'

const COLORS = {
  ROOF: '#34c759',
  OBJECT: '#ff453a'
} as const

export type DrawingMode = 'roof' | 'object'

interface UseDrawingModeProps {
  map: google.maps.Map | null
  isEditMode: boolean
  onPolygonComplete: (path: google.maps.LatLng[], isRoof: boolean) => void
}

export function useDrawingMode({ map, isEditMode, onPolygonComplete }: UseDrawingModeProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingType, setDrawingType] = useState<DrawingMode | null>(null)
  const [pointCount, setPointCount] = useState(0)

  // Use refs for immediate access without re-renders causing issues
  const pathRef = useRef<google.maps.LatLng[]>([])
  const markersRef = useRef<google.maps.Marker[]>([])
  const linesRef = useRef<google.maps.Polyline[]>([])
  const tempLineRef = useRef<google.maps.Polyline | null>(null)
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const mouseMoveListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const typeRef = useRef<DrawingMode | null>(null)

  const cleanup = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
    linesRef.current.forEach(line => line.setMap(null))
    linesRef.current = []
    if (tempLineRef.current) {
      tempLineRef.current.setMap(null)
      tempLineRef.current = null
    }
    pathRef.current = []
    setPointCount(0)
  }, [])

  const createMarker = useCallback((position: google.maps.LatLng, isFirst: boolean) => {
    if (!map) return null
    const color = typeRef.current === 'roof' ? COLORS.ROOF : COLORS.OBJECT
    return new google.maps.Marker({
      position,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: isFirst ? 10 : 7,
        fillColor: isFirst ? color : '#ffffff',
        fillOpacity: 1,
        strokeColor: isFirst ? '#ffffff' : color,
        strokeWeight: isFirst ? 3 : 2.5,
        strokeOpacity: 1
      },
      clickable: isFirst,
      zIndex: 2000,
      optimized: false
    })
  }, [map])

  const createLine = useCallback((start: google.maps.LatLng, end: google.maps.LatLng) => {
    if (!map) return null
    const color = typeRef.current === 'roof' ? COLORS.ROOF : COLORS.OBJECT
    return new google.maps.Polyline({
      path: [start, end],
      map,
      strokeColor: color,
      strokeWeight: 3,
      strokeOpacity: 0.9,
      clickable: false,
      zIndex: 1500
    })
  }, [map])

  const updateTempLine = useCallback((mousePos: google.maps.LatLng) => {
    if (!map || pathRef.current.length === 0) return
    if (tempLineRef.current) tempLineRef.current.setMap(null)
    const lastPoint = pathRef.current[pathRef.current.length - 1]
    const color = typeRef.current === 'roof' ? COLORS.ROOF : COLORS.OBJECT
    tempLineRef.current = new google.maps.Polyline({
      path: [lastPoint, mousePos],
      map,
      strokeColor: color,
      strokeWeight: 3,
      strokeOpacity: 0.5,
      clickable: false,
      zIndex: 1500,
      icons: [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 0.5,
          scale: 3
        },
        offset: '0',
        repeat: '12px'
      }]
    })
  }, [map])

  const completePolygon = useCallback(() => {
    if (pathRef.current.length < 3) return
    const path = [...pathRef.current]
    const isRoof = typeRef.current === 'roof'
    onPolygonComplete(path, isRoof)
    // Clear markers and lines but keep drawing mode active
    cleanup()
    // Don't exit drawing mode - user stays in the same drawing type
  }, [onPolygonComplete, cleanup])

  const addPoint = useCallback((latLng: google.maps.LatLng) => {
    if (!map) return
    const isFirst = pathRef.current.length === 0
    const marker = createMarker(latLng, isFirst)
    if (!marker) return
    if (isFirst) {
      marker.addListener('click', (e: google.maps.MapMouseEvent) => {
        e.stop?.()
        if (pathRef.current.length >= 3) completePolygon()
      })
    }
    markersRef.current.push(marker)
    if (pathRef.current.length > 0) {
      const line = createLine(pathRef.current[pathRef.current.length - 1], latLng)
      if (line) linesRef.current.push(line)
    }
    pathRef.current.push(latLng)
    setPointCount(pathRef.current.length)
  }, [map, createMarker, createLine, completePolygon])

  const startDrawing = useCallback((type: DrawingMode) => {
    if (!map || !isEditMode) return
    typeRef.current = type
    setDrawingType(type)
    setIsDrawing(true)
    setPointCount(0)
    map.setOptions({
      draggable: false,
      scrollwheel: false,
      gestureHandling: 'none',
      disableDoubleClickZoom: true,
      clickableIcons: false
    })
    cleanup()
  }, [map, isEditMode, cleanup])

  const stopDrawing = useCallback(() => {
    cleanup()
    setIsDrawing(false)
    setDrawingType(null)
    typeRef.current = null
    if (map) {
      map.setOptions({
        draggable: !isEditMode,
        scrollwheel: !isEditMode,
        gestureHandling: isEditMode ? 'none' : 'auto',
        disableDoubleClickZoom: isEditMode
      })
    }
  }, [map, isEditMode, cleanup])

  useEffect(() => {
    if (!map || !isDrawing) {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
      return
    }
    clickListenerRef.current = google.maps.event.addListener(map, 'click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) addPoint(e.latLng)
    })
    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
    }
  }, [map, isDrawing, addPoint])

  useEffect(() => {
    if (!map || !isDrawing) {
      if (mouseMoveListenerRef.current) {
        google.maps.event.removeListener(mouseMoveListenerRef.current)
        mouseMoveListenerRef.current = null
      }
      return
    }
    mouseMoveListenerRef.current = google.maps.event.addListener(map, 'mousemove', (e: google.maps.MapMouseEvent) => {
      if (e.latLng && pathRef.current.length > 0) updateTempLine(e.latLng)
    })
    return () => {
      if (mouseMoveListenerRef.current) {
        google.maps.event.removeListener(mouseMoveListenerRef.current)
        mouseMoveListenerRef.current = null
      }
    }
  }, [map, isDrawing, updateTempLine])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) stopDrawing()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing, stopDrawing])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  return { isDrawing, drawingType, pointCount, startDrawing, stopDrawing, completePolygon }
}