import { MapService } from './modules/map.js';
import { CaptureService } from './modules/capture.js';
import { SearchService } from './modules/search.js';
import { DetectionService } from './modules/detection.js';
import { ImageUpload } from './modules/image.js';
import { Edit } from './modules/edit.js';
import { GeneratePanelsService } from './modules/generate_panels.js';
import { ModuleSelectorService } from './modules/module_selector.js';
import appErrorHandler from './modules/utils/AppErrorHandler.js';
import apiService from './modules/utils/ApiService.js';
import keyboardShortcuts from './modules/utils/KeyboardShortcuts.js';
import { TutorialService } from './modules/utils/TutorialService.js';

const services = {};

function initializeServices() {
    // Hide the panel slider wrapper at startup (disabled feature in v1)
    const sliderWrapper = document.getElementById('panelSliderWrapper');
    if (sliderWrapper) {
        sliderWrapper.style.display = 'none';
    }

    // Initialize error handler first
    appErrorHandler.initialize({
        maxLogSize: 100
    });
    
    // Set base URL for API service
    apiService.setBaseUrl('/api');

    services.map = new MapService();
    services.imageUpload = new ImageUpload();
    services.capture = new CaptureService(services.map, services.imageUpload);
    services.search = new SearchService(services.map);
    services.detection = new DetectionService(services.map, services.capture);
    
    // Initialize edit service first
    services.edit = new Edit(services.map, services.imageUpload, services.detection);
    services.edit.init();
    
    // Make detection service aware of the edit service
    services.detection.setEditService(services.edit.editService);
    
    services.generatePanels = new GeneratePanelsService(
        services.map, 
        services.detection, 
        services.edit.editService
    );
    services.moduleSelector = new ModuleSelectorService(services.generatePanels);

    services.map.init();
    services.imageUpload.init(services.map);
    
    // Make edit service globally available
    window.editService = services.edit.editService;
    window.detectionService = services.detection;
    window.services = services; // Make the main services object globally available

    // Initialize keyboard shortcuts service
    keyboardShortcuts.initialize();
    services.keyboardShortcuts = keyboardShortcuts;

    // Initialize tutorial service
    services.tutorial = new TutorialService();
    services.tutorial.initialize(services);

    registerEventHandlers();
}

function exitEditModeIfActive() {
    if (services.edit.isEditMode()) {
        services.edit.toggleEditMode(false);
        return true;
    }
    return false;
}

