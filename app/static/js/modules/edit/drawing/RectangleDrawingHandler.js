/**
 * RectangleDrawingHandler.js
 * Handles rectangle drawing functionality - click and drag to create rectangles
 */

export class RectangleDrawingHandler {
    #map;
    #eventTracker;
    #drawingOptions;
    #active = true;
      // Mouse interaction state
    #isMouseDown = false;
    #startPoint = null;
    #currentRectangle = null;
    
    // Performance optimization properties
    #mouseMoveAnimationId = null;
    #lastMouseMoveTime = 0;
    #mouseMoveThrottle = 16; // ~60fps (16ms between updates)
    #lastUpdateBounds = null;
    
      // Event listeners
    #mouseDownListener = null;
    #mouseMoveListener = null;
    #mouseUpListener = null;
    #documentMouseUpListener = null;
    
    // Callbacks
    onRectangleComplete = null;
      constructor(map, eventTracker, drawingOptions) {
        this.#map = map;
        this.#eventTracker = eventTracker;
        this.#drawingOptions = drawingOptions;
        
        // Bind the document mouse up handler once to maintain consistent reference
        this.#documentMouseUpListener = this.#handleDocumentMouseUp.bind(this);
    }
    
    /**
     * Sets up event listeners for rectangle drawing
     */
    setupListeners() {
        this.cleanup();
        
        // Listen for mouse down on the map
        this.#mouseDownListener = this.#eventTracker.addListener(
            this.#map,
            'mousedown',
            this.#handleMouseDown.bind(this)
        );
        
