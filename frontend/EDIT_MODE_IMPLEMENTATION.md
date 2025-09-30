# Edit Mode Implementation

## Overview
This document describes the edit mode implementation for the solar panel frontend application, ported from the plain JavaScript version to React/TypeScript.

## Files Created

### Hooks
- **`hooks/useEditMode.ts`** - Manages edit mode state, keyboard shortcuts, and polygon selection
- **`hooks/usePolygonManager.ts`** - Handles polygon interaction listeners, styling updates, and event management

### Utilities
- **`utils/styleConfig.ts`** - Centralized styling configuration for polygons (roof, object, panel types)

### Components
- **`components/EditModeIndicator.tsx`** - Visual indicator showing edit mode is active
- **`components/EditModeIndicator.module.css`** - Styling for the edit mode indicator

## Key Features

### Edit Mode Toggle
- Activated when the "Edit" tool is selected from the ToolStrip
- Disables map dragging when active
- Updates all polygons to be interactive

### Polygon Selection
- **Click** - Select a single polygon (deselects others)
- **Ctrl+Click** - Multi-select polygons
- **Click on map** - Deselect all polygons

### Keyboard Shortcuts
- **Delete/Backspace** - Remove selected polygons
- **Escape** - Clear selection
- **Ctrl** - Hold for multi-select mode

### Polygon Editing
- **Selected polygons** become draggable and editable
- **Right-click on vertex** - Remove vertex (minimum 3 vertices required)
- **Double-click on edge** - Add new vertex
- **Hover effects** - Visual feedback on panel hover

### Visual Feedback
- Selected polygons have different styling (darker color, thicker stroke)
- Edit mode indicator shows current state and selected count
- Keyboard shortcut hints displayed in indicator

## Integration with MapContainer

The edit mode is integrated into `MapContainer.tsx`:

```tsx
// Edit mode hook
const { editState, toggleEditMode, selectPolygon, clearSelection, deleteSelected } = useEditMode(map)

// Polygon manager hook
const { updateAllPolygons } = usePolygonManager({
  map,
  isEditMode: editState.isEditMode,
  selectedPolygons: editState.selectedPolygons,
  isCtrlPressed: editState.isCtrlPressed,
  onSelectPolygon: selectPolygon
})
```

## Styling Configuration

The `StyleConfig` class provides consistent styling across the application:

- **Roof polygons** - Green (#27ae60)
- **Object polygons** - Red (#e74c3c)
- **Panels** - Dark colors with white stroke
  - Standard: #1a1a1a
  - Premium: #0d0d0d
  - Compact: #262626

## Differences from Original Implementation

### Simplified Architecture
- Combined multiple manager classes into React hooks
- Removed complex dependency injection
- State managed via React state and hooks

### Removed Features (for initial version)
- Drawing mode (polygon creation)
- Rotation handler
- Clipboard operations (copy/paste)
- Rectangle selection
- Debug tools
- UI manager with buttons

These can be added incrementally if needed.

## Usage

1. Click the "Edit Mode" tool in the ToolStrip
2. Edit mode activates - map becomes non-draggable
3. Click on polygons to select them
4. Hold Ctrl and click to multi-select
5. Use Delete key to remove selected polygons
6. Right-click vertices to remove them
7. Double-click edges to add vertices
8. Click the edit tool again or select another tool to exit

## Future Enhancements

- Add polygon drawing mode
- Implement copy/paste functionality
- Add rotation controls for panels
- Support rectangle selection tool
- Implement undo/redo
- Add polygon snapping
- Export/import polygon data