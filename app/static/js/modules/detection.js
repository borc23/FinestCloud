import { StyleConfig } from './edit/StyleConfig.js';

/**
 * Service that handles building detection on maps
 */
export class DetectionService {
    // Constants will be replaced with StyleConfig references
    static GOOGLE_MAPS_API = {
        STATIC_MAP_URL: 'https://maps.googleapis.com/maps/api/staticmap',
        DEFAULT_SIZE: '640x640',
        DEFAULT_FORMAT: 'jpg'
    };
    
    /**
     * @param {Object} mapService - Service that handles map operations
     * @param {Object} captureService - Service that handles capture area
     * @param {Object} [config={}] - Configuration options
     */
    constructor(mapService, captureService, config = {}) {
        this.mapService = mapService;
        this.captureService = captureService;
        this.editService = null;
        this.config = {
            apiKey: config.apiKey || 'AIzaSyArFZ4SYEzNAsmUgD0ss-kEScpZSC-1jh0',
            generatePanelsBtnId: config.generatePanelsBtnId || 'generatePanelsBtn'
        };
        
        // State management
        this.currentPolygonsRoof = [];
        this.currentPolygonsObjects = [];
        this.forcePolygonsHidden = false;
        this.generatePanelsBtn = document.getElementById(this.config.generatePanelsBtnId);
        
        this.updateGeneratePanelsVisibility();
        
        this.styleConfig = window.StyleConfig;
        
        if (!this.styleConfig) {
            // Dynamic import if StyleConfig is not available globally
            import('./edit/StyleConfig.js').then(module => {
                this.styleConfig = module.StyleConfig;
            }).catch(err => {
                console.error('Error loading StyleConfig:', err);
            });
        }
    }
  
    /**
     * Set the edit service for polygon editing
     */
    setEditService(editService) {
        this.editService = editService;
    }
  
    /**
     * Start the detection process
     */
    async detect() {
        if (!this.captureService.isVisible()) {
            this.captureService.toggle();
            return;
        }
  
        const loadingDiv = this.showLoading();
        
        try {
            const bounds = await this.getBoundsWithRetry();
            const staticMapUrl = this.generateStaticMapUrl();
            const response = await this.sendDetectionRequest(staticMapUrl, bounds);
            
            if (!response.success) {
                throw new Error(response.error || 'Detection failed');
            }
  
            this.clearCurrentPolygons();
            this.renderPolygons(response.roofs, true); // isRoof = true
            this.renderPolygons(response.objects, false); // isRoof = false
            this.captureService.toggle();
        } catch (error) {
            console.error('Detection error:', error);
            alert('Detection failed: ' + error.message);
        } finally {
            this.hideLoading(loadingDiv);
        }
    }
  
