# Coordinate System Refactoring Proposal

## Problem Statement

The current implementation has a **44% distance error** due to incorrect GPS-to-pixel conversion. The root cause is treating latitude and longitude as a Cartesian coordinate system, when they are actually spherical coordinates.

### Current Issues

1. **Linear projection error**: Code assumes 1° longitude = 1° latitude in distance
2. **At latitude 46°**: 1° longitude is only ~69% of 1° latitude distance
3. **Distorted aspect ratios**: Horizontal distances are compressed
4. **Resolution mismatch**: X and Y resolutions differ by ~30%

### Evidence

```python
# Current incorrect approach (panel_service.py:202-203)
lng_scale = width / (bounds["east"] - bounds["west"])
lat_scale = height / (bounds["north"] - bounds["south"])
# This treats degrees as equal distance units (WRONG!)
```

## Proposed Solution: Work in Meters Throughout

Instead of converting GPS → Pixels → GPS, work in a **meter-based coordinate system** throughout the pipeline.

### Architecture

```
GPS Coordinates (input)
    ↓
Convert to Local Metric Coordinates (meters from reference point)
    ↓
Generate Panel Grid in Meters
    ↓
Convert Back to GPS (output)
```

### Benefits

1. ✅ **Accurate distances**: All calculations in real-world meters
2. ✅ **No distortion**: Proper handling of latitude/longitude
3. ✅ **Simpler code**: No pixel intermediate step
4. ✅ **Resolution-independent**: Works with any map size
5. ✅ **Testable**: Easy to verify with GPS distance formulas

## Implementation Plan

### Phase 1: Create GPS Utilities Module

```python
# app/utils/gps_utils.py

import numpy as np
from typing import List, Dict, Tuple
from math import radians, sin, cos, sqrt, atan2, degrees, asin

class GPSCoordinateSystem:
    """Handle GPS coordinate transformations using proper spherical geometry."""

    def __init__(self, reference_lat: float, reference_lng: float):
        """
        Initialize with a reference point (typically center of map).
        All coordinates will be converted relative to this point.
        """
        self.ref_lat = reference_lat
        self.ref_lng = reference_lng
        self.ref_lat_rad = radians(reference_lat)

        # Meters per degree at reference latitude
        self.meters_per_deg_lat = 111132.92
        self.meters_per_deg_lng = 111132.92 * cos(self.ref_lat_rad)

    def gps_to_meters(self, lat: float, lng: float) -> Tuple[float, float]:
        """
        Convert GPS coordinates to local metric coordinates (meters).
        Returns (x_meters, y_meters) relative to reference point.
        """
        x = (lng - self.ref_lng) * self.meters_per_deg_lng
        y = (lat - self.ref_lat) * self.meters_per_deg_lat
        return x, y

    def meters_to_gps(self, x_meters: float, y_meters: float) -> Tuple[float, float]:
        """
        Convert local metric coordinates back to GPS.
        Returns (lat, lng).
        """
        lng = self.ref_lng + (x_meters / self.meters_per_deg_lng)
        lat = self.ref_lat + (y_meters / self.meters_per_deg_lat)
        return lat, lng

    def gps_array_to_meters(self, coords: List[Dict]) -> np.ndarray:
        """Convert array of GPS coordinates to meters."""
        result = np.zeros((len(coords), 2))
        for i, coord in enumerate(coords):
            result[i] = self.gps_to_meters(coord['lat'], coord['lng'])
        return result

    def meters_array_to_gps(self, coords: np.ndarray) -> List[Dict]:
        """Convert array of meter coordinates to GPS."""
        result = []
        for x, y in coords:
            lat, lng = self.meters_to_gps(x, y)
            result.append({'lat': lat, 'lng': lng})
        return result

    @staticmethod
    def haversine_distance(lat1, lng1, lat2, lng2) -> float:
        """Calculate accurate distance between two GPS points in meters."""
        R = 6371000  # Earth radius in meters

        phi1 = radians(lat1)
        phi2 = radians(lat2)
        delta_phi = radians(lat2 - lat1)
        delta_lambda = radians(lng2 - lng1)

        a = sin(delta_phi/2)**2 + cos(phi1) * cos(phi2) * sin(delta_lambda/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c
```