        this.#active = true;
    }
    
    /**
     * Handle mouse down event - start potential rectangle drawing
     */
    #handleMouseDown(e) {
        if (!this.#active) return;
        
        // Only handle left mouse button
        if (e.domEvent && e.domEvent.button !== 0) return;
        
        try {
            // Prevent default behavior
            if (e.domEvent) {
                e.domEvent.preventDefault();
                e.domEvent.stopPropagation();
            }
            
            this.#isMouseDown = true;
            this.#startPoint = e.latLng;
            
            // Set up temporary mouse move and mouse up listeners
            this.#setupTemporaryListeners();
            
        } catch (error) {
            console.error('Error handling mouse down:', error);
        }
    }
    
    /**
     * Set up temporary listeners for mouse move and mouse up during potential drag
     */
    #setupTemporaryListeners() {
        // Add mouse move listener to detect drag
        this.#mouseMoveListener = this.#eventTracker.addListener(
            this.#map,
            'mousemove',
            this.#handleMouseMove.bind(this)
        );
          // Add mouse up listener to complete or cancel
        this.#mouseUpListener = this.#eventTracker.addListener(
            this.#map,
            'mouseup',
            this.#handleMouseUp.bind(this)
        );
        
        // Also listen for mouse up on document in case user drags outside map
        document.addEventListener('mouseup', this.#documentMouseUpListener);
    }
      /**
     * Handle mouse move - create/update rectangle if dragging
     */
    #handleMouseMove(e) {
        if (!this.#active || !this.#isMouseDown || !this.#startPoint) return;
        
        // Performance optimization: use requestAnimationFrame to throttle updates
        if (this.#mouseMoveAnimationId) {
            cancelAnimationFrame(this.#mouseMoveAnimationId);
        }
        
        this.#mouseMoveAnimationId = requestAnimationFrame(() => {
            this.#processMouseMove(e);
        });
    }
    
    /**
     * Process the actual mouse move update
     */
    #processMouseMove(e) {
        try {
            const currentPoint = e.latLng;
            const now = performance.now();
            
            // Additional throttling check
            if (now - this.#lastMouseMoveTime < this.#mouseMoveThrottle) {
                return;
            }
            
            this.#lastMouseMoveTime = now;
            this.#mouseMoveAnimationId = null;
            
            // Check if bounds have changed significantly to avoid unnecessary updates
            if (this.#shouldUpdateRectangle(this.#startPoint, currentPoint)) {
                this.#updateRectangle(this.#startPoint, currentPoint);
            }
            
        } catch (error) {
            console.error('Error handling mouse move:', error);
        }
    }
    
    /**
     * Check if rectangle should be updated based on bounds change threshold
     */
    #shouldUpdateRectangle(startPoint, endPoint) {
        if (!this.#lastUpdateBounds) {
            return true; // First update
        }
        
        // Calculate new bounds
        const newBounds = new google.maps.LatLngBounds();
        newBounds.extend(startPoint);
        newBounds.extend(endPoint);
        
        // Check if bounds have changed significantly (reduce unnecessary polygon updates)
        const lastNe = this.#lastUpdateBounds.getNorthEast();
        const lastSw = this.#lastUpdateBounds.getSouthWest();
        const newNe = newBounds.getNorthEast();
        const newSw = newBounds.getSouthWest();
        
        const threshold = 0.00001; // Minimum coordinate change to trigger update
        const hasSignificantChange = 
            Math.abs(lastNe.lat() - newNe.lat()) > threshold ||
            Math.abs(lastNe.lng() - newNe.lng()) > threshold ||
            Math.abs(lastSw.lat() - newSw.lat()) > threshold ||
            Math.abs(lastSw.lng() - newSw.lng()) > threshold;
        
        if (hasSignificantChange) {
            this.#lastUpdateBounds = newBounds;
            return true;
        }
        
        return false;
    }
    
      /**
     * Handle mouse up - complete rectangle if one was being drawn
     */
    #handleMouseUp(e) {
        if (!this.#active) return;
        
        try {
            if (this.#currentRectangle && this.#startPoint) {
                // Validate rectangle size before completing
                if (this.#isValidRectangleSize(this.#startPoint, e.latLng)) {
                    const rectanglePath = this.#getRectanglePath(this.#startPoint, e.latLng);
                    
                    if (this.onRectangleComplete) {
                        this.onRectangleComplete(rectanglePath);
                    }
                }
                
                // Clean up the temporary rectangle
                this.#cleanupCurrentRectangle();
            }
            
            this.#resetMouseState();
            this.#cleanupTemporaryListeners();
            
        } catch (error) {
            console.error('Error handling mouse up:', error);
        }
    }    /**
     * Handle mouse up on document (when user drags outside map)
     */
    #handleDocumentMouseUp(e) {
        if (!this.#active || !this.#isMouseDown) return;
        
        // If we have a current rectangle, complete it at the last known position
        if (this.#currentRectangle && this.#startPoint) {
            // Get the current rectangle bounds for validation
            const path = this.#currentRectangle.getPath().getArray();
            if (path.length >= 4) {
                // Use first and third points as opposite corners for validation
                const firstPoint = path[0];
                const thirdPoint = path[2];
                
                if (this.#isValidRectangleSize(firstPoint, thirdPoint)) {
                    if (this.onRectangleComplete) {
                        this.onRectangleComplete(path);
                    }
                }
            }
            
            this.#cleanupCurrentRectangle();
        }
        
        this.#resetMouseState();
        this.#cleanupTemporaryListeners();
    }/**
     * Create or update the temporary rectangle
     */
    #updateRectangle(startPoint, endPoint) {
        // Create rectangle path
        const rectanglePath = this.#getRectanglePath(startPoint, endPoint);
        
        if (this.#currentRectangle) {
            // Performance optimization: update existing polygon path instead of recreating
            this.#currentRectangle.setPath(rectanglePath);
        } else {
            // Create temporary rectangle with drawing options
            this.#currentRectangle = new google.maps.Polygon({
                paths: rectanglePath,
                strokeColor: this.#drawingOptions.strokeColor || '#4285F4',
                strokeOpacity: 0.9,
                strokeWeight: 2,
                fillColor: this.#drawingOptions.fillColor || '#4285F4',
                fillOpacity: 0.2, // More visible while drawing
                map: this.#map,
                editable: false,
                draggable: false,
                clickable: false,
                zIndex: 3000 // High z-index to appear above everything
            });
        }
    }
      /**
     * Get rectangle path from two corner points
     * Performance optimized version that reuses calculations
     */
    #getRectanglePath(startPoint, endPoint) {
        // Direct coordinate extraction (faster than LatLngBounds)
        const startLat = startPoint.lat();
        const startLng = startPoint.lng();
        const endLat = endPoint.lat();
        const endLng = endPoint.lng();
        
        // Calculate bounds directly
        const north = Math.max(startLat, endLat);
        const south = Math.min(startLat, endLat);
        const east = Math.max(startLng, endLng);
        const west = Math.min(startLng, endLng);
        
        // Create rectangle path with direct coordinate values
        return [
            { lat: north, lng: west }, // NW
            { lat: north, lng: east }, // NE
            { lat: south, lng: east }, // SE
            { lat: south, lng: west }  // SW
        ];
    }/**
     * Clean up the current temporary rectangle
     */
    #cleanupCurrentRectangle() {
        if (this.#currentRectangle) {
            this.#currentRectangle.setMap(null);
            this.#currentRectangle = null;
        }
    }
      /**
     * Reset mouse interaction state
     */
    #resetMouseState() {
        this.#isMouseDown = false;
        this.#startPoint = null;
        this.#lastUpdateBounds = null;
        
        // Cancel any pending animation frame
        if (this.#mouseMoveAnimationId) {
            cancelAnimationFrame(this.#mouseMoveAnimationId);
            this.#mouseMoveAnimationId = null;
        }
    }
    
    /**
     * Clean up temporary event listeners
     */
    #cleanupTemporaryListeners() {
        if (this.#mouseMoveListener) {
            this.#eventTracker.removeListener(this.#map, 'mousemove', this.#mouseMoveListener);
            this.#mouseMoveListener = null;
        }
        
        if (this.#mouseUpListener) {
            this.#eventTracker.removeListener(this.#map, 'mouseup', this.#mouseUpListener);
            this.#mouseUpListener = null;
        }        
        document.removeEventListener('mouseup', this.#documentMouseUpListener);
    }
    
    /**
     * Deactivate the handler
     */
    deactivate() {
        this.#active = false;
    }
    
    /**
     * Activate the handler
     */
    activate() {
        this.#active = true;
    }
    
    /**
     * Clean up all event listeners and temporary elements
     */
    cleanup() {
        this.#active = false;
        
        // Clean up temporary rectangle
        this.#cleanupCurrentRectangle();
        
        // Clean up temporary listeners
        this.#cleanupTemporaryListeners();
        
        // Clean up main mouse down listener
        if (this.#mouseDownListener) {
            this.#eventTracker.removeListener(this.#map, 'mousedown', this.#mouseDownListener);
            this.#mouseDownListener = null;
        }
        
        // Reset state
        this.#resetMouseState();
    }
    
    /**
     * Check if rectangle meets minimum size requirements
     */
    #isValidRectangleSize(startPoint, endPoint) {
        const startLat = startPoint.lat();
        const startLng = startPoint.lng();
        const endLat = endPoint.lat();
        const endLng = endPoint.lng();
        
        const latDiff = Math.abs(startLat - endLat);
        const lngDiff = Math.abs(startLng - endLng);
        
        // Minimum rectangle size (approximately 10 meters)
        const minSize = 0.000001;
        return latDiff >= minSize && lngDiff >= minSize;
    }
}
