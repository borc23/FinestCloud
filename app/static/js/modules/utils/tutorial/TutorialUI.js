/**
 * TutorialUI.js
 * Manages all UI elements for the tutorial system
 */

export class TutorialUI {
    constructor() {
        this.overlayElement = null;
        this.highlightElement = null;
        this.tooltipElement = null;
        this.manager = null;
    }

    /**
     * Initialize UI with reference to manager
     * @param {TutorialManager} manager - The tutorial manager instance
     */
    initialize(manager) {
        this.manager = manager;
        this.createTutorialElements();
        this.createTutorialButton();
    }

    /**
     * Create the tooltip and overlay elements
     */
    createTutorialElements() {
        // Create overlay (transparent but still needed for structure)
        this.overlayElement = document.createElement('div');
        this.overlayElement.className = 'tutorial-overlay';
        
        // Create highlight element
        this.highlightElement = document.createElement('div');
        this.highlightElement.className = 'tutorial-highlight';
        
        // Create tooltip container with fixed dimensions
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'tutorial-tooltip';
        
        // Create scrollable content area
        const tooltipContent = document.createElement('div');
        tooltipContent.className = 'tooltip-content';
        this.tooltipElement.appendChild(tooltipContent);
        
        // Create fixed navigation footer
        const tooltipNav = document.createElement('div');
        tooltipNav.className = 'tooltip-nav';
        
        // Create navigation buttons
        const skipButton = document.createElement('button');
        skipButton.className = 'tooltip-skip';
        skipButton.textContent = 'Skip Tutorial';
        skipButton.addEventListener('click', () => this.manager.endTutorial());
        
        const prevButton = document.createElement('button');
        prevButton.className = 'tooltip-prev';
        prevButton.textContent = 'Previous';
        prevButton.addEventListener('click', () => this.manager.prevStep());
        
        const nextButton = document.createElement('button');
        nextButton.className = 'tooltip-next';
        nextButton.textContent = 'Next';
        nextButton.addEventListener('click', () => this.manager.nextStep());
        
        // Add buttons to the nav bar in the correct order
        tooltipNav.appendChild(skipButton);
        tooltipNav.appendChild(prevButton);
        tooltipNav.appendChild(nextButton);
        
        // Add the fixed nav bar to the tooltip
        this.tooltipElement.appendChild(tooltipNav);
        
        // Add elements to the document but keep them hidden
        document.body.appendChild(this.overlayElement);
        document.body.appendChild(this.highlightElement);
        document.body.appendChild(this.tooltipElement);
        
        // Hide elements initially
        this.hideAllElements();
    }

    /**
     * Create tutorial button in the UI
     */
    createTutorialButton() {
        const keyboardShortcutsBtn = document.getElementById('keyboardShortcutsBtn');
        if (keyboardShortcutsBtn) {
            const tutorialBtn = document.createElement('button');
            tutorialBtn.className = 'action-button';
            tutorialBtn.id = 'tutorialBtn';
            tutorialBtn.title = 'Start Tutorial';
            tutorialBtn.innerHTML = '<i class="fas fa-graduation-cap"></i><span>Tutorial</span>';
            tutorialBtn.addEventListener('click', () => this.manager.startTutorial());
            keyboardShortcutsBtn.parentNode.insertBefore(tutorialBtn, keyboardShortcutsBtn);
        }
    }

    /**
     * Show the overlay
     */
    showOverlay() {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'block';
        }
    }

    /**
     * Update tooltip content
     * @param {Object} data - Content data 
     */
    updateTooltipContent({ title, content, currentStep, totalSteps }) {
        const tooltipContent = this.tooltipElement.querySelector('.tooltip-content');
        if (tooltipContent) {
            // Clear existing content
            tooltipContent.innerHTML = '';
            
            // Create title element
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            tooltipContent.appendChild(titleElement);
            
            // Create content element with proper white-space handling
            const contentElement = document.createElement('p');
            contentElement.textContent = content;
            tooltipContent.appendChild(contentElement);
            
            // Create step indicator
            const stepIndicator = document.createElement('div');
            stepIndicator.className = 'step-indicator';
            stepIndicator.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
            tooltipContent.appendChild(stepIndicator);
            
            // Make sure to scroll to top when content changes
            tooltipContent.scrollTop = 0;
        }
    }

    /**
     * Update navigation buttons
     * @param {Object} data - Button state data
     */
    updateNavigationButtons({ isFirstStep, isLastStep }) {
        const prevButton = this.tooltipElement.querySelector('.tooltip-prev');
        const nextButton = this.tooltipElement.querySelector('.tooltip-next');
        
        if (prevButton) {
            prevButton.style.visibility = isFirstStep ? 'hidden' : 'visible';
        }
        
        if (nextButton) {
            nextButton.textContent = isLastStep ? 'Finish' : 'Next';
        }
    }

    /**
     * Get UI elements
     * @returns {Object} The UI elements
     */
    getElements() {
        return {
            overlay: this.overlayElement,
            highlight: this.highlightElement,
            tooltip: this.tooltipElement
        };
    }

    /**
     * Hide all tutorial elements
     */
    hideAllElements() {
        if (this.overlayElement) this.overlayElement.style.display = 'none';
        if (this.highlightElement) this.highlightElement.style.display = 'none';
        if (this.tooltipElement) this.tooltipElement.style.display = 'none';
    }

    /**
     * Clean up tutorial elements
     */
    cleanup() {
        if (this.overlayElement && this.overlayElement.parentNode) {
            this.overlayElement.parentNode.removeChild(this.overlayElement);
            this.overlayElement = null;
        }
        
        if (this.highlightElement && this.highlightElement.parentNode) {
            this.highlightElement.parentNode.removeChild(this.highlightElement);
            this.highlightElement = null;
        }
        
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
            this.tooltipElement = null;
        }
    }
}