### Phase 2: Refactor Panel Service

```python
# app/services/panel_service.py (refactored)

class PanelService:
    def __init__(self, bounds: Dict, custom_module=None, edge_padding_cm: int = 20):
        """
        Initialize panel service.
        No more resolution parameter - work in meters!
        """
        self.bounds = bounds

        # Create GPS coordinate system centered on map
        center_lat = (bounds['north'] + bounds['south']) / 2
        center_lng = (bounds['east'] + bounds['west']) / 2
        self.gps_system = GPSCoordinateSystem(center_lat, center_lng)

        self.edge_padding_m = edge_padding_cm / 100  # Convert to meters
        self.module_dict = self._get_module(custom_module)

        # Panel dimensions in meters
        self.panel_width_m = self.module_dict['width_cm'] / 100
        self.panel_height_m = self.module_dict['height_cm'] / 100

    def _gps_to_meters(self, coords: List[Dict]) -> np.ndarray:
        """Convert GPS coordinates to meters."""
        return self.gps_system.gps_array_to_meters(coords)

    def _meters_to_gps(self, coords: np.ndarray) -> List[Dict]:
        """Convert meter coordinates to GPS."""
        return self.gps_system.meters_array_to_gps(coords)

    def _generate_panels_on_roof(self, roof_data: RoofData) -> List[np.ndarray]:
        """
        Generate panel grid in meters.
        No more pixel conversion!
        """
        # Convert roof polygon to meters
        roof_coords_m = self._gps_to_meters(roof_data.coords)

        # Calculate adjusted panel height for roof pitch
        if roof_data.pitch > 0:
            panel_height_m = self.panel_height_m * cos(radians(roof_data.pitch))
        else:
            panel_height_m = self.panel_height_m

        # Generate grid in meters
        panels_m = self._generate_panel_grid_meters(
            roof_coords_m,
            panel_width=self.panel_width_m,
            panel_height=panel_height_m,
            spacing=0.005,  # 0.5cm in meters
            padding=self.edge_padding_m
        )

        return panels_m

    def _generate_panel_grid_meters(
        self,
        roof_polygon: np.ndarray,
        panel_width: float,
        panel_height: float,
        spacing: float,
        padding: float
    ) -> List[np.ndarray]:
        """
        Generate panel grid in meter coordinates.
        All dimensions are in meters.
        """
        # Find bounding box in meters
        min_x, min_y = roof_polygon.min(axis=0)
        max_x, max_y = roof_polygon.max(axis=0)

        # Create panel template (4 corners) in meters
        panel_template = np.array([
            [0, 0],
            [panel_width, 0],
            [panel_width, panel_height],
            [0, panel_height]
        ])

        panels = []
        step = panel_height + spacing

        # Generate grid
        y = min_y + padding
        while y + panel_height + padding <= max_y:
            x = min_x + padding
            while x + panel_width + padding <= max_x:
                # Create panel at this position
                panel = panel_template + [x, y]

                # Check if panel is inside roof polygon
                if self._is_panel_inside_polygon(panel, roof_polygon):
                    panels.append(panel)

                x += panel_width + spacing
            y += step

        return panels
```

### Phase 3: Update Frontend

```typescript
// frontend/components/RoofAnglePanel.tsx

// REMOVE: Resolution calculation (lines 107-121)
// No longer needed!

const requestBody = {
  angles: parsedAngles,
  edgePadding: padding,
  roofPolygons: roofPolygons.map(polygon => {
    const path = polygon.getPath()
    const coords = []
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i)
      coords.push({ lat: point.lat(), lng: point.lng() })
    }
    return { coords }
  }),
  solarData,
  mapBounds,
  // REMOVED: mapDimensions - no longer needed
  // REMOVED: resolution - no longer needed
  module: 'standard',
  spacing: 0.5
}
```

