export class PanelRenderer {
    #mapService;
    #detectionService;
    #editService;
    #panelPolygons = [];
    #currentModule = 'standard';
    
    constructor(mapService, detectionService, editService) {
      this.#mapService = mapService;
      this.#detectionService = detectionService;
      this.#editService = editService;
      
      // Import StyleConfig if it hasn't been imported
      this.styleConfig = window.StyleConfig;
      
      if (!this.styleConfig) {
        // Dynamic import if StyleConfig is not available globally
        import('../edit/StyleConfig.js').then(module => {
          this.styleConfig = module.StyleConfig;
        }).catch(err => {
          console.error('Error loading StyleConfig:', err);
        });
      }
    }
    
    setCurrentModule(moduleId) {
      this.#currentModule = moduleId;
    }
    
    #getModuleColor(moduleType) {
      if (this.styleConfig) {
        return this.styleConfig.getModuleColor(moduleType);
      }
      
      // Fallback if StyleConfig isn't loaded
      const moduleColors = {
        'STANDARD': '#1a1a1a',
        'PREMIUM': '#0d0d0d',
        'COMPACT': '#262626'
      };
      
      return moduleColors[moduleType] || moduleColors.STANDARD;
    }
    
    #getActiveMap() {
      // First check if we're in image mode
      if (window.imageUploadService && window.imageUploadService.isImageView) {
        // Use the image map instance
        const imageMap = window.imageMapInstance || window.imageUploadService.getImageMap();
        if (imageMap) {
          return imageMap;
        }
      }
      
      // Fall back to regular map
      return this.#mapService.getMap();
    }
  
    renderPanelsFromResponse(roofs) {
      this.clearPanels();
      
      this.#renderPanelsInternal(roofs);
    }

    /**
     * Render panels without clearing existing ones (for selective generation)
     */
    renderPanelsFromResponseSelective(roofs) {
      this.#renderPanelsInternal(roofs);
    }

    /**
     * Internal method to handle the actual panel rendering logic
     */
    #renderPanelsInternal(roofs) {
      // Get the correct map for our current context
      const targetMap = this.#getActiveMap();
      const isImageMode = window.imageUploadService?.isImageView;

      if (isImageMode && targetMap) {
        targetMap.setOptions({
            draggable: false,
            scrollwheel: false,
            gestureHandling: 'none',
            disableDoubleClickZoom: true
        });
      }

      roofs.forEach(roof => {
        // Use the roof's module type, or fall back to the current module
        const moduleType = roof.module_type || this.#currentModule;
        const moduleColor = this.#getModuleColor(moduleType);

        roof.panels.forEach(panelCoords => {

          // Get panel options from StyleConfig if available
          let panelOptions = this.styleConfig?.PANEL_DEFAULT_OPTIONS || {
            strokeColor: '#ffffff',
            strokeOpacity: 0.5,
            strokeWeight: 0.5,
            fillOpacity: 0.85,
            zIndex: 1101
          };

          const panelPolygon = new google.maps.Polygon({
            paths: panelCoords,
            ...panelOptions,
            fillColor: moduleColor,
            map: targetMap,
            clickable: this.#editService?.isEditMode ?? true,
            isPanelElement: true,
            moduleType: moduleType
          });
          
          if (this.#detectionService) {
            this.#detectionService.currentPolygonsRoof.push(panelPolygon);
          }
  
          if (this.#editService?.polygonManager) {
            // Add event listeners to the panel
            this.#editService.polygonManager.addPolygonListeners(panelPolygon);
            
            // Store the original position for later reference
            this.#editService.polygonManager.storeOriginalPosition(panelPolygon);
          }
  
          this.#panelPolygons.push(panelPolygon);
        });
      });
    }
  
    /**
     * Adds a single panel polygon to the map and registers it.
     * @param {Array<object>} panelCoords - Array of {lat, lng} coordinates for the panel.
     * @param {string} moduleType - The type of module for the panel.
     */
    addSinglePanel(panelCoords, moduleType) {
      const targetMap = this.#getActiveMap();
      if (!targetMap) {
        console.error("Cannot add panel: Active map not found.");
        return null;
      }
  
      const moduleColor = this.#getModuleColor(moduleType);
      const panelOptions = this.styleConfig?.PANEL_DEFAULT_OPTIONS || {
        strokeColor: '#ffffff',
        strokeOpacity: 0.5,
        strokeWeight: 0.5,
        fillOpacity: 0.85,
        zIndex: 1101 // Ensure it's consistent with renderPanelsFromResponse
      };
  
      const googleMapsCoords = panelCoords.map(p => new google.maps.LatLng(p.lat, p.lng));
  
      const panelPolygon = new google.maps.Polygon({
        paths: googleMapsCoords,
        ...panelOptions,
        fillColor: moduleColor,
        map: targetMap,
        clickable: this.#editService?.isEditMode ?? true,
        isPanelElement: true,
        moduleType: moduleType
      });
  
      if (this.#detectionService) {
        this.#detectionService.currentPolygonsRoof.push(panelPolygon);
      }
  
      if (this.#editService?.polygonManager) {
        this.#editService.polygonManager.addPolygonListeners(panelPolygon);
        this.#editService.polygonManager.storeOriginalPosition(panelPolygon);
      }
  
      this.#panelPolygons.push(panelPolygon);
      return panelPolygon;
    }
  
    hasPanels() {
      return this.#panelPolygons && this.#panelPolygons.length > 0;
    }
  
    clearPanels() {
      this.#panelPolygons.forEach(panel => {
        panel.setMap(null);
        const index = this.#detectionService?.currentPolygonsRoof?.indexOf(panel);
        if (index > -1) {
          this.#detectionService.currentPolygonsRoof.splice(index, 1);
        }
      });
      this.#panelPolygons = [];
    }
    
    /**
     * Get the current number of panel polygons
     * @returns {number} The number of panels currently rendered
     */
    getPanelCount() {
      return this.#panelPolygons.length;
    }
    
    /**
     * Get access to panel polygons array (for external operations)
     */
    getPanelPolygons() {
      return this.#panelPolygons;
    }
  }
