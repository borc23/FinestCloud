import { StyleConfig } from './StyleConfig.js';
import { EventListenerTracker } from '../utils/EventListenerTracker.js';
import { MarkerManager } from './drawing/MarkerManager.js';
import { LineManager } from './drawing/LineManager.js';
import { DrawingInteractionHandler } from './drawing/DrawingInteractionHandler.js';
import { GeometryUtils } from '../utils/GeometryUtils.js';

export class DrawingManager {
    constructor(mapService, stateManager, styleConfig, polygonManager, detectionService) {
        // Core services
        this.mapService = mapService;
        this.stateManager = stateManager;
        this.styleConfig = styleConfig;
        this.polygonManager = polygonManager;
        this.detectionService = detectionService;
        
        // Drawing state
        this.drawingPath = [];
        this.isInDrawingMode = false;
        
        // Internal tracking
        this._map = null;
        this._isRoof = true;
        this._drawingOptions = null;
        
        // Initialize sub-managers
        this.eventTracker = new EventListenerTracker();
        this.markerManager = new MarkerManager(this.eventTracker);
        this.lineManager = new LineManager();
        
        // Set up state change listener
        const unsubscribe = this.stateManager.addListener('isDrawingPolygon', (isDrawing) => {
            if (!isDrawing && !this.isInDrawingMode) {
                this.cleanupDrawingElements();
            }
        });
        
        // Store the unsubscribe function
        this.stateChangeUnsubscribe = unsubscribe;
    }

    // Get map instance with lazy loading - use active map
    get map() {
        if (!this._map || this._map !== this.mapService.getActiveMap()) {
            this._map = this.mapService.getActiveMap();
        }
        return this._map;
    }

    // Toggle drawing mode
    toggleDrawingMode(isRoof) {
        if (this.isInDrawingMode) {
            this.exitDrawingMode();
        } else {
            this.enterDrawingMode(isRoof);
        }
        return this.isInDrawingMode;
    }

    // Enter drawing mode
    enterDrawingMode(isRoof) {
        this._isRoof = isRoof;
        this.isInDrawingMode = true;
        this.startNewPolygon(isRoof);
    }

    // Exit drawing mode
    exitDrawingMode() {
        this.isInDrawingMode = false;
        this.cancelDrawing();

        // Restore map draggability
        if (this._map) {
            this._map.setOptions({
                draggable: true,
                scrollwheel: true,
                gestureHandling: 'auto'
            });
        }
    }

    // Start drawing a new polygon
    startNewPolygon(isRoof) {
        // Reset map reference to ensure we're using the current active map
        this._map = this.mapService.getActiveMap();
        // console.log('Starting new polygon on map', this._map);
        
        // Cancel any existing drawing operation
        this.cleanupForNextPolygon();
        
        // Update internal state
        this._isRoof = isRoof;
        this._drawingOptions = StyleConfig.getOptionsForType(isRoof, false, true);
        
        // Ensure map is not draggable during drawing
        if (this._map) {
            this._map.setOptions({
                draggable: false,
                scrollwheel: false,
                gestureHandling: 'none'
            });
        }
        
        // Update global state
        this.stateManager.setState({ 
            isDrawingPolygon: true,
            isClickable: false,
            polygonEditMode: isRoof ? 'roof' : 'object'
        }, 'DrawingManager.startNewPolygon');
        
        // Disable clicking on existing polygons
        this.polygonManager.setAllPolygonsClickable(false);
        
        // Initialize drawing elements
        this.drawingPath = [];
        
        // Initialize managers with the current map
        this.markerManager.setMap(this.map);
        this.lineManager.setMap(this.map);
        this.lineManager.createTempLine(this._drawingOptions);
        
        // Set up interaction handler
        this.setupDrawingListeners();
    }

    // Clean up for next polygon but stay in drawing mode
    cleanupForNextPolygon() {
        // Clean up listeners
        this.cleanupListeners();
        
        // Clean up visual elements
        this.lineManager.cleanup();
        this.markerManager.cleanup();
        
        // Reset drawing path
        this.drawingPath = [];
    }

