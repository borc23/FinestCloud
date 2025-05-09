/**
 * EditService.js 
 * Main controller for the edit mode functionality
 */
import { ClipboardService } from './ClipboardService.js';
import { RotationHandler } from './RotationHandler.js';
import { UIManager } from './UIManager.js';
import { RectangleSelectionManager } from './RectangleSelectionManager.js';

export class EditService {
    constructor(dependencies) {
        try {
            const {
                mapService,
                imageUploadService,
                stateManager,
                eventManager,
                drawingManager,
                polygonManager,
                detectionService
            } = dependencies;

            // Validate required services
            if (!mapService) throw new Error('Map service is required');
            if (!imageUploadService) throw new Error('Image upload service is required');
            if (!stateManager) throw new Error('State manager is required');
            if (!eventManager) throw new Error('Event manager is required');
            if (!drawingManager) throw new Error('Drawing manager is required');
            if (!polygonManager) throw new Error('Polygon manager is required');
            if (!detectionService) throw new Error('Detection service is required');

            this.mapService = mapService;
            this.imageUploadService = imageUploadService;
            this.stateManager = stateManager;
            this.eventManager = eventManager;
            this.drawingManager = drawingManager;
            this.polygonManager = polygonManager;
            this.detectionService = detectionService;

            // Set the image upload service in both directions
            this.imageUploadService.setEditService(this);
            
            // Connect PolygonManager back to EditService
            this.polygonManager.setEditService(this);
            
            // Initialize UI Manager
            this.uiManager = new UIManager({
                stateManager,
                drawingManager
            });
            
            // Initialize Rotation Handler
            this.rotationHandler = new RotationHandler({
                mapService,
                stateManager,
                polygonManager
            });
            
            // Initialize Rectangle Selection Manager
            this.rectangleSelectionManager = new RectangleSelectionManager({
                mapService,
                stateManager,
                detectionService,
                polygonManager
            });
            
            // Initialize Clipboard Service
            this.clipboardService = new ClipboardService({
                mapService,
                stateManager,
                notificationService: this.uiManager // UIManager implements showNotification
            });

            // Initialize UI and event listeners
            this.setupEventListeners();
            this.setupVisibilityListener();
            
            // Add listener for selection changes to control rotate buttons visibility
            this.#setupSelectionChangeListener();
            
            console.log('EditService initialized');
        } catch (error) {
            console.error('Error initializing EditService:', error);
            throw error;
        }
    }

