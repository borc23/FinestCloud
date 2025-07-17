/**
 * RectangleSelectionManager.js
 * Manages the rectangular selection functionality for selecting multiple polygons/panels
 * 
 * Selection Behavior:
 * - Right-click + drag: Replace current selection with new selection
 * - Ctrl + Right-click + drag: Add new selection to existing selection
 * - Alt + Right-click + drag: Remove new selection from existing selection
 */

import { EventListenerTracker } from './EventListenerTracker.js';
import { StyleConfig } from './StyleConfig.js';

export class RectangleSelectionManager {
    #mapService = null;
    #stateManager = null;
    #eventTracker = null;
    #selectionActive = false;
    #startPoint = null;
    #currentPoint = null;
    #selectionRectangle = null;
    #selectionBox = null;
    #isAltKeyPressed = false;
    #isCtrlKeyPressed = false;
    #detectionService = null;
    #mapDraggableState = null; // Store the original draggable state
    #polygonManager = null;

    /**
     * Constructor for the RectangleSelectionManager
     * @param {Object} dependencies - Dependencies needed by the manager
     */
    constructor(dependencies) {
        const { mapService, stateManager, detectionService, polygonManager } = dependencies;
        
        if (!mapService) throw new Error('Map service is required');
        if (!stateManager) throw new Error('State manager is required');
        if (!detectionService) throw new Error('Detection service is required');
        
        this.#mapService = mapService;
        this.#stateManager = stateManager;
        this.#detectionService = detectionService;
        this.#polygonManager = polygonManager;
        this.#eventTracker = new EventListenerTracker();
        
        this.#setupStateListeners();
    }
    
