/**
 * TutorialStep.js
 * Defines the base model for tutorial steps
 */

export class TutorialStep {
    /**
     * Create a new tutorial step
     * @param {Object} config - Step configuration
     * @param {string} config.title - Step title
     * @param {string} config.content - Step content/instructions
     * @param {string} config.target - CSS selector or 'body'
     * @param {string} config.position - Position of tooltip ('center', 'top', 'bottom', etc.)
     * @param {Function} [config.action] - Optional action to perform when entering this step
     */
    constructor({ title, content, target, position, action }) {
        this.title = title;
        this.content = content;
        this.target = target || 'body';
        this.position = position || 'center';
        this.action = action;
    }
    
    /**
     * Create a basic welcome step
     * @param {string} title - Step title
     * @param {string} content - Step content
     * @returns {TutorialStep} A configured welcome step
     */
    static createWelcomeStep(title, content) {
        return new TutorialStep({
            title,
            content,
            target: 'body',
            position: 'center'
        });
    }
    
    /**
     * Create a step that highlights an element
     * @param {Object} config - Step configuration
     * @param {string} config.title - Step title
     * @param {string} config.content - Step content
     * @param {string} config.target - CSS selector for the target element
     * @param {string} [config.position='center'] - Position of tooltip
     * @param {Function} [config.action] - Optional action to perform
     * @returns {TutorialStep} A configured highlight step
     */
    static createHighlightStep(config) {
        return new TutorialStep(config);
    }
}