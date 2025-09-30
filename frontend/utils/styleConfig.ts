export class StyleConfig {
  static COLORS = {
    ROOF: {
      DEFAULT: '#27ae60',
      SELECTED: '#219a52',
      HOVER: '#2ecc71'
    },
    OBJECT: {
      DEFAULT: '#e74c3c',
      SELECTED: '#c0392b',
      HOVER: '#f56565'
    },
    PANEL: {
      STROKE: '#ffffff',
      STANDARD: '#1a1a1a',
      PREMIUM: '#0d0d0d',
      COMPACT: '#262626'
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
    DEFAULT_STROKE_OPACITY: 0.5,
    SELECTED_STROKE_OPACITY: 0.8,
    HOVER_STROKE_OPACITY: 0.6,
    DEFAULT_STROKE_WEIGHT: 0.5,
    SELECTED_STROKE_WEIGHT: 1.5,
    HOVER_STROKE_WEIGHT: 1.2,
    DEFAULT_FILL_OPACITY: 0.85,
    HOVER_FILL_OPACITY: 0.90,
    SELECTED_FILL_OPACITY: 0.95,
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

  static getPanelOptions(state: 'default' | 'selected' | 'hover' = 'default', moduleType: string = 'STANDARD'): google.maps.PolygonOptions {
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

    const fillColor = (this.COLORS.PANEL as any)[moduleType] || this.COLORS.PANEL.STANDARD

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