/**
 * Service for generating and managing solar panel layouts
 */

import { PanelRenderer } from './generate_panels/panel_renderer.js';
import { PanelCalculator } from './generate_panels/panel_calculator.js';
import { PanelApiService } from './generate_panels/panel_api_service.js';
import { PanelUIManager } from './generate_panels/panel_ui_manager.js';
import { GeometryUtils } from './generate_panels/geometry_utils.js';
import {AngleInputManager} from './image/roof_pitch/angleInputManager.js';
import { ImageResolutionSelector } from './image/image_resolution_selector.js';
import { ImageMapService } from './image/image_map_service.js';

const VALID_MODULE_TYPES = Object.freeze(['standard', 'premium', 'compact']);
const DEFAULT_MODULE = 'standard';
const POLL_INTERVAL_MS = 250;

export class GeneratePanelsService {
  // External services
  #mapService;
  #detectionService;
  #imageService;
  
  // Internal services
  #renderer;
  #calculator;
  #apiService;
  #uiManager;
  #geometryUtils;
  #angleInputManager;

  // Cached DOM elements
  #generatePanelsBtn;

  // State
  #currentModule = DEFAULT_MODULE;
  #resolutionCache = null;
  
  // Tracking current panel data
  #currentRoofs = [];
  #maxPanels = 0;

  tutorialSaysShowButton = false; // Added for tutorial interaction

  constructor(mapService, detectionService, editService) {
    this.#initializeServices(mapService, detectionService, editService);
    this.#setupEventListeners();
    this.#angleInputManager = new AngleInputManager();
    this.#generatePanelsBtn = document.getElementById('generatePanelsBtn');
  }
  
  /**
   * Initialize all required services
   */
  #initializeServices(mapService, detectionService, editService) {
    // Store external services
    this.#mapService = mapService;
    this.#detectionService = detectionService;
    
    // Create internal services
    this.#geometryUtils = new GeometryUtils();
    this.#renderer = new PanelRenderer(mapService, detectionService, editService);
    this.#calculator = new PanelCalculator();
    this.#apiService = new PanelApiService(this.#geometryUtils);
    this.#uiManager = new PanelUIManager(this.#calculator);
    
