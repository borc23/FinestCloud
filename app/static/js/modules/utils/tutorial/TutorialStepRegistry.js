/**
 * TutorialStepRegistry.js
 * Centralized registry of all tutorial steps
 */

import { TutorialStep } from './TutorialStep.js';

export class TutorialStepRegistry {
    /**
     * Get all tutorial steps
     * @param {TutorialManager} manager - The tutorial manager instance for context
     * @returns {Array} Array of tutorial steps
     */
    static getSteps(manager) {
        return [
            // Welcome step
            TutorialStep.createWelcomeStep(
                "Welcome to FinestCloud Solar - Interactive Tutorial!",
                "This interactive tutorial will guide you through the main features. The map has been moved to a specific location for this tutorial. Let's explore the features."
            ),
            
            // Map navigation step
            TutorialStep.createHighlightStep({
                title: "Zoom In",
                content: "Please use your mouse scroll wheel to zoom in on the house located in the center of the map. The marker shows the location of interest.",
                target: 'body',
                position: 'center',
                action: () => {
                    return this.setupZoomStepCleanup(manager);
                }
            }),
            
            // Select area step
            TutorialStep.createHighlightStep({
                title: "Select Area",
                content: "Click the Select Area button in the sidebar to activate the selection tool.",
                target: 'button.menu-item[onclick="handleDetection()"]',
                position: 'center',
                action: () => {
                    return this.setupSelectAreaStepListeners(manager);
                }
            }),
            
            // Detection processing step
            TutorialStep.createHighlightStep({
                title: "Detection",
                content: "Move the map so that rectangle includes the entire roof. Make sure the whole roof is inside the selection rectangle.\nAfter selecting the area, click the Detect button to start the roof detection process. Our AI will analyze the image and identify the roof outlines automatically.",
                target: 'button.menu-item[onclick="handleDetection()"]',
                position: 'center',
                action: () => {
                    return this.setupDetectionStepListeners(manager);
                }
            }),
            
            // Edit mode step
            TutorialStep.createHighlightStep({
                title: "Edit Mode",
                content: "Now click the Edit button to enter edit mode. This will allow you to make changes to the detected roof outlines, create new polygons, and place solar panels.",
                target: 'button.menu-item[onclick="editImage()"]',
                position: 'center',
                action: () => {
                    return this.setupEditModeStepListeners(manager);
                }
            }),
            
            // Polygon editing step - new step for working with polygons
            TutorialStep.createHighlightStep({
                title: "Working with Polygons",
                content: "In edit mode, you can modify roof outlines by:\n\n• Select a polygon by clicking on it\n• Add points by dragging the transparent handles\n• Remove points with a right-click on them\n• Multi-select polygons with right-click + drag\n• Delete selected polygons with the DELETE key",
                target: '#createPolygonBtn',
                position: 'center',
                action: () => {
                    return this.setupPolygonEditingStepListeners(manager);
                }
            }),
            
            // Polygon drawing step - new step for creating new polygons
            TutorialStep.createHighlightStep({
                title: "Creating New Polygons",
                content: "Click 'Create New Polygon' to start drawing. Notice the color indicator at the top of the screen:\n\n• Green means you're drawing ROOF polygons\n• Red means you're drawing OBJECT polygons (chimneys, windows, etc.)\n\nTo draw a polygon:\n1. Click to place points\n2. Complete the polygon by connecting back to the starting point\n3. To cancel drawing, click 'Create New Polygon' again",
                target: '#generatePanelsBtn',
                position: 'center',
                action: () => {
                    return this.setupPolygonDrawingStepListeners(manager);
                }
            }),
              // Edit solar panels step - for solar panel editing features
            TutorialStep.createHighlightStep({
                title: "Edit Solar Panels",
                content: "Wait for panels to be placed.\n\nNow you can work with the solar panels that were generated. Enter Edit Mode again:\n\n• Select panels individually by clicking on them\n• Multi-select panels by holding CTRL while clicking or multi select tool like with right click and drag functionality\n• Drag to move selected panels\n• Rotate panels using the rotation handle\n• Copy panels by selecting them and pressing CTRL+C, then click to place\n• Delete selected panels with the DELETE key",
                target: 'button.menu-item[onclick="editImage()"]',
                position: 'center',
                action: () => {
                    return this.setupPanelEditingStepListeners(manager);
                }
            }),
            
            // Module selection step - for choosing different panel types
            TutorialStep.createHighlightStep({
                title: "Choose Panel Module Types",
                content: "You can select different types of solar panels to install on your roof:\n\n• Click the module selector button to view available panel options\n• Choose from different module types (Standard, Premium, Compact)\n• Each module has different efficiency, power ratings, and dimensions\n• After selecting a module, panels will automatically regenerate with the new specifications",
                target: '.module-select-button',
                position: 'center',
                action: () => {
                    return this.setupModuleSelectionStepListeners(manager);
                }
            }),

            // Image Mode step - explaining the image mode functionality
            TutorialStep.createHighlightStep({
                title: "Image Mode",
                content: "This logo toggles between Map and Image modes. Image mode lets you work with your own uploaded roof photos instead of satellite imagery.\n\nImage mode works similarly to Map mode, but is designed for processing custom roof images:\n\n• Upload your own roof images\n• Use the same detection and editing tools\n• Generate panel layouts on your custom images\n\nDetailed guides are available within the interface to help you get started.",
                target: '.navbar-logo, .logo-container, #logoContainer',
                position: 'center',
                action: () => {
                    return this.setupImageModeStepListeners(manager);
                }
            }),
            
            // Upload Button step - for uploading custom images
            TutorialStep.createHighlightStep({
                title: "Upload Images",
                content: "The Upload button allows you to add your own roof images to analyze:\n\n• Click to open the file browser\n• Select clear, high-resolution images of roofs\n• Images should have good lighting and minimal shadows\n• After uploading, you can use the same detection tools you've learned about\n\nThis feature is especially useful for contractors who have their own roof imagery.",
                target: 'button[onclick="uploadImage()"]',
                position: 'center',
                action: () => {
                    return this.setupUploadButtonStepListeners(manager);
                }
            }),
            
            // Search functionality step - for address/location search
            TutorialStep.createHighlightStep({
                title: "Search Functionality",
                content: "Use this search bar to find specific locations or addresses:\n\n• Type an address or location name\n• Press Enter or click the search icon\n• The map will automatically navigate to that location\n\nYou can then use all the tools you've learned to analyze and design solar installations at the new location.",
                target: '#searchInput, .search-container, .search-bar',
                position: 'center',
                action: () => {
                    return this.setupSearchFunctionalityStepListeners(manager);
                }
            }),
            
            // Clear All step - final step of the tutorial
            TutorialStep.createHighlightStep({
                title: "Clear All",
                content: "Wait for the panels to generate with your chosen module type. Feel free to experiment with editing the panels on your own.\n\nWhen you're ready to finish, click the Clear button to remove all panels and return to a clean map. This is useful when you want to start over with a new design.",
                target: '.sidebar-menu.bottom-menu .menu-item',
                position: 'center',
                action: () => {
                    return this.setupClearAllStepListeners(manager);
                }
            })
        ];
    }
    
