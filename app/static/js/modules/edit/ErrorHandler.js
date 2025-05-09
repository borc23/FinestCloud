import appErrorHandler from '../utils/AppErrorHandler.js';

export class ErrorHandler {
    static initialize() {
        // Register the emergency polygon fix with the global error handler
        window.emergencyPolygonFix = this.emergencyPolygonFix;
        
        // Register component-specific error recovery methods with the app error handler
        appErrorHandler.addListener(this.handleEditModeErrors);
        
        console.log('Edit module error handler initialized');
    }
    
    static handleEditModeErrors(error) {
        // Handle specific errors for the edit mode
        if (error.component === 'editMode' || error.component === 'polygon') {
            // Additional edit-specific recovery can go here
        }
    }
    
    static emergencyPolygonFix() {
        console.log('🚨 Emergency polygon fix started');
        
        try {
            // Access the debug tools if available
            if (window.debugEdit && window.debugEdit.fixDraggable) {
                const result = window.debugEdit.fixDraggable();
                console.log('🚨 Emergency fix applied to polygons:', result);
            } else {
                let fixCount = 0;
                
                const collections = [];
                if (window.detectionService && window.detectionService.currentPolygonsRoof) {
                    collections.push(window.detectionService.currentPolygonsRoof);
                }
                if (window.detectionService && window.detectionService.currentPolygonsObjects) {
                    collections.push(window.detectionService.currentPolygonsObjects);
                }
                
                // Fix each polygon
                collections.forEach(collection => {
                    collection.forEach(polygon => {
                        if (polygon) {
                            polygon.setOptions({
                                draggable: true,
                                clickable: true,
                                editable: true
                            });
                            fixCount++;
                        }
                    });
                });
                
                console.log(`🚨 Manual emergency fix applied to ${fixCount} polygons`);
            }
            return true;
        } catch (error) {
            appErrorHandler.handleComponentError(error, 'emergencyFix', false);
            console.error('🚨 Emergency polygon fix failed:', error);
            return false;
        }
    }
    
    static cleanup() {
        // We no longer need to remove global event listeners here as they're managed by AppErrorHandler
        
        // But we should remove our emergency fix function
        delete window.emergencyPolygonFix;
        
        console.log('Edit module error handler cleaned up');
    }
}
