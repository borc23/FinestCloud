"""Grid placement of solar panels on a roof polygon (all units in cm)."""

import numpy as np
import shapely
from shapely.geometry import Polygon

OFFSET_STEP_CM = 5.0


def place_panels(
    roof: np.ndarray,
    obstacles: list[np.ndarray],
    panel_dims: list[tuple[float, float]],
    spacing_cm: float,
    padding_cm: float,
) -> list[np.ndarray]:
    """
    Return the corners (4 x 2) of each panel in the grid layout that fits the most.

    The grid is aligned with the roof's longest edge. A regular grid repeats every
    panel size + spacing, so trying each offset within one period (at
    OFFSET_STEP_CM) for each allowed (width, height) covers every distinct layout.
    Panels must lie inside the roof, within its padded bounding box, and must not
    touch an obstacle.
    """
    angle = _longest_edge_angle(roof)
    center = (roof.min(axis=0) + roof.max(axis=0)) / 2
    to_grid = _rotation(-angle)
    roof_poly = Polygon((roof - center) @ to_grid.T)
    shapely.prepare(roof_poly)
    obstacle_polys = [
        Polygon((o - center) @ to_grid.T) for o in obstacles if len(o) > 2
    ]
    tree = shapely.STRtree(obstacle_polys) if obstacle_polys else None
    min_x, min_y, max_x, max_y = roof_poly.bounds

    best = np.empty((0, 4, 2))
    for w, h in panel_dims:
        xs = _grid_positions(min_x + padding_cm, max_x - padding_cm - w, w + spacing_cm)
        ys = _grid_positions(min_y + padding_cm, max_y - padding_cm - h, h + spacing_cm)
        if xs.size == 0 or ys.size == 0:
            continue
        # One x-offset at a time keeps memory bounded on large roofs
        for row_x in xs:
            # (y-offset, row, col) grid of lower-left corners for this x-offset
            x, y = np.broadcast_arrays(row_x[None, None, :], ys[:, :, None])
            offset_idx, row, col = np.nonzero(~np.isnan(x) & ~np.isnan(y))
            x0, y0 = x[offset_idx, row, col], y[offset_idx, row, col]
            boxes = shapely.box(x0, y0, x0 + w, y0 + h)

            fits = shapely.contains(roof_poly, boxes)
            if tree is not None:
                fits[tree.query(boxes, predicate="intersects")[0]] = False

            counts = np.bincount(offset_idx[fits], minlength=len(ys))
            if counts.max() > len(best):
                keep = fits & (offset_idx == counts.argmax())
                x0, y0 = x0[keep], y0[keep]
                best = np.stack(
                    [
                        np.c_[x0, y0],
                        np.c_[x0 + w, y0],
                        np.c_[x0 + w, y0 + h],
                        np.c_[x0, y0 + h],
                    ],
                    axis=1,
                )

    to_roof = _rotation(angle)
    return list(best @ to_roof.T + center)


def _grid_positions(start: float, end: float, step: float) -> np.ndarray:
    """(offset, index) positions start + offset + i * step; NaN past end."""
    if end < start:
        return np.empty((0, 0))
    offsets = np.arange(0, step, OFFSET_STEP_CM)
    count = int((end - start) // step) + 1
    positions = start + offsets[:, None] + step * np.arange(count)[None, :]
    positions[positions > end + 1e-3] = np.nan
    return positions


def _longest_edge_angle(points: np.ndarray) -> float:
    """Angle (radians) of the polygon's longest edge from the x-axis."""
    edges = np.roll(points, -1, axis=0) - points
    dx, dy = edges[np.argmax(np.linalg.norm(edges, axis=1))]
    return float(np.arctan2(dy, dx))


def _rotation(angle: float) -> np.ndarray:
    cos_a, sin_a = np.cos(angle), np.sin(angle)
    return np.array([[cos_a, -sin_a], [sin_a, cos_a]])