    /**
     * Get bounds with retry mechanism
     */
    async getBoundsWithRetry(maxAttempts = 2) {
        let attempts = 0;
        let bounds = null;
  
        while (!bounds && attempts < maxAttempts) {
            bounds = this.captureService.getBounds();
            if (!bounds) {
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    throw new Error('Unable to get capture square bounds');
                }
            }
        }
        return bounds;
    }
  
    /**
     * Generate the static map URL for detection
     */
    generateStaticMapUrl() {
        const center = this.mapService.getCenter();
        const zoom = this.mapService.getZoom();
        const { STATIC_MAP_URL } = DetectionService.GOOGLE_MAPS_API;
        
        const params = new URLSearchParams({
            center: `${center.lat()},${center.lng()}`,
            size: '640x640',
            maptype: 'satellite',
            zoom: zoom,
            format: 'jpg',
            style: 'feature:all|color:0xffffff',
            key: this.config.apiKey
        });
  
        return `${STATIC_MAP_URL}?${params.toString()}`;
    }
  
    /**
     * Send detection request to the server
     */
    async sendDetectionRequest(image, bounds) {
        const response = await fetch('/detect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image, bounds })
        });
        return response.json();
    }
  
    /**
     * Clear all current polygons from the map
     */
    clearCurrentPolygons() {
        this.clearPolygonGroup(this.currentPolygonsRoof);
        this.clearPolygonGroup(this.currentPolygonsObjects);
        
        this.currentPolygonsRoof = [];
        this.currentPolygonsObjects = [];
        
        this.updateGeneratePanelsVisibility();
    }
  
    /**
     * Clear a group of polygons from the map
     */
    clearPolygonGroup(polygons) {
        if (!Array.isArray(polygons)) return;
        
        polygons.forEach(polygon => {
            if (polygon) polygon.setMap(null);
        });
    }
  
    /**
     * Update the visibility of the generate panels button
     */
    updateGeneratePanelsVisibility() {
        if (this.generatePanelsBtn) {
            const hasRoofs = this.currentPolygonsRoof && this.currentPolygonsRoof.length > 0;
            this.generatePanelsBtn.style.display = hasRoofs ? 'block' : 'none';
        }
    }
  
    /**
     * Toggle visibility of all polygons
     */
    togglePolygonVisibility(visible) {
        this.forcePolygonsHidden = !visible;
        this.setPolygonGroupVisibility(this.currentPolygonsRoof, visible);
        this.setPolygonGroupVisibility(this.currentPolygonsObjects, visible);
    }  

    /**
     * Set visibility for a group of polygons
     */
    setPolygonGroupVisibility(polygons, visible) {
        if (!Array.isArray(polygons)) return;
        
        polygons.forEach(polygon => {
            if (polygon && !polygon.isPanelElement) {
                polygon.setVisible(visible);
            }
        });
    }
  
    /**
     * Render polygons on the map
     */
    renderPolygons(polygonData, isRoof) {
        if (!polygonData) return;
        
        const flatPolygons = this.flattenPolygonData(polygonData);
        
        flatPolygons.forEach(data => {
            if (!data || !data.coords) return;
            
            // Use StyleConfig for polygon styling
            let options = {};            if (this.styleConfig) {
                options = this.styleConfig.getOptionsForType(isRoof, false, false);
            } else {
                // Fallback options if StyleConfig isn't available
                const color = StyleConfig.getPolygonColor(isRoof, 'default');
                options = {
                    strokeColor: color,
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: color,
                    fillOpacity: 0.2
                };
            }
            
            const polygon = new google.maps.Polygon({
                paths: data.coords,
                ...options,
                map: this.mapService.getMap(),
                visible: !this.panelsActive
            });
            
            polygon.addListener('click', () => {
                // Check if edit mode is active before fitting bounds
                const isEditMode = window.editService?.stateManager?.getState()?.isEditMode || false;
                if (!isEditMode) { // Only fit bounds if NOT in edit mode
                    const bounds = new google.maps.LatLngBounds();
                    data.coords.forEach(coord => bounds.extend(coord));
                    // Use getActiveMap() in case this logic is ever used elsewhere
                    const currentMap = this.mapService.getActiveMap(); 
                    if (currentMap) {
                        currentMap.fitBounds(bounds);
                    }
                }
                // The click event will still propagate to PolygonManager's listener if added.
            });
            
            if (isRoof) {
                this.currentPolygonsRoof.push(polygon);
            } else {
                this.currentPolygonsObjects.push(polygon);
            }
        });
    
        this.updateGeneratePanelsVisibility();
    }
    
    /**
     * Flatten nested polygon data
     */
    flattenPolygonData(polygonData) {
        return polygonData.flat().filter(poly => poly && poly.coords);
    }
    
    /**
     * Create and show a loading indicator
     */
    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = 'Processing...';
        loadingDiv.style.position = 'absolute';
        loadingDiv.style.top = '50%';
        loadingDiv.style.left = '50%';
        loadingDiv.style.transform = 'translate(-50%, -50%)';
        loadingDiv.style.backgroundColor = 'white';
        loadingDiv.style.padding = '10px';
        loadingDiv.style.borderRadius = '5px';
        loadingDiv.style.zIndex = '1000';
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }
  
    /**
     * Remove the loading indicator
     */
    hideLoading(loadingDiv) {
        if (loadingDiv && document.body.contains(loadingDiv)) {
            document.body.removeChild(loadingDiv);
        }
    }
    
    /**
     * Add a dummy polygon for tutorial purposes
     * @param {Object} polygonData - Data for creating the dummy polygon
     */
    addTutorialDummyPolygon(polygonData) {
        if (!polygonData) return;
        
        // Store the dummy polygon state
        this._dummyPolygon = polygonData;
        
        // Create a non-visible polygon for the tutorial
        let options = {};
              if (this.styleConfig) {
            options = this.styleConfig.getOptionsForType(true, false, false);
        } else {
            // Fallback options
            const roofColor = StyleConfig.getRoofColor('default');
            options = {
                strokeColor: roofColor,
                strokeOpacity: 0.0,
                strokeWeight: 0,
                fillColor: roofColor,
                fillOpacity: 0.0
            };
        }
        
        // Override visibility options
        options.visible = false;
        options.clickable = false;
        options._tutorialDummy = true;
        
        const polygon = new google.maps.Polygon({
            paths: polygonData.coords,
            ...options,
            map: this.mapService.getMap()
        });
        
        // Add dummy to roof polygons to enable panel generation
        this.currentPolygonsRoof.push(polygon);
        
        // Update button visibility
        this.updateGeneratePanelsVisibility();
    }
    
    /**
     * Remove all tutorial dummy polygons
     */
    removeTutorialDummyPolygons() {
        // Filter out and remove dummy polygons
        if (this.currentPolygonsRoof && this.currentPolygonsRoof.length > 0) {
            this.currentPolygonsRoof = this.currentPolygonsRoof.filter(polygon => {
                if (polygon && polygon.get('_tutorialDummy')) {
                    polygon.setMap(null);
                    return false;
                }
                return true;
            });
        }
        
        // Clean up stored dummy state
        this._dummyPolygon = null;
        
        // Update button visibility
        this.updateGeneratePanelsVisibility();
    }
    
    /**
     * Get the current polygons state (for tutorial to restore later)
     */
    getCurrentPolygonsState() {
        return {
            roofPolygons: [...this.currentPolygonsRoof],
            objectPolygons: [...this.currentPolygonsObjects]
        };
    }
}