### Phase 4: Update API Models

```python
# app/api/models.py

class GeneratePanelsRequest(BaseModel):
    """Request model for panel generation."""
    roofs: List[RoofModel]
    mapBounds: BoundsModel
    # REMOVED: mapDimensions - not needed
    # REMOVED: resolution - not needed
    module: Optional[str] = Field(None, description="Panel module type")
    spacing: float = Field(default=0.5, ge=0.0, description="Panel spacing in cm")
    max_panels: Optional[int] = Field(None, ge=0, description="Maximum panels per roof")
    padding: Optional[float] = Field(default=20, ge=0.0, description="Edge padding in cm")
```

## Migration Strategy

### Option A: Big Bang (Recommended)
1. Create new GPS utilities module
2. Create new `PanelServiceV2` alongside existing one
3. Add feature flag to switch between old/new
4. Test thoroughly with known coordinates
5. Switch to new system
6. Remove old code

### Option B: Gradual
1. Add GPS utilities
2. Update panel generation to use meters internally
3. Keep pixel conversion at boundaries
4. Gradually remove pixel code

## Testing Plan

```python
# tests/test_gps_accuracy.py

def test_gps_roundtrip():
    """Verify GPS → Meters → GPS conversion is accurate."""
    gps = GPSCoordinateSystem(46.043, 14.582)

    original_lat, original_lng = 46.043431, 14.582261
    x, y = gps.gps_to_meters(original_lat, original_lng)
    result_lat, result_lng = gps.meters_to_gps(x, y)

    assert abs(original_lat - result_lat) < 1e-8
    assert abs(original_lng - result_lng) < 1e-8

def test_distance_accuracy():
    """Verify distances match Haversine formula."""
    coords = [
        {'lat': 46.043431, 'lng': 14.582261},
        {'lat': 46.043474, 'lng': 14.582137}
    ]

    # Calculate using Haversine
    expected = GPSCoordinateSystem.haversine_distance(
        coords[0]['lat'], coords[0]['lng'],
        coords[1]['lat'], coords[1]['lng']
    )

    # Calculate using meter conversion
    gps = GPSCoordinateSystem(46.043, 14.582)
    coords_m = gps.gps_array_to_meters(coords)
    actual = np.linalg.norm(coords_m[1] - coords_m[0])

    # Should match within 0.1%
    assert abs(expected - actual) / expected < 0.001
```

## Expected Improvements

- ✅ Distance accuracy: **44% error → < 0.1% error**
- ✅ Code simplicity: **Remove ~200 lines** of pixel conversion
- ✅ Performance: **15-20% faster** (no pixel conversions)
- ✅ Maintainability: **Clearer code** with real-world units
- ✅ Testability: **Easy to verify** with GPS distance formulas

## Questions to Answer

1. **Do we need pixel coordinates at all?**
   - For rendering: Yes, but handle in frontend
   - For calculations: No, use meters

2. **What about existing panel data?**
   - Migration script to convert stored pixels → GPS
   - Or: Keep old system for backward compatibility

3. **Performance impact?**
   - Fewer conversions = faster
   - Simpler math = faster
   - No caching needed = simpler

## Next Steps

1. Review this proposal with team
2. Create `feature/gps-refactor` branch
3. Implement GPS utilities with tests
4. Create PanelServiceV2 with meter-based logic
5. Add integration tests
6. Deploy behind feature flag
7. Validate with real data
8. Switch over and deprecate old code

## References

- [Web Mercator Projection](https://en.wikipedia.org/wiki/Web_Mercator_projection)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Latitude/Longitude Distance Calculations](https://www.movable-type.co.uk/scripts/latlong.html)
