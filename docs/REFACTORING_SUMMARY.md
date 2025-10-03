# Refactoring Summary: GPS-Based Panel Generation

## Overview

Successfully refactored the solar panel generation system from a pixel-based coordinate system to a GPS-based system working in centimeters. This eliminates the 44% distance error caused by treating latitude/longitude as Cartesian coordinates.

## Key Changes

### 1. New GPS Utilities Module
**File:** [app/utils/gps_utils.py](app/utils/gps_utils.py)

Created `GPSCoordinateSystem` class that:
- Converts GPS coordinates to/from cm with proper spherical geometry correction
- Uses reference point (map center) for local metric coordinates
- Accounts for latitude-dependent longitude distance (cosine correction)
- Provides both single and array conversion methods
- Includes Haversine distance calculation for validation

### 2. Refactored Panel Service
**File:** [app/services/panel_service.py](app/services/panel_service.py)

**Removed:**
- `resolution` parameter (cm per pixel)
- `map_dimensions` parameter
- Pixel-based coordinate conversions (`_gps_to_pixels`, `_pixels_to_gps`)
- Pixel-based mask generation
- Complex genetic algorithm with OpenCV masks

**Added:**
- Direct GPS → cm → GPS pipeline
- `spacing_cm` parameter (replaces pixel spacing)
- `_generate_panel_grid_cm()` - generates panels in cm coordinates
- `_generate_simple_grid_cm()` - simple rectangular grid
- `_generate_optimized_grid_cm()` - rotated grid with Shapely
- Shapely-based polygon containment checks (cleaner than masks)

**Architecture:**
```
GPS Input → Convert to cm → Generate Panel Grid (cm) → Convert to GPS Output
```

### 3. Updated Data Models

**[app/dataclasses/config.py](app/dataclasses/config.py:74)**
- Removed `resolution` from `RoofData` dataclass

**[app/api/models.py](app/api/models.py:80)**
- Removed `mapDimensions` from `GeneratePanelsRequest`
- Removed `resolution` from `GeneratePanelsRequest`
- Removed `resolution` from `UpdatePanelCountRequest`

### 4. Updated API Routes
**File:** [app/api/routes/panels.py](app/api/routes/panels.py)

- Updated `generate_panels` endpoint to not require resolution/mapDimensions
- Updated `generate_panels_selective` endpoint similarly
- Updated `update_panel_count` endpoint to not fetch/use resolution

### 5. Updated Helper Functions
**File:** [app/utils/panel_helpers.py](app/utils/panel_helpers.py)

- `create_panel_generator()` - removed resolution parameter, added spacing_cm
- `execute_panel_generation()` - removed map_dimensions handling
- `cache_generation_results()` - removed resolution caching
- Removed `get_map_dimensions()` - no longer needed

### 6. Frontend Updates

**[frontend/app/api/generate_panels/route.ts](frontend/app/api/generate_panels/route.ts)**
- Removed `mapDimensions` and `resolution` from backend request

**[frontend/components/RoofAnglePanel.tsx](frontend/components/RoofAnglePanel.tsx)**
- Removed resolution calculation (no more cm per pixel)
- Removed mapDimensions calculation
- Simplified request body to only include GPS bounds

### 7. Tests
**File:** [tests/test_gps_accuracy.py](tests/test_gps_accuracy.py)

Comprehensive test suite covering:
- GPS roundtrip conversion accuracy (< 1e-8° error)
- Distance accuracy vs Haversine (< 0.1% error)
- Array conversions
- Coordinate system consistency
- Known distance validation
- Longitude cosine correction

## Benefits

### ✅ **Accuracy**
- **Before:** 44% distance error
- **After:** < 0.1% error
- Proper spherical geometry with latitude correction

### ✅ **Simplicity**
- Removed ~200 lines of pixel conversion code
- No more resolution calculation complexity
- Direct GPS → cm → GPS pipeline
- Cleaner polygon operations with Shapely

### ✅ **Maintainability**
- Real-world units (cm) throughout
- No pixel/resolution dependencies
- Easier to understand and test
- Consistent coordinate system

### ✅ **Precision**
- Using cm instead of m for better precision
- Matches panel definitions in config (already in cm)
- Integer-friendly for most calculations

### ✅ **Scalability**
- Resolution-independent (works with any map zoom)
- No map dimension requirements
- Simpler frontend integration

## Architecture Comparison

### Before (Pixel-Based):
```
GPS → Pixels (with distortion) → Panel Grid → Pixels → GPS (with error)
         ↓
    Needs resolution & mapDimensions
    Different scales for lat/lng (44% error)
    Complex mask generation
```

### After (GPS-Based):
```
GPS → cm (corrected) → Panel Grid → GPS (accurate)
         ↓
    Single coordinate system
    Proper spherical geometry
    Direct Shapely operations
```

## Implementation Notes

### Panel Generation Logic

1. **Coordinate Conversion:**
   - Uses cosine correction: `cm_per_deg_lng = cm_per_deg_lat × cos(latitude)`
   - Reference point: map center for minimal distortion
   - All calculations relative to reference

2. **Grid Generation:**
   - Simple mode: Rectangular grid aligned to bounding box
   - Optimized mode: Rotated grid aligned to longest roof edge
   - Uses Shapely for accurate polygon containment
   - No pixel thresholds needed

3. **Pitch Adjustment:**
   - Still applies cosine correction for roof pitch
   - `panel_height_viewed = panel_height × cos(pitch_angle)`
   - Maintains proper panel area accounting

### Breaking Changes

**API Changes:**
- Removed `mapDimensions` field from requests
- Removed `resolution` field from requests
- These are no longer needed or used

**Cache Changes:**
- No longer caches `resolution`
- No longer caches `IMAGE_SHAPE`

### Migration Notes

**Frontend:**
- No need to calculate pixel dimensions
- No need to calculate cm per pixel resolution
- Only send GPS bounds

**Backend:**
- Sessions created with old code may have cached resolution
- This is harmless - it's simply ignored now
- New sessions won't cache resolution

## Testing

### GPS Accuracy Validation

The GPS coordinate system has been validated with your actual roof data:

**Test 1: Longest Edge Distance**
- Your roof's longest edge (points 3→4): **10.67 m**
- Haversine (ground truth): **1067.02 cm**
- GPS→cm conversion: **1066.43 cm**
- **Error: 0.60 cm (0.056%)**
- ✅ **PASSED** (< 0.1% error)

**Test 2: Full Roof Polygon**
- Roof dimensions: **15.05 m × 12.10 m**
- All 10 points roundtrip tested
- **Max error: < 1e-10°**
- ✅ **PASSED** (perfect accuracy)

Run GPS accuracy tests:
```bash
pytest tests/test_gps_accuracy.py -v
```

Test coverage:
- ✅ GPS roundtrip conversion (< 1e-8° error)
- ✅ Distance accuracy vs Haversine (< 0.1% error)
- ✅ Array conversions preserve all points
- ✅ Coordinate system consistency
- ✅ Known distance validation (111 km/degree)
- ✅ Longitude cosine correction at 46° latitude
- ✅ Actual roof polygon from test data

## Future Enhancements

Potential improvements:
1. Add more sophisticated rotation optimization (currently uses longest edge)
2. Implement panel orientation preferences (portrait/landscape)
3. Add support for irregular roof shapes with better packing
4. Consider more accurate Earth models (currently uses simple sphere)

## Conclusion

This refactoring eliminates the fundamental coordinate system error while simplifying the codebase. The system now works directly in real-world units with proper spherical geometry, resulting in accurate panel placement with cleaner, more maintainable code.