    /**
     * Set up cleanup for the zoom step to remove the marker when advancing
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove the marker
     */
    static setupZoomStepCleanup(manager) {
        // Return a cleanup function that will remove the marker
        // when advancing from the zoom step
        return () => {
            if (manager.tutorialMarker) {
                manager.tutorialMarker.setMap(null);
                manager.tutorialMarker = null;
                console.log("Tutorial: Marker removed after 'Zoom In' step");
            }
        };
    }

    /**
     * Helper function to set up a button-triggered step advancement
     * @param {string} selector - CSS selector for the button
     * @param {TutorialManager} manager - The tutorial manager instance
     * @param {Function} [customAction] - Optional custom action to perform on click
     * @returns {Function} Cleanup function to remove event listeners and highlights
     */
    static _setupButtonClickListener(selector, manager, customAction) {
        const button = document.querySelector(selector);

        if (!button) {
            console.warn(`Tutorial: Button with selector '${selector}' not found.`);
            return () => {};
        }

        // Apply CSS-based highlight
        button.classList.add('button-highlight');

        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }

        // Create a one-time click handler that advances to the next step
        const handleClick = () => {
            if (customAction) {
                customAction();
            }
            manager.nextStep();
        };

        // Add the click handler
        button.addEventListener('click', handleClick);

