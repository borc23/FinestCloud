/**
 * ClipboardService.js
 * Handles copy-paste functionality for panel elements
 */

export class ClipboardService {
    #clipboard = {
        panels: [],
        hasContent: false,
        isPreviewMode: false,
        previewPanels: [],
        originalBounds: null,
        mouseMoveListener: null,
        clickListener: null
    };

    constructor(dependencies) {
        const {
            mapService,
            stateManager,
            notificationService
        } = dependencies;

        this.mapService = mapService;
        this.stateManager = stateManager;
        this.notificationService = notificationService || {
            showNotification: (msg, duration) => {
                // Default implementation if notification service isn't provided
                this.#showNotification(msg, duration);
            }
        };
    }

    /**
     * Handle copying selected panels
     */
    handleCopyPanels() {
        const selectedPanels = Array.from(this.stateManager.getState().selectedPolygons)
            .filter(p => p.isPanelElement);
        
        if (selectedPanels.length === 0) return;
        
        // Store panel data in clipboard
        this.#clipboard.panels = selectedPanels.map(panel => {
            const path = panel.getPath();
            const coords = Array.from({ length: path.getLength() }, (_, i) => {
                const point = path.getAt(i);
                return { lat: point.lat(), lng: point.lng() };
            });
            
            return {
                coords,
                moduleType: panel.moduleType || 'standard'
            };
        });
        
        this.#clipboard.hasContent = true;
        
        // Show notification
        this.notificationService.showNotification('Panels copied. Move cursor and click to place');
        
        // Start preview mode
        this.startPanelPreviewMode();
    }
    
    /**
     * Handle pasting panels from clipboard
     */
    handlePastePanels() {
        // Simply start the preview mode if we have content in clipboard
        if (this.#clipboard.hasContent) {
            // If already in preview mode, no need to start again
            if (!this.#clipboard.isPreviewMode) {
                this.startPanelPreviewMode();
            }
        }
    }

    /**
     * Create preview panels that follow the mouse cursor
     */
    startPanelPreviewMode() {
        if (!this.#clipboard.hasContent) return;
        
        const map = this.mapService.getActiveMap();
        if (!map) return;
        
        // Store original bounds
        this.#clipboard.originalBounds = this.#calculatePanelsBounds(this.#clipboard.panels);
        
        // Clear any existing preview panels
        this.#clearPreviewPanels();
        
        // Set preview mode flag
        this.#clipboard.isPreviewMode = true;
        
        // Create semi-transparent preview panels
        this.#createPreviewPanels();
        
        // Create handler functions
        const mouseMoveHandler = this.#handlePanelPreviewMouseMove.bind(this);
        const clickHandler = this.#handlePanelPreviewClick.bind(this);
        
        // Set cursor to indicate that user can place panels
        map.getDiv().style.cursor = 'crosshair';
        
        // Add event listeners using google.maps.event.addListener
        // Store the listener IDs directly
        this.#clipboard.mouseMoveListener = google.maps.event.addListener(map, 'mousemove', mouseMoveHandler);
        this.#clipboard.clickListener = google.maps.event.addListener(map, 'click', clickHandler);
        
        // Show a tooltip
        this.notificationService.showNotification('Move to position panels, then click to place', 5000);
    }
    
    /**
     * End the panel preview mode
     */
    endPanelPreviewMode() {
        const map = this.mapService.getActiveMap();
        if (!map) return;
        
        // Clear preview panels
        this.#clearPreviewPanels();
        
        // Remove listeners safely
        if (this.#clipboard.mouseMoveListener) {
            google.maps.event.removeListener(this.#clipboard.mouseMoveListener);
            this.#clipboard.mouseMoveListener = null;
        }
        
        if (this.#clipboard.clickListener) {
            google.maps.event.removeListener(this.#clipboard.clickListener);
            this.#clipboard.clickListener = null;
        }
        
        // Reset cursor
        if (map && map.getDiv) {
            map.getDiv().style.cursor = 'grab';
        }
        
        // Reset preview mode flag
        this.#clipboard.isPreviewMode = false;
    }
    
    /**
     * Create semi-transparent preview panels
     */
    #createPreviewPanels() {
        // Get the map for adding preview panels
        const map = this.mapService.getActiveMap();
        if (!map) return;
        
        const moduleColor = '#1a73e8'; // Default blue color
        
        // Create preview panels from clipboard data
        this.#clipboard.previewPanels = this.#clipboard.panels.map(panel => {
            const panelCoords = panel.coords.map(point => {
                return new google.maps.LatLng(point.lat, point.lng);
            });
            
            // Create semi-transparent polygon
            const polygon = new google.maps.Polygon({
                paths: panelCoords,
                strokeColor: '#ffffff',
                strokeOpacity: 0.7,
                strokeWeight: 0.5,
                fillColor: moduleColor,
                fillOpacity: 0.5, // Semi-transparent
                map: map,
                clickable: false, // Don't intercept clicks
                zIndex: 1200, // Appear above regular panels
                isPreviewPanel: true
            });
            
            return polygon;
        });
    }
    
    /**
     * Clear all preview panels from the map
     */
    #clearPreviewPanels() {
        if (!this.#clipboard.previewPanels) return;
        
        this.#clipboard.previewPanels.forEach(panel => {
            if (panel) panel.setMap(null);
        });
        
        this.#clipboard.previewPanels = [];
    }
    
    /**
     * Handle mouse movement to update preview panel positions
     */
    #handlePanelPreviewMouseMove(event) {
        if (!this.#clipboard.isPreviewMode || !event.latLng) return;
        
        const map = this.mapService.getActiveMap();
        if (!map) return;
        
        // Calculate the center of the original panel bounds
        const bounds = this.#clipboard.originalBounds;
        if (!bounds) return;
        
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        
        // Calculate offset to apply
        const offsetLat = event.latLng.lat() - centerLat;
        const offsetLng = event.latLng.lng() - centerLng;
        
        // Update positions of all preview panels
        this.#clipboard.previewPanels.forEach((previewPanel, i) => {
            const originalPanel = this.#clipboard.panels[i];
            
            const newPath = originalPanel.coords.map(point => {
                return new google.maps.LatLng(
                    point.lat + offsetLat,
                    point.lng + offsetLng
                );
            });
            
            previewPanel.setPath(newPath);
        });
    }
    
    /**
     * Handle click to place panels permanently
     */
    #handlePanelPreviewClick(event) {
        if (!this.#clipboard.isPreviewMode || !event.latLng) return;
        
        // Calculate the center of the original panel bounds
        const bounds = this.#clipboard.originalBounds;
        if (!bounds) return;
        
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        
        // Calculate offset to apply
        const offsetLat = event.latLng.lat() - centerLat;
        const offsetLng = event.latLng.lng() - centerLng;
        
        // Apply offset to create new panel coordinates and include moduleType
        const newPanelsData = this.#clipboard.panels.map(panel => {
            return {
                coords: panel.coords.map(point => ({
                    lat: point.lat + offsetLat,
                    lng: point.lng + offsetLng
                })),
                moduleType: panel.moduleType || 'standard' // Include module type
            };
        });
        
        // End preview mode
        this.endPanelPreviewMode();
        
        // Use the new GeneratePanelsService method to add panels directly
        if (window.services?.generatePanels?.addPanelsToMap) {
            window.services.generatePanels.addPanelsToMap(newPanelsData);
            this.notificationService.showNotification('Panels placed successfully');
        } else {
            console.error('generatePanels service or addPanelsToMap method not available');
            this.notificationService.showNotification('Error placing panels', 3000);
        }
    }
    
    /**
     * Calculate the bounds of a set of panels
     */
    #calculatePanelsBounds(panels) {
        if (!panels || panels.length === 0) {
            return { north: 0, south: 0, east: 0, west: 0 };
        }
        
        let north = -90, south = 90, east = -180, west = 180;
        
        panels.forEach(panel => {
            panel.coords.forEach(point => {
                north = Math.max(north, point.lat);
                south = Math.min(south, point.lat);
                east = Math.max(east, point.lng);
                west = Math.min(west, point.lng);
            });
        });
        
        return { north, south, east, west };
    }
    
    /**
     * Show a temporary notification
     */
    #showNotification(message, duration = 2000) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('edit-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'edit-notification';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            notification.style.color = 'white';
            notification.style.padding = '10px 15px';
            notification.style.borderRadius = '4px';
            notification.style.zIndex = '9999';
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = message;
        setTimeout(() => { notification.style.opacity = '1'; }, 10);
        
        // Hide after duration
        setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }
    
    /**
     * Update clipboard data if needed to prevent panels from jumping back to initial position
     * Called after panel drag
     */
    updateClipboardIfNeeded() {
        // Only update if there's content in the clipboard
        if (!this.#clipboard.hasContent) return;
        
        const selectedPanels = Array.from(this.stateManager.getState().selectedPolygons)
            .filter(p => p.isPanelElement);
        
        // Map of panel moduleType to current positions
        const currentPanelMap = new Map();
        
        // Get current positions of all selected panels
        selectedPanels.forEach(panel => {
            const path = panel.getPath();
            const coords = Array.from({ length: path.getLength() }, (_, i) => {
                const point = path.getAt(i);
                return { lat: point.lat(), lng: point.lng() };
            });
            
            const moduleType = panel.moduleType || 'standard';
            if (!currentPanelMap.has(moduleType)) {
                currentPanelMap.set(moduleType, []);
            }
            currentPanelMap.get(moduleType).push({ coords });
        });
        
        // If there are panels in the clipboard, update their coordinates
        if (this.#clipboard.panels.length > 0 && selectedPanels.length > 0) {
            // Replace the clipboard panels with the current panel positions
            this.#clipboard.panels = [];
            
            // Add all panels from the current selection to clipboard
            selectedPanels.forEach(panel => {
                const path = panel.getPath();
                const coords = Array.from({ length: path.getLength() }, (_, i) => {
                    const point = path.getAt(i);
                    return { lat: point.lat(), lng: point.lng() };
                });
                
                this.#clipboard.panels.push({
                    coords,
                    moduleType: panel.moduleType || 'standard'
                });
            });
            
            // Update the bounds
            this.#clipboard.originalBounds = this.#calculatePanelsBounds(this.#clipboard.panels);
        }
    }

    /**
     * Check if clipboard has content
     */
    hasContent() {
        return this.#clipboard.hasContent;
    }

    /**
     * Check if preview mode is active
     */
    isPreviewMode() {
        return this.#clipboard.isPreviewMode;
    }

    /**
     * Clean up clipboard resources
     */
    cleanup() {
        // End preview mode if active
        if (this.#clipboard.isPreviewMode) {
            this.endPanelPreviewMode();
        }
        
        // Clear clipboard data
        this.#clipboard = {
            panels: [],
            hasContent: false,
            isPreviewMode: false,
            previewPanels: [],
            originalBounds: null,
            mouseMoveListener: null,
            clickListener: null
        };
    }
}