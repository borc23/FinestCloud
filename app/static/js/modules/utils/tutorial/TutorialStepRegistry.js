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
                target: '#panelEditActions',
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
     * Set up event listeners for the select area step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupSelectAreaStepListeners(manager) {
        const selectAreaButton = document.querySelector('button.menu-item[onclick="handleDetection()"]');
        
        if (!selectAreaButton) {
            console.warn("Tutorial: Select Area button not found for the select area step");
            return null;
        }
        
        // Apply CSS-based highlight
        selectAreaButton.classList.add('button-highlight');
        
        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
        
        // Create a one-time click handler that automatically advances to the next step
        const handleSelectAreaButtonClick = () => {
            console.log("Tutorial: Select Area button clicked, advancing to next step");
            
            // Wait a short moment to allow the UI to update before advancing
            setTimeout(() => {
                manager.nextStep();
            }, 500);
            
            // Remove this event listener after first click
            selectAreaButton.removeEventListener('click', handleSelectAreaButtonClick);
        };
        
        // Add the click handler
        selectAreaButton.addEventListener('click', handleSelectAreaButtonClick);
        
        // Return cleanup function
        return () => {
            selectAreaButton.removeEventListener('click', handleSelectAreaButtonClick);
            selectAreaButton.classList.remove('button-highlight');
        };
    }
    
    /**
     * Set up event listeners for the detection step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupDetectionStepListeners(manager) {
        const detectButton = document.querySelector('button.menu-item[onclick="handleDetection()"]');
        
        if (!detectButton) {
            console.warn("Tutorial: Detect button not found for detection step");
            return null;
        }
        
        // Apply CSS-based highlight
        detectButton.classList.add('button-highlight');
        
        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
        
        // Create a one-time click handler that advances to the next step
        const handleDetectButtonClick = () => {
            console.log("Tutorial: Detect button clicked, advancing to next step");
            
            // Wait a short moment to allow the UI to update before advancing
            setTimeout(() => {
                manager.nextStep();
            }, 500);
            
            // Remove this event listener after first click
            detectButton.removeEventListener('click', handleDetectButtonClick);
        };
        
        // Add the click handler
        detectButton.addEventListener('click', handleDetectButtonClick);
        
        // Return cleanup function
        return () => {
            detectButton.removeEventListener('click', handleDetectButtonClick);
            detectButton.classList.remove('button-highlight');
        };
    }
    
    /**
     * Set up event listeners for the edit mode step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupEditModeStepListeners(manager) {
        const editButton = document.querySelector('button.menu-item[onclick="editImage()"]');
        
        if (!editButton) {
            console.warn("Tutorial: Edit button not found for edit mode step");
            return null;
        }
        
        // Apply CSS-based highlight
        editButton.classList.add('button-highlight');
        
        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
        
        // Create a one-time click handler that advances to the next step
        const handleEditButtonClick = () => {
            console.log("Tutorial: Edit button clicked, advancing to next step");
            
            // Wait a short moment to allow the UI to update before advancing
            setTimeout(() => {
                manager.nextStep();
            }, 500);
            
            // Remove this event listener after first click
            editButton.removeEventListener('click', handleEditButtonClick);
        };
        
        // Add the click handler
        editButton.addEventListener('click', handleEditButtonClick);
        
        // Return cleanup function
        return () => {
            editButton.removeEventListener('click', handleEditButtonClick);
            editButton.classList.remove('button-highlight');
        };
    }
    
    /**
     * Set up event listeners for the polygon editing step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupPolygonEditingStepListeners(manager) {
        // Apply CSS-based highlight to the Create New Polygon button
        const createPolygonBtn = document.getElementById('createPolygonBtn');
        if (createPolygonBtn) {
            createPolygonBtn.classList.add('button-highlight');
        }

        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }

        // Track user interactions to provide contextual guidance
        let interactionTracker = {
            hasSelectedPolygon: false,
            hasRightClicked: false,
            hasUsedDeleteKey: false
        };
        
        // Set up tooltip properly
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            // Increase the z-index to ensure it stays on top
            tooltipElement.style.zIndex = "10000";
            
            // Add a class to the tooltip for polygon-editing specific styling
            tooltipElement.classList.add('polygon-editing-step');
            
            // Keep nav buttons clickable (handled by CSS now)
            const tooltipNav = tooltipElement.querySelector('.tooltip-nav');
            if (tooltipNav) tooltipNav.style.pointerEvents = 'auto';
        }

        // Define the event handlers that were referenced in the cleanup function
        const handleKeyDown = (event) => {
            if (event.key === 'Delete' && manager.tutorialActive) {
                console.log("Tutorial: Delete key pressed during polygon editing step");
                interactionTracker.hasUsedDeleteKey = true;
                
                // Ensure tooltip stays visible after any operations
                setTimeout(() => {
                    const tooltipElement = manager.ui.getElements().tooltip;
                    if (tooltipElement) {
                        tooltipElement.style.display = 'block';
                        tooltipElement.style.zIndex = "10000";
                    }
                }, 20);
                
                checkAdvanceCondition();
            }
        };
        
        // Add click event listener to track polygon selection
        const handleMapClick = (event) => {
            // Left click
            if (event.button === 0) {
                setTimeout(() => {
                    interactionTracker.hasSelectedPolygon = true;
                    console.log("Tutorial: Possible polygon selection detected");
                    
                    // Ensure tooltip stays visible after any operations
                    const tooltipElement = manager.ui.getElements().tooltip;
                    if (tooltipElement) {
                        tooltipElement.style.display = 'block';
                        tooltipElement.style.zIndex = "10000";
                    }
                    
                    checkAdvanceCondition();
                }, 20);
            } else if (event.button === 2) { // Right click
                interactionTracker.hasRightClicked = true;
                console.log("Tutorial: Right-click detected during polygon editing");
                
                // Ensure tooltip stays visible after any operations
                setTimeout(() => {
                    const tooltipElement = manager.ui.getElements().tooltip;
                    if (tooltipElement) {
                        tooltipElement.style.display = 'block';
                        tooltipElement.style.zIndex = "10000";
                    }
                }, 20);
                
                checkAdvanceCondition();
            }
        };
        
        // Prevent context menu from appearing on right-click
        const handleContextMenu = (event) => {
            // Don't prevent all context menus as the app might need some,
            // but track that it happened
            interactionTracker.hasRightClicked = true;
            console.log("Tutorial: Context menu event during polygon editing");
            
            // Ensure tooltip stays visible after any operations
            setTimeout(() => {
                const tooltipElement = manager.ui.getElements().tooltip;
                if (tooltipElement) {
                    tooltipElement.style.display = 'block';
                    tooltipElement.style.zIndex = "10000";
                }
            }, 20);
            
            checkAdvanceCondition();
        };
        
        // Function to check if we should advance to next step
        const checkAdvanceCondition = () => {
            // Count the number of true values in interactionTracker
            const interactionCount = Object.values(interactionTracker)
                .filter(val => val === true).length;
            
            // Require either:
            // 1. All three interactions (selection, right-click, delete key), or
            // 2. Just the delete key (as it's the most important interaction)
            if (interactionTracker.hasUsedDeleteKey || interactionCount === 3) {
                // Add a confirmation step before auto-advancing
                if (!window.tutorialConfirmShown) {
                    window.tutorialConfirmShown = true;
                    
                    // Use the new addMessageToTooltip method
                    manager.addMessageToTooltip({
                        type: 'success',
                        content: '<p><strong>Great job!</strong> You\'ve tried the key polygon editing functions. Now click on "Create New Polygon"</p>',
                        className: 'tutorial-confirm'
                    });
                    
                    // Modify the next button to be more obvious
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
                    
                    console.log("Tutorial: User has completed key polygon editing interactions");

                    // Add listener for the createPolygonBtn to advance the tutorial
                    const createPolygonBtn = document.getElementById('createPolygonBtn');
                    if (createPolygonBtn) {
                        // Use a one-time click event listener to advance to the next step
                        const handleCreatePolygonClick = () => {
                            console.log("Tutorial: Create New Polygon button clicked, advancing to next step");
                            setTimeout(() => {
                                manager.nextStep();
                            }, 100);
                            // Remove listener after first click
                            createPolygonBtn.removeEventListener('click', handleCreatePolygonClick);
                        };
                        
                        createPolygonBtn.addEventListener('click', handleCreatePolygonClick);
                        
                        // Store the event listener cleanup function
                        window.tutorialCreatePolygonListener = {
                            element: createPolygonBtn,
                            listener: handleCreatePolygonClick
                        };
                    } else {
                        console.warn("Tutorial: Create New Polygon button not found");
                    }
                }
            }
        };
        
        // Intercept polygon interactions that might hide the tutorial
        const handlePolygonInteraction = () => {
            // Reset tooltip visibility after a very short delay
            setTimeout(() => {
                const tooltipElement = manager.ui.getElements().tooltip;
                if (tooltipElement) {
                    tooltipElement.style.display = 'block';
                    tooltipElement.style.zIndex = "10000";
                }
            }, 20);
        };
        
        // Add all event listeners
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('click', handleMapClick);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('mousedown', handlePolygonInteraction);
        
        // Keep the tutorial tooltip visible by ensuring it's never hidden
        // Create a monitor that frequently checks if the tooltip is visible
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    console.log("Tutorial: Polygon editing tooltip was hidden, making visible again");
                    tooltipElement.style.display = 'block';
                }
                
                // Also ensure proper position and z-index
                if (parseInt(tooltipElement.style.zIndex) < 10000) {
                    tooltipElement.style.zIndex = "10000";
                }
                
                // Ensure the class is still applied
                if (!tooltipElement.classList.contains('polygon-editing-step')) {
                    tooltipElement.classList.add('polygon-editing-step');
                }
            }
        }, 100); // Check every 100ms (more frequent than before)

        // Return cleanup function
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('click', handleMapClick);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('mousedown', handlePolygonInteraction);
            clearInterval(tooltipMonitor);
            
            // Remove CSS highlight from Create New Polygon button
            if (createPolygonBtn) {
                createPolygonBtn.classList.remove('button-highlight');
            }
            
            // Remove the Create New Polygon button click listener if it exists
            if (window.tutorialCreatePolygonListener) {
                const { element, listener } = window.tutorialCreatePolygonListener;
                if (element && listener) {
                    element.removeEventListener('click', listener);
                }
                delete window.tutorialCreatePolygonListener;
            }
            
            // Restore tooltip styling if needed
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                // Remove the special class for this step
                tooltipElement.classList.remove('polygon-editing-step');
                const tooltipContent = tooltipElement.querySelector('.tooltip-content');
                if (tooltipContent) tooltipContent.style.pointerEvents = '';
            }
            
            console.log("Tutorial: Cleaned up polygon editing step listeners");
        };
    }
    
    /**
     * Set up event listeners for the polygon drawing step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupPolygonDrawingStepListeners(manager) {
        // Find the Generate Panels button
        const generatePanelsBtn = document.getElementById('generatePanelsBtn') || 
                                 document.querySelector('.generate-panels-btn');
        
        if (generatePanelsBtn) {
            console.log("Tutorial: Generate Panels button found");
            
            // Apply CSS-based highlight
            generatePanelsBtn.classList.add('button-highlight');
            
            // Make sure it's visible
            generatePanelsBtn.style.setProperty('display', 'flex', 'important');
            
            // Add click listener to advance to next step
            const handleGeneratePanelsClick = () => {
                console.log("Tutorial: Generate Panels button clicked, advancing to next step");
                setTimeout(() => {
                    manager.nextStep();
                }, 500);
                
                // Remove listener after first click
                generatePanelsBtn.removeEventListener('click', handleGeneratePanelsClick);
            };
            
            generatePanelsBtn.addEventListener('click', handleGeneratePanelsClick);
            
            // Store the event listener for cleanup
            window.tutorialGeneratePanelsListener = {
                element: generatePanelsBtn,
                listener: handleGeneratePanelsClick
            };
        } else {
            console.warn("Tutorial: Generate Panels button not found");
        }

        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }

        // Add instruction message
        manager.addMessageToTooltip({
            type: 'success',
            content: `
                <p><strong>Great!</strong> If you are satisfied with how the roof plan is drawn, you can generate solar panels by clicking the "Generate Panels" button.</p>
            `,
            className: 'tutorial-panel-instruction'
        });

        // Make sure the tooltip is visible
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            tooltipElement.style.display = 'block';
            tooltipElement.style.visibility = 'visible';
            tooltipElement.style.opacity = '1';
            tooltipElement.style.zIndex = '10001 !important';
        }
        
        // Force show the Generate Panels button if needed
        if (window.services?.generatePanels) {
            window.services.generatePanels.tutorialSaysShowButton = true;
            window.services.generatePanels.refreshButtonVisibility();
        }
        
        // Keep the tutorial tooltip visible 
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    console.log("Tutorial: Polygon drawing tooltip was hidden, making visible again");
                    tooltipElement.style.display = 'block';
                    tooltipElement.style.visibility = 'visible';
                    tooltipElement.style.opacity = '1';
                }
                tooltipElement.style.zIndex = "10001";
                
                // Also check the instruction message
                const instructionMessage = tooltipElement.querySelector('.tutorial-panel-instruction');
                if (!instructionMessage) {
                    console.log("Tutorial: Instruction message disappeared, adding it again");
                    
                    // If the message is gone, add it again using the manager method
                    manager.addMessageToTooltip({
                        type: 'success',
                        content: `
                            <p><strong>Great!</strong> If you are satisfied with how the roof plan is drawn, you can generate solar panels by clicking the "Generate Panels" button.</p>
                        `,
                        className: 'tutorial-panel-instruction'
                    });
                }
            }
        }, 100);
        
        // Return cleanup function
        return () => {
            // Remove CSS highlight from the Generate Panels button
            if (generatePanelsBtn) {
                generatePanelsBtn.classList.remove('button-highlight');
            }
            
            // Remove the Generate Panels button click listener if it exists
            if (window.tutorialGeneratePanelsListener) {
                const { element, listener } = window.tutorialGeneratePanelsListener;
                if (element && listener) {
                    element.removeEventListener('click', listener);
                }
                delete window.tutorialGeneratePanelsListener;
            }
            
            // Reset the tutorialSaysShowButton flag
            if (window.services?.generatePanels) {
                window.services.generatePanels.tutorialSaysShowButton = false;
                window.services.generatePanels.refreshButtonVisibility();
            }
            
            clearInterval(tooltipMonitor);
            
            // Restore tooltip styling if needed
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                // Remove the special class for this step
                tooltipElement.classList.remove('polygon-editing-step');
                const tooltipContent = tooltipElement.querySelector('.tooltip-content');
                if (tooltipContent) tooltipContent.style.pointerEvents = '';
            }
            
            console.log("Tutorial: Cleaned up polygon drawing step listeners");
        };
    }
    
    /**
     * Set up event listeners for the solar panel editing step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupPanelEditingStepListeners(manager) {
        // Keep the tooltip visible with improved z-index
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            tooltipElement.style.zIndex = "10000";
            
            // Add a class for panel-editing specific styling
            tooltipElement.classList.add('polygon-editing-step');
            
            // Keep nav buttons clickable (handled by CSS now)
            const tooltipNav = tooltipElement.querySelector('.tooltip-nav');
            if (tooltipNav) tooltipNav.style.pointerEvents = 'auto';
        }
        
        // Add instructions for panel editing using the new manager method
        manager.addMessageToTooltip({
            type: 'info',
            content: `
                <p><strong>Try the following actions:</strong></p>
                <ul>
                    <li>Select a panel by clicking on it</li>
                    <li>Multi-select panels with Ctrl+Click</li>
                    <li>Move panels by dragging them</li>
                    <li>Rotate panels using the rotation handle</li>
                </ul>
            `,
            className: 'tutorial-panel-edit-instruction'
        });
        
        // Set up monitoring for panel interactions
        const interactionEvents = {
            panelSelected: false,
            panelMoved: false,
            panelRotated: false
        };
        
        // Keep the tutorial tooltip visible by ensuring it's never hidden
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    tooltipElement.style.display = 'block';
                }
                tooltipElement.style.zIndex = "10000";
                
                // Ensure the class is still applied
                if (!tooltipElement.classList.contains('polygon-editing-step')) {
                    tooltipElement.classList.add('polygon-editing-step');
                }
            }
        }, 100);
        
        // Monitor for panel selections
        const handleMouseDown = (event) => {
            // Check if we're clicking on a panel
            const isPanelClick = event.target.classList && 
                (event.target.classList.contains('solar-panel') || 
                 event.target.closest('.solar-panel') ||
                 event.path?.some(el => el.classList && el.classList.contains('solar-panel')));
                 
            if (isPanelClick) {
                interactionEvents.panelSelected = true;
                console.log("Tutorial: Panel selected");
                checkAdvanceConditions();
            }
        };
        
        // Monitor for panel movement
        const handleMouseMove = (event) => {
            if (interactionEvents.panelSelected && event.buttons === 1) {
                interactionEvents.panelMoved = true;
                console.log("Tutorial: Panel moved");
                checkAdvanceConditions();
            }
        };
        
        // Monitor for rotation handle interactions
        const handleRotationHandleClick = (event) => {
            if (event.target.classList && 
                (event.target.classList.contains('rotation-handle') || 
                 event.target.closest('rotation-handle'))) {
                interactionEvents.panelRotated = true;
                console.log("Tutorial: Panel rotation started");
                checkAdvanceConditions();
            }
        };
        
        // Function to check if we should advance to next step
        const checkAdvanceConditions = () => {
            const hasCompletedInteractions = 
                interactionEvents.panelSelected && 
                (interactionEvents.panelMoved || interactionEvents.panelRotated);
            
            if (hasCompletedInteractions) {
                // Add a success message using the new manager method
                const existingSuccess = tooltipElement.querySelector('.tutorial-success');
                
                if (!existingSuccess) {
                    manager.addMessageToTooltip({
                        type: 'success',
                        content: '<p><strong>Well done!</strong> You\'ve learned how to edit solar panels. Click Next to continue.</p>',
                        className: 'tutorial-success'
                    });
                    
                    // Highlight the next button
                    const nextButton = tooltipElement.querySelector('.tooltip-next');
                    if (nextButton) {
                        nextButton.style.animation = 'pulse-button 1.5s infinite';
                        nextButton.style.fontWeight = 'bold';
                        nextButton.style.backgroundColor = '#4caf50';
                    }
                }
            }
        };
        
        // Add event listeners
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleRotationHandleClick);
        
        // Return cleanup function
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleRotationHandleClick);
            clearInterval(tooltipMonitor);
            
            // Remove any pulse animation
            const style = document.getElementById('pulse-button-style');
            if (style) style.remove();
            
            // Restore tooltip styling if needed
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                // Remove the special class for this step
                tooltipElement.classList.remove('polygon-editing-step');
                const tooltipContent = tooltipElement.querySelector('.tooltip-content');
                if (tooltipContent) tooltipContent.style.pointerEvents = '';
            }
            
            console.log("Tutorial: Cleaned up panel editing step listeners");
        };
    }
    
    /**
     * Set up event listeners for the module selection step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupModuleSelectionStepListeners(manager) {
        // Find the module selector button
        const moduleSelectButton = document.querySelector('.module-select-button');
        
        if (!moduleSelectButton) {
            console.warn("Tutorial: Module selector button not found");
            return null;
        }
        
        // Apply highlight class to the module selector button
        moduleSelectButton.classList.add('module-selector-highlight');
        
        // Keep the tooltip visible with improved z-index
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            tooltipElement.style.zIndex = "10000";
            
            // Add the same class we use for polygon editing for consistent behavior
            tooltipElement.classList.add('polygon-editing-step');
            
            // Keep nav buttons clickable
            const tooltipNav = tooltipElement.querySelector('.tooltip-nav');
            if (tooltipNav) tooltipNav.style.pointerEvents = 'auto';
        }
        
        // Add instructions for module selection using the new manager method
        manager.addMessageToTooltip({
            type: 'success',
            content: `
                <p><strong>Try the following actions:</strong></p>
                <ul>
                    <li>Click on the module selector button to open the panel</li>
                    <li>Browse through different module types</li>
                    <li>Select a different module to see how it affects your installation</li>
                </ul>
            `,
            className: 'tutorial-module-selection-instruction'
        });
        
        // Set up monitoring for module selector interactions
        const interactionEvents = {
            moduleButtonClicked: false,
            moduleSelected: false
        };
        
        // Keep the tutorial tooltip visible by ensuring it's never hidden
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    tooltipElement.style.display = 'block';
                }
                tooltipElement.style.zIndex = "10000";
                
                // Ensure the class is still applied
                if (!tooltipElement.classList.contains('polygon-editing-step')) {
                    tooltipElement.classList.add('polygon-editing-step');
                }
            }
        }, 100);
        
        // Add click handler for module selector button
        const handleModuleButtonClick = () => {
            interactionEvents.moduleButtonClicked = true;
            console.log("Tutorial: Module selector button clicked");
            checkAdvanceConditions();
        };
        
        // Add click handler for module selection
        const handleModuleSelection = (event) => {
            // Check if we clicked on a module item
            if (event.target.closest('.module-item')) {
                interactionEvents.moduleSelected = true;
                console.log("Tutorial: Module selected");
                
                // Wait for the panel to be regenerated with the new module
                setTimeout(() => {
                    checkAdvanceConditions();
                }, 500);
            }
        };
        
        // Function to check if we should advance to next step
        const checkAdvanceConditions = () => {
            const hasCompletedInteractions = 
                interactionEvents.moduleButtonClicked && 
                interactionEvents.moduleSelected;
            
            if (hasCompletedInteractions) {
                // Add a transitional message using the new manager method
                const existingSuccess = tooltipElement.querySelector('.tutorial-success');
                
                if (!existingSuccess) {
                    manager.addMessageToTooltip({
                        type: 'success',
                        content: '<p><strong>Great choice!</strong> A new module has been selected. Wait for panels to regenerate...</p>',
                        className: 'tutorial-success'
                    });
                    
                    // Automatically advance to next step after a delay to let panels regenerate
                    setTimeout(() => {
                        console.log("Tutorial: Module selection complete, automatically advancing to next step");
                        manager.nextStep();
                    }, 2500);
                }
            }
        };
        
        // Add event listeners
        moduleSelectButton.addEventListener('click', handleModuleButtonClick);
        const moduleList = document.querySelector('.module-list');
        if (moduleList) {
            moduleList.addEventListener('click', handleModuleSelection);
        } else {
            console.warn("Tutorial: Module list element not found");
        }
        
        // Return cleanup function
        return () => {
            moduleSelectButton.removeEventListener('click', handleModuleButtonClick);
            if (moduleList) {
                moduleList.removeEventListener('click', handleModuleSelection);
            }
            clearInterval(tooltipMonitor);
            
            // Remove pulse animation from button
            moduleSelectButton.style.animation = '';
            
            // Ensure the module-selector-highlight class is removed from all possible elements
            // Not just the original button we found (in case there are multiple or the DOM has updated)
            const allModuleSelectors = document.querySelectorAll('.module-select-button, .module-selector');
            allModuleSelectors.forEach(element => {
                element.classList.remove('module-selector-highlight');
                element.classList.remove('button-highlight');
            });
            
            // Also check for any highlighted navbar items that might contain module selectors
            const navbarItems = document.querySelectorAll('.navbar-item');
            navbarItems.forEach(item => {
                item.classList.remove('module-selector-highlight');
                item.classList.remove('button-highlight');
            });
            
            // Remove any pulse animation style
            const style = document.getElementById('pulse-button-style');
            if (style) style.remove();
            
            // Restore tooltip styling if needed
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                // Remove the special class for this step
                tooltipElement.classList.remove('polygon-editing-step');
                const tooltipContent = tooltipElement.querySelector('.tooltip-content');
                if (tooltipContent) tooltipContent.style.pointerEvents = '';
            }
            
            console.log("Tutorial: Cleaned up module selection step listeners and removed all module selector highlights");
        };
    }
    
    /**
     * Set up event listeners for the Clear All step
     * @param {TutorialManager} manager - The tutorial manager
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupClearAllStepListeners(manager) {
        // Find the Clear All button in the sidebar
        const clearAllButton = document.querySelector('.sidebar-menu.bottom-menu .menu-item');
        
        if (!clearAllButton) {
            console.warn("Tutorial: Clear All button not found");
            return null;
        }
        
        // Apply CSS-based highlight to the button
        clearAllButton.classList.add('button-highlight');
        
        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
        
        // Keep the tooltip visible with improved z-index
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            tooltipElement.style.zIndex = "10000";
            
            // Add extra styling to make the tooltip more prominent
            tooltipElement.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.15)";
            
            // Make tooltip pointer-events none except for buttons
            const tooltipContent = tooltipElement.querySelector('.tooltip-content');
            if (tooltipContent) tooltipContent.style.pointerEvents = 'none';
            
            // Keep nav buttons clickable
            const tooltipNav = tooltipElement.querySelector('.tooltip-nav');
            if (tooltipNav) tooltipNav.style.pointerEvents = 'auto';
        }
        
        // Add instructions for this final step using the new manager method
        manager.addMessageToTooltip({
            type: 'info',
            content: `
                <p><strong>Congratulations!</strong> You've reached the end of the tutorial.</p>
                <p>You can continue experimenting with the panels, trying different layouts and module types.</p>
                <p>When you're ready to finish, click the Clear button to reset everything.</p>
            `,
            className: 'tutorial-final-instruction'
        });
        
        // Create a one-time click handler that finishes the tutorial
        const handleClearAllButtonClick = () => {
            console.log("Tutorial: Clear All button clicked, finishing tutorial");
            
            // Wait a short moment to allow the UI to update before ending
            setTimeout(() => {
                manager.endTutorial();
            }, 500);
            
            // Remove this event listener after first click
            clearAllButton.removeEventListener('click', handleClearAllButtonClick);
        };
        
        // Add the click handler
        clearAllButton.addEventListener('click', handleClearAllButtonClick);
        
        // Highlight the finish button in the tooltip
        const nextButton = tooltipElement.querySelector('.tooltip-next');
        if (nextButton) {
            nextButton.textContent = 'Finish';
            nextButton.style.backgroundColor = '#4caf50';  // Green color
            nextButton.style.fontWeight = 'bold';
            
            // Add pulse animation
            if (!document.getElementById('pulse-button-style')) {
                const style = document.createElement('style');
                style.id = 'pulse-button-style';
                style.innerHTML = `
                    @keyframes pulse-button {
                        0% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                        50% { transform: scale(1.05); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
                        100% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                    }
                `;
                document.head.appendChild(style);
            }
            nextButton.style.animation = 'pulse-button 2s infinite';
        }
        
        // Keep the tutorial tooltip visible
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    tooltipElement.style.display = 'block';
                }
                tooltipElement.style.zIndex = "10000";
            }
        }, 100);
        
        // Return cleanup function
        return () => {
            clearAllButton.removeEventListener('click', handleClearAllButtonClick);
            clearAllButton.classList.remove('button-highlight');
            clearInterval(tooltipMonitor);
            
            // Remove any pulse animation style
            const style = document.getElementById('pulse-button-style');
            if (style) style.remove();
            
            // Restore tooltip styling if needed
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                // Remove the special class for this step
                tooltipElement.classList.remove('polygon-editing-step');
                const tooltipContent = tooltipElement.querySelector('.tooltip-content');
                if (tooltipContent) tooltipContent.style.pointerEvents = '';
            }
            
            console.log("Tutorial: Cleaned up Clear All step listeners");
        };
    }

    /**
     * Set up event listeners for the image mode step
     * @param {TutorialManager} manager - The tutorial manager instance
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupImageModeStepListeners(manager) {
        // Try to find the logo element using multiple potential selectors
        const logoElement = document.querySelector('.navbar-logo') || 
                           document.querySelector('.logo-container') || 
                           document.querySelector('#logoContainer');
        
        if (!logoElement) {
            console.warn("Tutorial: Logo element for image mode not found");
            return null;
        }
        
        // Apply CSS-based highlight to the logo
        logoElement.classList.add('button-highlight');
        
        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
        
        // Keep the tooltip visible with improved z-index
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            tooltipElement.style.zIndex = "10000";
        }
        
        // Add informational message
        manager.addMessageToTooltip({
            type: 'info',
            content: `
                <p>Image mode is perfect when you have your own photos of roofs that you want to analyze.</p>
                <p>All the tools you've been learning work in a similar way for uploaded images.</p>
                <p>Click Next to continue the tutorial.</p>
            `,
            className: 'tutorial-image-mode-info'
        });
        
        // Keep the tutorial tooltip visible
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    tooltipElement.style.display = 'block';
                }
                tooltipElement.style.zIndex = "10000";
            }
        }, 100);
        
        // Return cleanup function
        return () => {
            if (logoElement) {
                logoElement.classList.remove('button-highlight');
            }
            clearInterval(tooltipMonitor);
            
            console.log("Tutorial: Cleaned up image mode step listeners");
        };
    }

    /**
     * Set up event listeners for the search functionality step
     * @param {TutorialManager} manager - The tutorial manager instance
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupSearchFunctionalityStepListeners(manager) {
        // Try to find the search input using multiple potential selectors
        const searchInput = document.querySelector('#searchInput') || 
                           document.querySelector('.search-container input') || 
                           document.querySelector('.search-bar input');
        
        if (!searchInput) {
            console.warn("Tutorial: Search input element not found");
            return null;
        }
        
        // Apply CSS-based highlight to the search input
        searchInput.classList.add('button-highlight');
        
        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
        
        // Keep the tooltip visible with improved z-index
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            tooltipElement.style.zIndex = "10000";
        }
        
        // Add congratulatory message for completing the tutorial
        manager.addMessageToTooltip({
            type: 'success',
            content: `
                <p><strong>Congratulations!</strong></p>
                <p>You've successfully completed the FinestCloud Solar tutorial. You now have all the skills needed to start designing your own solar installations.</p>
                <p>Click Next to finish the tutorial and start exploring on your own!</p>
            `,
            className: 'tutorial-completion-message'
        });
        
        // Modify the next button to be more prominent
        const nextButton = tooltipElement.querySelector('.tooltip-next');
        if (nextButton) {
            nextButton.textContent = 'Finish Tutorial';
            nextButton.style.backgroundColor = '#4caf50';  // Green color
            nextButton.style.fontWeight = 'bold';
            nextButton.style.padding = '8px 20px';
            
            // Add pulse animation
            if (!document.getElementById('pulse-button-style')) {
                const style = document.createElement('style');
                style.id = 'pulse-button-style';
                style.innerHTML = `
                    @keyframes pulse-button {
                        0% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                        50% { transform: scale(1.05); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
                        100% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                    }
                `;
                document.head.appendChild(style);
            }
            nextButton.style.animation = 'pulse-button 2s infinite';
        }
        
        // Keep the tutorial tooltip visible
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    tooltipElement.style.display = 'block';
                }
                tooltipElement.style.zIndex = "10000";
            }
        }, 100);
        
        // Return cleanup function
        return () => {
            if (searchInput) {
                searchInput.classList.remove('button-highlight');
            }
            clearInterval(tooltipMonitor);
            
            // Remove any pulse animation style
            const style = document.getElementById('pulse-button-style');
            if (style) style.remove();
            
            console.log("Tutorial: Cleaned up search functionality step listeners");
        };
    }

    /**
     * Set up event listeners for the upload button step
     * @param {TutorialManager} manager - The tutorial manager instance
     * @returns {Function} Cleanup function to remove event listeners
     */
    static setupUploadButtonStepListeners(manager) {
        // Try to find the upload button using the known selector
        const uploadButton = document.querySelector('button[onclick="uploadImage()"]');
        
        if (!uploadButton) {
            console.warn("Tutorial: Upload button not found");
            return null;
        }
        
        // Apply CSS-based highlight to the upload button
        uploadButton.classList.add('button-highlight');
        
        // Hide default highlight element as we're using CSS highlighting
        const highlightElement = manager.ui.getElements().highlight;
        if (highlightElement) {
            highlightElement.style.display = 'none';
        }
        
        // Keep the tooltip visible with improved z-index
        const tooltipElement = manager.ui.getElements().tooltip;
        if (tooltipElement) {
            tooltipElement.style.zIndex = "10000";
        }
        
        // Add informational message
        manager.addMessageToTooltip({
            type: 'info',
            content: `
                <p>Uploading your own images is perfect for professionals working with custom roof photos.</p>
                <p>The detection and panel generation tools work the same way on your uploaded images.</p>
                <p>Click Next to continue the tutorial.</p>
            `,
            className: 'tutorial-upload-info'
        });
        
        // Keep the tutorial tooltip visible
        const tooltipMonitor = setInterval(() => {
            const tooltipElement = manager.ui.getElements().tooltip;
            if (tooltipElement) {
                if (tooltipElement.style.display === 'none') {
                    tooltipElement.style.display = 'block';
                }
                tooltipElement.style.zIndex = "10000";
            }
        }, 100);
        
        // Return cleanup function
        return () => {
            if (uploadButton) {
                uploadButton.classList.remove('button-highlight');
            }
            clearInterval(tooltipMonitor);
            
            console.log("Tutorial: Cleaned up upload button step listeners");
        };
    }
}
