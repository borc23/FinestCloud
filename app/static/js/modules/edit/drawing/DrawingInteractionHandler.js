import { GeometryUtils } from '../../utils/GeometryUtils.js';

/**
 * Handles user interactions during the polygon drawing process
 */
export class DrawingInteractionHandler {
    #map;
    #eventTracker;
    #drawingPath;
    #markerManager;
    #lineManager;
    #drawingOptions;
    #active = true; // Track if handler is active
    #mapClickListener = null;
    #mouseMoveListener = null;
    
    // Callbacks
    onPointAdded = null;
    onCompletePolygon = null;
    
    constructor(map, eventTracker, drawingPath, markerManager, lineManager, drawingOptions) {
        this.#map = map;
        this.#eventTracker = eventTracker;
        this.#drawingPath = drawingPath;
        this.#markerManager = markerManager;
        this.#lineManager = lineManager;
        this.#drawingOptions = drawingOptions;
    }
    
    /**
     * Sets up map event listeners for drawing
     */
    setupListeners() {
        // Clean up any existing listeners first
        this.cleanup();
        
        // Add click listener for placing points
        this.#mapClickListener = this.#eventTracker.addListener(
            this.#map, 
            'click', 
            this.#handleMapClick.bind(this)
        );
        
        // Add mouse move listener for live preview
        this.#mouseMoveListener = this.#eventTracker.addListener(
            this.#map, 
            'mousemove', 
            this.#handleMouseMove.bind(this)
        );
        
        this.#active = true;
    }
    
    /**
     * Deactivates the handler without removing listeners
     */
    deactivate() {
        this.#active = false;
    }
    
    /**
     * Reactivates the handler
     */
    activate() {
        this.#active = true;
    }
    
    /**
     * Handles map click events for adding points to the polygon
     * @param {google.maps.MouseEvent} e The click event
     */
    #handleMapClick(e) {
        // Skip if handler is not active
        if (!this.#active) return;
        
        try {
            e.stop && e.stop();
            
            const newPoint = e.latLng;
            
            // Check if close to starting point and have at least 3 points
            if (this.#drawingPath.length >= 3 && 
                GeometryUtils.isCloseToPoint(this.#map, newPoint, this.#drawingPath[0], 10)) {
                // Complete the polygon and deactivate handler
                if (this.onCompletePolygon) {
                    this.#active = false; // Prevent additional clicks
                    this.onCompletePolygon();
                }
                return;
            }
            
            // Add the point
            if (this.onPointAdded) {
                this.onPointAdded(newPoint);
            }
        } catch (error) {
            console.error('Error handling map click:', error);
        }
    }
    
    /**
     * Handles mouse movement for updating the temporary line
     * @param {google.maps.MouseEvent} e The mouse move event
     */
    #handleMouseMove(e) {
        // Skip if handler is not active
        if (!this.#active) return;
        
        try {
            if (this.#drawingPath.length === 0) return;
            
            const newPoint = e.latLng;
            
            // Update temporary line to follow cursor
            this.#lineManager.updateTempLine(
                this.#drawingPath[this.#drawingPath.length - 1], 
                newPoint
            );
            
            // Check if near starting point for completion hint
            const isNearStart = this.#drawingPath.length >= 3 && 
                GeometryUtils.isCloseToPoint(this.#map, newPoint, this.#drawingPath[0], 10);
            
            // Update visual cues
            this.#lineManager.highlightTempLine(isNearStart, this.#drawingOptions);
            this.#markerManager.highlightStartPoint(isNearStart);
        } catch (error) {
            console.error('Error handling mouse move:', error);
        }
    }
    
    /**
     * Cleans up all event listeners
     */
    cleanup() {
        // Deactivate first to prevent any new events from being processed
        this.#active = false;
        
        // Explicitly remove the specific listeners we added
        if (this.#mapClickListener) {
            this.#eventTracker.removeListener(this.#map, 'click', this.#mapClickListener);
            this.#mapClickListener = null;
        }
        
        if (this.#mouseMoveListener) {
            this.#eventTracker.removeListener(this.#map, 'mousemove', this.#mouseMoveListener);
            this.#mouseMoveListener = null;
        }
    }
}