    /**
     * Set up listeners to toggle selection functionality based on edit mode
     */
    #setupStateListeners() {
        // Listen for edit mode changes to enable/disable rectangle selection
        this.#stateManager.addListener('isEditMode', (isEditMode) => {
            if (isEditMode) {
                this.#setupSelectionEvents();
            } else {
                this.#removeSelectionEvents();
            }
        });
    }
    
    /**
     * Set up the selection events when edit mode is active
     */
    #setupSelectionEvents() {
        const map = this.#mapService.getActiveMap();
        if (!map) return;
        
        // Add event for starting selection with right mouse button
        this.#eventTracker.addListener(map.getDiv(), 'mousedown', (e) => {
            // Only start selection with right mouse button
            if (e.button === 2 || e.which === 3) {
                e.preventDefault();
                this.#startSelection(e);
            }
        });
        
        // Add keyboard event listeners for modifier keys
        document.addEventListener('keydown', this.#handleKeyDown);
        document.addEventListener('keyup', this.#handleKeyUp);
        
        // Prevent context menu on the map when in edit mode
        this.#eventTracker.addListener(map.getDiv(), 'contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }
    
    /**
     * Temporarily disable map dragging during selection
     */
    #disableMapDragging() {
        const map = this.#mapService.getActiveMap();
        if (!map) return;
        
        // Store current draggable state before disabling
        this.#mapDraggableState = {
            draggable: map.get('draggable'),
            scrollwheel: map.get('scrollwheel'),
            gestureHandling: map.get('gestureHandling'),
            disableDoubleClickZoom: map.get('disableDoubleClickZoom')
        };
        
        // Disable map dragging during selection
        map.setOptions({
            draggable: false,
            scrollwheel: false,
            gestureHandling: 'none',
            disableDoubleClickZoom: true
        });
    }
    
    /**
     * Restore map dragging functionality to its previous state
     */
    #restoreMapDragging() {
        const map = this.#mapService.getActiveMap();
        if (!map || !this.#mapDraggableState) return;
        
        // Restore the map to its previous state
        map.setOptions({
            draggable: this.#mapDraggableState.draggable,
            scrollwheel: this.#mapDraggableState.scrollwheel,
            gestureHandling: this.#mapDraggableState.gestureHandling,
            disableDoubleClickZoom: this.#mapDraggableState.disableDoubleClickZoom
        });
        
        this.#mapDraggableState = null;
    }    /**
     * Handle key down events to track modifier keys
     */
    #handleKeyDown = (e) => {
        if (e.key === 'Alt') {
            this.#isAltKeyPressed = true;
        } else if (e.key === 'Control') {
            this.#isCtrlKeyPressed = true;
        }
    }      /**
     * Handle key up events to track modifier keys
     */
    #handleKeyUp = (e) => {
        if (e.key === 'Alt') {
            this.#isAltKeyPressed = false;
        } else if (e.key === 'Control') {
            this.#isCtrlKeyPressed = false;
        }
    }
    
    /**
     * Start the selection process when the user presses the right mouse button
     */
    #startSelection(e) {
        const map = this.#mapService.getActiveMap();
        if (!map || this.#selectionActive || this.#stateManager.getState().isDrawingPolygon) return;
        
        this.#selectionActive = true;
        
        // Temporarily disable map dragging during selection
        this.#disableMapDragging();
        
        // Convert mouse position to map coordinates
        const mapDiv = map.getDiv();
        const rect = mapDiv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Create mouse position as a point in screen space
        this.#startPoint = { x, y };
        this.#currentPoint = { x, y };
        
        // Create the selection box element
        this.#createSelectionBox();
        
        // Add mouse move and up events
        document.addEventListener('mousemove', this.#handleSelectionMouseMove);
        document.addEventListener('mouseup', this.#handleSelectionMouseUp);
        
        // Set cursor to crosshair during selection
        mapDiv.style.cursor = 'crosshair';
    }
    
    /**
     * Create the visual selection box element
     */
    #createSelectionBox() {
        // Remove any existing selection box
        this.#removeSelectionBox();
        
        // Create a new div for the selection box
        this.#selectionBox = document.createElement('div');
        this.#selectionBox.className = 'rectangle-selection-box';
        this.#selectionBox.style.position = 'absolute';
        this.#selectionBox.style.border = '2px dashed #4285F4';
        this.#selectionBox.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
        this.#selectionBox.style.zIndex = '9000';
        this.#selectionBox.style.pointerEvents = 'none'; // Make sure it doesn't block other events
        
        // Add to map container
        const mapDiv = this.#mapService.getActiveMap().getDiv();
        mapDiv.appendChild(this.#selectionBox);
        
        // Update the position
        this.#updateSelectionBox();
    }
    
    /**
     * Update the selection box position and size
     */
    #updateSelectionBox() {
        if (!this.#selectionBox || !this.#startPoint || !this.#currentPoint) return;
        
        // Calculate the top-left corner and dimensions
        const left = Math.min(this.#startPoint.x, this.#currentPoint.x);
        const top = Math.min(this.#startPoint.y, this.#currentPoint.y);
        const width = Math.abs(this.#currentPoint.x - this.#startPoint.x);
        const height = Math.abs(this.#currentPoint.y - this.#startPoint.y);
        
        // Apply to the selection box
        this.#selectionBox.style.left = `${left}px`;
        this.#selectionBox.style.top = `${top}px`;
        this.#selectionBox.style.width = `${width}px`;
        this.#selectionBox.style.height = `${height}px`;
    }
    
    /**
     * Handle mouse move during selection
     */
    #handleSelectionMouseMove = (e) => {
        if (!this.#selectionActive) return;
        
        // Update current position
        const mapDiv = this.#mapService.getActiveMap().getDiv();
        const rect = mapDiv.getBoundingClientRect();
        this.#currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Update the selection box
        this.#updateSelectionBox();
    }
    
    /**
     * Handle mouse up to complete selection
     */
    #handleSelectionMouseUp = (e) => {
        if (!this.#selectionActive) return;
        
        // Finalize the current point
        const mapDiv = this.#mapService.getActiveMap().getDiv();
        const rect = mapDiv.getBoundingClientRect();
        this.#currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Select polygons within the rectangle
        this.#selectPolygonsInRectangle();
        
        // Clean up
        this.#endSelection();
        
        // Reset cursor
        mapDiv.style.cursor = 'default';
    }
    
    /**
     * Select all polygons that are within the selection rectangle
     */
    #selectPolygonsInRectangle() {
        const map = this.#mapService.getActiveMap();
        if (!map || !this.#startPoint || !this.#currentPoint) return;
        
        // Check if this selection was triggered during vertex removal
        // If the rectangle is very small (essentially just a click), abort selection process
        const selectionWidth = Math.abs(this.#startPoint.x - this.#currentPoint.x);
        const selectionHeight = Math.abs(this.#startPoint.y - this.#currentPoint.y);
        
        // If the selection box is very small (likely because it was initiated from a vertex right-click)
        // then don't change the current selection state - this prevents deselection when removing vertices
        if (selectionWidth < 5 && selectionHeight < 5) {
            return; // Exit without changing selection
        }
        
        // Create selection bounds in screen coordinates
        const selectionBounds = {
            minX: Math.min(this.#startPoint.x, this.#currentPoint.x),
            maxX: Math.max(this.#startPoint.x, this.#currentPoint.x),
            minY: Math.min(this.#startPoint.y, this.#currentPoint.y),
            maxY: Math.max(this.#startPoint.y, this.#currentPoint.y)
        };
        
        // Convert the selection bounds to LatLngBounds
        const sw = this.#screenToLatLng(map, selectionBounds.minX, selectionBounds.maxY);
        const ne = this.#screenToLatLng(map, selectionBounds.maxX, selectionBounds.minY);
        const bounds = new google.maps.LatLngBounds(sw, ne);
        
        // Get current state for selection logic
        const state = this.#stateManager.getState();
        const currentSelection = state.selectedPolygons;          // Decide what to do based on modifier keys:
        // - No modifier: Replace selection
        // - Ctrl: Add to selection
        // - Alt: Remove from selection
        let newSelection;
        
        if (!this.#isAltKeyPressed && !this.#isCtrlKeyPressed) {
            // Replace selection
            newSelection = new Set();
            
            // Deselect all current panels first
            if (this.#polygonManager) {
                this.#polygonManager.deselectAllPanels();
            }
        } else if (this.#isCtrlKeyPressed) {
            // Add to selection
            newSelection = new Set(currentSelection);        } else if (this.#isAltKeyPressed) {
            // Remove from selection
            newSelection = new Set(currentSelection);
        }
        
        // Process roof polygons
        if (this.#detectionService?.currentPolygonsRoof) {
            this.#detectionService.currentPolygonsRoof.forEach(polygon => {
                if (polygon && this.#isPolygonInBounds(polygon, bounds)) {
                    this.#updateSelectionSet(newSelection, polygon);
                }
            });
        }
        
        // Process object polygons
        if (this.#detectionService?.currentPolygonsObjects) {
            this.#detectionService.currentPolygonsObjects.forEach(polygon => {
                if (polygon && this.#isPolygonInBounds(polygon, bounds)) {
                    this.#updateSelectionSet(newSelection, polygon);
                }
            });
        }
          // Update selection state
        this.#stateManager.setState({ 
            selectedPolygons: newSelection 
        }, 'RectangleSelectionManager.selectPolygonsInRectangle');
        
        // Apply proper styling to ALL selected panels - make them draggable but not editable
        this.#applyPanelStyles(Array.from(newSelection).filter(polygon => polygon.isPanelElement));
    }
      /**
     * Apply proper styling to all selected panels - making them movable but not editable
     */
    #applyPanelStyles(selectedPanels) {
        selectedPanels.forEach(panel => {
            if (panel && panel.isPanelElement) {
                const moduleType = panel.moduleType || 'STANDARD';
                const selectedOptions = StyleConfig.getPanelOptions('selected', moduleType);
                
                // Set options to make panels draggable but not editable
                panel.setOptions({
                    ...selectedOptions,
                    draggable: true,
                    editable: false
                });
            }
        });
    }
    
    /**
     * Update the selection set based on modifier keys
     */
    #updateSelectionSet(selectionSet, polygon) {
        if (this.#isAltKeyPressed) {
            // Remove from selection
            selectionSet.delete(polygon);
        } else {
            // Add to selection
            selectionSet.add(polygon);
        }
    }
    
    /**
     * Check if a polygon is inside or overlapping the selection bounds
     */
    #isPolygonInBounds(polygon, bounds) {
        if (!polygon || !polygon.getPath) return false;
        
        // Check if any point of the polygon is inside bounds
        const path = polygon.getPath();
        
        // Fast pre-check with polygon bounds
        const polygonBounds = new google.maps.LatLngBounds();
        path.forEach(point => polygonBounds.extend(point));
        
        // Check for intersection
        if (this.#boundsIntersect(bounds, polygonBounds)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if two bounds intersect
     */
    #boundsIntersect(bounds1, bounds2) {
        return !(
            bounds1.getNorthEast().lng() < bounds2.getSouthWest().lng() ||
            bounds1.getSouthWest().lng() > bounds2.getNorthEast().lng() ||
            bounds1.getNorthEast().lat() < bounds2.getSouthWest().lat() ||
            bounds1.getSouthWest().lat() > bounds2.getNorthEast().lat()
        );
    }
    
    /**
     * Convert screen coordinates to LatLng
     */
    #screenToLatLng(map, x, y) {
        const topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
        const bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
        const scale = Math.pow(2, map.getZoom());
        const worldPoint = new google.maps.Point(
            (x / scale) + bottomLeft.x,
            (y / scale) + topRight.y
        );
        return map.getProjection().fromPointToLatLng(worldPoint);
    }
    
    /**
     * End the selection process
     */
    #endSelection() {
        this.#selectionActive = false;
        this.#removeSelectionBox();
        
        document.removeEventListener('mousemove', this.#handleSelectionMouseMove);
        document.removeEventListener('mouseup', this.#handleSelectionMouseUp);
        
        // Restore the map's draggable state
        this.#restoreMapDragging();
        
        // Reset cursor
        const mapDiv = this.#mapService.getActiveMap()?.getDiv();
        if (mapDiv) {
            mapDiv.style.cursor = 'default';
        }
    }
    
    /**
     * Remove the selection box from the DOM
     */
    #removeSelectionBox() {
        if (this.#selectionBox && this.#selectionBox.parentNode) {
            this.#selectionBox.parentNode.removeChild(this.#selectionBox);
        }
        this.#selectionBox = null;
    }
    
    /**
     * Remove all selection events
     */
    #removeSelectionEvents() {
        // End any active selection
        this.#endSelection();
        
        // Clear event listeners
        this.#eventTracker.cleanup();
        
        // Remove keyboard event listeners
        document.removeEventListener('keydown', this.#handleKeyDown);
        document.removeEventListener('keyup', this.#handleKeyUp);
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        this.#removeSelectionEvents();
        this.#eventTracker.cleanup();
        this.#removeSelectionBox();
        
        // Make sure we restore map draggability if we're cleaning up during active selection
        if (this.#selectionActive && this.#mapDraggableState) {
            this.#restoreMapDragging();
        }          // Reset state
        this.#selectionActive = false;
        this.#startPoint = null;
        this.#currentPoint = null;
        this.#isAltKeyPressed = false;
        this.#isCtrlKeyPressed = false;
        this.#mapDraggableState = null;
    }
}