    // Complete the polygon drawing
    completePolygon() {
        try {
            const state = this.stateManager.getState();
        
            // Verify we have enough points
            if (!state.isDrawingPolygon || this.drawingPath.length < 3) {
                console.warn('Cannot complete polygon: insufficient points');
                if (!this.isInDrawingMode) {
                    this.cancelDrawing();
                } else {
                    this.cleanupForNextPolygon();
                    this.startNewPolygon(this._isRoof);
                }
                return;
            }
            
            // Clean up interaction handlers first to prevent additional clicks
            this.cleanupListeners();
            
            // Create final polygon with appropriate styling
            const isRoof = state.polygonEditMode === 'roof';
            const defaultOptions = StyleConfig.getOptionsForType(isRoof);
            
            // Get appropriate z-index - objects always on top of roofs
            const zIndex = isRoof ? defaultOptions.zIndex : defaultOptions.zIndex;
            
            const finalPolygon = new google.maps.Polygon({
                paths: [...this.drawingPath], // Clone the path
                ...defaultOptions,
                map: this.map,
                editable: false,
                draggable: false,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillOpacity: 0.2,
                zIndex: zIndex      // Use appropriate type-based z-index
            });
            
            // Add to collection
            if (!this.detectionService) {
                console.error('Detection service is not available');
                return;
            }
            
            // Ensure collections exist
            if (!this.detectionService.currentPolygonsRoof) {
                this.detectionService.currentPolygonsRoof = [];
            }
            if (!this.detectionService.currentPolygonsObjects) {
                this.detectionService.currentPolygonsObjects = [];
            }
            
            // Add to appropriate collection
            if (isRoof) {
                this.detectionService.currentPolygonsRoof.push(finalPolygon);
            } else {
                this.detectionService.currentPolygonsObjects.push(finalPolygon);
            }
            
            // Don't add to selection - we want it unselected
            
            // Set up polygon interactions
            this.polygonManager.addPolygonListeners(finalPolygon);
            
            // Apply unselected styling directly
            if (finalPolygon.isPanelElement) {
                const moduleType = finalPolygon.moduleType || 'STANDARD';
                const defaultPanelOptions = StyleConfig.getPanelOptions('default', moduleType);
                finalPolygon.setOptions({
                    ...defaultPanelOptions,
                    editable: false,
                    draggable: false
                });
            } else {
                const options = StyleConfig.getOptionsForType(isRoof, false);
                finalPolygon.setOptions({
                    ...options,
                    editable: false,
                    draggable: false
                });
            }
            
            // If we're in continuous drawing mode, prepare for the next polygon
            if (this.isInDrawingMode) {
                // Update state for next polygon
                this.cleanupForNextPolygon();
                this.startNewPolygon(this._isRoof);
            } else {
                // Exit drawing mode
                this.stateManager.setState({ 
                    isDrawingPolygon: false,
                    isClickable: true
                }, 'DrawingManager.completePolygon');
                
                // Reset all polygon clickability and update the new polygon
                this.polygonManager.setAllPolygonsClickable(true);
                
                // Clean up drawing elements
                this.cleanupDrawingElements();
            }
            
        } catch (error) {
            console.error('Error completing polygon:', error);
            
            if (!this.isInDrawingMode) {
                this.cancelDrawing();
            } else {
                this.cleanupForNextPolygon();
                this.startNewPolygon(this._isRoof);
            }
        }
    }

