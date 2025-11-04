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
  moduleType?: 'STANDARD' | 'PREMIUM' | string
}

interface UsePanelGridDragProps {
  selectedPolygonsRef: React.RefObject<Set<google.maps.Polygon>>
}

/**
 * Hook to manage grid-snapped dragging for solar panels with multi-selection support.
 *
 * This hook handles the complex mathematics of dragging solar panels that are snapped to
 * grid systems. When multiple panels are selected, they maintain their relative positions
 * while respecting each panel's individual grid constraints.
 *
 * ## Grid System Concepts:
 *
 * Each solar panel can belong to a different roof, and each roof has its own grid system
 * with unique rotation, scale, and origin. When dragging multiple panels from different
 * roofs, we need to:
 *
 * 1. Calculate movement in the PRIMARY panel's grid space (dx, dy in grid cells)
 * 2. Apply that SAME movement to each other panel in ITS OWN grid space
 * 3. Keep all panels snapped to their respective grids throughout the drag
 *
 * ## Why This Is Complex:
 *
 * Consider two roofs:
 * - Roof A: Grid rotated 30°, cell size 1m x 1.5m
 * - Roof B: Grid rotated 45°, cell size 0.9m x 1.6m
 *
 * If you drag a panel on Roof A by "2 cells right, 1 cell up" in its grid space,
 * a panel on Roof B should ALSO move "2 cells right, 1 cell up" in ITS grid space,
 * even though the actual lat/lng deltas are different due to rotation and scale.
 *
 * ## Algorithm Overview:
 *
 * **DRAGSTART:**
 * 1. Store original positions of all selected polygons
 * 2. Snap any off-grid panels to nearest grid cell (ensures integer coordinates)
 *
 * **DRAG (continuous):**
 * 1. Snap primary (dragged) panel to its grid
 * 2. Calculate grid delta: primaryCurrentGridPos - primaryStartGridPos
 * 3. For each other selected panel:
 *    a. Get its grid ID and start position
 *    b. Apply the SAME grid delta (dx, dy) in its grid space
 *    c. Convert back to lat/lng and update polygon
 *
 * **DRAGEND:**
 * - No action needed (snapping happens during drag for smooth UX)
 *
 * @example
 * ```typescript
 * const { handleDragStart, handleDrag, handleDragEnd } = usePanelGridDrag({
 *   selectedPolygonsRef
 * })
 *
 * polygon.addListener('dragstart', handleDragStart)
 * polygon.addListener('drag', () => handleDrag(polygon))
 * polygon.addListener('dragend', handleDragEnd)
 * ```
 */
