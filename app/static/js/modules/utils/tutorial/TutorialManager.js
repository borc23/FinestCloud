/**
 * TutorialManager.js
 * Core manager responsible for orchestrating the tutorial experience
 */

import { TutorialUI } from './TutorialUI.js';
import { TutorialStepRegistry } from './TutorialStepRegistry.js';
import { TutorialPositioner } from './TutorialPositioner.js';

export class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.tutorialActive = false;
        this.completedTutorial = false;
        this.previousStepCleanup = null;
        this.tutorialMarker = null;
        this.services = null;
        
        // Initialize UI components
        this.ui = new TutorialUI();
        this.positioner = new TutorialPositioner();
        
        // Check if user has completed the tutorial before
        this.completedTutorial = localStorage.getItem('finestcloud_tutorial_completed') === 'true';
        
        // Bind methods for event handlers
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
    }

    /**
     * Initialize the tutorial service with application services
     * @param {Object} services - Application services
     */
    initialize(services) {
        this.services = services;
        this.steps = TutorialStepRegistry.getSteps(this); // Pass manager as context
        this.ui.initialize(this);
        
        // Check if we should show the tutorial on load
        if (!this.completedTutorial) {
            // Delay tutorial start to ensure all UI elements are loaded
            setTimeout(() => this.startTutorial(), 1500);
        }
    }

    /**
     * Set up the map for the tutorial
     */
    setupMapForTutorial() {
        if (!this.services || !this.services.search || !this.services.map) {
            console.warn("Tutorial: Search or Map service not available for initial setup.");
            return null;
        }
        
        const address = "Litijska cesta 237a, 1261 Ljubljana - Dobrunje";
        const searchInput = document.getElementById('searchInput');
        
        if (!searchInput || !this.services.search.searchAddress) {
            console.warn("Tutorial: Search input or SearchService.searchAddress method not found.");
            return null;
        }
        
        try {
            // Exit edit mode if active
            if (typeof window.exitEditModeIfActive === 'function') {
                window.exitEditModeIfActive();
            } else if (this.services.edit && typeof this.services.edit.exitEditModeIfActive === 'function') {
                this.services.edit.exitEditModeIfActive();
            }

            // Set search input and trigger search
            searchInput.value = address;
            this.services.search.searchAddress()
                .then(() => {
                    console.log(`Tutorial: Triggered search for '${address}' using SearchService.searchAddress().`);

                    const mapToControl = this.services.map.getActiveMap() || this.services.map.getMap();
                    if (mapToControl) {
                        const center = mapToControl.getCenter();
                        if (center) {
                            if (this.tutorialMarker) {
                                this.tutorialMarker.setMap(null);
                            }
                            
                            this.tutorialMarker = new google.maps.Marker({
                                position: center,
                                map: mapToControl,
                                title: "Focus on this area"
                            });
                            console.log("Tutorial: Marker added at map center:", center.toJSON());
                        } else {
                            console.warn("Tutorial: map.getCenter() returned null/undefined after searchAddress.");
                        }

                        setTimeout(() => {
                            console.log(`Tutorial: Current map zoom after searchAddress: ${mapToControl.getZoom()}`);
                        }, 500);
                    }
                })
                .catch(error => {
                    console.error(`Tutorial: Error during searchAddress:`, error);
                });
        } catch (error) {
            console.error(`Tutorial: Error during initial map setup:`, error);
        }
    }

    /**
     * Start the tutorial
     */
    async startTutorial() {
        if (this.tutorialActive) return;
        
        // Clear everything before starting the tutorial
        try {
            if (typeof window.clearAll === 'function') {
                console.log("Tutorial: Clearing everything before starting tutorial");
                await window.clearAll();
            } else {
                console.warn("Tutorial: clearAll function not available, continuing without clearing");
            }
        } catch (error) {
            console.error("Tutorial: Error while trying to clear everything:", error);
        }
        
        this.tutorialActive = true;
        this.currentStep = 0;
        
        // Set up the map immediately when starting the tutorial
        this.setupMapForTutorial();
        
        // Add escape key listener
        document.addEventListener('keydown', this.handleEscapeKey);
        
        await this.showCurrentStep();
    }

    /**
     * Handle escape key press to exit tutorial
     */
    handleEscapeKey(e) {
        if (e.key === 'Escape' && this.tutorialActive) {
            this.endTutorial();
        }
    }

    /**
     * Show the current tutorial step
     */
    async showCurrentStep() {
        if (this.currentStep >= this.steps.length) {
            this.endTutorial();
            return;
        }

        const step = this.steps[this.currentStep];
        
        // 1. Optional step-specific action
        if (step.action) {
            try {
                this.previousStepCleanup = await step.action() || null;
            } catch (error) {
                console.error("Tutorial: Error executing step action:", error);
            }
        }
        
        // 2. Show UI elements
        this.ui.showOverlay();
        
        // 3. Target element acquisition
        // Try to find the target element (if not 'body')
        const targetElement = step.target === 'body' 
            ? document.body 
            : document.querySelector(step.target);
            
        if (!targetElement) {
            console.warn(`Tutorial target '${step.target}' not found even after action. Skipping step.`);
            this.nextStep(); 
            return;
        }
        
        // Optional: Check visibility for debugging.
        if (targetElement !== document.body && 
            (targetElement.offsetWidth === 0 || targetElement.offsetHeight === 0 || getComputedStyle(targetElement).display === 'none')) {
             console.warn(`Tutorial target element '${step.target}' is not effectively visible (zero size or display:none). Highlight may be misplaced.`);
        }

        // 4. Update tooltip content
        this.ui.updateTooltipContent({
            title: step.title,
            content: step.content,
            currentStep: this.currentStep,
            totalSteps: this.steps.length
        });
        
        // 5. Update navigation buttons
        this.ui.updateNavigationButtons({
            isFirstStep: this.currentStep === 0,
            isLastStep: this.currentStep === this.steps.length - 1
        });
        
        // 6. Apply special classes based on step content
        const tooltipElement = this.ui.getElements().tooltip;
        if (tooltipElement) {
            // Remove any previous step-specific classes
            tooltipElement.classList.remove('polygon-editing-step');
            
            // Check if this is the polygon editing step
            if (step.title.includes("Working with Polygons")) {
                tooltipElement.classList.add('polygon-editing-step');
                console.log("Tutorial: Applied polygon-editing-step class to tooltip");
            }
        }
        
        // 7. Position highlight and tooltip
        this.positioner.positionElements(targetElement, step.position, this.ui);
    }

    /**
     * Add a message box to the tooltip content
     * @param {Object} options - Message box options
     * @param {string} options.type - Type of message ('success', 'info', 'warning')
     * @param {string} options.content - HTML content for the message
     * @param {string} options.className - Additional CSS class
     * @returns {HTMLElement} The created message element
     */
    addMessageToTooltip(options) {
        const { type = 'info', content, className = '' } = options;
        
        const tooltipElement = this.ui.getElements().tooltip;
        if (!tooltipElement) return null;
        
        const tooltipContent = tooltipElement.querySelector('.tooltip-content');
        if (!tooltipContent) return null;
        
        // Check if a message with this class already exists
        if (className && tooltipContent.querySelector(`.${className}`)) {
            // Update existing message instead of creating a new one
            const existingMsg = tooltipContent.querySelector(`.${className}`);
            existingMsg.innerHTML = content;
            
            // Scroll to make sure the updated message is visible
            this.scrollToElement(tooltipContent, existingMsg);
            
            return existingMsg;
        }
        
        // Create new message element with the appropriate CSS class for styling
        const messageElement = document.createElement('div');
        messageElement.className = `tutorial-${type}-message ${className}`;
        messageElement.innerHTML = content;
        
        // Insert message into tooltip content
        tooltipContent.appendChild(messageElement);
        
        // Scroll to make the new message visible
        this.scrollToElement(tooltipContent, messageElement);
        
        return messageElement;
    }
    
    /**
     * Helper method to scroll a container to show an element
     * @param {HTMLElement} container - The scrollable container
     * @param {HTMLElement} element - The element to scroll to
     */
    scrollToElement(container, element) {
        if (!container || !element) return;
        
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Calculate if the element is fully visible in the container
        const isVisible = (
            elementRect.top >= containerRect.top &&
            elementRect.bottom <= containerRect.bottom
        );
        
        if (!isVisible) {
            if (elementRect.bottom > containerRect.bottom) {
                container.scrollTop += (elementRect.bottom - containerRect.bottom) + 20;
            }
            else if (elementRect.top < containerRect.top) {
                // Scroll up to show element
                container.scrollTop -= (containerRect.top - elementRect.top) + 20;
            }
        }
    }

    /**
     * Go to the next tutorial step
     */
    async nextStep() {
        if (this.previousStepCleanup) {
            this.previousStepCleanup();
            this.previousStepCleanup = null;
        }
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            await this.showCurrentStep();
        } else {
            this.endTutorial();
        }
    }

    /**
     * Go to the previous tutorial step
     */
    async prevStep() {
        if (this.previousStepCleanup) {
            this.previousStepCleanup();
            this.previousStepCleanup = null;
        }
        if (this.currentStep > 0) {
            this.currentStep--;
            await this.showCurrentStep();
        }
    }

    /**
     * End the tutorial
     */
    endTutorial() {
        if (this.previousStepCleanup) {
            this.previousStepCleanup();
            this.previousStepCleanup = null;
        }
        
        if (this.tutorialMarker) {
            this.tutorialMarker.setMap(null);
            this.tutorialMarker = null;
            console.log("Tutorial: Marker cleaned up on endTutorial.");
        }
        
        if (window.clearAll && typeof window.clearAll === 'function') {
            console.log("Tutorial: Clearing workspace on tutorial exit");
            window.clearAll();
        } else {
            console.warn("Tutorial: window.clearAll function not available for cleanup");
        }
        
        this.tutorialActive = false;
        this.ui.hideAllElements();
        
        localStorage.setItem('finestcloud_tutorial_completed', 'true');
        this.completedTutorial = true;
        
        document.removeEventListener('keydown', this.handleEscapeKey);
    }

    /**
     * Clean up all resources used by the tutorial
     */
    cleanup() {
        this.endTutorial();
        this.ui.cleanup();
        
        if (this.tutorialMarker) {
            this.tutorialMarker.setMap(null);
            this.tutorialMarker = null;
        }
    }
}