import { useRef } from 'react'
import {
  snapPolygonToGrid,
  getPolygonGridId,
  calculateGridDelta,
  applyGridDelta,
  worldToGrid,
  type LatLng,
  type GridDelta
} from '@/features/solar-panels/utils/gridSnapping'

interface ExtendedPolygon extends google.maps.Polygon {
  isPanelElement?: boolean
}

interface UsePanelGridDragProps {
  selectedPolygonsRef: React.RefObject<Set<google.maps.Polygon>>
}

export function usePanelGridDrag({ selectedPolygonsRef }: UsePanelGridDragProps) {
  const dragStartPositions = useRef(new WeakMap<google.maps.Polygon, google.maps.LatLng[]>())
  const handleDragStart = () => {
    selectedPolygonsRef.current?.forEach(p => {
      const extP = p as ExtendedPolygon
      let path = p.getPath().getArray()
      const gridId = getPolygonGridId(p)
      const isPanel = extP.isPanelElement === true

      if (isPanel && gridId !== undefined) {
        const snapped = snapPolygonToGrid(path, p)

        const firstCorner = { lat: path[0].lat(), lng: path[0].lng() }
        const gridCoords = worldToGrid(firstCorner, gridId)

        if (gridCoords) {
          const isOffGrid =
            Math.abs(gridCoords.x - Math.round(gridCoords.x)) > 0.01 ||
            Math.abs(gridCoords.y - Math.round(gridCoords.y)) > 0.01

          if (isOffGrid) {
            p.setPath(snapped)
            path = snapped
          }
        }
      }

      dragStartPositions.current.set(
        p,
        path.map(ll => new google.maps.LatLng(ll.lat(), ll.lng()))
      )
    })
  }


  const handleDrag = (polygon: google.maps.Polygon) => {
    const extendedPolygon = polygon as ExtendedPolygon

    if (!extendedPolygon.isPanelElement) {
      return
    }

    const currentPath = polygon.getPath().getArray()
    const snappedPath = snapPolygonToGrid(currentPath, polygon)

    if (currentPath[0].lat() !== snappedPath[0].lat() ||
        currentPath[0].lng() !== snappedPath[0].lng()) {
      polygon.setPath(snappedPath)
    }

    if (selectedPolygonsRef.current && selectedPolygonsRef.current.size > 1) {
      const primaryGridId = getPolygonGridId(polygon)
      const primaryStartPath = dragStartPositions.current.get(polygon)

      if (primaryGridId !== undefined && primaryStartPath) {
        const primaryStartPos: LatLng = {
          lat: primaryStartPath[0].lat(),
          lng: primaryStartPath[0].lng()
        }
        const primaryCurrentPos: LatLng = {
          lat: snappedPath[0].lat(),
          lng: snappedPath[0].lng()
        }

        const gridDelta = calculateGridDelta(primaryStartPos, primaryCurrentPos, primaryGridId)

        if (gridDelta) {
          const { dx, dy } = gridDelta

          selectedPolygonsRef.current.forEach(p => {
            if (p === polygon) return

            const pGridId = getPolygonGridId(p)
            const pStartPath = dragStartPositions.current.get(p)

            if (pGridId !== undefined && pStartPath) {
              const pStartPos: LatLng = {
                lat: pStartPath[0].lat(),
                lng: pStartPath[0].lng()
              }
              const newPos = applyGridDelta(pStartPos, { dx, dy }, pGridId, true)

              if (newPos) {
                const offsetLat = newPos.lat - pStartPos.lat
                const offsetLng = newPos.lng - pStartPos.lng
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
  }
  const handleDragEnd = () => {
    // All snapping happens during drag for smooth UX
    // This listener is kept for potential future dragend-specific logic
  }

  return {
    handleDragStart,
    handleDrag,
    handleDragEnd
  }
}

export function handleNonPanelDrag(
  polygon: google.maps.Polygon,
  selectedPolygonsRef: React.RefObject<Set<google.maps.Polygon>>,
  dragStartPositions: WeakMap<google.maps.Polygon, google.maps.LatLng[]>
) {
  if (!selectedPolygonsRef.current || selectedPolygonsRef.current.size <= 1) return

  const draggedPath = polygon.getPath().getArray()
  const draggedStart = dragStartPositions.get(polygon)
  if (!draggedStart) return

  const latDiff = draggedPath[0].lat() - draggedStart[0].lat()
  const lngDiff = draggedPath[0].lng() - draggedStart[0].lng()

  selectedPolygonsRef.current.forEach(p => {
    if (p === polygon) return

    const startPath = dragStartPositions.get(p)
    if (!startPath) return

    const newPath = startPath.map(ll =>
      new google.maps.LatLng(ll.lat() + latDiff, ll.lng() + lngDiff)
    )
    p.setPath(newPath)
  })
}
