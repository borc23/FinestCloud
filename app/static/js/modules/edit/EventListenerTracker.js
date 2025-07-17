/**
 * EventListenerTracker.js
 * Utility class for tracking and cleaning up event listeners to prevent memory leaks
 */

export class EventListenerTracker {
    constructor() {
        this.listeners = new Map();
    }
    
    /**
     * Add an event listener and track it
     * @param {Object} element - The DOM element or Google Maps object to attach the listener to
     * @param {string} eventType - The event type (e.g., 'click', 'mouseover')
     * @param {Function} handler - The event handler function
     * @returns {Object|number} The listener reference or ID
     */
    addListener(element, eventType, handler) {
        if (!element) return null;
        
        let listener;
        
        // Handle Google Maps objects with their own event system
        if (element instanceof google?.maps?.MVCObject || 
            (element.addListener && typeof element.addListener === 'function')) {
            listener = element.addListener(eventType, handler);
        } 
        // Handle DOM elements
        else if (element instanceof Element || element === window || element === document) {
            element.addEventListener(eventType, handler);
            listener = { element, eventType, handler };
        }
        // Unknown element type
        else {
            console.warn('Unknown element type for event listener:', element);
            return null;
        }
        
        if (!this.listeners.has(element)) {
            this.listeners.set(element, []);
        }
        
        this.listeners.get(element).push({ eventType, handler, listener });
        return listener;
    }
    
    /**
     * Remove a specific listener
     * @param {Object} element - The element the listener is attached to
     * @param {string} eventType - The event type
     * @param {Function|Object} listener - The listener reference or handler
     */
    removeListener(element, eventType, listener) {
        if (!element || !this.listeners.has(element)) return;
        
        const elementListeners = this.listeners.get(element);
        const index = elementListeners.findIndex(item => 
            item.eventType === eventType && 
            (item.handler === listener || item.listener === listener)
        );
        
        if (index !== -1) {
            const listenerInfo = elementListeners[index];
            
            // Google Maps listener
            if (listenerInfo.listener && listenerInfo.listener.remove) {
                listenerInfo.listener.remove();
            }
            // DOM listener
            else if (element instanceof Element || element === window || element === document) {
                element.removeEventListener(eventType, listenerInfo.handler);
            }
            
            elementListeners.splice(index, 1);
            
            // Remove empty entries
            if (elementListeners.length === 0) {
                this.listeners.delete(element);
            }
        }
    }
    
    /**
     * Remove all listeners from an element
     * @param {Object} element - The element to remove all listeners from
     */
    removeAllListeners(element) {
        if (!element || !this.listeners.has(element)) return;
        
        const elementListeners = this.listeners.get(element);
        
        elementListeners.forEach(({ eventType, handler, listener }) => {
            // Google Maps listener
            if (listener && listener.remove) {
                listener.remove();
            }
            // DOM listener
            else if (element instanceof Element || element === window || element === document) {
                element.removeEventListener(eventType, handler);
            }
        });
        
        this.listeners.delete(element);
    }
    
    /**
     * Clean up all tracked event listeners
     */
    cleanup() {
        this.listeners.forEach((listeners, element) => {
            listeners.forEach(({ eventType, handler, listener }) => {
                // Google Maps listener
                if (listener && listener.remove) {
                    listener.remove();
                }
                // DOM listener
                else if (element instanceof Element || element === window || element === document) {
                    try {
                        element.removeEventListener(eventType, handler);
                    } catch (error) {
                        // Element may have been removed from the DOM
                        console.warn('Could not remove event listener:', error);
                    }
                }
            });
        });
        
        this.listeners.clear();
    }
}