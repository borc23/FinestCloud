export class StyleConfig {
    // Base style properties for roofs
    static ROOF_STYLES = {
        DEFAULT_COLOR: '#27ae60',
        SELECTED_COLOR: '#219a52',
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
    };

    // Base style properties for objects
    static OBJECT_STYLES = {
        DEFAULT_COLOR: '#e74c3c',
        SELECTED_COLOR: '#c0392b',
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
        STROKE_COLOR: '#ffffff',
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
        SELECTED_Z_INDEX: 1802,
        MODULE_COLORS: {
            'STANDARD': '#1a1a1a',
            'PREMIUM': '#0d0d0d',
            'COMPACT': '#262626'
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
}
