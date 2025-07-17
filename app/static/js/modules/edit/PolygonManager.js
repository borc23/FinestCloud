import { StyleConfig } from './StyleConfig.js';
import { EventListenerTracker } from '../utils/EventListenerTracker.js';

export class PolygonManager {
    #panelDragData = null;
    #editService = null;
    #originalPanelPositions = new Map(); // Store original positions of panels

    constructor(styleConfig, detectionService, stateManager, mapService) {
        this.styleConfig = styleConfig;
        this.detectionService = detectionService;
        this.stateManager = stateManager;
        this.mapService = mapService;
        
        this.mapClickListener = null;

        this.eventTracker = new EventListenerTracker();
        this.polygonListeners = new Map();
        
        this.stateManager.addListener('isEditMode', (isEditMode) => {
            this.updateMapClickHandler(isEditMode);
        });
        
        this.stateManager.addListener('selectedPolygons', () => {
            this.refreshAllPolygons();
        });
    }

    // Set reference to EditService for callbacks
    setEditService(editService) {
        this.#editService = editService;
    }

    // Store original position when a panel is created
    storeOriginalPosition(panel) {
        if (!panel || !panel.getPath) return;
        
        const path = panel.getPath();
        const positions = Array.from({ length: path.getLength() }, (_, i) => {
            const point = path.getAt(i);
            return { lat: point.lat(), lng: point.lng() };
        });
        
        this.#originalPanelPositions.set(panel, positions);
    }

    // Update original positions for all panels
    updateOriginalPositions() {
        if (this.detectionService?.currentPolygonsRoof) {
            this.detectionService.currentPolygonsRoof.forEach(panel => {
                if (panel && panel.isPanelElement) {
                    this.storeOriginalPosition(panel);
                }
            });
        }
    }

    // Get original position of a panel
    getOriginalPosition(panel) {
        return this.#originalPanelPositions.get(panel);
    }

    setAllPolygonsClickable(clickable) {
        const options = { clickable };
        
        if (this.detectionService?.currentPolygonsRoof) {
            this.detectionService.currentPolygonsRoof.forEach(polygon => {
                if (polygon) polygon.setOptions(options);
            });
        }
        
        if (this.detectionService?.currentPolygonsObjects) {
            this.detectionService.currentPolygonsObjects.forEach(polygon => {
                if (polygon) polygon.setOptions(options);
            });
        }
    }

    updateMapClickHandler(isEditMode) {
        if (this.mapClickListener) {
            google.maps.event.removeListener(this.mapClickListener);
            this.mapClickListener = null;
        }
        
        if (isEditMode) {
            // Use getActiveMap instead of getMap
            const activeMap = this.mapService.getActiveMap();
            if (!activeMap) {
                console.error('No active map available for click handler');
                return;
            }
            
            this.mapClickListener = activeMap.addListener('click', (e) => {
                const state = this.stateManager.getState();
                
                if (state.isDrawingPolygon) return;
                
                this.deselectAllPanels();
                this.stateManager.setState({ selectedPolygons: new Set() }, 'PolygonManager.mapClick');
            });
        }
    }

    updateAllPolygons(isEditMode) {
        // Store current visibility state to ensure we don't lose polygons
        const roofPolygonsVisible = [];
        const objectPolygonsVisible = [];
        
        // Save visibility state for non-panel polygons only
        if (this.detectionService?.currentPolygonsRoof) {
            this.detectionService.currentPolygonsRoof.forEach((polygon, index) => {
                if (polygon && !polygon.isPanelElement) {
                    roofPolygonsVisible[index] = polygon.getVisible !== undefined ? polygon.getVisible() : true;
                }
            });
        }
        
        if (this.detectionService?.currentPolygonsObjects) {
            this.detectionService.currentPolygonsObjects.forEach((polygon, index) => {
                if (polygon && !polygon.isPanelElement) {
                    objectPolygonsVisible[index] = polygon.getVisible !== undefined ? polygon.getVisible() : true;
                }
            });
        }
        
        // Update polygon states
        if (this.detectionService?.currentPolygonsRoof) {
            this.detectionService.currentPolygonsRoof.forEach((polygon, index) => {
                if (polygon) {
                    this.updatePolygonState(polygon, isEditMode);
                    if (!polygon.isPanelElement && roofPolygonsVisible[index] !== undefined) {
                        polygon.setVisible(roofPolygonsVisible[index]);
                    }
                    // Always keep panels visible
                    if (polygon.isPanelElement) {
                        polygon.setVisible(true);
                    }
                }
            });
        }

        if (this.detectionService?.currentPolygonsObjects) {
            this.detectionService.currentPolygonsObjects.forEach((polygon, index) => {
                if (polygon) {
                    this.updatePolygonState(polygon, isEditMode);
                    if (!polygon.isPanelElement && objectPolygonsVisible[index] !== undefined) {
                        polygon.setVisible(objectPolygonsVisible[index]);
                    }
                }
            });
        }



        this.updateMapClickHandler(isEditMode);
        this.verifySelectedPolygonsDraggable();
    }
    
