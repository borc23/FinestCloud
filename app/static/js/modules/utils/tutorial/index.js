/**
 * index.js
 * Entry point for the tutorial module
 * Provides backward compatibility with existing implementation
 */

import { TutorialManager } from './TutorialManager.js';

/**
 * TutorialService class
 * Maintains the same interface as the original monolithic class
 * but delegates to the new modular implementation
 */
export class TutorialService {
    constructor() {
        this.manager = new TutorialManager();
        
        // Proxy key properties from manager to this service
        this.tutorialActive = this.manager.tutorialActive;
        this.completedTutorial = this.manager.completedTutorial;
    }
    
    /**
     * Initialize the tutorial service
     * @param {Object} services - Application services
     */
    initialize(services) {
        this.manager.initialize(services);
        
        // Keep properties in sync with manager
        Object.defineProperty(this, 'tutorialActive', {
            get: () => this.manager.tutorialActive,
            set: (value) => { this.manager.tutorialActive = value; }
        });
        
        Object.defineProperty(this, 'completedTutorial', {
            get: () => this.manager.completedTutorial,
            set: (value) => { this.manager.completedTutorial = value; }
        });
    }
    
    /**
     * Forward all method calls to the manager
     */
    startTutorial() {
        return this.manager.startTutorial();
    }
    
    nextStep() {
        return this.manager.nextStep();
    }
    
    prevStep() {
        return this.manager.prevStep();
    }
    
    endTutorial() {
        return this.manager.endTutorial();
    }
    
    cleanup() {
        return this.manager.cleanup();
    }
}