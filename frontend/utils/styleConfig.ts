// Helper to get CSS variable value
const getCSSVar = (name: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  }
  return ''
}

export class StyleConfig {
  // Colors now read from CSS variables for consistency
  static get COLORS() {
    return {
      ROOF: {
        DEFAULT: getCSSVar('--roof-default'),
        SELECTED: getCSSVar('--roof-selected'),
        HOVER: getCSSVar('--roof-hover')
      },
      OBJECT: {
        DEFAULT: getCSSVar('--object-default'),
        SELECTED: getCSSVar('--object-selected'),
        HOVER: getCSSVar('--object-hover')
      },
      PANEL: {
        STROKE: getCSSVar('--panel-stroke'),
        STROKE_HIGHLIGHT: getCSSVar('--panel-stroke-highlight'),
        STANDARD: getCSSVar('--panel-standard'),
        PREMIUM: getCSSVar('--panel-premium'),
        COMPACT: getCSSVar('--panel-compact')
      }
    }
  }

  static ROOF_STYLES = {
    DEFAULT_STROKE_OPACITY: 0.9,
    SELECTED_STROKE_OPACITY: 0.9,
    DEFAULT_STROKE_WEIGHT: 2,
    SELECTED_STROKE_WEIGHT: 3,
    DEFAULT_FILL_OPACITY: 0.3,
    SELECTED_FILL_OPACITY: 0.4,
    DEFAULT_Z_INDEX: 1000,
    SELECTED_Z_INDEX: 1050
  }

  static OBJECT_STYLES = {
    DEFAULT_STROKE_OPACITY: 0.9,
    SELECTED_STROKE_OPACITY: 0.9,
    DEFAULT_STROKE_WEIGHT: 2,
    SELECTED_STROKE_WEIGHT: 3,
    DEFAULT_FILL_OPACITY: 0.3,
    SELECTED_FILL_OPACITY: 0.4,
    DEFAULT_Z_INDEX: 1100,
    SELECTED_Z_INDEX: 1150
  }

  static PANEL_STYLES = {
    DEFAULT_STROKE_OPACITY: 0.9,
    SELECTED_STROKE_OPACITY: 1.0,
    HOVER_STROKE_OPACITY: 0.95,
    DEFAULT_STROKE_WEIGHT: 1.5,
    SELECTED_STROKE_WEIGHT: 2.5,
    HOVER_STROKE_WEIGHT: 2.0,
    DEFAULT_FILL_OPACITY: 0.95,
    HOVER_FILL_OPACITY: 0.97,
    SELECTED_FILL_OPACITY: 0.98,
    DEFAULT_Z_INDEX: 1101,
    SELECTED_Z_INDEX: 1802
  }

  static getOptionsForType(isRoof: boolean, isSelected: boolean = false): google.maps.PolygonOptions {
    const baseColor = isRoof ? this.COLORS.ROOF : this.COLORS.OBJECT
    const styles = isRoof ? this.ROOF_STYLES : this.OBJECT_STYLES

    return {
      strokeColor: isSelected ? baseColor.SELECTED : baseColor.DEFAULT,
      strokeOpacity: isSelected ? styles.SELECTED_STROKE_OPACITY : styles.DEFAULT_STROKE_OPACITY,
      strokeWeight: isSelected ? styles.SELECTED_STROKE_WEIGHT : styles.DEFAULT_STROKE_WEIGHT,
      fillColor: isSelected ? baseColor.SELECTED : baseColor.DEFAULT,
      fillOpacity: isSelected ? styles.SELECTED_FILL_OPACITY : styles.DEFAULT_FILL_OPACITY,
      editable: isSelected,
      draggable: isSelected,
      clickable: true,
      zIndex: isSelected ? styles.SELECTED_Z_INDEX : styles.DEFAULT_Z_INDEX
    }
  }

  static getPanelOptions(state: 'default' | 'selected' | 'hover' = 'default', moduleType: 'STANDARD' | 'PREMIUM' | 'COMPACT' = 'STANDARD'): google.maps.PolygonOptions {
    let strokeOpacity = this.PANEL_STYLES.DEFAULT_STROKE_OPACITY
    let strokeWeight = this.PANEL_STYLES.DEFAULT_STROKE_WEIGHT
    let fillOpacity = this.PANEL_STYLES.DEFAULT_FILL_OPACITY
    let zIndex = this.PANEL_STYLES.DEFAULT_Z_INDEX
    let draggable = false

    if (state === 'selected') {
      strokeOpacity = this.PANEL_STYLES.SELECTED_STROKE_OPACITY
      strokeWeight = this.PANEL_STYLES.SELECTED_STROKE_WEIGHT
      fillOpacity = this.PANEL_STYLES.SELECTED_FILL_OPACITY
      zIndex = this.PANEL_STYLES.SELECTED_Z_INDEX
      draggable = true
    } else if (state === 'hover') {
      strokeOpacity = this.PANEL_STYLES.HOVER_STROKE_OPACITY
      strokeWeight = this.PANEL_STYLES.HOVER_STROKE_WEIGHT
      fillOpacity = this.PANEL_STYLES.HOVER_FILL_OPACITY
    }

    const fillColor = this.COLORS.PANEL[moduleType] ?? this.COLORS.PANEL.STANDARD

    return {
      strokeColor: this.COLORS.PANEL.STROKE,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
      editable: false,
      draggable,
      clickable: true,
      zIndex
    }
  }
}
