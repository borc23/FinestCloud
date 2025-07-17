import { EventListenerTracker } from '../utils/EventListenerTracker.js';
import appErrorHandler from '../utils/AppErrorHandler.js';

export class EventManager {
    constructor(stateManager, drawingManager, polygonManager) {
        try {
            this.stateManager = stateManager;
            this.drawingManager = drawingManager;
            this.polygonManager = polygonManager;
            this.eventTracker = new EventListenerTracker();
            
            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'eventManager', true);
        }
    }

    debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    setupEventListeners() {
        try {
            this.eventTracker.addListener(document, 'keydown', this.handleKeyPress.bind(this));
            this.eventTracker.addListener(document, 'keyup', this.handleKeyUp.bind(this));
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'eventSetup', true);
        }
    }

    handleKeyPress(event) {
        try {
            // Add a check to ensure stateManager is not null
            if (!this.stateManager) {
                console.warn("EventManager: stateManager is null in handleKeyPress. Aborting.");
                return; 
            }
            const state = this.stateManager.getState();
            if (!state.isEditMode) return;

            switch (event.key) {
                case 'Control':
                    this.handleControlKeyPress(true);
                    break;
                case 'Delete':
                case 'Backspace':
                    this.handleDeleteKey();
                    break;
                case 'Escape':
                    this.handleEscapeKey();
                    break;
            }
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'keyPress', true);
        }
    }

    handleControlKeyPress(isPressed) {
        try {
            this.stateManager.setState({ isCtrlPressed: isPressed });
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'controlKey', true);
        }
    }

    handleDeleteKey() {
        try {
            const state = this.stateManager.getState();
            if (state.selectedPolygons.size > 0) {
                this.removeSelectedPolygons(state.selectedPolygons);
            }
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'deleteKey', true);
        }
    }

    removeSelectedPolygons(selectedPolygons) {
        try {
            selectedPolygons.forEach(panel => {
                this.polygonManager.removePolygon(panel);
            });
            this.stateManager.setState({ selectedPolygons: new Set() });
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'polygonRemoval', true);
        }
    }

    handleEscapeKey() {
        try {
            const state = this.stateManager.getState();
            if (state.isDrawingPolygon) {
                this.drawingManager.cancelDrawing();
                
                // Deselect all panels when exiting drawing mode
                this.polygonManager.deselectAllPanels();
                
                // Update UI to reflect cancelled drawing state
                if (window.editService && window.editService.uiManager) {
                    // Hide the drawing mode indicator
                    window.editService.uiManager.updateDrawingModeIndicator(false);
                    
                    // Reset the "Create New Polygon" button visual state
                    const createPolygonBtn = window.editService.uiManager.getElement('createPolygonBtn');
                    if (createPolygonBtn) {
                        createPolygonBtn.classList.remove('active');
                    }
                }
            }
            // No action if not in drawing mode
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'escapeKey', true);
        }
    }

    handleKeyUp(event) {
        try {
            if (event.key === 'Control') {
                this.handleControlKeyPress(false);
            }
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'keyUp', false);
        }
    }

    cleanup() {
        try {
            // Use the tracker to remove all listeners
            this.eventTracker.cleanup();
            
            // Clear references to other services
            this.stateManager = null;
            this.drawingManager = null;
            this.polygonManager = null;
            
            console.log('EventManager cleaned up');
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'eventManagerCleanup', false);
        }
    }
}
