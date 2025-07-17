export class StateManager {
    constructor() {
        this.state = {
            isEditMode: false,
            selectedPolygons: new Set(),
            isCtrlPressed: false,
            isDrawingPolygon: false,
            mouseIsDown: false,
            isClickable: true,
            polygonEditMode: 'roof' // 'roof' or 'object'
        };
        
        this.logger = {
            stateChanges: [],
            maxLogEntries: 100
        };
        
        this.listeners = new Map();
        this.addListener('isCtrlPressed', (newValue) => {
            console.debug(`Ctrl key state changed to: ${newValue}`);
        });
        
        this.addListener('selectedPolygons', (newValue) => {
            console.debug(`Selection changed, polygon count: ${newValue.size}`);
        });
    }

    addListener(property, callback) {
        if (!this.listeners.has(property)) {
            this.listeners.set(property, new Set());
        }
        this.listeners.get(property).add(callback);
        return () => this.removeListener(property, callback);
    }

    removeListener(property, callback) {
        if (this.listeners.has(property)) {
            this.listeners.get(property).delete(callback);
            if (this.listeners.get(property).size === 0) {
                this.listeners.delete(property);
            }
        }
    }

    notifyListeners(property, oldValue, newValue) {
        if (this.listeners.has(property)) {
            this.listeners.get(property).forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error(`Error in state listener for ${property}:`, error);
                }
            });
        }
        
        if (this.listeners.has('all')) {
            this.listeners.get('all').forEach(callback => {
                try {
                    callback({ [property]: newValue }, { [property]: oldValue });
                } catch (error) {
                    console.error(`Error in 'all' state listener:`, error);
                }
            });
        }
    }

    logStateChange(property, oldValue, newValue, source) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            property,
            oldValue,
            newValue,
            source
        };
        
        this.logger.stateChanges.push(logEntry);
        
        if (this.logger.stateChanges.length > this.logger.maxLogEntries) {
            this.logger.stateChanges.shift();
        }


    }

    setState(newState, source = 'unknown') {
        const oldState = { ...this.state };
        
        if (newState.selectedPolygons !== undefined && 
            !(newState.selectedPolygons instanceof Set)) {
            console.error('selectedPolygons must be a Set');
            delete newState.selectedPolygons;
        }
        
        this.state = { 
            ...this.state, 
            ...newState 
        };
        
        Object.keys(newState).forEach(key => {
            if (key === 'selectedPolygons') {
                const oldSet = oldState[key];
                const newSet = this.state[key];
                
                if (oldSet.size !== newSet.size || 
                    [...oldSet].some(item => !newSet.has(item))) {
                    this.logStateChange(key, oldSet, newSet, source);
                    this.notifyListeners(key, oldSet, newSet);
                }
            } else if (!Object.is(oldState[key], this.state[key])) {
                this.logStateChange(key, oldState[key], this.state[key], source);
                this.notifyListeners(key, oldState[key], this.state[key]);
            }
        });
        
        return this.state;
    }

    getState() {
        return { ...this.state };
    }

    toggleEditMode(source = 'unknown') {
        const oldValue = this.state.isEditMode;
        const newValue = !oldValue;
        
        this.state.isEditMode = newValue;
        this.logStateChange('isEditMode', oldValue, newValue, source);
        this.notifyListeners('isEditMode', oldValue, newValue);
        
        return newValue;
    }

    clearSelection(source = 'unknown') {
        const oldPolygons = new Set(this.state.selectedPolygons);
        const oldCount = oldPolygons.size;

        if (oldCount === 0) {
            return false;
        }

        this.state.selectedPolygons.clear();
        this.logStateChange('selectedPolygons', `${oldCount} items`, '0 items', source);
        this.notifyListeners('selectedPolygons', oldPolygons, new Set());
        
        return true;
    }

    addToSelection(polygon, source = 'unknown') {
        if (!polygon || this.state.selectedPolygons.has(polygon)) {
            return false; // Already selected or invalid
        }
        
        const oldPolygons = new Set(this.state.selectedPolygons);
        this.state.selectedPolygons.add(polygon);
        
        this.logStateChange(
            'selectedPolygons', 
            `Set(${oldPolygons.size})`, 
            `Set(${this.state.selectedPolygons.size})`, 
            source
        );
        
        this.notifyListeners('selectedPolygons', oldPolygons, new Set(this.state.selectedPolygons));
        return true;
    }

    removeFromSelection(polygon, source = 'unknown') {
        if (!polygon || !this.state.selectedPolygons.has(polygon)) {
            return false; // Not selected or invalid
        }
        
        const oldPolygons = new Set(this.state.selectedPolygons);
        this.state.selectedPolygons.delete(polygon);
        
        this.logStateChange(
            'selectedPolygons', 
            `Set(${oldPolygons.size})`, 
            `Set(${this.state.selectedPolygons.size})`, 
            source
        );
        
        this.notifyListeners('selectedPolygons', oldPolygons, new Set(this.state.selectedPolygons));
        return true;
    }

    getStateLog() {
        return [...this.logger.stateChanges];
    }

    clearStateLog() {
        this.logger.stateChanges = [];
    }
    
    cleanup() {
        // Clear all registered listeners
        this.listeners.clear();
        
        // Clear selection
        this.clearSelection('cleanup');
        
        // Reset state to defaults
        this.state = {
            isEditMode: false,
            selectedPolygons: new Set(),
            isCtrlPressed: false,
            isDrawingPolygon: false,
            mouseIsDown: false,
            isClickable: true,
            polygonEditMode: 'roof'
        };
        
        console.log('StateManager cleaned up');
    }
}