export function usePanelGridDrag({ selectedPolygonsRef }: UsePanelGridDragProps) {
  // Store the starting positions of all selected polygons when drag begins
  // WeakMap ensures no memory leaks - entries are garbage collected with polygons
  const dragStartPositions = useRef(new WeakMap<google.maps.Polygon, google.maps.LatLng[]>())

  /**
   * Handle dragstart event - store initial positions and snap to grid
   *
   * This runs ONCE when the user starts dragging. We:
   * 1. Loop through all selected polygons
   * 2. Check if each is a panel element
   * 3. If off-grid, snap it to the nearest grid cell
   * 4. Store the (potentially snapped) starting position
   *
   * Why snap before storing?
   * - Ensures we start from integer grid coordinates (e.g., cell 5,3 not 5.2,3.1)
   * - Makes delta calculations simple: newPos - startPos = whole number of cells
   * - Prevents drift over multiple drag operations
   */
  const handleDragStart = () => {
    selectedPolygonsRef.current?.forEach(p => {
      const extP = p as ExtendedPolygon
      let path = p.getPath().getArray()
      const gridId = getPolygonGridId(p)
      const isPanel = extP.isPanelElement === true

      // Only process panels (not roof polygons or other shapes)
      if (isPanel && gridId !== undefined) {
        // Get the snapped version of the polygon
        const snapped = snapPolygonToGrid(path, p)

        // Check if panel is currently off-grid
        const firstCorner = { lat: path[0].lat(), lng: path[0].lng() }
        const gridCoords = worldToGrid(firstCorner, gridId)

        if (gridCoords) {
          // Calculate distance from nearest grid cell (in grid units)
          // Example: if x=5.2, nearest is 5.0, distance is 0.2
          const isOffGrid =
            Math.abs(gridCoords.x - Math.round(gridCoords.x)) > 0.01 ||
            Math.abs(gridCoords.y - Math.round(gridCoords.y)) > 0.01

          if (isOffGrid) {
            // Snap to grid BEFORE storing position
            // This ensures we start from clean integer coordinates
            p.setPath(snapped)
            path = snapped
          }
        }
      }

      // Store starting position for delta calculation during drag
      dragStartPositions.current.set(
        p,
        path.map(ll => new google.maps.LatLng(ll.lat(), ll.lng()))
      )
    })
  }

  /**
   * Handle drag event for panel elements - apply grid snapping and multi-selection sync
   *
   * This runs CONTINUOUSLY as the user drags (potentially 60 times per second).
   *
   * @param polygon - The polygon being actively dragged by the user
   *
   * ## Single Panel Drag:
   * Just snap the dragged panel to its grid on every frame
   *
   * ## Multi Panel Drag (Complex):
   * 1. The dragged polygon is the "primary" - it dictates movement
   * 2. Calculate how many grid cells the primary moved (dx, dy)
   * 3. Apply that SAME dx, dy to all other panels in their own grid spaces
   * 4. This keeps relative positions while respecting individual grids
   */
  const handleDrag = (polygon: google.maps.Polygon) => {
    const extendedPolygon = polygon as ExtendedPolygon

    if (!extendedPolygon.isPanelElement) {
      // Not a panel - skip grid snapping logic
      return
    }

    // STEP 1: Snap the primary (dragged) panel to its grid
    const currentPath = polygon.getPath().getArray()
    const snappedPath = snapPolygonToGrid(currentPath, polygon)

    // Only update if position actually changed (prevents infinite loop)
    // Without this check: setPath triggers drag event → handleDrag → setPath → ...
    if (currentPath[0].lat() !== snappedPath[0].lat() ||
        currentPath[0].lng() !== snappedPath[0].lng()) {
      polygon.setPath(snappedPath)
    }

    // STEP 2: Handle multi-polygon drag if multiple panels selected
    if (selectedPolygonsRef.current && selectedPolygonsRef.current.size > 1) {
      const primaryGridId = getPolygonGridId(polygon)
      const primaryStartPath = dragStartPositions.current.get(polygon)

      if (primaryGridId !== undefined && primaryStartPath) {
        // Calculate grid delta: how many grid cells did primary panel move?
        // Example: Started at grid cell (3, 5), now at (5, 6) → delta = (2, 1)
        const primaryStartPos: LatLng = {
          lat: primaryStartPath[0].lat(),
          lng: primaryStartPath[0].lng()
        }
        const primaryCurrentPos: LatLng = {
          lat: snappedPath[0].lat(),
          lng: snappedPath[0].lng()
        }

        // This converts world coordinates to grid coordinates and calculates delta
        // Returns { dx: number, dy: number } in grid cell units
        const gridDelta = calculateGridDelta(primaryStartPos, primaryCurrentPos, primaryGridId)

        if (gridDelta) {
          const { dx, dy } = gridDelta

          // STEP 3: Apply the same grid delta to all other selected panels
          selectedPolygonsRef.current.forEach(p => {
            // Skip the primary panel (it's already been updated)
            if (p === polygon) return

            const pGridId = getPolygonGridId(p)
            const pStartPath = dragStartPositions.current.get(p)

            if (pGridId !== undefined && pStartPath) {
              const pStartPos: LatLng = {
                lat: pStartPath[0].lat(),
                lng: pStartPath[0].lng()
              }

              // KEY INSIGHT: Apply the SAME grid delta (dx, dy) but in THIS panel's grid space
              // Example: If primary moved 2 cells right, 1 up in its rotated grid,
              //          this panel ALSO moves 2 cells right, 1 up in ITS rotated grid
              //
              // Even though the actual lat/lng change is different due to:
              // - Different grid rotation angles
              // - Different cell dimensions
              // - Different grid origins
              //
              // The RELATIVE movement is preserved: "2 right, 1 up"
              const newPos = applyGridDelta(pStartPos, { dx, dy }, pGridId, true)

              if (newPos) {
                // Calculate world coordinate offset
                const offsetLat = newPos.lat - pStartPos.lat
                const offsetLng = newPos.lng - pStartPos.lng

                // Apply offset to entire polygon (all vertices, not just first)
                // This maintains polygon shape while translating position
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

  /**
   * Handle dragend event - cleanup after drag completes
   *
   * Currently no action needed because:
   * - All snapping happens during drag (not at end) for smooth UX
   * - WeakMap auto-cleans when polygons are garbage collected
   * - No listeners or timers to clean up
   *
   * This function is kept for:
   * 1. API completeness (dragstart/drag/dragend trilogy)
   * 2. Future dragend-specific logic (e.g., save to database, undo/redo checkpoint)
   */
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

/**
 * Handle non-panel polygon dragging with multi-selection support
 *
 * This is simpler than panel dragging because non-panel polygons (roofs, obstacles)
 * don't snap to grids. They use simple lat/lng deltas.
 *
 * @param polygon - The polygon being dragged
 * @param selectedPolygonsRef - Ref to set of selected polygons
 * @param dragStartPositions - WeakMap of starting positions
 */
export function handleNonPanelDrag(
  polygon: google.maps.Polygon,
  selectedPolygonsRef: React.RefObject<Set<google.maps.Polygon>>,
  dragStartPositions: WeakMap<google.maps.Polygon, google.maps.LatLng[]>
) {
  // Only process multi-selection (single polygon dragging is handled by Google Maps)
  if (!selectedPolygonsRef.current || selectedPolygonsRef.current.size <= 1) return

  const draggedPath = polygon.getPath().getArray()
  const draggedStart = dragStartPositions.get(polygon)
  if (!draggedStart) return

  // Calculate simple lat/lng delta (no grid math needed)
  const latDiff = draggedPath[0].lat() - draggedStart[0].lat()
  const lngDiff = draggedPath[0].lng() - draggedStart[0].lng()

  // Apply same delta to all other selected polygons
  selectedPolygonsRef.current.forEach(p => {
    if (p === polygon) return // Skip the dragged polygon itself

    const startPath = dragStartPositions.get(p)
    if (!startPath) return

    // Simple translation: add delta to all vertices
    const newPath = startPath.map(ll =>
      new google.maps.LatLng(ll.lat() + latDiff, ll.lng() + lngDiff)
    )
    p.setPath(newPath)
  })
}
