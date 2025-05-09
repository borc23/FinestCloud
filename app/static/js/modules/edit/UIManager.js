/**
 * UIManager.js
 * Manages UI elements and indicators for EditService
 */

export class UIManager {
    // Cached DOM elements
    #elements = {};
    
    constructor(dependencies) {
        const {
            stateManager,
            drawingManager
        } = dependencies;
        
        this.stateManager = stateManager;
        this.drawingManager = drawingManager;
        
        // Cache DOM elements
        this.#cacheElements();
        
        // Create drawing mode indicator
        this.#createDrawingModeIndicator();
        
        // Initialize UI components
        this.initializeUI();
    }
    
    #cacheElements() {
        const selectors = {
            editButton: '#editButton',
            editText: '#editText',
            editIcon: '#editIcon',
            editModePopup: '#editModePopup',
            polygonTypeToggle: '#polygonTypeToggle',
            createPolygonBtn: '#createPolygonBtn',
            panelEditActions: '.panel-edit-actions',
            copyPanelsBtn: '#copyPanelsBtn'
        };
        
        this.#elements = Object.entries(selectors).reduce((acc, [key, selector]) => {
            acc[key] = document.querySelector(selector);
            return acc;
        }, {});

        // Cache edit icon if edit button exists
        if (this.#elements.editButton) {
            this.#elements.editIcon = this.#elements.editButton.querySelector('i');
        }

        // Log warnings for missing critical elements
        Object.entries(this.#elements).forEach(([key, element]) => {
            if (!element && 
                key !== 'editIcon' && 
                key !== 'drawingModeIndicator' &&
                key !== 'panelEditActions' &&
                key !== 'rotateLeftBtn' &&
                key !== 'rotateRightBtn'
            ) { 
                console.warn(`Critical UI element "${key}" not found in DOM`);
            }
        });
    }
    
    #createDrawingModeIndicator() {
        // Create drawing mode indicator if it doesn't exist
        if (!document.getElementById('drawingModeIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'drawingModeIndicator';
            indicator.className = 'drawing-mode-indicator';
            indicator.innerHTML = '<i class="fas fa-draw-polygon"></i> Drawing Mode Active';
            indicator.style.display = 'none';
            document.body.appendChild(indicator);
            this.#elements.drawingModeIndicator = indicator;
            
            // Add styles if they don't exist
            if (!document.querySelector('style#drawingModeStyles')) {
                const styles = document.createElement('style');
                styles.id = 'drawingModeStyles';
                styles.textContent = `
                    .drawing-mode-indicator {
                        position: fixed;
                        top: 70px;
                        right: 80px;
                        background-color: rgba(76, 175, 80, 0.8);
                        color: white;
                        padding: 10px 15px;
                        border-radius: 4px;
                        font-weight: bold;
                        z-index: 9999;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        display: flex;
                        align-items: center;
                        animation: pulse 2s infinite;
                    }
                    .drawing-mode-indicator i {
                        margin-right: 8px;
                    }
                    @keyframes pulse {
                        0% { opacity: 0.8; }
                        50% { opacity: 1; }
                        100% { opacity: 0.8; }
                    }
                `;
                document.head.appendChild(styles);
            }
        } else {
            this.#elements.drawingModeIndicator = document.getElementById('drawingModeIndicator');
        }
    }
    
    initializeUI() {
        try {
            const { createPolygonBtn, polygonTypeToggle } = this.#elements;

            // Set up polygon creation button
            if (createPolygonBtn) {
                createPolygonBtn.addEventListener('click', () => {
                    try {
                        const isRoof = !polygonTypeToggle?.checked;
                        const isInDrawingMode = this.drawingManager.toggleDrawingMode(isRoof);
                        
                        // Update button visual state
                        if (isInDrawingMode) {
                            createPolygonBtn.classList.add('active');
                        } else {
                            createPolygonBtn.classList.remove('active');
                        }
                        
                        // Show/hide the drawing mode indicator
                        this.updateDrawingModeIndicator(isInDrawingMode);
                        
                    } catch (error) {
                        console.error('Error toggling drawing mode:', error);
                    }
                });
            }

            // Set up polygon type toggle to update polygon type while in drawing mode
            if (polygonTypeToggle) {
                polygonTypeToggle.addEventListener('change', () => {
                    try {
                        // If currently in drawing mode, update the polygon type
                        if (this.drawingManager.isInDrawingMode) {
                            const isRoof = !polygonTypeToggle.checked;
                            this.drawingManager.updatePolygonType(isRoof);
                            
                            // Update the drawing mode indicator text
                            this.#updateDrawingModeIndicatorText(isRoof);
                        }
                    } catch (error) {
                        console.error('Error updating polygon type during drawing:', error);
                    }
                });
            }
        } catch (error) {
            console.error('Error initializing UI:', error);
        }
    }

    updatePanelEditActionsVisibility(selectedPolygons) {
        const { panelEditActions } = this.#elements;
        if (!panelEditActions) return;

        const selectedPanels = Array.from(selectedPolygons).filter(p => p.isPanelElement);
        
        // Show/hide panel edit actions
        if (selectedPanels.length > 0) {
            panelEditActions.style.display = 'flex';
            // Show copy button when panels are selected
            if (this.#elements.copyPanelsBtn) {
                this.#elements.copyPanelsBtn.style.display = 'block';
            }
        } else {
            panelEditActions.style.display = 'none';
            // Hide copy button when no panels are selected
            if (this.#elements.copyPanelsBtn) {
                this.#elements.copyPanelsBtn.style.display = 'none';
            }
        }
        
        return selectedPanels.length > 0;
    }

    updateDrawingModeIndicator(isVisible) {
        const { drawingModeIndicator, polygonTypeToggle } = this.#elements;
        if (drawingModeIndicator) {
            drawingModeIndicator.style.display = isVisible ? 'flex' : 'none';
            
            // Also update indicator text when visibility changes
            if (isVisible && polygonTypeToggle) {
                const isRoof = !polygonTypeToggle.checked;
                this.#updateDrawingModeIndicatorText(isRoof);
            }
        }
    }
    
    #updateDrawingModeIndicatorText(isRoof) {
        const { drawingModeIndicator } = this.#elements;
        if (drawingModeIndicator) {
            const typeText = isRoof ? 'Roof' : 'Object';
            
            // Update the indicator color based on the polygon type
            const backgroundColor = isRoof ? 'rgba(76, 175, 80, 0.8)' : 'rgba(231, 76, 60, 0.8)';
            drawingModeIndicator.style.backgroundColor = backgroundColor;
            
            // Update the indicator text
            drawingModeIndicator.innerHTML = `<i class="fas fa-draw-polygon"></i> Drawing ${typeText} Polygon`;
        }
    }

    updateUIState(isEditMode) {
        try {
            const { editModePopup } = this.#elements;

            // Show/hide edit mode popup
            if (editModePopup) {
                editModePopup.style.display = isEditMode ? 'block' : 'none';
            }
            
            // Update edit button icon and text
            this.updateEditIcon(isEditMode);
            this.updateButtonText(isEditMode);
        } catch (error) {
            console.error('Error updating UI state:', error);
        }
    }

    updateEditIcon(isEditMode) {
        try {
            const { editIcon } = this.#elements;

            if (editIcon) {
                // Update icon class
                editIcon.classList.remove('fa-pencil-alt', 'fa-check');
                editIcon.classList.add(isEditMode ? 'fa-check' : 'fa-pencil-alt');
            }
        } catch (error) {
            console.error('Error updating edit icon:', error);
        }
    }

    updateButtonText(isEditMode) {
        try {
            const { editButton } = this.#elements;

            if (!editButton) return;
            
            const span = editButton.querySelector('span');
            if (span) {
                span.textContent = isEditMode ? 'Done' : 'Edit';
            }
        } catch (error) {
            console.error('Error updating button text:', error);
        }
    }

    /**
     * Show a notification to the user
     * @param {string} message - The message to show
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, duration = 2000) {
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
     * Get a DOM element by key
     * @param {string} key - Key of the element to get
     */
    getElement(key) {
        return this.#elements[key];
    }

    /**
     * Get all cached elements
     */
    getAllElements() {
        return { ...this.#elements };
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Hide drawing mode indicator
        if (this.#elements.drawingModeIndicator) {
            this.#elements.drawingModeIndicator.style.display = 'none';
        }
        
        // Reset UI elements
        const { editModePopup, panelEditActions } = this.#elements;
        if (editModePopup) editModePopup.style.display = 'none';
        if (panelEditActions) panelEditActions.style.display = 'none';
        
        // Remove event listeners for polygon creation button
        const { createPolygonBtn, polygonTypeToggle } = this.#elements;
        if (createPolygonBtn) {
            createPolygonBtn.replaceWith(createPolygonBtn.cloneNode(true));
        }
        
        if (polygonTypeToggle) {
            polygonTypeToggle.replaceWith(polygonTypeToggle.cloneNode(true));
        }
    }
}