function registerEventHandlers() {
    const handlers = {
        changeMapType: () => {
            exitEditModeIfActive();
            const mapTypeSelect = document.getElementById('mapType');
            services.map.setMapType(mapTypeSelect.value);
        },
      
        searchAddress: () => {
            exitEditModeIfActive();
            services.search.searchAddress();
        },
      
        getCurrentLocation: () => {
            exitEditModeIfActive();
            services.search.getCurrentLocation();
        },
      
        toggleCaptureSquare: () => {
            exitEditModeIfActive();
            services.capture.toggle();
        },
      
        uploadImage: async () => {
            exitEditModeIfActive();
            await window.clearAll();
            services.imageUpload.handleUploadClick();
        },
      
        handleDetection: () => {
            exitEditModeIfActive();
            if (services.imageUpload.isImageView) {
                services.imageUpload.detectRoofs();
            } else {
                if (!services.capture.isSquareVisible) {
                    services.capture.toggle();
                } else {
                    services.detection.detect();
                }
            }
        },
      
        editImage: () => services.edit.toggleEditMode(),
      
        generateSolarPanels: () => {
            exitEditModeIfActive();
            const currentModule = services.moduleSelector.getCurrentModule();
            services.generatePanels.setModule(currentModule);
            services.generatePanels.generatePanels();
        },
      
        clearAll: async () => {
            exitEditModeIfActive();
            
            try {
                await fetch('/reset_session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Failed to reset session:', error);
            }

            services.detection?.clearCurrentPolygons();
            
            if (services.generatePanels) {
            services.generatePanels.clearPanels();
            
            const ui = {
                sliderWrapper: document.getElementById('panelSliderWrapper'),
                statsPanel: document.querySelector('.roof-live-stats'),
                generateBtn: document.getElementById('generatePanelsBtn')
            };
            
            if (ui.sliderWrapper) ui.sliderWrapper.style.display = 'none';
            if (ui.statsPanel) ui.statsPanel.style.display = 'none';
            if (ui.generateBtn) ui.generateBtn.style.display = 'none';
            }
            
            if (services.capture?.isSquareVisible) {
                services.capture.toggle();
            }
        },
        
        tuneGAParameters: () => {
            exitEditModeIfActive();
            const currentModule = services.moduleSelector.getCurrentModule();
            services.generatePanels.setModule(currentModule);
            services.generatePanels.tuneAndGeneratePanels();
        },
        
        showKeyboardShortcuts: () => {
            services.keyboardShortcuts.showHelp();
        }
    };
  
    Object.entries(handlers).forEach(([name, handler]) => {
        window[name] = handler;
    });

    // Create a global handler object
    window.solarApp = {
        generateSolarPanels: () => {
            exitEditModeIfActive();
            const currentModule = services.moduleSelector.getCurrentModule();
            services.generatePanels.setModule(currentModule);
            services.generatePanels.generatePanels();
        },
      
        clearAll: async () => {
            exitEditModeIfActive();
            
            try {
                await fetch('/reset_session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Failed to reset session:', error);
            }            services.detection?.clearCurrentPolygons();
            
            if (services.generatePanels) {
                // Reset all panel generation state to ensure clean dimensions on subsequent runs
                services.generatePanels.resetState();
                
                const ui = {
                    sliderWrapper: document.getElementById('panelSliderWrapper'),
                    statsPanel: document.querySelector('.roof-live-stats'),
                    generateBtn: document.getElementById('generatePanelsBtn')
                };
                
                if (ui.sliderWrapper) ui.sliderWrapper.style.display = 'none';
                if (ui.statsPanel) ui.statsPanel.style.display = 'none';
            }
        },
        
        /**
         * Create new panels and add them to the existing panel layout
         * @param {Array} newPanelsCoords - Array of panel coordinate arrays (each panel is an array of lat/lng coordinates)
         * @param {number} roofIndex - Index of the roof to add panels to (defaults to 0)
         * @returns {boolean} - Success status
         */
        createPanels: (newPanelsCoords, roofIndex = 0) => {
            if (!services.generatePanels) {
                console.error('Generate panels service not initialized');
                return false;
            }
            return services.generatePanels.createPanels(newPanelsCoords, roofIndex);
        },
        
        /**
         * Get the current number of panels
         * @returns {number}
         */
        getCurrentPanelCount: () => {
            if (!services.generatePanels) return 0;
            return services.generatePanels.getCurrentPanelCount();
        },
        
        /**
         * Get the maximum possible number of panels
         * @returns {number}
         */
        getMaxPanelCount: () => {
            if (!services.generatePanels) return 0;
            return services.generatePanels.getMaxPanelCount();
        },
        
        /**
         * Update stats based on the actual panels on the map
         */
        updateStatsFromActualPanels: () => {
            if (!services.generatePanels) return;
            services.generatePanels.updateStatsFromActualPanels();
        }
    };
    
    // Assign helper functions to window object for global access
    window.generateSolarPanels = window.solarApp.generateSolarPanels;
    window.clearAll = window.solarApp.clearAll;
    window.createPanels = window.solarApp.createPanels;
    
    // Set up keyboard shortcuts button click handler
    const keyboardShortcutsBtn = document.getElementById('keyboardShortcutsBtn');
    if (keyboardShortcutsBtn) {
        keyboardShortcutsBtn.addEventListener('click', handlers.showKeyboardShortcuts);
    }
}

// Clean up services on page unload
window.addEventListener('beforeunload', () => {
    // Clean up error handler
    appErrorHandler.cleanup();
});

window.addEventListener('load', initializeServices, { once: true });