    verifySelectedPolygonsDraggable() {
        const state = this.stateManager.getState();
        if (!state.isEditMode) return;
        
        const selectedPolygons = Array.from(state.selectedPolygons);
        
        selectedPolygons.forEach(polygon => {
            if (!polygon) return;
            
            const isDraggable = typeof polygon.getDraggable === 'function' ? 
                polygon.getDraggable() : 
                polygon.draggable;
                
            const isEditable = typeof polygon.getEditable === 'function' ? 
                polygon.getEditable() : 
                polygon.editable;
                
            if (!isDraggable || !isEditable) {
                polygon.setOptions({
                    draggable: true,
                    editable: true
                });
            }
        });
    }

    refreshAllPolygons() {
        const state = this.stateManager.getState();
        this.updateAllPolygons(state.isEditMode);
    }

    updatePolygonState(polygon, isEditMode) {
        if (!polygon) return;

        try {
            const state = this.stateManager.getState();
            const isRoof = this.detectionService?.currentPolygonsRoof?.includes(polygon) ?? false;
            const isSelected = state.selectedPolygons.has(polygon);
            
            this.removePolygonListeners(polygon);
            
            if (polygon.isPanelElement) {
                // Use the StyleConfig panel options
                const moduleType = polygon.moduleType || 'STANDARD';
                const optionState = isSelected ? 'selected' : 'default';
                const panelOptions = StyleConfig.getPanelOptions(optionState, moduleType);
                
                // Add editMode specific options
                this.setPolygonOptions(polygon, {
                    ...panelOptions,
                    draggable: isSelected && isEditMode,
                    clickable: isEditMode
                });
            } else {
                const options = StyleConfig.getOptionsForType(isRoof, isSelected);
                
                if (isSelected && isEditMode) {
                    options.draggable = true;
                    options.editable = true;
                }
                
                polygon.setOptions({
                    ...options,
                    editable: isSelected && isEditMode,
                    draggable: isSelected && isEditMode,
                    clickable: isEditMode
                });
            }

            if (isEditMode) {
                this.addPolygonListeners(polygon);
            }
        } catch (error) {
            console.error('Error updating polygon state:', error);
        }
    }