        // Return cleanup function
        return () => {
            button.classList.remove('button-highlight');
            button.removeEventListener('click', handleClick);
        };
    }

    /**
     * Helper function to apply CSS-based highlight to an element
     * @param {HTMLElement} element - The element to highlight
     * @param {TutorialManager} manager - The tutorial manager instance
     * @returns {void}
     */
    static _applyHighlight(element, manager) {
        if (!element) {
            return;
        }

        // Apply CSS-based highlight
        element.classList.add('button-highlight');

        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
    }

    /**
     * Helper function to set up a standard step with element highlighting and listeners
     * @param {string} selector - CSS selector for the target element
     * @param {TutorialManager} manager - The tutorial manager instance
     * @param {Function} [customSetup] - Optional function for additional setup logic
     * @param {Function} [cleanup] - Optional cleanup function to run on step completion
     * @returns {Function} Cleanup function to remove event listeners and highlights
     */
    static _setupStandardStep(selector, manager, customSetup, cleanup) {
        const element = document.querySelector(selector);
        
        if (!element) {
            console.warn(`Tutorial: Element with selector '${selector}' not found.`);
            return () => {};
        }
        
        // Apply CSS-based highlight
        this._applyHighlight(element, manager);
        
        // Run any custom setup logic
        let customCleanup = null;
        if (customSetup && typeof customSetup === 'function') {
            customCleanup = customSetup(element, manager);
        }
        
        // Return a combined cleanup function
        return () => {
            // Remove highlight class
            element.classList.remove('button-highlight');
            element.classList.remove('module-selector-highlight');
            
            // Run custom cleanup if provided
            if (cleanup && typeof cleanup === 'function') {
                cleanup();
            }
            
            // Run any cleanup returned from custom setup
            if (customCleanup && typeof customCleanup === 'function') {
                customCleanup();
            }
        };
    }    /**
     * Set up event listeners for the select area step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupSelectAreaStepListeners(manager) {
        return this._setupButtonClickListener('button.menu-item[onclick="handleDetection()"]', manager);
    }

    /**
     * Set up event listeners for the detection step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupDetectionStepListeners(manager) {
        return this._setupButtonClickListener('button.menu-item[onclick="handleDetection()"]', manager);
    }

    /**
     * Set up event listeners for the edit mode step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupEditModeStepListeners(manager) {
        return this._setupButtonClickListener('button.menu-item[onclick="editImage()"]', manager);
    }    /**
     * Set up event listeners for the polygon editing step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupPolygonEditingStepListeners(manager) {
        return this._setupStandardStep('#createPolygonBtn', manager, (element, manager) => {
            // Track user interactions to provide contextual guidance
            let interactionTracker = {
                hasSelectedPolygon: false,
                hasRightClicked: false,
                hasUsedDeleteKey: false
            };
            
            // Set up tooltip styling for polygon editing mode
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                // Increase the z-index to ensure it stays on top
                tooltipElement.style.zIndex = "10000";
                
                // Add a class to the tooltip for polygon-editing specific styling
                tooltipElement.classList.add('polygon-editing-step');
                
                // Keep nav buttons clickable
                const tooltipNav = tooltipElement.querySelector('.tooltip-nav');
                if (tooltipNav) tooltipNav.style.pointerEvents = 'auto';
            }
            
            // Define the event handlers
            const handleKeyDown = (event) => {
                if (event.key === 'Delete' && manager.tutorialActive) {
                    interactionTracker.hasUsedDeleteKey = true;
                    checkAdvanceCondition();
                }
            };
            
            const handleMapClick = (event) => {
                if (event.button === 0) { // Left click
                    setTimeout(() => {
                        interactionTracker.hasSelectedPolygon = true;
                        checkAdvanceCondition();
                    }, 20);
                } else if (event.button === 2) { // Right click
                    interactionTracker.hasRightClicked = true;
                    checkAdvanceCondition();
                }
            };
            
            const handleContextMenu = (event) => {
                interactionTracker.hasRightClicked = true;
                checkAdvanceCondition();
            };
            
            const checkAdvanceCondition = () => {
                // Count the number of true values in interactionTracker
                const interactionCount = Object.values(interactionTracker)
                    .filter(val => val === true).length;
                
                if (interactionTracker.hasUsedDeleteKey || interactionCount === 3) {
                    if (!window.tutorialConfirmShown) {
                        window.tutorialConfirmShown = true;
                        
                        manager.addMessageToTooltip({
                            type: 'success',
                            content: '<p><strong>Great job!</strong> You\'ve tried the key polygon editing functions. Now click on "Create New Polygon"</p>',
                            className: 'tutorial-confirm'
                        });
                        
                        // Update next button styling
                        const nextButton = tooltipElement.querySelector('.tooltip-next');
                        if (nextButton) {
                            nextButton.style.animation = 'pulse-button 1.5s infinite';
                            nextButton.style.fontWeight = 'bold';
                            
                            // Add pulse animation style if it doesn't exist
                            if (!document.getElementById('pulse-button-style')) {
                                const style = document.createElement('style');
                                style.id = 'pulse-button-style';
                                style.innerHTML = `
                                    @keyframes pulse-button {
                                        0% { transform: scale(1); }
                                        50% { transform: scale(1.05); }
                                        100% { transform: scale(1); }
                                    }
                                `;
                                document.head.appendChild(style);
                            }
                        }
                    }
                    
                    // Add click handler for the Create New Polygon button
                    if (!element.hasNextStepListener) {
                        element.hasNextStepListener = true;
                        element.addEventListener('click', () => manager.nextStep());
                    }
                }
            };
            
            // Add the event listeners
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('click', handleMapClick);
            document.addEventListener('contextmenu', handleContextMenu);
            
            // Return cleanup function for event listeners
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.removeEventListener('click', handleMapClick);
                document.removeEventListener('contextmenu', handleContextMenu);
                
                if (tooltipElement) {
                    tooltipElement.classList.remove('polygon-editing-step');
                }
                
                if (element.hasNextStepListener) {
                    element.removeEventListener('click', () => manager.nextStep());
                    element.hasNextStepListener = false;
                }
                
                // Remove temporary style if it exists
                const pulseStyle = document.getElementById('pulse-button-style');
                if (pulseStyle) {
                    pulseStyle.remove();
                }
                
                // Reset tutorial confirmation flag
                window.tutorialConfirmShown = false;
            };
        });
    }
    
    /**
     * Set up event listeners for polygon drawing step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupPolygonDrawingStepListeners(manager) {
        return this._setupButtonClickListener('#generatePanelsBtn', manager);
    }    /**
     * Set up event listeners for panel editing step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupPanelEditingStepListeners(manager) {
        return this._setupButtonClickListener('button.menu-item[onclick="editImage()"]', manager);
    }

    /**
     * Set up event listeners for module selection step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupModuleSelectionStepListeners(manager) {
        return this._setupStandardStep('.module-select-button', manager, (element) => {
            // Apply special highlight for module selector
            element.classList.remove('button-highlight');
            element.classList.add('module-selector-highlight');
            
            // Add one-time click handler
            const handleClick = () => manager.nextStep();
            element.addEventListener('click', handleClick);
            
            // Return cleanup function
            return () => {
                element.classList.remove('module-selector-highlight');
                element.removeEventListener('click', handleClick);
            };
        });
    }

    /**
     * Set up event listeners for image mode step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupImageModeStepListeners(manager) {
        return this._setupButtonClickListener('.navbar-logo, .logo-container, #logoContainer', manager);
    }

    /**
     * Set up event listeners for upload button step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupUploadButtonStepListeners(manager) {
        return this._setupButtonClickListener('button[onclick="uploadImage()"]', manager);
    }

    /**
     * Set up event listeners for search functionality step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupSearchFunctionalityStepListeners(manager) {
        return this._setupStandardStep('#searchInput, .search-container, .search-bar', manager);
    }

    /**
     * Set up event listeners for clear all step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupClearAllStepListeners(manager) {
        return this._setupButtonClickListener('.sidebar-menu.bottom-menu .menu-item', manager);
    }
}