    // Setup image service
    this.#imageService = new ImageMapService();
    this.#imageService.setMapService(mapService);
  }
  
  /**
   * Set up event listeners and observers
   */
  #setupEventListeners() {
    this.#uiManager.bindEvents(this.#handleSliderChange.bind(this));
    this.#observePolygonChanges();
    
    // Set up an interval to update the stats based on actual panel count
    setInterval(() => {
      this.updateStatsFromActualPanels();
    }, POLL_INTERVAL_MS);
  }

  /**
   * Watch for polygon changes to toggle button visibility
   * Performance improvement: Use cached DOM reference
   */
  #observePolygonChanges() {
    setInterval(() => {
      if (this.tutorialSaysShowButton) {
        // If tutorial is active for this button and wants it shown,
        // ensure it's flex and skip normal logic.
        // The tutorial itself will use !important if needed.
        if (this.#generatePanelsBtn && this.#generatePanelsBtn.style.display !== 'flex') {
            this.#generatePanelsBtn.style.display = 'flex';
        }
        return; 
      }

      if (this.#generatePanelsBtn) {
        const hasPolygons = this.#detectionService.currentPolygonsRoof.length > 0;
        this.#generatePanelsBtn.style.display = hasPolygons ? 'flex' : 'none';
      }
    }, POLL_INTERVAL_MS);
  }

  /**
   * Manually refresh the visibility of the Generate Panels button based on current state.
   * To be used by external services like the tutorial.
   */
  refreshButtonVisibility() {
    if (this.tutorialSaysShowButton) {
      if (this.#generatePanelsBtn && this.#generatePanelsBtn.style.display !== 'flex') {
        this.#generatePanelsBtn.style.setProperty('display', 'flex', 'important'); // Ensure tutorial wins if it's active
      }
      return;
    }
    if (this.#generatePanelsBtn) {
      const hasPolygons = this.#detectionService.currentPolygonsRoof.length > 0;
      // No !important here, just regular application logic
      this.#generatePanelsBtn.style.display = hasPolygons ? 'flex' : 'none';
    }
  }

  /**
   * Update stats based on the actual panel count on the map
   */
  updateStatsFromActualPanels() {
    const currentPanelCount = this.getCurrentPanelCount();
    // Only update if we have panels
    if (currentPanelCount > 0 || this.hasPanels()) {
      this.#uiManager.updateStatsFromActualPanels(currentPanelCount, this.#maxPanels);
    }
  }

  /**
   * Handle panel count slider changes
   */
  async #handleSliderChange(panelCount, maxPanels) {    
    try {
      const mapBounds = this.#getMapBounds();
      const resolution = this.#getResolution();
      
      const response = await this.#apiService.updatePanelCount(panelCount, mapBounds, resolution);
      
      if (response.success) {
        this.#detectionService.togglePolygonVisibility(false);
        this.clearPanels();
        this.#renderer.renderPanelsFromResponse(response.results.roofs);
        // Store the current roof data for potential panel addition
        this.#currentRoofs = response.results.roofs;
        
        // Update stats based on actual panel count
        this.updateStatsFromActualPanels();
      } else {
        this.#handleError('Failed to update panel count', response.error);
      }
    } catch (error) {
      this.#handleError('Panel update error', error);
    }
  }
  
  /**
   * Set the current module type
   */
  setModule(moduleId) {
    if (!this.isValidMappingType(moduleId)) {
      console.warn(`Invalid module type: ${moduleId}, using default`);
      moduleId = DEFAULT_MODULE;
    }
    
    this.#currentModule = moduleId;
    this.#renderer.setCurrentModule(moduleId);
    this.#calculator.setCurrentModule(moduleId);
  }
  
  /**
   * Generate panels with the specified module
   */
  async generatePanels(moduleId = null) {
    if (moduleId) {
        this.setModule(moduleId);
    }

    try {
        if (this.#isImageMode()) {
            const resolutionSelector = new ImageResolutionSelector(this.#mapService);
            const resolution = await resolutionSelector.getResolution();
            
            if (!resolution) {
                return; // User cancelled
            }
            
            // Get roof angles after resolution
            const roofPolygons = this.#detectionService.currentPolygonsRoof;
            try {
                const angles = await this.#angleInputManager.showAngleInputs(roofPolygons);
                await this.#generatePanelsWithResolution(resolution, angles);
            } catch (error) {
                if (error !== 'Cancelled by user') {
                    this.#handleError('Failed to get roof angles', error);
                }
                return;
            }
        } else {
            await this.#generatePanelsWithResolution();
        }
    } catch (error) {
        this.#handleError('Failed to generate panels', error);
    }
  }
  
  /**
   * Handle panel generation in image mode
   */
  async #handleImageModeGeneration() {
    const resolutionSelector = new ImageResolutionSelector(this.#mapService);
    const resolution = await resolutionSelector.getResolution();
    
    if (!resolution) {
      return; // User cancelled
    }
    
    await this.#generatePanelsWithResolution(resolution);
  }
  
  /**
   * Generate panels with the specified resolution
   */
  async #generatePanelsWithResolution(manualResolution = null, roofAngles = null) {
    const loadingDiv = this.#uiManager.showLoading();

    try {
      const mapBounds = this.#getMapBounds();
      const mapDimensions = this.#getMapDimensions();
      const cmPerPixel = this.#getResolution(manualResolution);

      const { roofSegments, maxSunshineHoursPerYear } = await this.#apiService.fetchSolarApiData(mapBounds);
      this.#calculator.setMaxSunshineHoursPerYear(maxSunshineHoursPerYear);

      const roofData = this.#prepareRoofData(roofSegments, roofAngles);
      const objectData = this.#prepareObjectData();

      const response = await this.#apiService.generatePanelsAPI(
        roofData,
        objectData,
        this.#currentModule,
        cmPerPixel,
        mapBounds,
        mapDimensions
      );

      if (response.success) {
        this.#detectionService.togglePolygonVisibility(false);
        this.clearPanels();
        this.#renderer.renderPanelsFromResponse(response.results.roofs);
        this.#uiManager.updateSlider(response.results.max_panels);
        
        // Store the current roof data and max panels count
        this.#currentRoofs = response.results.roofs;
        this.#maxPanels = response.results.max_panels;
        
        if (this.#isImageMode()) {
          const map = this.#getCurrentMap();
          if (map) {
            map.setOptions({
              draggable: false,
              scrollwheel: false,
              gestureHandling: 'none',
              disableDoubleClickZoom: true
            });
          }
        }
      } else {
        this.#handleError('Panel generation failed', response.error);
      }
    } catch (error) {
      this.#handleError('Panel generation failed', error);
      this.#uiManager.hideSlider();
    } finally {
      this.#uiManager.hideLoading(loadingDiv);
    }
  }

  /**
   * Prepare roof data for API request
   */
  #prepareRoofData(roofSegments, roofAngles = null) {
    return this.#detectionService.currentPolygonsRoof.map((polygon, index) => {
      const coords = this.#extractPolygonCoordinates(polygon);
      const matchingSegment = this.#findMatchingRoofSegment(coords, roofSegments);
      
      return {
        coords,
        pitch: roofAngles ? roofAngles[index] : (matchingSegment?.pitchDegrees || null),
        azimuth: matchingSegment?.azimuthDegrees || null,
      };
    });
  }
  
  /**
   * Extract coordinates from a polygon
   */
  #extractPolygonCoordinates(polygon) {
    const path = polygon.getPath();
    return Array.from({ length: path.getLength() }, (_, i) => {
      const point = path.getAt(i);
      return { lat: point.lat(), lng: point.lng() };
    });
  }
  
  /**
   * Find the matching roof segment for a polygon
   */
  #findMatchingRoofSegment(coords, roofSegments) {
    return roofSegments.find(segment => {
      if (!segment.center?.latitude || !segment.center?.longitude) {
        return false;
      }
      
      const center = {
        lat: segment.center.latitude,
        lng: segment.center.longitude
      };
      
      return this.#geometryUtils.isPointInPolygon(center, coords);
    });
  }

  /**
   * Prepare object data for API request
   */
  #prepareObjectData() {
    return this.#detectionService.currentPolygonsObjects.map(polygon => 
      this.#extractPolygonCoordinates(polygon)
    );
  }

  /**
   * Get current map bounds
   */
  #getMapBounds() {
    const map = this.#getCurrentMap();
    if (!map) {
        throw new Error('Map not initialized');
    }
    
    const bounds = this.#isImageMode() 
        ? map.getBounds()
        : this.#geometryUtils.getMapBounds(map);
        
    if (!bounds) {
        throw new Error('Unable to get map bounds');
    }
    
    return bounds;
  }
  
  /**
   * Get map dimensions
   */
  #getMapDimensions() {
    return this.#geometryUtils.getMapDimensions(this.#getCurrentMap());
  }
  
  /**
   * Get resolution in cm per pixel
   */
  #getResolution(manualResolution = null) {
    if (manualResolution) return manualResolution;
    
    // Use cached resolution if available to improve performance
    if (this.#resolutionCache) return this.#resolutionCache;
    
    this.#resolutionCache = this.#geometryUtils.calculateCmPerPixel(this.#getCurrentMap());
    return this.#resolutionCache;
  }
  
  /**
   * Get the current map object based on mode
   */
  #getCurrentMap() {
    return this.#isImageMode() 
      ? window.imageUploadService.getActiveMap() 
      : this.#mapService.getMap();
  }
  
  /**
   * Check if we're in image mode
   */
  #isImageMode() {
    return Boolean(window.imageUploadService?.isImageView);
  }
  
  /**
   * Standardized error handling
   */
  #handleError(message, error) {
    console.error(message, error);
    // In production, would use a proper error logging service
  }

  /**
   * Check if panels exist
   */
  hasPanels() {
    return this.#renderer.hasPanels();
  }

  /**
   * Clear all panels
   */
  clearPanels() {
    this.#renderer.clearPanels();
    this.#detectionService.togglePolygonVisibility(false);
    
    // Reset the panel stats if panels are cleared
    const statsPanel = document.querySelector('.roof-live-stats');
    if (statsPanel) statsPanel.style.display = 'none';
  }

  /**
   * Check if module type is valid
   */
  isValidMappingType(moduleId) {
    return VALID_MODULE_TYPES.includes(moduleId);
  }
  
  /**
   * Adds multiple panels directly to the map using the renderer.
   * Used for pasting panels without a full re-render.
   * @param {Array<object>} panelsData - Array of panel objects, each with { coords: Array<{lat, lng}>, moduleType: string }
   */
  addPanelsToMap(panelsData) {
    if (!this.#renderer) {
      this.#handleError('Renderer not available', 'Cannot add panels to map.');
      return;
    }

    let addedCount = 0;
    panelsData.forEach(panelData => {
      const addedPanel = this.#renderer.addSinglePanel(panelData.coords, panelData.moduleType);
      if (addedPanel) {
        addedCount++;
      }
    });

    // Update the internal max count (assuming pasted panels increase the total possible)
    // Note: This might need refinement depending on how maxPanels should behave with pasting.
    // For now, let's assume pasting adds to the potential total.
    this.#maxPanels += addedCount;

    // Update UI stats after adding panels
    this.updateStatsFromActualPanels();
  }

  /**
   * Create new panels and add them to the existing panel layout
   * @param {Array} newPanelsCoords - Array of panel coordinate arrays (each panel is an array of lat/lng points)
   * @param {number} roofIndex - Index of the roof to add panels to (defaults to 0)
   * @returns {boolean} - Success status
   */
  async createPanels(newPanelsCoords, roofIndex = 0) {
    try {
      // Validate parameters
      if (!Array.isArray(newPanelsCoords) || newPanelsCoords.length === 0) {
        this.#handleError('Invalid panel coordinates', 'Panel coordinates must be a non-empty array');
        return false;
      }
      
      if (!this.#currentRoofs || this.#currentRoofs.length === 0) {
        this.#handleError('No roof data available', 'Generate panels first before creating new panels');
        return false;
      }
      
      if (roofIndex < 0 || roofIndex >= this.#currentRoofs.length) {
        this.#handleError('Invalid roof index', `Roof index ${roofIndex} is out of range`);
        return false;
      }
      
      // Create a copy of the current roof data
      const updatedRoofs = [...this.#currentRoofs];
      const targetRoof = {...updatedRoofs[roofIndex]};
      
      // Add new panels to the target roof
      targetRoof.panels = [...targetRoof.panels, ...newPanelsCoords];
      updatedRoofs[roofIndex] = targetRoof;
      
      // Update max panels count
      const newMaxPanels = this.#maxPanels + newPanelsCoords.length;
      
      // Re-render all panels with the updated data
      this.clearPanels();
      this.#renderer.renderPanelsFromResponse(updatedRoofs);
      
      // Update the UI with new panel count
      this.#uiManager.updateSlider(newMaxPanels);
      
      // Update stored state
      this.#currentRoofs = updatedRoofs;
      this.#maxPanels = newMaxPanels;
      
      // Synchronize with backend
      await this.updateMaxPanelCount(newMaxPanels);
      
      return true;
    } catch (error) {
      this.#handleError('Failed to create new panels', error);
      return false;
    }
  }
  
  /**
   * Get the current number of panels
   * @returns {number}
   */
  getCurrentPanelCount() {
    // Use DetectionService's array as the source of truth for panels managed by PolygonManager
    return this.#detectionService?.currentPolygonsRoof?.filter(p => p.isPanelElement)?.length || 0;
  }
  
  /**
   * Get the maximum possible number of panels
   * @returns {number}
   */
  getMaxPanelCount() {
    return this.#maxPanels;
  }
  
  /**
   * Update the max panel count on the server
   * @param {number} newMaxPanels - The new maximum panel count
   * @returns {Promise<boolean>} - Success status
   */
  async updateMaxPanelCount(newMaxPanels) {
    try {
      const response = await fetch('/update_max_panel_count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          max_panel_count: newMaxPanels
        })
      });
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      this.#handleError('Failed to update max panel count on server', error);
      return false;
    }
  }
}
