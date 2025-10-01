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

  // Use refs for immediate access without re-renders causing issues
  const pathRef = useRef<google.maps.LatLng[]>([])
  const markersRef = useRef<google.maps.Marker[]>([])
  const linesRef = useRef<google.maps.Polyline[]>([])
  const tempLineRef = useRef<google.maps.Polyline | null>(null)
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const mouseMoveListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const typeRef = useRef<DrawingMode | null>(null)
  const firstMarkersRef = useRef<WeakSet<google.maps.Marker>>(new WeakSet())

  const getCurrentColor = () => typeRef.current === 'roof' ? COLORS.ROOF : COLORS.OBJECT

  const markerIcon = (isFirst: boolean, color: string) => ({
    path: google.maps.SymbolPath.CIRCLE,
    scale: isFirst ? 6 : 4,
    fillColor: isFirst ? color : '#ffffff',
    fillOpacity: 1,
    strokeColor: isFirst ? '#ffffff' : color,
    strokeWeight: isFirst ? 2 : 1.5,
    strokeOpacity: 1
  })

  const lineOptions = (start: google.maps.LatLng, end: google.maps.LatLng, color: string, opacity = 0.9) => ({
    path: [start, end],
    strokeColor: color,
    strokeWeight: 3,
    strokeOpacity: opacity,
    clickable: false,
    zIndex: 1500
  })

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
    firstMarkersRef.current = new WeakSet()
  }, [])

  const createMarker = useCallback((position: google.maps.LatLng, isFirst: boolean) => {
    if (!map) return null
    const color = getCurrentColor()
    return new google.maps.Marker({
      position,
      map,
      icon: markerIcon(isFirst, color),
      clickable: isFirst,
      zIndex: 2000,
      optimized: false
    })
  }, [map])

  const createLine = useCallback((start: google.maps.LatLng, end: google.maps.LatLng) => {
    if (!map) return null
    const color = getCurrentColor()
    return new google.maps.Polyline({
      ...lineOptions(start, end, color),
      map
    })
  }, [map])

  const updateTempLine = useCallback((mousePos: google.maps.LatLng) => {
    if (!map || pathRef.current.length === 0) return undefined
    if (tempLineRef.current) tempLineRef.current.setMap(null)
    const lastPoint = pathRef.current[pathRef.current.length - 1]
    const color = getCurrentColor()
    tempLineRef.current = new google.maps.Polyline({
      ...lineOptions(lastPoint, mousePos, color, 0.5),
      map,
      zIndex: 2500,
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
    if (pathRef.current.length < 3) return undefined
    const path = [...pathRef.current]
    const isRoof = typeRef.current === 'roof'
    onPolygonComplete(path, isRoof)
    // Clear markers and lines but keep drawing mode active
    cleanup()
    // Don't exit drawing mode - user stays in the same drawing type
  }, [onPolygonComplete])

  const addPoint = useCallback((latLng: google.maps.LatLng) => {
    if (!map) return undefined
    const isFirst = pathRef.current.length === 0
    const marker = createMarker(latLng, isFirst)
    if (!marker) return undefined
    if (isFirst) {
      // Track first marker for click detection
      firstMarkersRef.current.add(marker)
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
  }, [map, createMarker, createLine, completePolygon])

  const startDrawing = useCallback((type: DrawingMode) => {
    if (!map || !isEditMode) return undefined
    typeRef.current = type
    setDrawingType(type)
    setIsDrawing(true)
    map.setOptions({
      draggable: false,
      scrollwheel: false,
      gestureHandling: 'none',
      disableDoubleClickZoom: true,
      clickableIcons: false
    })
    cleanup()
  }, [map, isEditMode])

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
  }, [map, isEditMode])

  // Base overlay class for DOM-level event handling with coordinate conversion
  const createEventOverlay = useCallback((
    eventType: string,
    callback: (latLng: google.maps.LatLng, point: google.maps.Point, e: MouseEvent) => void
  ) => {
    if (!map) return null

    class EventOverlay extends google.maps.OverlayView {
      private handler: ((e: MouseEvent) => void) | null = null

      onAdd() {
        const panes = this.getPanes()
        if (!panes) return

        const mapDiv = map.getDiv()

        this.handler = (e: MouseEvent) => {
          const projection = this.getProjection()
          if (!projection) return

          const bounds = mapDiv.getBoundingClientRect()
          const point = new google.maps.Point(
            e.clientX - bounds.left,
            e.clientY - bounds.top
          )

          const latLng = projection.fromContainerPixelToLatLng(point)
          if (latLng) callback(latLng, point, e)
        }

        mapDiv.addEventListener(eventType, this.handler, { capture: true })
      }

      onRemove() {
        const mapDiv = map.getDiv()
        if (this.handler) {
          mapDiv.removeEventListener(eventType, this.handler, { capture: true })
          this.handler = null
        }
      }

      draw() {
        // No drawing needed
      }
    }

    return new EventOverlay()
  }, [map])

  useEffect(() => {
    if (!map || !isDrawing) {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
      return
    }

    // Click handling with first marker detection
    const clickOverlay = createEventOverlay('click', (latLng, point, e) => {
      // Check if clicking near the first marker to complete polygon
      if (pathRef.current.length >= 3 && markersRef.current[0]) {
        const firstMarkerPos = markersRef.current[0].getPosition()
        if (firstMarkerPos && clickOverlay) {
          const projection = clickOverlay.getProjection()
          if (projection) {
            const firstMarkerPixel = projection.fromLatLngToContainerPixel(firstMarkerPos)
            if (firstMarkerPixel) {
              const distance = Math.sqrt(
                Math.pow(point.x - firstMarkerPixel.x, 2) +
                Math.pow(point.y - firstMarkerPixel.y, 2)
              )
              // If within 15 pixels of first marker, complete polygon
              if (distance <= 15) {
                e.stopPropagation()
                completePolygon()
                return
              }
            }
          }
        }
      }

      // Otherwise add a new point
      e.stopPropagation()
      addPoint(latLng)
    })

    if (clickOverlay) clickOverlay.setMap(map)

    // Also add standard listener as fallback
    clickListenerRef.current = google.maps.event.addListener(map, 'click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) addPoint(e.latLng)
    })

    return () => {
      if (clickOverlay) clickOverlay.setMap(null)
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
    }
  }, [map, isDrawing, addPoint, completePolygon])

  useEffect(() => {
    if (!map || !isDrawing) {
      if (mouseMoveListenerRef.current) {
        google.maps.event.removeListener(mouseMoveListenerRef.current)
        mouseMoveListenerRef.current = null
      }
      return
    }

    // Mouse move handling for temp line
    const mouseMoveOverlay = createEventOverlay('mousemove', (latLng) => {
      if (pathRef.current.length === 0) return
      updateTempLine(latLng)
    })

    if (mouseMoveOverlay) mouseMoveOverlay.setMap(map)

    // Also add standard listener as fallback
    mouseMoveListenerRef.current = google.maps.event.addListener(map, 'mousemove', (e: google.maps.MapMouseEvent) => {
      if (e.latLng && pathRef.current.length > 0) updateTempLine(e.latLng)
    })

    return () => {
      if (mouseMoveOverlay) mouseMoveOverlay.setMap(null)
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

  return { isDrawing, drawingType, startDrawing, stopDrawing, completePolygon }
}