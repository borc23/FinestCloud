/**
 * Manages the creation and lifecycle of markers used in the polygon drawing process
 */
export class MarkerManager {
    #map = null;
    #eventTracker = null;
    #vertexMarkers = [];
    #startPointMarker = null;
    #completePolygonCallback = null;
    
    // Performance optimization properties
    #lastStartPointHighlight = null;
    
    // Object pooling for vertex markers (reuse objects to reduce GC pressure)
    #markerPool = [];
    #maxPoolSize = 10;
    
    constructor(eventTracker) {
        this.#eventTracker = eventTracker;
    }
    
    setMap(map) {
        this.#map = map;
    }
      /**
     * Creates a marker for a vertex in the drawing path
     * Uses object pooling for better memory management
     * @param {google.maps.LatLng} position The position for the marker
     * @param {boolean} isStartingPoint Whether this is the first point of the polygon
     * @param {Object} drawingOptions Styling options for the marker
     * @returns {google.maps.Marker} The created marker
     */
    createVertexMarker(position, isStartingPoint = false, drawingOptions) {
        if (!this.#map) return null;
        
        let marker;
        
        // Try to reuse a marker from the pool
        if (this.#markerPool.length > 0) {
            marker = this.#markerPool.pop();
            
            // Reset marker properties
            marker.setPosition(position);
            marker.setMap(this.#map);
            
            // Remove any existing listeners
            this.#eventTracker.removeAllListeners(marker);
        } else {
            // Create new marker if pool is empty
            marker = new google.maps.Marker({
                position,
                map: this.#map,
                draggable: false,
                zIndex: 2001, // Very high z-index to appear above everything
                optimized: true
            });
        }
        
        // Set marker icon and properties based on type
        marker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: isStartingPoint ? 4 : 3,
            fillOpacity: 1,
            fillColor: isStartingPoint ? '#4CAF50' : drawingOptions.strokeColor,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
        });
        
        marker.setOptions({
            cursor: isStartingPoint ? 'pointer' : 'default',
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
     * Performance optimized to avoid unnecessary icon updates
     * @param {boolean} highlight Whether to highlight the marker
     */
    highlightStartPoint(highlight) {
        if (!this.#startPointMarker) return;
        
        // Performance optimization: avoid unnecessary icon updates
        if (this.#lastStartPointHighlight === highlight) {
            return;
        }
        
        this.#startPointMarker.setIcon({
            ...this.#startPointMarker.getIcon(),
            scale: highlight ? 6 : 4,
            fillColor: highlight ? '#8BC34A' : '#4CAF50'
        });
        
        this.#lastStartPointHighlight = highlight;
    }    /**
     * Cleans up all markers and resets internal state
     */
    cleanup() {
        // Return vertex markers to pool instead of destroying them
        if (this.#vertexMarkers.length) {
            this.#vertexMarkers.forEach(marker => {
                if (marker) {
                    marker.setMap(null);
                    this.#eventTracker.removeAllListeners(marker);
                    
                    // Add to pool if not full and not the start point marker
                    if (this.#markerPool.length < this.#maxPoolSize && marker !== this.#startPointMarker) {
                        this.#markerPool.push(marker);
                    }
                }
            });
            this.#vertexMarkers = [];
        }
        
        // Handle start point marker separately
        if (this.#startPointMarker) {
            this.#eventTracker.removeAllListeners(this.#startPointMarker);
            this.#startPointMarker.setMap(null);
            
            // Add start point marker to pool as well if space available
            if (this.#markerPool.length < this.#maxPoolSize) {
                this.#markerPool.push(this.#startPointMarker);
            }
            
            this.#startPointMarker = null;
        }
        
        this.#completePolygonCallback = null;
        
        // Reset performance optimization state
        this.#lastStartPointHighlight = null;
    }
}
