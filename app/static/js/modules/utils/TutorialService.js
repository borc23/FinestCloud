/**
 * TutorialService.js
 * Provides guided onboarding experience for new users
 * This is now a wrapper around the modular implementation
 */

import { TutorialService as ModularTutorialService } from './tutorial/index.js';

// Export an instance of the new modular service implementation
// This maintains backward compatibility with existing code that imports TutorialService
export class TutorialService extends ModularTutorialService {
    // All functionality is inherited from the modular implementation
}