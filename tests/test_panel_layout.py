import numpy as np
import pytest
from shapely.affinity import rotate
from shapely.geometry import Polygon, box

from finestcloud.services.panel_layout import place_panels

# 10 x 5 m roof, 100 x 170 cm panels, 2 cm spacing, 20 cm padding
RECT = np.array([(0, 0), (1000, 0), (1000, 500), (0, 500)], dtype=float)
VERTICAL, HORIZONTAL = (100, 170), (170, 100)
L_SHAPE = Polygon([(0, 0), (1500, 0), (1500, 450), (600, 450), (600, 1000), (0, 1000)])


def _place(roof, dims, obstacles=()):
    return place_panels(roof, list(obstacles), dims, spacing_cm=2, padding_cm=20)


@pytest.mark.parametrize(
    ("dims", "expected"),
    [
        # columns floor((960 - 100) / 102) + 1 = 9, rows floor((460 - 170) / 172) + 1 = 2
        ([VERTICAL], 18),
        # columns floor((960 - 170) / 172) + 1 = 5, rows floor((460 - 100) / 102) + 1 = 4
        ([HORIZONTAL], 20),
        ([VERTICAL, HORIZONTAL], 20),
    ],
)
def test_rectangle_counts(dims, expected):
    assert len(_place(RECT, dims)) == expected


def test_best_picks_orientation_that_fits_more():
    panel = Polygon(_place(RECT, [VERTICAL, HORIZONTAL])[0])
    minx, miny, maxx, maxy = panel.bounds
    assert (maxx - minx, maxy - miny) == pytest.approx(HORIZONTAL)


def test_too_small_roof_gets_no_panels():
    assert _place(RECT / 10, [VERTICAL, HORIZONTAL]) == []


def test_rotated_l_shape_layout_is_valid_and_deterministic():
    roof_poly = rotate(L_SHAPE, 27, origin=(0, 0))
    roof = np.array(roof_poly.exterior.coords[:-1])
    obstacle = rotate(box(300, 200, 380, 280), 27, origin=(0, 0))
    obstacles = [np.array(obstacle.exterior.coords)]

    panels = _place(roof, [VERTICAL, HORIZONTAL], obstacles)
    polys = [Polygon(p) for p in panels]

    assert len(polys) > 20
    assert all(roof_poly.buffer(1e-6).contains(p) for p in polys)
    assert not any(p.intersects(obstacle) for p in polys)
    # No overlaps, and at least the requested spacing between panels
    for i, a in enumerate(polys):
        assert all(a.distance(b) >= 2 - 1e-6 for b in polys[i + 1 :])
    assert np.array_equal(panels, _place(roof, [VERTICAL, HORIZONTAL], obstacles))
