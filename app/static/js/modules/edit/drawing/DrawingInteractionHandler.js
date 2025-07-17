import { GeometryUtils } from '../../utils/GeometryUtils.js';
import { RectangleDrawingHandler } from './RectangleDrawingHandler.js';

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
    #mouseDownListener = null;
    #mouseUpListener = null;
    
    // Rectangle drawing
    #rectangleHandler = null;
    #isMouseDown = false;
    #mouseDownTime = null;
    #mouseDownPosition = null;
    #dragThreshold = 2; // pixels (very small threshold)
    #holdThreshold = 150; // milliseconds (shorter hold time)
    #mouseMoveAnimationId = null;
    #lastMouseMoveTime = 0;
    #mouseMoveThrottle = 16; // ~60fps (16ms between updates)
    
    // Geometry calculation caching
    #lastProximityCheck = null;
    #proximityCheckCache = new Map();
    #proximityCheckThrottle = 50; // Check proximity every 50ms
    
    // Callbacks
    onPointAdded = null;
    onCompletePolygon = null;
    onRectangleComplete = null;
      constructor(map, eventTracker, drawingPath, markerManager, lineManager, drawingOptions) {
        this.#map = map;
        this.#eventTracker = eventTracker;
        this.#drawingPath = drawingPath;
        this.#markerManager = markerManager;
        this.#lineManager = lineManager;
        this.#drawingOptions = drawingOptions;
        
        // Initialize rectangle drawing handler
        this.#rectangleHandler = new RectangleDrawingHandler(map, eventTracker, drawingOptions);
        this.#rectangleHandler.onRectangleComplete = (rectanglePath) => {
            if (this.onRectangleComplete) {
                this.onRectangleComplete(rectanglePath);
            }
        };
    }
      /**
     * Sets up map event listeners for drawing
     */
    setupListeners() {
        // Clean up any existing listeners first
        this.cleanup();
        
        // Add mouse down listener to detect click vs drag
        this.#mouseDownListener = this.#eventTracker.addListener(
            this.#map,
            'mousedown',
            this.#handleMouseDown.bind(this)
        );
        
        // Add mouse up listener
        this.#mouseUpListener = this.#eventTracker.addListener(
            this.#map,
            'mouseup',
            this.#handleMouseUp.bind(this)
        );
        
        // Add mouse move listener for live preview
        this.#mouseMoveListener = this.#eventTracker.addListener(
            this.#map, 
            'mousemove', 
            this.#handleMouseMove.bind(this)
        );
        
        // Set up rectangle drawing handler
        this.#rectangleHandler.setupListeners();
        
        this.#active = true;
    }
      /**
     * Deactivates the handler without removing listeners
     */
    deactivate() {
        this.#active = false;
        this.#rectangleHandler.deactivate();
    }
    
    /**
     * Reactivates the handler
     */
    activate() {
        this.#active = true;
        this.#rectangleHandler.activate();
    }
    
    /**
     * Handle mouse down event - start tracking for click vs drag detection
     */
    #handleMouseDown(e) {
        if (!this.#active) return;
        
        // Only handle left mouse button
        if (e.domEvent && e.domEvent.button !== 0) return;
        
        this.#isMouseDown = true;
        this.#mouseDownTime = Date.now();
        
        // Store mouse position for drag detection
        if (e.domEvent) {
            const mapDiv = this.#map.getDiv();
            const rect = mapDiv.getBoundingClientRect();
            this.#mouseDownPosition = {
                x: e.domEvent.clientX - rect.left,
                y: e.domEvent.clientY - rect.top,
                latLng: e.latLng
            };
        }
    }
    
    /**
     * Handle mouse up event - determine if it was a click or end of drag
     */
    #handleMouseUp(e) {
        if (!this.#active || !this.#isMouseDown) return;
        
        const mouseUpTime = Date.now();
        const holdDuration = mouseUpTime - this.#mouseDownTime;
        
        // Check if mouse moved significantly
        let hasMoved = false;
        if (this.#mouseDownPosition && e.domEvent) {
            const mapDiv = this.#map.getDiv();
            const rect = mapDiv.getBoundingClientRect();
            const currentX = e.domEvent.clientX - rect.left;
            const currentY = e.domEvent.clientY - rect.top;
            
            const distance = Math.sqrt(
                Math.pow(currentX - this.#mouseDownPosition.x, 2) + 
                Math.pow(currentY - this.#mouseDownPosition.y, 2)
            );
            
            hasMoved = distance > this.#dragThreshold;
        }
        
        // If it was a quick click without movement, treat as point addition
        if (!hasMoved && holdDuration < this.#holdThreshold) {
            this.#handleMapClick(e);
        }
        
        // Reset mouse state
        this.#isMouseDown = false;
        this.#mouseDownTime = null;
        this.#mouseDownPosition = null;
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
                this.#isNearStartingPoint(newPoint)) {
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
        
        // Performance optimization: use requestAnimationFrame to throttle updates
        if (this.#mouseMoveAnimationId) {
            cancelAnimationFrame(this.#mouseMoveAnimationId);
        }
        
        this.#mouseMoveAnimationId = requestAnimationFrame(() => {
            this.#processMouseMove(e);
        });
    }
      /**
     * Process the actual mouse move update with smooth visual updates and throttled expensive operations
     */
    #processMouseMove(e) {
        try {
            if (this.#drawingPath.length === 0) return;
            
            const now = performance.now();
            const newPoint = e.latLng;
            
            // Always update the temporary line for smooth movement
            this.#lineManager.updateTempLine(
                this.#drawingPath[this.#drawingPath.length - 1], 
                newPoint
            );
            
            // Throttle expensive operations only
            const shouldDoExpensiveUpdates = (now - this.#lastMouseMoveTime) >= this.#mouseMoveThrottle;
            
            if (shouldDoExpensiveUpdates) {
                this.#lastMouseMoveTime = now;
                
                // Only throttle proximity checking and visual cue updates
                if (this.#drawingPath.length >= 3) {
                    const isNearStart = this.#isNearStartingPoint(newPoint);
                    
                    // Update visual cues (these are the expensive operations)
                    this.#lineManager.highlightTempLine(isNearStart, this.#drawingOptions);
                    this.#markerManager.highlightStartPoint(isNearStart);
                }
            }
            
            this.#mouseMoveAnimationId = null;
        } catch (error) {
            console.error('Error handling mouse move:', error);        }
    }    /**
     * Performance optimized proximity check with caching
     */
    #isNearStartingPoint(newPoint) {
        const now = performance.now();
        
        // Throttle proximity checks for performance
        if (this.#lastProximityCheck && (now - this.#lastProximityCheck) < this.#proximityCheckThrottle) {
            // Return cached result if available
            const cacheKey = `${Math.round(newPoint.lat() * 100000)},${Math.round(newPoint.lng() * 100000)}`;
            if (this.#proximityCheckCache.has(cacheKey)) {
                return this.#proximityCheckCache.get(cacheKey);
            }
        }
        
        // Perform actual proximity check
        const isNear = GeometryUtils.isCloseToPoint(this.#map, newPoint, this.#drawingPath[0], 10);
        
        // Cache the result
        const cacheKey = `${Math.round(newPoint.lat() * 100000)},${Math.round(newPoint.lng() * 100000)}`;
        this.#proximityCheckCache.set(cacheKey, isNear);
        
        // Limit cache size
        if (this.#proximityCheckCache.size > 50) {
            const firstKey = this.#proximityCheckCache.keys().next().value;
            this.#proximityCheckCache.delete(firstKey);
        }
        
        this.#lastProximityCheck = now;
        return isNear;
    }
      /**
     * Cleans up all event listeners
     */
    cleanup() {
        // Deactivate first to prevent any new events from being processed
        this.#active = false;
        
        // Clean up rectangle handler
        if (this.#rectangleHandler) {
            this.#rectangleHandler.cleanup();
        }
        
        // Explicitly remove the specific listeners we added
        if (this.#mapClickListener) {
            this.#eventTracker.removeListener(this.#map, 'click', this.#mapClickListener);
            this.#mapClickListener = null;
        }
        
        if (this.#mouseMoveListener) {
            this.#eventTracker.removeListener(this.#map, 'mousemove', this.#mouseMoveListener);
            this.#mouseMoveListener = null;
        }
        
        if (this.#mouseDownListener) {
            this.#eventTracker.removeListener(this.#map, 'mousedown', this.#mouseDownListener);
            this.#mouseDownListener = null;
        }
        
        if (this.#mouseUpListener) {
            this.#eventTracker.removeListener(this.#map, 'mouseup', this.#mouseUpListener);
            this.#mouseUpListener = null;
        }        // Reset state
        this.#isMouseDown = false;
        this.#mouseDownTime = null;
        this.#mouseDownPosition = null;
        
        // Clear proximity check cache
        this.#proximityCheckCache.clear();
        this.#lastProximityCheck = null;
        
        // Cancel any pending animation frame
        if (this.#mouseMoveAnimationId) {
            cancelAnimationFrame(this.#mouseMoveAnimationId);
            this.#mouseMoveAnimationId = null;
        }
    }
}
