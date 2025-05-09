import { StyleConfig } from './edit/StyleConfig.js';
import { StateManager } from './edit/StateManager.js';
import { EventManager } from './edit/Eventmanager.js';
import { DrawingManager } from './edit/DrawingManager.js';
import { PolygonManager } from './edit/PolygonManager.js';
import { EditService } from './edit/EditService.js';
import { ErrorHandler } from './edit/ErrorHandler.js';
import { DebugTools } from './edit/DebugTools.js';
import { RectangleSelectionManager } from './edit/RectangleSelectionManager.js';
import appErrorHandler from './utils/AppErrorHandler.js';

export class Edit {
    constructor(mapService, imageUploadService, detectionService) {
        try {
            // Validate required services
            if (!mapService) throw new Error("Map service is required");
            if (!imageUploadService) throw new Error("Image upload service is required");
            if (!detectionService) throw new Error("Detection service is required");
            
            // Store map instance for recovery purposes
            window.mapInstance = mapService.getMap();
            
            // Initialize error handler
            ErrorHandler.initialize();
            
            // Initialize components
            this.styleConfig = new StyleConfig();
            this.stateManager = new StateManager();
            this.polygonManager = new PolygonManager(
                this.styleConfig, 
                detectionService, 
                this.stateManager, 
                mapService
            );
            
            this.drawingManager = new DrawingManager(
                mapService, 
                this.stateManager, 
                this.styleConfig, 
                this.polygonManager, 
                detectionService
            );
            
            this.eventManager = new EventManager(
                this.stateManager, 
                this.drawingManager, 
                this.polygonManager
            );
            
            // Initialize main service with all required dependencies
            this.editService = new EditService({
                mapService,
                imageUploadService,
                stateManager: this.stateManager,
                eventManager: this.eventManager,
                drawingManager: this.drawingManager,
                polygonManager: this.polygonManager,
                detectionService  // Add the missing detectionService
            });
            
            // Initialize debug tools but keep minimal
            this.debugTools = new DebugTools(this);
            
            // Store reference to services
            this.imageUploadService = imageUploadService;
            this.detectionService = detectionService;
            
            console.log('Edit module initialized successfully');
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'editInitialization');
            throw error; // Rethrow to prevent partial initialization
        }
    }

    init() {
        try {
            this.editService.init();
            
            // Minimal debug tools initialization
            this.debugTools.initialize();
            
            console.log('Edit module ready');
            return true;
        } catch (error) {
            console.error('Failed to initialize Edit module:', error);
            return false;
        }
    }

    toggleEditMode() {
        try {
            return this.editService.toggleEditMode();
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'editMode');
        }
    }

    isEditMode() {
        try {
            return this.stateManager.getState().isEditMode;
        } catch (error) {
            console.error('Error checking edit mode:', error);
            return false;
        }
    }
    
    // Add method to check if we're in image or map view
    isImageView() {
        return this.imageUploadService && this.imageUploadService.isImageView;
    }

    cleanup() {
        try {
            // Clean up services in reverse order of dependency
            if (this.editService) {
                this.editService.cleanup();
                this.editService = null;
            }
            
            if (this.errorHandler) {
                ErrorHandler.cleanup();
                this.errorHandler = null;
            }
            
            if (this.debugTools) {
                this.debugTools.cleanup();
                this.debugTools = null;
            }
            
            // Clean global references
            if (window.mapInstance) {
                delete window.mapInstance;
            }
            
            if (window.debugEdit) {
                delete window.debugEdit;
            }
            
            console.log('Edit module cleaned up successfully');
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'editCleanup', false);
            console.error('Error cleaning up Edit module:', error);
        }
    }
}
