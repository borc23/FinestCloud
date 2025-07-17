/**
 * Manages the creation and lifecycle of polylines used in the polygon drawing process
 */
export class LineManager {
    #map = null;
    #drawingLines = [];
    #tempLine = null;
    
    // Performance optimization properties
    #lastTempLinePath = null;
    #lastHighlightState = null;
    
    // Object pooling for temporary lines (reuse objects to reduce GC pressure)
    #tempLinePool = [];
    #maxPoolSize = 5;
    
    /**
     * Sets the map instance that the lines will be drawn on
     * @param {google.maps.Map} map The map instance
     */
    setMap(map) {
        this.#map = map;
    }
      /**
     * Creates a temporary line that follows the mouse cursor
     * Uses object pooling for better memory management
     * @param {Object} drawingOptions Styling options for the line
     */
    createTempLine(drawingOptions) {
        if (!this.#map) return;
        
        // Try to reuse a line from the pool
        if (this.#tempLinePool.length > 0) {
            this.#tempLine = this.#tempLinePool.pop();
            this.#tempLine.setOptions({
                ...drawingOptions,
                map: this.#map,
                zIndex: 2000,
                path: [] // Reset path
            });
        } else {
            // Create new line if pool is empty
            this.#tempLine = new google.maps.Polyline({
                ...drawingOptions,
                map: this.#map,
                zIndex: 2000, // High z-index to ensure visibility
            });
        }
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
    }    /**
     * Updates the temporary line to follow the cursor
     * Always updates for smooth movement, performance optimization handled elsewhere
     * @param {google.maps.LatLng} lastPoint The last fixed point in the path
     * @param {google.maps.LatLng} cursorPoint The current cursor position
     */
    updateTempLine(lastPoint, cursorPoint) {
        if (!this.#tempLine) return;
        
        // Always update for smooth movement - throttling handled in caller
        const newPath = [lastPoint, cursorPoint];
        this.#tempLine.setPath(newPath);
        this.#lastTempLinePath = newPath;    }
      /**
     * Highlights the temporary line to indicate potential polygon completion
     * Performance optimized to avoid unnecessary style updates
     * @param {boolean} highlight Whether to highlight the line
     * @param {Object} drawingOptions The normal drawing options to revert to when not highlighted
     */
    highlightTempLine(highlight, drawingOptions) {
        if (!this.#tempLine) return;
        
        // Performance optimization: avoid unnecessary style updates
        if (this.#lastHighlightState === highlight) {
            return;
        }
        
        this.#tempLine.setOptions({
            strokeColor: highlight ? '#4CAF50' : drawingOptions.strokeColor,
            strokeWeight: highlight ? 3 : drawingOptions.strokeWeight
        });
        
        this.#lastHighlightState = highlight;
    }    /**
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
        
        // Return temp line to pool instead of destroying it
        if (this.#tempLine) {
            this.#tempLine.setMap(null);
            
            // Add to pool if not full
            if (this.#tempLinePool.length < this.#maxPoolSize) {
                this.#tempLinePool.push(this.#tempLine);
            }
            
            this.#tempLine = null;
        }
        
        // Reset performance optimization state
        this.#lastTempLinePath = null;
        this.#lastHighlightState = null;
    }
}