    handlePolygonClick(polygon, e) {
        const state = this.stateManager.getState();
        if (!state.isEditMode) return;
        
        try {
            e.stop && e.stop();
            
            if (e.cancelBubble !== undefined) e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
            
            const isRoof = this.detectionService?.currentPolygonsRoof?.includes(polygon) ?? false;
            
            if (!state.isCtrlPressed) {
                this.deselectAllPanels();
                state.selectedPolygons.clear();
            }
            
            if (state.selectedPolygons.has(polygon)) {
                this.deselectPanel(polygon);
                const newSelection = new Set(state.selectedPolygons);
                newSelection.delete(polygon);
                this.stateManager.setState({ selectedPolygons: newSelection }, 'PolygonManager.handlePolygonClick.deselect');
                
                // Update remaining selected panels to ensure they keep the correct state
                if (newSelection.size > 0) {
                    newSelection.forEach(selectedPanel => {
                        if (selectedPanel.isPanelElement) {
                            const moduleType = selectedPanel.moduleType || 'STANDARD';
                            const selectedOptions = StyleConfig.getPanelOptions('selected', moduleType);
                            
                            // Keep panels draggable but not editable (fix for the bug)
                            selectedPanel.setOptions({
                                ...selectedOptions,
                                draggable: true,
                                editable: false
                            });
                        } else {
                            // For non-panel elements
                            const pIsRoof = this.detectionService?.currentPolygonsRoof?.includes(selectedPanel) ?? false;
                            const options = StyleConfig.getOptionsForType(pIsRoof, true);
                            
                            selectedPanel.setOptions({
                                ...options,
                                editable: true,
                                draggable: true
                            });
                        }
                    });
                }
            } else {
                const newSelection = new Set(state.selectedPolygons);
                newSelection.add(polygon);
                this.stateManager.setState({ selectedPolygons: newSelection }, 'PolygonManager.handlePolygonClick.select');
                
                // Apply proper options for the newly selected panel
                if (polygon.isPanelElement) {
                    const moduleType = polygon.moduleType || 'STANDARD';
                    const panelOptions = StyleConfig.getPanelOptions('selected', moduleType);
                    
                    polygon.setOptions({
                        ...panelOptions,
                        draggable: true
                    });
                    
                    // Also refresh options for all other selected panels
                    newSelection.forEach(selectedPanel => {
                        if (selectedPanel !== polygon && selectedPanel.isPanelElement) {
                            const selectedModuleType = selectedPanel.moduleType || 'STANDARD';
                            const selectedPanelOptions = StyleConfig.getPanelOptions('selected', selectedModuleType);
                            
                            selectedPanel.setOptions({
                                ...selectedPanelOptions,
                                draggable: true
                            });
                        }
                    });
                } else {
                    const options = StyleConfig.getOptionsForType(isRoof, true);
                    polygon.setOptions({
                        ...options,
                        editable: true,
                        draggable: true
                    });
                }
            }
        } catch (error) {
            console.error('Error handling polygon click:', error);
        }
    }

    // Handle right-click on polygon (not vertex)
    handlePolygonRightClick(polygon, e) {
        if (!polygon) return;
        
        try {
            const state = this.stateManager.getState();
            if (!state.isEditMode) return;
            
            // Safely get properties with defensive checks
            const isDraggable = typeof polygon.getDraggable === 'function' ? polygon.getDraggable() : polygon.draggable;
            const isEditable = typeof polygon.getEditable === 'function' ? polygon.getEditable() : polygon.editable;
            const isClickable = typeof polygon.getClickable === 'function' ? polygon.getClickable() : polygon.clickable;
            const isVisible = typeof polygon.getVisible === 'function' ? polygon.getVisible() : polygon.visible;
            const zIndex = typeof polygon.getZIndex === 'function' ? polygon.getZIndex() : polygon.zIndex;
            
            console.log(`Polygon detailed info:`, {
                draggable: isDraggable,
                editable: isEditable,
                clickable: isClickable,
                visible: isVisible,
                zIndex: zIndex,
                inRoofCollection: this.detectionService?.currentPolygonsRoof?.includes(polygon) || false,
                inObjectCollection: this.detectionService?.currentPolygonsObjects?.includes(polygon) || false,
                isSelected: this.stateManager.getState().selectedPolygons.has(polygon),
                path: polygon.getPath ? polygon.getPath().getArray().map(p => ({lat: p.lat, lng: p.lng})) : []
            });
        } catch (error) {
            console.error('Error handling polygon right-click:', error);
        }
    }

