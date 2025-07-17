export class StyleConfig {
    // Color constants - centralized color definitions
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
    };

    // Base style properties for roofs
    static ROOF_STYLES = {
        DEFAULT_COLOR: StyleConfig.COLORS.ROOF.DEFAULT,
        SELECTED_COLOR: StyleConfig.COLORS.ROOF.SELECTED,
        DEFAULT_STROKE_OPACITY: 0.9,
        SELECTED_STROKE_OPACITY: 0.9,
        DEFAULT_STROKE_WEIGHT: 2,
        SELECTED_STROKE_WEIGHT: 3,
        DRAWING_STROKE_WEIGHT: 3,
        DEFAULT_FILL_OPACITY: 0.3,
        SELECTED_FILL_OPACITY: 0.4,
        DRAWING_FILL_OPACITY: 0.4,
        DEFAULT_Z_INDEX: 1000,
        SELECTED_Z_INDEX: 1050
    };    // Base style properties for objects
    static OBJECT_STYLES = {
        DEFAULT_COLOR: StyleConfig.COLORS.OBJECT.DEFAULT,
        SELECTED_COLOR: StyleConfig.COLORS.OBJECT.SELECTED,
        DEFAULT_STROKE_OPACITY: 0.9,
        SELECTED_STROKE_OPACITY: 0.9,
        DEFAULT_STROKE_WEIGHT: 2,
        SELECTED_STROKE_WEIGHT: 3,
        DRAWING_STROKE_WEIGHT: 3,
        DEFAULT_FILL_OPACITY: 0.3,
        SELECTED_FILL_OPACITY: 0.4,
        DRAWING_FILL_OPACITY: 0.4,
        DEFAULT_Z_INDEX: 1100,
        SELECTED_Z_INDEX: 1150
    };
      // Base style properties for panels
    static PANEL_STYLES = {
        STROKE_COLOR: StyleConfig.COLORS.PANEL.STROKE,
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
        SELECTED_Z_INDEX: 1802,        MODULE_COLORS: {
            'STANDARD': StyleConfig.COLORS.PANEL.STANDARD,
            'PREMIUM': StyleConfig.COLORS.PANEL.PREMIUM,
            'COMPACT': StyleConfig.COLORS.PANEL.COMPACT
        }
    };

    static ROOF_DEFAULT_OPTIONS = {
        strokeColor: this.ROOF_STYLES.DEFAULT_COLOR,
        strokeOpacity: this.ROOF_STYLES.DEFAULT_STROKE_OPACITY,
        strokeWeight: this.ROOF_STYLES.DEFAULT_STROKE_WEIGHT,
        fillColor: this.ROOF_STYLES.DEFAULT_COLOR,
        fillOpacity: this.ROOF_STYLES.DEFAULT_FILL_OPACITY,
        editable: false,
        draggable: false,
        clickable: false,
        zIndex: this.ROOF_STYLES.DEFAULT_Z_INDEX
    };
    
    static ROOF_SELECTED_OPTIONS = {
        strokeColor: this.ROOF_STYLES.SELECTED_COLOR,
        strokeWeight: this.ROOF_STYLES.SELECTED_STROKE_WEIGHT,
        fillColor: this.ROOF_STYLES.SELECTED_COLOR,
        fillOpacity: this.ROOF_STYLES.SELECTED_FILL_OPACITY,
        editable: true,
        draggable: true,
        zIndex: this.ROOF_STYLES.SELECTED_Z_INDEX
    };
    
    static ROOF_DRAWING_OPTIONS = {
        strokeColor: this.ROOF_STYLES.DEFAULT_COLOR,
        strokeOpacity: 1.0,
        strokeWeight: this.ROOF_STYLES.DRAWING_STROKE_WEIGHT,
        fillColor: this.ROOF_STYLES.DEFAULT_COLOR,
        fillOpacity: this.ROOF_STYLES.DRAWING_FILL_OPACITY,
        clickable: false,
        zIndex: this.ROOF_STYLES.SELECTED_Z_INDEX
    };

    static OBJECT_DEFAULT_OPTIONS = {
        strokeColor: this.OBJECT_STYLES.DEFAULT_COLOR,
        strokeOpacity: this.OBJECT_STYLES.DEFAULT_STROKE_OPACITY,
        strokeWeight: this.OBJECT_STYLES.DEFAULT_STROKE_WEIGHT,
        fillColor: this.OBJECT_STYLES.DEFAULT_COLOR,
        fillOpacity: this.OBJECT_STYLES.DEFAULT_FILL_OPACITY,
        editable: false,
        draggable: false,
        clickable: true,
        zIndex: this.OBJECT_STYLES.DEFAULT_Z_INDEX
    };
    
    static OBJECT_SELECTED_OPTIONS = {
        strokeColor: this.OBJECT_STYLES.SELECTED_COLOR,
        strokeWeight: this.OBJECT_STYLES.SELECTED_STROKE_WEIGHT,
        fillColor: this.OBJECT_STYLES.SELECTED_COLOR,
        fillOpacity: this.OBJECT_STYLES.SELECTED_FILL_OPACITY,
        editable: true,
        draggable: true,
        zIndex: this.OBJECT_STYLES.SELECTED_Z_INDEX
    };
    
    static OBJECT_DRAWING_OPTIONS = {
        strokeColor: this.OBJECT_STYLES.DEFAULT_COLOR,
        strokeOpacity: 1.0,
        strokeWeight: this.OBJECT_STYLES.DRAWING_STROKE_WEIGHT,
        fillColor: this.OBJECT_STYLES.DEFAULT_COLOR,
        fillOpacity: this.OBJECT_STYLES.DRAWING_FILL_OPACITY,
        clickable: false,
        zIndex: this.OBJECT_STYLES.SELECTED_Z_INDEX
    };
    
    // Panel style options
    static PANEL_DEFAULT_OPTIONS = {
        strokeColor: this.PANEL_STYLES.STROKE_COLOR,
        strokeOpacity: this.PANEL_STYLES.DEFAULT_STROKE_OPACITY,
        strokeWeight: this.PANEL_STYLES.DEFAULT_STROKE_WEIGHT,
        fillOpacity: this.PANEL_STYLES.DEFAULT_FILL_OPACITY,
        editable: false,
        draggable: false,
        clickable: true,
        zIndex: this.PANEL_STYLES.DEFAULT_Z_INDEX
    };
    
    static PANEL_SELECTED_OPTIONS = {
        strokeColor: this.PANEL_STYLES.STROKE_COLOR,
        strokeOpacity: this.PANEL_STYLES.SELECTED_STROKE_OPACITY,
        strokeWeight: this.PANEL_STYLES.SELECTED_STROKE_WEIGHT,
        fillOpacity: this.PANEL_STYLES.SELECTED_FILL_OPACITY,
        editable: false,
        draggable: true,
        clickable: true,
        zIndex: this.PANEL_STYLES.SELECTED_Z_INDEX
    };
    
    static PANEL_HOVER_OPTIONS = {
        strokeColor: this.PANEL_STYLES.STROKE_COLOR,
        strokeOpacity: this.PANEL_STYLES.HOVER_STROKE_OPACITY,
        strokeWeight: this.PANEL_STYLES.HOVER_STROKE_WEIGHT,
        fillOpacity: this.PANEL_STYLES.HOVER_FILL_OPACITY,
        zIndex: this.PANEL_STYLES.DEFAULT_Z_INDEX
    };

    static getOptionsForType(isRoof, isSelected = false, isDrawing = false) {
        if (isDrawing) {
            return isRoof ? this.ROOF_DRAWING_OPTIONS : this.OBJECT_DRAWING_OPTIONS;
        }
        if (isSelected) {
            return isRoof ? this.ROOF_SELECTED_OPTIONS : this.OBJECT_SELECTED_OPTIONS;
        }
        return isRoof ? this.ROOF_DEFAULT_OPTIONS : this.OBJECT_DEFAULT_OPTIONS;
    }
    
    static getPanelOptions(state = 'default', moduleType = 'STANDARD') {
        let options;
        
        switch(state) {
            case 'selected':
                options = {...this.PANEL_SELECTED_OPTIONS};
                break;
            case 'hover':
                options = {...this.PANEL_HOVER_OPTIONS};
                break;
            default:
                options = {...this.PANEL_DEFAULT_OPTIONS};
        }
        
        // Add the appropriate fill color based on module type
        options.fillColor = this.PANEL_STYLES.MODULE_COLORS[moduleType] || this.PANEL_STYLES.MODULE_COLORS.STANDARD;
        
        return options;
    }
      static getModuleColor(moduleType) {
        return this.PANEL_STYLES.MODULE_COLORS[moduleType] || this.PANEL_STYLES.MODULE_COLORS.STANDARD;
    }

    // Helper methods for easy color access
    static getRoofColor(state = 'default') {
        switch(state.toLowerCase()) {
            case 'selected': return this.COLORS.ROOF.SELECTED;
            case 'hover': return this.COLORS.ROOF.HOVER;
            default: return this.COLORS.ROOF.DEFAULT;
        }
    }

    static getObjectColor(state = 'default') {
        switch(state.toLowerCase()) {
            case 'selected': return this.COLORS.OBJECT.SELECTED;
            case 'hover': return this.COLORS.OBJECT.HOVER;
            default: return this.COLORS.OBJECT.DEFAULT;
        }
    }    static getPolygonColor(isRoof, state = 'default') {
        return isRoof ? this.getRoofColor(state) : this.getObjectColor(state);
    }

    // Helper method to convert hex to rgba
    static hexToRgba(hex, alpha = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Get all colors for easy export/configuration
    static getAllColors() {
        return {
            roof: {
                default: this.COLORS.ROOF.DEFAULT,
                selected: this.COLORS.ROOF.SELECTED,
                hover: this.COLORS.ROOF.HOVER
            },
            object: {
                default: this.COLORS.OBJECT.DEFAULT,
                selected: this.COLORS.OBJECT.SELECTED,
                hover: this.COLORS.OBJECT.HOVER
            },
            panel: {
                stroke: this.COLORS.PANEL.STROKE,
                standard: this.COLORS.PANEL.STANDARD,
                premium: this.COLORS.PANEL.PREMIUM,
                compact: this.COLORS.PANEL.COMPACT
            }
        };
    }

    // Set colors programmatically (for dynamic theming)
    static setColors(newColors) {
        if (newColors.roof) {
            if (newColors.roof.default) this.COLORS.ROOF.DEFAULT = newColors.roof.default;
            if (newColors.roof.selected) this.COLORS.ROOF.SELECTED = newColors.roof.selected;
            if (newColors.roof.hover) this.COLORS.ROOF.HOVER = newColors.roof.hover;
        }
        if (newColors.object) {
            if (newColors.object.default) this.COLORS.OBJECT.DEFAULT = newColors.object.default;
            if (newColors.object.selected) this.COLORS.OBJECT.SELECTED = newColors.object.selected;
            if (newColors.object.hover) this.COLORS.OBJECT.HOVER = newColors.object.hover;
        }
        if (newColors.panel) {
            if (newColors.panel.stroke) this.COLORS.PANEL.STROKE = newColors.panel.stroke;
            if (newColors.panel.standard) this.COLORS.PANEL.STANDARD = newColors.panel.standard;
            if (newColors.panel.premium) this.COLORS.PANEL.PREMIUM = newColors.panel.premium;
            if (newColors.panel.compact) this.COLORS.PANEL.COMPACT = newColors.panel.compact;
        }
    }
}