    // Set up event listeners for drawing
    setupDrawingListeners() {
        this.cleanupListeners();
        
        try {
            // console.log('Setting up drawing listeners on map', this.map);
            
            // Create interaction handler
            this.interactionHandler = new DrawingInteractionHandler(
                this.map,
                this.eventTracker,
                this.drawingPath,
                this.markerManager,
                this.lineManager,
                this._drawingOptions
            );
            
            // Set up callbacks
            this.interactionHandler.onPointAdded = (point) => {
                this.drawingPath.push(point);
                const isFirstPoint = this.drawingPath.length === 1;
                this.markerManager.createVertexMarker(point, isFirstPoint, this._drawingOptions);
                
                // Create a line segment if we have at least 2 points
                if (this.drawingPath.length >= 2) {
                    const lastIndex = this.drawingPath.length - 1;
                    this.lineManager.createLine(
                        this.drawingPath[lastIndex - 1],
                        this.drawingPath[lastIndex],
                        this._drawingOptions
                    );
                }
            };
            
            this.interactionHandler.onCompletePolygon = () => {
                this.completePolygon();
            };
            
            // Connect marker manager's completion callback
            this.markerManager.setCompletePolygonCallback(() => {
                this.completePolygon();
            });
            
            // Set up listeners
            this.interactionHandler.setupListeners();
            
        } catch (error) {
            console.error('Error setting up drawing listeners:', error);
            this.cancelDrawing();
        }
    }

    // Cancel the current drawing operation
    cancelDrawing() {
        this.isInDrawingMode = false;
        
        this.stateManager.setState({ 
            isDrawingPolygon: false,
            isClickable: true 
        }, 'DrawingManager.cancelDrawing');
        
        this.cleanupListeners();
        this.cleanupDrawingElements();
    }

    // Clean up all event listeners
    cleanupListeners() {
        try {
            // Clean up interaction handler if it exists
            if (this.interactionHandler) {
                this.interactionHandler.cleanup();
                this.interactionHandler = null;
            }
            
            // Use event tracker to remove map listeners
            if (this.map) {
                this.eventTracker.removeAllListeners(this.map);
            }
        } catch (error) {
            console.error('Error cleaning up drawing listeners:', error);
        }
    }

    // Clean up all drawing visual elements
    cleanupDrawingElements() {
        try {
            // Use managers to clean up elements
            this.lineManager.cleanup();
            this.markerManager.cleanup();
            
            // Reset drawing path
            this.drawingPath = [];
            
            // Re-enable polygon clickability
            this.polygonManager.setAllPolygonsClickable(true);
            
            // Reset cache
            this._drawingOptions = null;
        } catch (error) {
            console.error('Error cleaning up drawing elements:', error);
        }
    }

    // Clean up everything
    cleanup() {
        try {
            // Cancel any active drawing first
            if (this.stateManager.getState().isDrawingPolygon) {
                this.cancelDrawing();
            }
            
            // Clean up all listeners and visual elements
            this.cleanupListeners();
            this.cleanupDrawingElements();
            
            // Remove state change listener
            if (this.stateChangeUnsubscribe) {
                this.stateChangeUnsubscribe();
                this.stateChangeUnsubscribe = null;
            }
            
            // Clean up managers
            this.markerManager.cleanup();
            this.lineManager.cleanup();
            this.eventTracker.cleanup();
            
            // Clear references to other services
            this.mapService = null;
            this.stateManager = null;
            this.styleConfig = null;
            this.polygonManager = null;
            this.detectionService = null;
            this.markerManager = null;
            this.lineManager = null;
            
            // Reset map reference
            this._map = null;
            
            console.log('DrawingManager cleaned up');
        } catch (error) {
            console.error('Error during DrawingManager cleanup:', error);
        }
    }

    // Update polygon type while in drawing mode
    updatePolygonType(isRoof) {
        if (!this.isInDrawingMode) return;
        
        // Store current polygon type
        this._isRoof = isRoof;
        
        // Update the state with the new polygon type
        this.stateManager.setState({ 
            polygonEditMode: isRoof ? 'roof' : 'object'
        }, 'DrawingManager.updatePolygonType');
        
        // Clean up the current polygon and start a new one
        this.cleanupForNextPolygon();
        this.startNewPolygon(isRoof);
    }
}