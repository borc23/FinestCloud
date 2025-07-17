/**
 * Service for generating and managing solar panel layouts
 */

import { PanelRenderer } from './generate_panels/panel_renderer.js';
import { PanelCalculator } from './generate_panels/panel_calculator.js';
import { PanelApiService } from './generate_panels/panel_api_service.js';
import { PanelUIManager } from './generate_panels/panel_ui_manager.js';
import { GeometryUtils } from './generate_panels/geometry_utils.js';
import { FinancialCalculator } from './generate_panels/financial_calculator.js';
import { FinancialConfigManager } from './generate_panels/financial_config_manager.js';
import {AngleInputManager} from './image/roof_pitch/angleInputManager.js';
import { MapAngleInputManager } from './generate_panels/map_angle_input_manager.js';
import { ImageResolutionSelector } from './image/image_resolution_selector.js';
import { ImageMapService } from './image/image_map_service.js';

const VALID_MODULE_TYPES = Object.freeze(['standard', 'premium', 'compact']);
const DEFAULT_MODULE = 'standard';
const POLL_INTERVAL_MS = 250;

export class GeneratePanelsService {  // External services
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
  #mapAngleInputManager;
  #financialCalculator;
  #financialConfigManager;

  // Cached DOM elements
  #generatePanelsBtn;

  // State
  #currentModule = DEFAULT_MODULE;
  #resolutionCache = null;
    // Tracking current panel data
  #currentRoofs = [];
  #maxPanels = 0;
  #currentElectricalSystem = null;

  tutorialSaysShowButton = false; // Added for tutorial interaction
  constructor(mapService, detectionService, editService) {
    this.#initializeServices(mapService, detectionService, editService);
    this.#setupEventListeners();
    this.#angleInputManager = new AngleInputManager();
    this.#mapAngleInputManager = new MapAngleInputManager();
    this.#generatePanelsBtn = document.getElementById('generatePanelsBtn');
  }
  
  /**
   * Initialize all required services
   */  #initializeServices(mapService, detectionService, editService) {
    // Store external services
    this.#mapService = mapService;
    this.#detectionService = detectionService;
    