    setupEventListeners() {
        try {
            this.eventManager.setupEventListeners();
            
            // Add event listeners for copy and paste actions
            const copyPanelsBtn = document.querySelector('#copyPanelsBtn');
            if (copyPanelsBtn) {
                copyPanelsBtn.addEventListener('click', () => {
                    this.clipboardService.handleCopyPanels();
                });
            }
            
            // Add keyboard shortcuts for copy and paste
            document.addEventListener('keydown', (e) => {
                if (!this.isEditMode) return;
                
                // Check if Ctrl+C or Command+C is pressed
                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    this.clipboardService.handleCopyPanels();
                }
                
                // Check if Ctrl+V or Command+V is pressed
                if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                    this.clipboardService.handlePastePanels();
                }
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // When the tab becomes hidden, clean up event listeners
                // console.log('Tab hidden, event listeners cleanup skipped.');
            } else {
                // When the tab becomes visible, re-setup event listeners
                this.eventManager.setupEventListeners();
                // console.log('Tab visible, event listeners re-attached.');
            }
        });
    }

    init() {
        try {
            // Expose global function for edit button
            window.editImage = () => this.toggleEditMode();
            console.log('EditService ready');
        } catch (error) {
            console.error('Error initializing EditService:', error);
        }
    }

    toggleEditMode() {
        try {
            const updatedIsEditMode = !this.isEditMode;
            this.isEditMode = updatedIsEditMode;
            
            // Hide rotation handle when exiting edit mode
            if (!updatedIsEditMode) {
                this.rotationHandler.hideRotationHandle();
            }
            
            // If leaving edit mode, ensure drawing mode is exited
            if (!updatedIsEditMode && this.drawingManager.isInDrawingMode) {
                this.drawingManager.exitDrawingMode();
                this.uiManager.updateDrawingModeIndicator(false);
                const createPolygonBtn = this.uiManager.getElement('createPolygonBtn');
                if (createPolygonBtn) {
                    createPolygonBtn.classList.remove('active');
                }
            }
            
            // Update UI state
            this.uiManager.updateUIState(updatedIsEditMode);
            
            // Make the map non-draggable in edit mode
            this.updateMapOptions(updatedIsEditMode);
            
            // Ensure visibility is properly managed
            if (this.detectionService) {
                if (!updatedIsEditMode) {
                    if (this.detectionService.panelsActive) {
                        this.detectionService.currentPolygonsRoof?.forEach(polygon => {
                            if (polygon && !polygon.isPanelElement) {
                                polygon.setVisible(false);
                            }
                        });
                        this.detectionService.currentPolygonsObjects?.forEach(polygon => {
                            if (polygon && !polygon.isPanelElement) {
                                polygon.setVisible(false);
                            }
                        });
                    }
                }
            }
            
            // Update the state *after* we've handled visibility
            this.stateManager.setState({ 
                isEditMode: updatedIsEditMode,
                selectedPolygons: new Set()
            }, 'EditService.toggleEditMode');
            
            // Update polygon interactions
            this.updatePolygons(updatedIsEditMode);
            
            return updatedIsEditMode;
        } catch (error) {
            console.error('Error toggling edit mode:', error);
            return this.isEditMode;
        }
    }

    updateMapOptions(isEditMode) {
        try {
            // Get the active map (could be main map or image map)
            const map = this.mapService.getActiveMap();
            if (map) {
                const isImageMode = window.imageUploadService?.isImageView || false;
                
                // If in image mode, always set draggable to false regardless of edit mode
                // If in regular map mode, set draggable based on edit mode
                map.setOptions({
                    draggable: isImageMode ? false : !isEditMode,
                    scrollwheel: isImageMode ? false : !isEditMode,
                    gestureHandling: (isEditMode || isImageMode) ? 'none' : 'auto',
                    disableDoubleClickZoom: isEditMode || isImageMode
                });
                
                // Prevent map panning on polygon click
                if (isEditMode) {
                    // Disable auto-panning for map
                    if (map.setOptions) {
                        map.setOptions({
                            panControl: false
                        });
                    }
                } else {
                    // Re-enable panning when exiting edit mode - but only in regular map mode
                    if (map.setOptions && !isImageMode) {
                        map.setOptions({
                            panControl: true
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error updating map options:', error);
        }
    }

    updatePolygons(isEditMode) {
        try {
            this.polygonManager.updateAllPolygons(isEditMode);
        } catch (error) {
            console.error('Error updating polygons:', error);
        }
    }

    cleanup() {
        try {
            // First cancel any active drawing operations
            if (this.drawingManager) {
                const state = this.stateManager?.getState();
                if (state?.isDrawingPolygon) {
                    this.drawingManager.cancelDrawing();
                }
            }
            
            // Clean up UI Manager
            if (this.uiManager) {
                this.uiManager.cleanup();
                this.uiManager = null;
            }
            
            // Clean up Rotation Handler
            if (this.rotationHandler) {
                this.rotationHandler.cleanup();
                this.rotationHandler = null;
            }
            
            // Clean up Rectangle Selection Manager
            if (this.rectangleSelectionManager) {
                this.rectangleSelectionManager.cleanup();
                this.rectangleSelectionManager = null;
            }
            
            // Clean up Clipboard Service
            if (this.clipboardService) {
                this.clipboardService.cleanup();
                this.clipboardService = null;
            }
            
            // Clean up all services in reverse order of dependency
            if (this.eventManager) this.eventManager.cleanup();
            if (this.drawingManager) this.drawingManager.cleanup();
            if (this.polygonManager) this.polygonManager.cleanup();
            if (this.stateManager) this.stateManager.cleanup();
            
            // Reset map options for both maps if necessary
            const mainMap = this.mapService?.getMap();
            const activeMap = this.mapService?.getActiveMap();
            
            if (mainMap) {
                mainMap.setOptions({
                    draggable: true,
                    scrollwheel: true,
                    gestureHandling: 'auto',
                    disableDoubleClickZoom: false
                });
            }
            
            if (activeMap && activeMap !== mainMap) {
                activeMap.setOptions({
                    draggable: false,
                    scrollwheel: false,
                    gestureHandling: 'none',
                    disableDoubleClickZoom: true
                });
            }
            
            // Clean references to services
            this.mapService = null;
            this.stateManager = null;
            this.detectionService = null;
            this.eventManager = null;
            this.drawingManager = null;
            this.polygonManager = null;
            
            console.log('EditService cleaned up');
        } catch (error) {
            console.error('Error during EditService cleanup:', error);
        }
    }
    
    /**
     * Update clipboard data if panels are moved
     */
    updateClipboardAfterPanelMove() {
        if (this.clipboardService) {
            this.clipboardService.updateClipboardIfNeeded();
        }
    }

    // Listen for selection changes to update the rotation handle
    #setupSelectionChangeListener() {
        this.stateManager.addListener('selectedPolygons', (newSelection, oldSelection) => {
            // Show/hide rotation handle based on selection
            const hasSelectedPanels = Array.from(newSelection).some(polygon => polygon.isPanelElement);
            
            if (hasSelectedPanels && this.stateManager.getState().isEditMode) {
                // Instead of show(), use updateRotationHandlePosition() to display the rotation handle
                this.rotationHandler.updateRotationHandlePosition();
            } else {
                // Use the existing hideRotationHandle() method instead of hide()
                this.rotationHandler.hideRotationHandle();
            }
        });
    }
}
