/**
 * Tracks and manages event listeners for easier cleanup
 */
export class EventListenerTracker {
    #listeners = new Map();
    
    /**
     * Adds an event listener and tracks it for later cleanup
     * @param {Object} target The object to add the listener to
     * @param {string} eventType The event type
     * @param {Function} callback The callback function
     * @returns {Function} The actual listener reference
     */
    addListener(target, eventType, callback) {
        if (!target || !eventType || !callback) {
            console.warn('Invalid arguments for addListener');
            return null;
        }
        
        try {
            let listener;
            
            if (target.addEventListener) {
                target.addEventListener(eventType, callback);
                listener = { target, eventType, callback };
            } else {
                listener = google.maps.event.addListener(target, eventType, callback);
            }
            
            if (!this.#listeners.has(target)) {
                this.#listeners.set(target, new Map());
            }
            
            const targetListeners = this.#listeners.get(target);
            if (!targetListeners.has(eventType)) {
                targetListeners.set(eventType, new Set());
            }
            
            targetListeners.get(eventType).add(listener);
            
            return listener;
        } catch (error) {
            console.error('Error adding event listener:', error);
            return null;
        }
    }
    
    /**
     * Removes a specific listener by reference
     * @param {Object} target The object the listener was added to
     * @param {string} eventType The event type
     * @param {Function} listener The listener reference to remove
     */
    removeListener(target, eventType, listener) {
        if (!target || !eventType || !listener) return;
        
        try {
            // Remove the specific listener from Google Maps
            google.maps.event.removeListener(listener);
            
            // Remove from our tracking
            if (this.#listeners.has(target)) {
                const targetListeners = this.#listeners.get(target);
                if (targetListeners.has(eventType)) {
                    targetListeners.get(eventType).delete(listener);
                    
                    // Clean up empty sets
                    if (targetListeners.get(eventType).size === 0) {
                        targetListeners.delete(eventType);
                    }
                }
                
                // Clean up empty maps
                if (targetListeners.size === 0) {
                    this.#listeners.delete(target);
                }
            }
        } catch (error) {
            console.error('Error removing specific listener:', error);
        }
    }
    
    /**
     * Removes all listeners for a specific event type from a target
     * @param {Object} target The object to remove listeners from
     * @param {string} eventType The event type to remove
     */
    removeEventListeners(target, eventType) {
        if (!target || !this.#listeners.has(target)) return;
        
        try {
            const targetListeners = this.#listeners.get(target);
            
            if (eventType && targetListeners.has(eventType)) {
                // Remove specific event type
                for (const listener of targetListeners.get(eventType)) {
                    google.maps.event.removeListener(listener);
                }
                targetListeners.delete(eventType);
            }
            
            // Clean up empty maps
            if (targetListeners.size === 0) {
                this.#listeners.delete(target);
            }
        } catch (error) {
            console.error('Error removing event listeners:', error);
        }
    }
    
    /**
     * Removes all listeners from a target
     * @param {Object} target The object to remove listeners from
     */
    removeAllListeners(target) {
        if (!target || !this.#listeners.has(target)) return;
        
        try {
            const targetListeners = this.#listeners.get(target);
            
            // Loop through all event types
            for (const [eventType, listeners] of targetListeners.entries()) {
                for (const listener of listeners) {
                    google.maps.event.removeListener(listener);
                }
            }
            
            // Remove from tracking
            this.#listeners.delete(target);
        } catch (error) {
            console.error('Error removing all listeners:', error);
        }
    }
    
    /**
     * Cleans up all tracked event listeners
     */
    cleanup() {
        try {
            // Remove all listeners from all targets
            for (const [target, targetListeners] of this.#listeners.entries()) {
                for (const [eventType, listeners] of targetListeners.entries()) {
                    for (const listener of listeners) {
                        google.maps.event.removeListener(listener);
                    }
                }
            }
            
            // Clear the tracking map
            this.#listeners.clear();
        } catch (error) {
            console.error('Error cleaning up event listeners:', error);
        }
    }
}
