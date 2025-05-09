/**
 * Manages the creation and lifecycle of markers used in the polygon drawing process
 */
export class MarkerManager {
    #map = null;
    #eventTracker = null;
    #vertexMarkers = [];
    #startPointMarker = null;
    #completePolygonCallback = null;
    
    constructor(eventTracker) {
        this.#eventTracker = eventTracker;
    }
    
    setMap(map) {
        this.#map = map;
    }
    
    /**
     * Creates a marker for a vertex in the drawing path
     * @param {google.maps.LatLng} position The position for the marker
     * @param {boolean} isStartingPoint Whether this is the first point of the polygon
     * @param {Object} drawingOptions Styling options for the marker
     * @returns {google.maps.Marker} The created marker
     */
    createVertexMarker(position, isStartingPoint = false, drawingOptions) {
        if (!this.#map) return null;
        
        const marker = new google.maps.Marker({
            position,
            map: this.#map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: isStartingPoint ? 4 : 3,
                fillOpacity: 1,
                fillColor: isStartingPoint ? '#4CAF50' : drawingOptions.strokeColor,
                strokeWeight: 2,
                strokeColor: '#FFFFFF'
            },
            draggable: false,
            zIndex: 2001, // Very high z-index to appear above everything
            cursor: isStartingPoint ? 'pointer' : 'default',
            optimized: true,
            clickable: isStartingPoint
        });
        
        // Track starting point marker
        if (isStartingPoint) {
            this.#startPointMarker = marker;
            
            // Add completion listener
            this.#eventTracker.addListener(marker, 'click', () => {
                if (this.#completePolygonCallback) {
                    this.#completePolygonCallback();
                }
            });
            
            // Add hover effect for starting point
            this.#eventTracker.addListener(marker, 'mouseover', () => {
                marker.setIcon({
                    ...marker.getIcon(),
                    scale: 6,
                    fillColor: '#8BC34A'
                });
            });
            
            this.#eventTracker.addListener(marker, 'mouseout', () => {
                marker.setIcon({
                    ...marker.getIcon(),
                    scale: 4,
                    fillColor: '#4CAF50'
                });
            });
        }
        
        this.#vertexMarkers.push(marker);
        return marker;
    }
    
    /**
     * Sets the callback to be called when the starting point is clicked to complete the polygon
     * @param {Function} callback The callback function
     */
    setCompletePolygonCallback(callback) {
        this.#completePolygonCallback = callback;
    }
    
    /**
     * Highlights the starting point marker to indicate potential polygon completion
     * @param {boolean} highlight Whether to highlight the marker
     */
    highlightStartPoint(highlight) {
        if (!this.#startPointMarker) return;
        
        this.#startPointMarker.setIcon({
            ...this.#startPointMarker.getIcon(),
            scale: highlight ? 6 : 4,
            fillColor: highlight ? '#8BC34A' : '#4CAF50'
        });
    }
    
    /**
     * Cleans up all markers and resets internal state
     */
    cleanup() {
        // Clean up vertex markers
        if (this.#vertexMarkers.length) {
            this.#vertexMarkers.forEach(marker => {
                if (marker) marker.setMap(null);
            });
            this.#vertexMarkers = [];
        }
        
        // Remove listeners from start marker
        if (this.#startPointMarker) {
            this.#eventTracker.removeAllListeners(this.#startPointMarker);
            this.#startPointMarker = null;
        }
        
        this.#completePolygonCallback = null;
    }
}
