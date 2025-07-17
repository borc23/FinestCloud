/**
 * EditUIAdapter.js
 * Adapter that connects business logic in EditService with UI operations
 * Responsible for translating business operations into UI updates
 */
export class EditUIAdapter {
    constructor(dependencies) {
        const { uiManager, stateManager } = dependencies;
        
        if (!uiManager) throw new Error('UI Manager is required');
        if (!stateManager) throw new Error('State Manager is required');
        
        this.uiManager = uiManager;
        this.stateManager = stateManager;
        
        // Set up event listeners for state changes that affect the UI
        this.setupStateListeners();
    }
    
    setupStateListeners() {
        // Listen for selection changes to update UI components that depend on selection
        this.stateManager.addListener('selectedPolygons', (newSelection) => {
            this.updateSelectionDependentUI(newSelection);
        });
        
        // Listen for edit mode changes
        this.stateManager.addListener('isEditMode', (isEditMode) => {
            this.updateEditModeUI(isEditMode);
        });
    }
    
    updateSelectionDependentUI(selectedPolygons) {
        // Update panel edit actions visibility based on selection
        this.uiManager.updatePanelEditActionsVisibility(selectedPolygons);
    }
    
    updateEditModeUI(isEditMode) {
        // Update general UI state for edit mode
        this.uiManager.updateUIState(isEditMode);
    }
    
    updateDrawingModeIndicator(isInDrawingMode) {
        this.uiManager.updateDrawingModeIndicator(isInDrawingMode);
    }
    
    showNotification(message, duration) {
        this.uiManager.showNotification(message, duration);
    }
    
    getElement(key) {
        return this.uiManager.getElement(key);
    }
    
    /**
     * Clean up resources and event listeners
     */
    cleanup() {
        // Cleanup UI components
        if (this.uiManager) {
            this.uiManager.cleanup();
        }
    }
}
