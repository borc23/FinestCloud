/**
 * Grid snapping utility for panel movement
 * Supports multiple grids (one per roof) with different orientations
 * Uses pure grid-space mathematics for precise multi-panel dragging
 */

import type {
  Coordinate,
  PanelGenerationResponse,
} from "@/features/solar-panels/types/panel";

interface GridCoords {
  x: number;
  y: number;
}

// ============================================================================
// Grid Class - Pure coordinate transformation
// ============================================================================

class Grid {
  private readonly det: number;

  constructor(
    private readonly origin: Coordinate,
    private readonly vecX: Coordinate,
    private readonly vecY: Coordinate,
  ) {
    this.det = vecX.lat * vecY.lng - vecX.lng * vecY.lat;

    if (Math.abs(this.det) < 1e-10) {
      throw new Error(
        "Grid vectors are collinear or near-collinear (determinant ≈ 0). Cannot create valid grid.",
      );
    }
  }

  /**
   * Convert world coordinates (lat/lng) to grid coordinates (x, y steps)
   * Uses matrix inversion to solve: fromOrigin = x * vecX + y * vecY
   */
  worldToGrid(latLng: Coordinate): GridCoords {
    const dLat = latLng.lat - this.origin.lat;
    const dLng = latLng.lng - this.origin.lng;
    return {
      x: (this.vecY.lng * dLat - this.vecY.lat * dLng) / this.det,
      y: (this.vecX.lat * dLng - this.vecX.lng * dLat) / this.det,
    };
  }

  /**
   * Convert grid coordinates (x, y steps) to world coordinates (lat/lng)
   */
  gridToWorld({ x, y }: GridCoords): Coordinate {
    return {
      lat: this.origin.lat + x * this.vecX.lat + y * this.vecY.lat,
      lng: this.origin.lng + x * this.vecX.lng + y * this.vecY.lng,
    };
  }

  /**
   * Snap a world position to the nearest grid point
   */
  snapToGrid(latLng: Coordinate): Coordinate {
    const { x, y } = this.worldToGrid(latLng);
    return this.gridToWorld({ x: Math.round(x), y: Math.round(y) });
  }

  /**
   * Grid steps (dx, dy) needed to move from 'from' to 'to'
   */
  calculateGridDelta(from: Coordinate, to: Coordinate): GridCoords {
    const a = this.worldToGrid(from);
    const b = this.worldToGrid(to);
    return { x: b.x - a.x, y: b.y - a.y };
  }

  /**
   * Apply a grid delta to a position, snapped to the nearest grid point
   */
  applyGridDelta(startPos: Coordinate, delta: GridCoords): Coordinate {
    const { x, y } = this.worldToGrid(startPos);
    return this.gridToWorld({
      x: Math.round(x + delta.x),
      y: Math.round(y + delta.y),
    });
  }
}

// ============================================================================
// Module state: one grid per roof with panels, plus polygon → grid tags
// ============================================================================

let grids: Grid[] = [];
const polygonGridIds = new WeakMap<google.maps.Polygon, number>();

/**
 * Set grid vectors from panel data (called when panels are generated).
 * Each grid is spanned by the edges of the roof's first panel.
 */
export function setGridVectors(panelData: PanelGenerationResponse): void {
  grids = [];
  panelData?.roofs?.forEach((roof) => {
    const coords = roof.panels?.[0]?.coords;
    if (!coords || coords.length < 4) return;
    const [p0, p1, , p3] = coords;
    grids.push(
      new Grid(
        { lat: p0.lat, lng: p0.lng },
        { lat: p1.lat - p0.lat, lng: p1.lng - p0.lng },
        { lat: p3.lat - p0.lat, lng: p3.lng - p0.lng },
      ),
    );
  });
}

/**
 * Clear all grid vectors (called when panels are cleared)
 */
export function clearGridVectors(): void {
  grids = [];
}

export function tagPanelWithGrid(
  polygon: google.maps.Polygon,
  gridId: number,
): void {
  polygonGridIds.set(polygon, gridId);
}

export function getPolygonGridId(
  polygon: google.maps.Polygon,
): number | undefined {
  return polygonGridIds.get(polygon);
}

export function getGrid(gridId: number): Grid | null {
  return grids[gridId] ?? null;
}

/**
 * Snap a tagged panel's path to its grid (path is returned unchanged if the
 * panel has no grid)
 */
export function snapPolygonToGrid(
  path: google.maps.LatLng[],
  polygon: google.maps.Polygon,
): google.maps.LatLng[] {
  const gridId = polygonGridIds.get(polygon);
  const grid = gridId === undefined ? null : getGrid(gridId);
  if (!grid || path.length === 0) return path;

  const first = path[0];
  const snapped = grid.snapToGrid({ lat: first.lat(), lng: first.lng() });
  const offsetLat = snapped.lat - first.lat();
  const offsetLng = snapped.lng - first.lng();

  return path.map(
    (ll) => new google.maps.LatLng(ll.lat() + offsetLat, ll.lng() + offsetLng),
  );
}