    // Create internal services
    this.#geometryUtils = new GeometryUtils();
    this.#renderer = new PanelRenderer(mapService, detectionService, editService);
    this.#calculator = new PanelCalculator();
    this.#apiService = new PanelApiService(this.#geometryUtils);
    this.#financialCalculator = new FinancialCalculator();
    this.#financialConfigManager = new FinancialConfigManager();
    this.#uiManager = new PanelUIManager(this.#calculator, this.#financialCalculator, this.#financialConfigManager);
    
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
  }  /**
   * Update stats based on the actual panel count on the map
   */
  updateStatsFromActualPanels() {
    const currentPanelCount = this.getCurrentPanelCount();
    // Update calculator with current panel count
    this.#calculator.setCurrentPanelCount(currentPanelCount);
    
    // Only update if we have panels
    if (currentPanelCount > 0 || this.hasPanels()) {
      this.#uiManager.updateStatsFromActualPanels(currentPanelCount, this.#maxPanels, this.#currentElectricalSystem);
    }
  }

  /**
   * Handle panel count slider changes
   */  async #handleSliderChange(panelCount, maxPanels) {    
    try {
      // Update calculator with current panel count
      this.#calculator.setCurrentPanelCount(panelCount);
      
      const mapBounds = this.#getMapBounds();
      const resolution = this.#getResolution();
      
      const response = await this.#apiService.updatePanelCount(panelCount, mapBounds, resolution);      if (response.success) {
        this.#detectionService.togglePolygonVisibility(false);
        this.clearPanels();
        this.#renderer.renderPanelsFromResponse(response.results.roofs);
        // Store the current roof data for potential panel addition
        this.#currentRoofs = response.results.roofs;
        this.#currentElectricalSystem = response.results.electrical_system;
        
        // Update stats panel with electrical system data
        this.#uiManager.updateStatsPanel(
          panelCount, 
          maxPanels, 
          response.results.electrical_system
        );
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
                const result = await this.#angleInputManager.showAngleInputs(roofPolygons);
                await this.#generatePanelsWithResolution(resolution, result.angles, result.edgePadding);
            } catch (error) {
                if (error !== 'Cancelled by user') {
                    this.#handleError('Failed to get roof angles', error);
                }
                return;
            }} else {
            // Map mode - show angle input popup with API-obtained angles
            try {
                const roofPolygons = this.#detectionService.currentPolygonsRoof;
                const mapBounds = this.#getMapBounds();
                
                // Get roof segments from API to pre-fill the inputs
                const { roofSegments } = await this.#apiService.fetchSolarApiData(mapBounds);
                  // Show angle input popup with pre-filled API values
                const result = await this.#mapAngleInputManager.showAngleInputs(roofPolygons, roofSegments);
                await this.#generatePanelsWithResolution(null, result.angles, result.edgePadding);
            } catch (error) {
                if (error !== 'Cancelled by user') {
                    this.#handleError('Failed to get roof angles', error);
                }
                return;
            }
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
  async #generatePanelsWithResolution(manualResolution = null, roofAngles = null, edgePadding = 20) {
    const loadingDiv = this.#uiManager.showLoading();

    try {
      const mapBounds = this.#getMapBounds();
      const mapDimensions = this.#getMapDimensions();
      const cmPerPixel = this.#getResolution(manualResolution);

      const { roofSegments, maxSunshineHoursPerYear } = await this.#apiService.fetchSolarApiData(mapBounds);
      this.#calculator.setMaxSunshineHoursPerYear(maxSunshineHoursPerYear);

      const roofData = this.#prepareRoofData(roofSegments, roofAngles);
      const objectData = this.#prepareObjectData();      const response = await this.#apiService.generatePanelsAPI(
        roofData,
        objectData,
        this.#currentModule,
        cmPerPixel,
        mapBounds,
        mapDimensions,
        edgePadding
      );if (response.success) {
        this.#detectionService.togglePolygonVisibility(false);
        this.clearPanels();
        this.#renderer.renderPanelsFromResponse(response.results.roofs);
        this.#uiManager.updateSlider(response.results.max_panels);
          // Store the current roof data and max panels count
        this.#currentRoofs = response.results.roofs;
        this.#maxPanels = response.results.max_panels;
        this.#currentElectricalSystem = response.results.electrical_system;
        
        // Update stats panel with electrical system data
        const currentPanelCount = this.getCurrentPanelCount();
        this.#uiManager.updateStatsPanel(
          currentPanelCount, 
          response.results.max_panels, 
          response.results.electrical_system
        );
        
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
  }  /**
   * Reset all state variables to ensure clean panel generation on subsequent runs
   */
  resetState() {
    // Clear cached resolution to force recalculation
    this.#resolutionCache = null;
    
    // Clear current roof data
    this.#currentRoofs = [];
    
    // Reset max panels count
    this.#maxPanels = 0;
    
    // Clear electrical system data
    this.#currentElectricalSystem = null;
    
    // Reset module to default
    this.#currentModule = DEFAULT_MODULE;
    
    // Reset calculator state
    this.#calculator.resetState();
    
    // Reset UI manager state
    this.#uiManager.resetState();
    
    // Clear panels
    this.clearPanels();
    
    console.log('GeneratePanelsService state reset completed');
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
   * Check if there are roof polygons available for selection
   */
  hasRoofPolygons() {
    return this.#detectionService?.currentPolygonsRoof?.some(polygon => !polygon.isPanelElement) || false;
  }

  /**
   * Get the detection service for external use
   */
  getDetectionService() {
    return this.#detectionService;
  }
  /**
   * Generate panels on selected roof polygons only
   * @param {Array<number>} selectedRoofIndices - Indices of selected roof polygons
   * @param {string} moduleId - Module ID to use for generation
   */
  async generatePanelsOnSelectedRoofs(selectedRoofIndices, moduleId) {
    if (!selectedRoofIndices || selectedRoofIndices.length === 0) {
      throw new Error('No roofs selected for panel generation');
    }

    const loadingDiv = this.#uiManager.showLoading();

    try {
      const mapBounds = this.#getMapBounds();
      const mapDimensions = this.#getMapDimensions();
      const cmPerPixel = this.#getResolution();      // Get roof segments for API data
      const { roofSegments, maxSunshineHoursPerYear } = await this.#apiService.fetchSolarApiData(mapBounds);
      this.#calculator.setMaxSunshineHoursPerYear(maxSunshineHoursPerYear);

      // Prepare roof data only for selected roofs using cached configuration for consistency
      const selectedRoofData = this.#prepareSelectedRoofDataWithCache(selectedRoofIndices, roofSegments);
      const objectData = this.#prepareObjectData();

      const response = await this.#apiService.generatePanelsOnSelectedRoofs(
        selectedRoofData,
        objectData,
        moduleId,
        cmPerPixel,
        mapBounds,
        mapDimensions,
        20 // default edge padding
      );      if (response.success) {
        // Only clear panels on selected roofs, keep others
        this.#clearPanelsOnSelectedRoofs(selectedRoofIndices);
        
        // Render new panels without clearing existing ones
        this.#renderer.renderPanelsFromResponseSelective(response.results.roofs);
        
        // Update stored roof data
        this.#updateStoredRoofData(selectedRoofIndices, response.results.roofs);
        
        // Hide roof polygons after generation
        this.#detectionService.togglePolygonVisibility(false);
        
        // Update UI
        const currentPanelCount = this.getCurrentPanelCount();
        this.#uiManager.updateStatsPanel(
          currentPanelCount, 
          this.#maxPanels, 
          response.results.electrical_system
        );

        console.log(`Successfully generated panels on ${selectedRoofIndices.length} roofs`);
      } else {
        this.#handleError('Panel generation failed', response.error);
      }
    } catch (error) {
      this.#handleError('Panel generation failed', error);
    } finally {
      this.#uiManager.hideLoading(loadingDiv);
    }
  }

  /**
   * Prepare roof data only for selected roof indices
   */
  #prepareSelectedRoofData(selectedRoofIndices, roofSegments) {
    if (!this.#detectionService?.currentPolygonsRoof) return [];

    return selectedRoofIndices.map(index => {
      const polygon = this.#detectionService.currentPolygonsRoof[index];
      if (!polygon || polygon.isPanelElement) return null;

      const coords = this.#extractPolygonCoordinates(polygon);
      const matchingSegment = this.#findMatchingRoofSegment(coords, roofSegments);
      
      return {
        coords,
        pitch: matchingSegment?.pitchDegrees || null,
        azimuth: matchingSegment?.azimuthDegrees || null,
        roofIndex: index // Keep track of original index
      };
    }).filter(Boolean);
  }
  /**
   * Prepare roof data only for selected roof indices using cached configuration
   */
  #prepareSelectedRoofDataWithCache(selectedRoofIndices, roofSegments) {
    if (!this.#detectionService?.currentPolygonsRoof || !this.#currentRoofs) return [];

    // Use the cached roof data structure from original generation
    return selectedRoofIndices.map(index => {
      // Get the original roof data if it exists
      const originalRoof = this.#currentRoofs[index];
      
      if (originalRoof) {
        // Use the original roof configuration for consistency
        return {
          coords: originalRoof.coords,
          pitch: originalRoof.pitch,
          azimuth: originalRoof.azimuth,
          roofIndex: index
        };
      } else {
        // Fallback to new calculation if no cached data
        const polygon = this.#detectionService.currentPolygonsRoof[index];
        if (!polygon || polygon.isPanelElement) return null;

        const coords = this.#extractPolygonCoordinates(polygon);
        const matchingSegment = this.#findMatchingRoofSegment(coords, roofSegments);
        
        return {
          coords,
          pitch: matchingSegment?.pitchDegrees || null,
          azimuth: matchingSegment?.azimuthDegrees || null,
          roofIndex: index
        };
      }
    }).filter(Boolean);
  }

  /**
   * Clear panels only on selected roofs
   */
  #clearPanelsOnSelectedRoofs(selectedRoofIndices) {
    if (!this.#detectionService?.currentPolygonsRoof) return;

    // Get the actual roof polygons for selected roofs
    const selectedRoofPolygons = selectedRoofIndices.map(index => {
      const polygon = this.#detectionService.currentPolygonsRoof[index];
      if (!polygon || polygon.isPanelElement) return null;
      return polygon;
    }).filter(Boolean);

    // Convert roof polygons to coordinate arrays for accurate containment checking
    const selectedRoofCoords = selectedRoofPolygons.map(polygon => {
      const path = polygon.getPath();
      return Array.from({ length: path.getLength() }, (_, i) => {
        const point = path.getAt(i);
        return { lat: point.lat(), lng: point.lng() };
      });
    });

    // Remove panels that are within selected roof polygons
    const panelsToRemove = [];
    this.#detectionService.currentPolygonsRoof.forEach(polygon => {
      if (polygon.isPanelElement) {
        // Get panel center point
        const panelBounds = new google.maps.LatLngBounds();
        polygon.getPath().forEach(point => panelBounds.extend(point));
        const panelCenter = panelBounds.getCenter();
        const centerPoint = { lat: panelCenter.lat(), lng: panelCenter.lng() };

        // Check if panel center is within any selected roof polygon using accurate polygon containment
        const isInSelectedRoof = selectedRoofCoords.some(roofCoords => 
          this.#geometryUtils.isPointInPolygon(centerPoint, roofCoords)
        );

        if (isInSelectedRoof) {
          panelsToRemove.push(polygon);
        }
      }
    });

    // Remove the panels
    panelsToRemove.forEach(panel => {
      panel.setMap(null);
      const index = this.#detectionService.currentPolygonsRoof.indexOf(panel);
      if (index > -1) {
        this.#detectionService.currentPolygonsRoof.splice(index, 1);
      }
      // Remove from renderer's panel list
      const panelPolygons = this.#renderer.getPanelPolygons();
      const rendererIndex = panelPolygons.indexOf(panel);
      if (rendererIndex > -1) {
        panelPolygons.splice(rendererIndex, 1);
      }
    });

    console.log(`Removed ${panelsToRemove.length} panels from ${selectedRoofIndices.length} selected roofs`);
  }

  /**
   * Update stored roof data with new panels
   */
  #updateStoredRoofData(selectedRoofIndices, newRoofData) {
    if (!this.#currentRoofs || !newRoofData) return;

    // Update the stored roof data for the selected roofs
    newRoofData.forEach((newRoof, index) => {
      const originalIndex = selectedRoofIndices[index];
      if (originalIndex !== undefined && this.#currentRoofs[originalIndex]) {
        this.#currentRoofs[originalIndex] = newRoof;
      }
    });
  }

  /**
   * Update max panel count (for API synchronization)
   */
  async updateMaxPanelCount(maxPanels) {
    this.#maxPanels = maxPanels;
    // Could add API call here if needed
    return true;
  }

  /**
   * Get current panel count from renderer
   */
  getCurrentPanelCount() {
    return this.#renderer.getPanelCount();
  }
}