    // Add all necessary event listeners to a polygon
    addPolygonListeners(polygon) {
        if (!polygon) return;
        
        // Clear any existing listeners first
        this.removePolygonListeners(polygon);
        
        try {
            // Store listeners for this polygon
            const listeners = [];
            
            // Click listener for selection
            listeners.push(
                this.eventTracker.addListener(polygon, 'click', (e) => {
                    e.stop && e.stop();
                    this.handlePolygonClick(polygon, e);
                })
            );
            
            // KEEPING: Right-click for polygon info
            listeners.push(
                this.eventTracker.addListener(polygon, 'rightclick', (e) => {
                    if (e.vertex === undefined) { // Only for general right-click, not vertex right-click
                        this.handlePolygonRightClick(polygon, e);
                    }
                })
            );
            
            // Right-click for vertex removal
            listeners.push(
                this.eventTracker.addListener(polygon, 'rightclick', (e) => {
                    const state = this.stateManager.getState();
                    if (state.selectedPolygons.has(polygon) && e.vertex !== undefined) {
                        this.removeVertex(polygon, e.vertex);
                    }
                })
            );
            
            // Double-click for vertex addition
            listeners.push(
                this.eventTracker.addListener(polygon, 'dblclick', (e) => {
                    e.stop && e.stop(); // Prevent map zoom
                    
                    const state = this.stateManager.getState();
                    if (state.selectedPolygons.has(polygon) && e.vertex !== undefined) {
                        this.addVertex(polygon, e.vertex, e.latLng);
                    }
                })
            );
            
            // Add hover effects for panels
            if (polygon.isPanelElement) {
                // Store original position if not already stored
                if (!this.#originalPanelPositions.has(polygon)) {
                    this.storeOriginalPosition(polygon);
                }
                
                listeners.push(
                    this.eventTracker.addListener(polygon, 'mouseover', () => {
                        const state = this.stateManager.getState();
                        if (!state.isEditMode || state.selectedPolygons.has(polygon)) return;
                        
                        const moduleType = polygon.moduleType || 'STANDARD';
                        const hoverOptions = StyleConfig.getPanelOptions('hover', moduleType);
                        this.setPolygonOptions(polygon, hoverOptions);
                    })
                );
                
                listeners.push(
                    this.eventTracker.addListener(polygon, 'mouseout', () => {
                        const state = this.stateManager.getState();
                        if (!state.isEditMode || state.selectedPolygons.has(polygon)) return;
                        
                        const moduleType = polygon.moduleType || 'STANDARD';
                        const defaultOptions = StyleConfig.getPanelOptions('default', moduleType);
                        this.setPolygonOptions(polygon, defaultOptions);
                    })
                );
                
                // Add drag event listeners for synchronized panel movement
                listeners.push(
                    this.eventTracker.addListener(polygon, 'dragstart', (e) => {
                        if (this.stateManager.getState().selectedPolygons.has(polygon)) {
                            // Store initial state of all panels
                            this.#panelDragData = {
                                draggedPanel: polygon,
                                initialPositions: new Map(),
                                startLatLng: e.latLng
                            };

                            // Store initial positions of all selected panels
                            this.stateManager.getState().selectedPolygons.forEach(selectedPanel => {
                                if (selectedPanel.isPanelElement) {
                                    const path = selectedPanel.getPath().getArray();
                                    this.#panelDragData.initialPositions.set(selectedPanel, 
                                        path.map(point => ({
                                            lat: point.lat(),
                                            lng: point.lng()
                                        }))
                                    );
                                }
                            });
                        }
                    })
                );

                listeners.push(
                    this.eventTracker.addListener(polygon, 'drag', (e) => {
                        if (this.#panelDragData && this.#panelDragData.draggedPanel === polygon) {
                            const latDiff = e.latLng.lat() - this.#panelDragData.startLatLng.lat();
                            const lngDiff = e.latLng.lng() - this.#panelDragData.startLatLng.lng();

                            // Move all panels based on the initial positions
                            this.#panelDragData.initialPositions.forEach((initialPath, panel) => {
                                if (panel !== polygon) {  // Skip the dragged panel as it moves automatically
                                    const newPath = initialPath.map(point => 
                                        new google.maps.LatLng(
                                            point.lat + latDiff,
                                            point.lng + lngDiff
                                        )
                                    );
                                    panel.setPath(newPath);
                                }
                            });
                            
                            // Update rotation handle position during drag
                            if (this.#editService && this.#editService.rotationHandler) {
                                this.#editService.rotationHandler.updateRotationHandlePosition();
                            }
                        }
                    })
                );
                
                listeners.push(
                    this.eventTracker.addListener(polygon, 'dragend', () => {
                        if (this.#panelDragData) {
                            // Update original positions for all dragged panels
                            this.#panelDragData.initialPositions.forEach((_, panel) => {
                                this.storeOriginalPosition(panel);
                            });
                            
                            // Also store the main dragged panel
                            this.storeOriginalPosition(this.#panelDragData.draggedPanel);
                            
                            this.#panelDragData = null;
                        }
                        
                        // Final update of rotation handle position
                        if (this.#editService && this.#editService.rotationHandler) {
                            this.#editService.rotationHandler.updateRotationHandlePosition();
                            
                            // Update clipboard data if we have content to prevent "jump back" issue
                            // when copying panels that have been moved
                            if (this.#editService.updateClipboardAfterPanelMove) {
                                this.#editService.updateClipboardAfterPanelMove();
                            }
                        }
                    })
                );
            }
            
            this.polygonListeners.set(polygon, listeners);
            
        } catch (error) {
            console.error('Error adding polygon listeners:', error);
        }
    }
    
    // Remove all event listeners from a polygon
    removePolygonListeners(polygon) {
        if (!polygon) return;
        
        try {
            // Use our tracker to remove listeners
            this.eventTracker.removeAllListeners(polygon);
            
            // Clear from our tracking Map
            this.polygonListeners.delete(polygon);
        } catch (error) {
            console.error('Error removing polygon listeners:', error);
        }
    }

    // Deselect all panels
    deselectAllPanels() {
        try {
            // Deselect roof polygons
            if (this.detectionService?.currentPolygonsRoof) {
                this.detectionService.currentPolygonsRoof.forEach(panel => {
                    if (panel) this.deselectPanel(panel);
                });
            }
            
            // Deselect object polygons
            if (this.detectionService?.currentPolygonsObjects) {
                this.detectionService.currentPolygonsObjects.forEach(panel => {
                    if (panel) this.deselectPanel(panel);
                });
            }
        } catch (error) {
            console.error('Error deselecting all panels:', error);
        }
    }

    // Create a new polygon
    createPolygon(path, isRoof, map) {
        try {
            // Get styling options
            const options = StyleConfig.getOptionsForType(isRoof);
            const state = this.stateManager.getState();
            
            // Create the polygon
            const polygon = new google.maps.Polygon({
                paths: path,
                ...options,
                map: map,
                draggable: state.isEditMode,
                clickable: state.isEditMode
            });
            
            // Add listeners if in edit mode
            if (state.isEditMode) {
                this.addPolygonListeners(polygon);
            }
            
            return polygon;
        } catch (error) {
            console.error('Error creating polygon:', error);
            return null;
        }
    }

    // Set options on a polygon
    setPolygonOptions(polygon, options) {
        if (!polygon) return;
        
        try {
            polygon.setOptions(options);
        } catch (error) {
            console.error('Error setting polygon options:', error);
        }
    }

    // Update a polygon's style based on type and selection state
    updatePolygonStyle(polygon, isRoof, isSelected) {
        if (!polygon) return;
        
        try {
            const options = StyleConfig.getOptionsForType(isRoof, isSelected);
            this.setPolygonOptions(polygon, options);
        } catch (error) {
            console.error('Error updating polygon style:', error);
        }
    }

    removePolygon(polygon) {
        if (!polygon) return;

        try {
            // Remove from selection if needed
            const state = this.stateManager.getState();
            if (state.selectedPolygons.has(polygon)) {
                this.stateManager.removeFromSelection(polygon, 'PolygonManager.removePolygon');
            }

            // Store whether this was a panel before removal
            const wasPanel = polygon.isPanelElement || false;

            // Remove event listeners first
            this.removePolygonListeners(polygon);

            // Remove polygon from the map
            polygon.setMap(null);
            
            // Update the respective polygon arrays
            if (this.detectionService?.currentPolygonsRoof) {
                const index = this.detectionService.currentPolygonsRoof.indexOf(polygon);
                if (index > -1) {
                    this.detectionService.currentPolygonsRoof.splice(index, 1);
                }
            }

            if (this.detectionService?.currentPolygonsObjects) {
                const index = this.detectionService.currentPolygonsObjects.indexOf(polygon);
                if (index > -1) {
                    this.detectionService.currentPolygonsObjects.splice(index, 1);
                }
            }

            // Remove from original positions map
            this.#originalPanelPositions.delete(polygon);
            
            // Update stats panel if this was a panel element
            if (wasPanel && window.solarApp) {
                // Use a small timeout to allow the arrays to update first
                setTimeout(() => {
                    if (typeof window.solarApp.updateStatsFromActualPanels === 'function') {
                        window.solarApp.updateStatsFromActualPanels();
                    } else {
                        // Fallback if function not available
                        const statsPanel = document.querySelector('.roof-live-stats');
                        if (statsPanel) {
                            const currentPanelCount = this.detectionService?.currentPolygonsRoof?.filter(p => p.isPanelElement)?.length || 0;
                            const statsPanelsCurrent = document.getElementById('statsPanelsCurrent');
                            if (statsPanelsCurrent) {
                                statsPanelsCurrent.textContent = currentPanelCount;
                            }
                            
                            // Hide stats if no panels left
                            if (currentPanelCount === 0) {
                                statsPanel.style.display = 'none';
                            }
                        }
                    }
                }, 50);
            }
        } catch (error) {
            console.error('Error removing polygon:', error);
        }
    }
    
    deselectPanel(polygon) {
        if (!polygon) return;
        
        try {
            const state = this.stateManager.getState();
            
            if (polygon.isPanelElement) {
                // Use StyleConfig for panel deselection
                const moduleType = polygon.moduleType || 'STANDARD';
                const defaultOptions = StyleConfig.getPanelOptions('default', moduleType);
                
                this.setPolygonOptions(polygon, {
                    ...defaultOptions,
                    editable: false,
                    draggable: false,
                    clickable: state.isEditMode
                });
            } else {
                // Deselect a regular polygon
                const isRoof = this.detectionService?.currentPolygonsRoof?.includes(polygon) ?? false;
                const options = StyleConfig.getOptionsForType(isRoof, false);
                
                this.setPolygonOptions(polygon, {
                    ...options,
                    editable: false,
                    draggable: state.isEditMode,
                    clickable: state.isEditMode
                    // Keep z-index from StyleConfig options
                });
            }
        } catch (error) {
            console.error('Error deselecting panel:', error);
        }
    }
    
    // Remove a vertex from a polygon
    removeVertex(polygon, vertexIndex) {
        if (!polygon || vertexIndex === undefined) return;
        
        try {
            const path = polygon.getPath();
            path.removeAt(vertexIndex);
            
            // Store whether the polygon was selected before removing the vertex
            const state = this.stateManager.getState();
            const wasSelected = state.selectedPolygons.has(polygon);
            
            // If there are less than 3 points left, remove the polygon
            if (path.getLength() < 3) {
                this.removePolygon(polygon);
                return;
            }
            
            // Important fix: Ensure the polygon stays selected after vertex removal
            if (wasSelected) {
                // Ensure the polygon is still in the selection set
                const currentSelection = new Set(state.selectedPolygons);
                if (!currentSelection.has(polygon)) {
                    currentSelection.add(polygon);
                    this.stateManager.setState({ selectedPolygons: currentSelection }, 'PolygonManager.removeVertex.preserveSelection');
                }
                
                // Re-apply selected styling
                if (polygon.isPanelElement) {
                    const moduleType = polygon.moduleType || 'STANDARD';
                    const selectedOptions = StyleConfig.getPanelOptions('selected', moduleType);
                    
                    polygon.setOptions({
                        ...selectedOptions,
                        editable: true,
                        draggable: true
                    });
                } else {
                    const isRoof = this.detectionService?.currentPolygonsRoof?.includes(polygon) ?? false;
                    const options = StyleConfig.getOptionsForType(isRoof, true);
                    
                    polygon.setOptions({
                        ...options,
                        editable: true,
                        draggable: true
                    });
                }
            }
        } catch (error) {
            console.error('Error removing vertex:', error);
        }
    }
    
    // Add a vertex to a polygon
    addVertex(polygon, vertexIndex, latLng) {
        if (!polygon || vertexIndex === undefined || !latLng) return;
        
        try {
            const path = polygon.getPath();
            path.insertAt(vertexIndex + 1, latLng);
        } catch (error) {
            console.error('Error adding vertex:', error);
        }
    }
    
    #getPanelBounds(panel) {
        if (!panel || !panel.getPath) return null;
        const path = panel.getPath().getArray();
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        return bounds;
    }
    
    #movePanel(panel, newCenter) {
        if (!panel || !panel.getPath || !newCenter) return;
        const path = panel.getPath().getArray();
        
        // Calculate the exact offset from current to new position
        let sumLat = 0, sumLng = 0;
        path.forEach(point => {
            sumLat += point.lat();
            sumLng += point.lng();
        });
        const currentCenter = {
            lat: sumLat / path.length,
            lng: sumLng / path.length
        };
        
        // Calculate the exact difference to maintain precise relative positions
        const latDiff = newCenter.lat() - currentCenter.lat;
        const lngDiff = newCenter.lng() - currentCenter.lng;
        
        // Apply the exact offset to each point
        const newPath = path.map(point => new google.maps.LatLng(
            point.lat() + latDiff,
            point.lng() + latDiff
        ));
        
        panel.setPath(newPath);
    }
    
    #calculateCenter(path) {
        if (!path || !path.length) return null;
        let sumLat = 0;
        let sumLng = 0;
        const len = path.length;
        
        path.forEach(point => {
            sumLat += point.lat();
            sumLng += point.lng();
        });
        
        return new google.maps.LatLng(sumLat / len, sumLng / len);
    }
    
    // Rotate selected panels
    rotateSelectedPanels(angleDegrees) {
        const state = this.stateManager.getState();
        const selectedPanels = Array.from(state.selectedPolygons).filter(p => p.isPanelElement);

        if (selectedPanels.length === 0) return;

        try {
            // 1. Calculate the centroid of all selected panels
            let totalLat = 0;
            let totalLng = 0;
            let totalVertices = 0;
            selectedPanels.forEach(panel => {
                const path = panel.getPath().getArray();
                path.forEach(point => {
                    totalLat += point.lat();
                    totalLng += point.lng();
                });
                totalVertices += path.length;
            });

            if (totalVertices === 0) return; // Should not happen if panels are selected

            const centroid = new google.maps.LatLng(totalLat / totalVertices, totalLng / totalVertices);

            // 2. Rotate each selected panel around the centroid
            selectedPanels.forEach(panel => {
                const path = panel.getPath();
                const newPath = [];
                const vertices = path.getArray();

                vertices.forEach(vertex => {
                    // Calculate distance and heading from centroid to vertex
                    const distance = google.maps.geometry.spherical.computeDistanceBetween(centroid, vertex);
                    const heading = google.maps.geometry.spherical.computeHeading(centroid, vertex);
                    
                    // Calculate new heading
                    const newHeading = heading + angleDegrees;
                    
                    // Calculate new vertex position
                    const newVertex = google.maps.geometry.spherical.computeOffset(centroid, distance, newHeading);
                    newPath.push(newVertex);
                });

                // Update the panel's path
                panel.setPath(newPath);
                
                // Update original position after rotation
                this.storeOriginalPosition(panel);
            });
            
        } catch (error) {
            console.error('Error rotating selected panels:', error);
        }
    }
    
    // Clean up all resources
    cleanup() {
        try {
            // Clear original positions
            this.#originalPanelPositions.clear();
            
            // Remove map click listener
            if (this.mapClickListener) {
                google.maps.event.removeListener(this.mapClickListener);
                this.mapClickListener = null;
            }
            
            // Use event tracker to clean up all listeners
            this.eventTracker.cleanup();
            
            // Clear our polygon listeners tracking
            this.polygonListeners.clear();
            
            // Clean up all polygons and their listeners
            if (this.detectionService?.currentPolygonsRoof) {
                this.detectionService.currentPolygonsRoof.forEach(polygon => {
                    if (polygon) {
                        this.removePolygonListeners(polygon);
                    }
                });
            }
            
            if (this.detectionService?.currentPolygonsObjects) {
                this.detectionService.currentPolygonsObjects.forEach(polygon => {
                    if (polygon) {
                        this.removePolygonListeners(polygon);
                    }
                });
            }
            
            // Clean references to other services
            this.mapService = null;
            this.stateManager = null;
            this.styleConfig = null;
            this.detectionService = null;
            
            console.log('PolygonManager cleaned up');
        } catch (error) {
            console.error('Error during PolygonManager cleanup:', error);
        }
    }
}
