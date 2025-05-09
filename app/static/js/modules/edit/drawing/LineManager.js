/**
 * Manages the creation and lifecycle of polylines used in the polygon drawing process
 */
export class LineManager {
    #map = null;
    #drawingLines = [];
    #tempLine = null;
    
    /**
     * Sets the map instance that the lines will be drawn on
     * @param {google.maps.Map} map The map instance
     */
    setMap(map) {
        this.#map = map;
    }
    
    /**
     * Creates a temporary line that follows the mouse cursor
     * @param {Object} drawingOptions Styling options for the line
     */
    createTempLine(drawingOptions) {
        if (!this.#map) return;
        
        this.#tempLine = new google.maps.Polyline({
            ...drawingOptions,
            map: this.#map,
            zIndex: 2000, // High z-index to ensure visibility
        });
    }
    
    /**
     * Creates a permanent line segment between two points
     * @param {google.maps.LatLng} point1 The first point
     * @param {google.maps.LatLng} point2 The second point
     * @param {Object} drawingOptions Styling options for the line
     */
    createLine(point1, point2, drawingOptions) {
        if (!this.#map) return;
        
        const newLine = new google.maps.Polyline({
            path: [point1, point2],
            ...drawingOptions,
            map: this.#map
        });
        
        this.#drawingLines.push(newLine);
    }
    
    /**
     * Updates the temporary line to follow the cursor
     * @param {google.maps.LatLng} lastPoint The last fixed point in the path
     * @param {google.maps.LatLng} cursorPoint The current cursor position
     */
    updateTempLine(lastPoint, cursorPoint) {
        if (!this.#tempLine) return;
        
        this.#tempLine.setPath([lastPoint, cursorPoint]);
    }
    
    /**
     * Highlights the temporary line to indicate potential polygon completion
     * @param {boolean} highlight Whether to highlight the line
     * @param {Object} drawingOptions The normal drawing options to revert to when not highlighted
     */
    highlightTempLine(highlight, drawingOptions) {
        if (!this.#tempLine) return;
        
        this.#tempLine.setOptions({
            strokeColor: highlight ? '#4CAF50' : drawingOptions.strokeColor,
            strokeWeight: highlight ? 3 : drawingOptions.strokeWeight
        });
    }
    
    /**
     * Cleans up all lines and resets internal state
     */
    cleanup() {
        // Clean up drawing lines
        if (this.#drawingLines.length) {
            this.#drawingLines.forEach(line => {
                if (line) line.setMap(null);
            });
            this.#drawingLines = [];
        }
        
        // Clean up temp line
        if (this.#tempLine) {
            this.#tempLine.setMap(null);
            this.#tempLine = null;
        }
    }
}
