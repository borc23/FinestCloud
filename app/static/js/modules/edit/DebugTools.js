export class DebugTools {
    constructor(editModule) {
        this.editModule = editModule;
        this.isInitialized = false;
        this.exposedMethods = [];
        this.eventListeners = [];
    }

    initialize() {
        if (this.isInitialized) return;
        
        // Set up debugging tools and possibly expose methods
        // this.setupKeyboardDebugging();
        
        // For development/debugging, we can expose methods to the global scope
        if (process.env.NODE_ENV === 'development') {
            this.exposeDebugMethods();
        }
        
        this.isInitialized = true;
        console.log('Debug tools initialized');
    }

    setupKeyboardDebugging() {
        // Add a keyboard listener to check if key events are being captured
        const keyListener = (e) => {
            if (e.key === 'F12') {
                console.log('Debug key pressed - current state:', 
                    this.editModule.stateManager?.getState());
            }
        };
        
        document.addEventListener('keydown', keyListener);
        this.eventListeners.push({ element: document, type: 'keydown', listener: keyListener });
    }

    exposeDebugMethods() {
        // Create safe debug namespace if it doesn't exist
        if (!window.debugEdit) {
            window.debugEdit = {};
        }
        
        // Add debugging methods
        window.debugEdit.fixDraggable = () => {
            let fixCount = 0;
            
            // Fix roof polygons
            if (this.editModule.detectionService?.currentPolygonsRoof) {
                this.editModule.detectionService.currentPolygonsRoof.forEach(polygon => {
                    if (polygon) {
                        polygon.setOptions({
                            draggable: true,
                            clickable: true,
                            editable: true
                        });
                        fixCount++;
                    }
                });
            }
            
            // Fix object polygons
            if (this.editModule.detectionService?.currentPolygonsObjects) {
                this.editModule.detectionService.currentPolygonsObjects.forEach(polygon => {
                    if (polygon) {
                        polygon.setOptions({
                            draggable: true,
                            clickable: true,
                            editable: true
                        });
                        fixCount++;
                    }
                });
            }
            
            console.log(`Fixed draggable state for ${fixCount} polygons`);
            return fixCount;
        };
        
        window.debugEdit.getState = () => {
            return this.editModule.stateManager?.getState() || 'No state manager available';
        };
        
        window.debugEdit.isKeyboardCaptured = () => {
            // Add a test to see if keyboard events are being captured correctly
            const testDiv = document.createElement('div');
            testDiv.style.position = 'fixed';
            testDiv.style.bottom = '10px';
            testDiv.style.left = '10px';
            testDiv.style.padding = '10px';
            testDiv.style.background = 'rgba(0,0,0,0.7)';
            testDiv.style.color = 'white';
            testDiv.style.zIndex = '9999';
            testDiv.textContent = 'Press any key to test...';
            
            document.body.appendChild(testDiv);
            
            const keyHandler = (e) => {
                testDiv.textContent = `Key captured: ${e.key} (code: ${e.keyCode})`;
                setTimeout(() => {
                    document.body.removeChild(testDiv);
                }, 3000);
                document.removeEventListener('keydown', keyHandler);
            };
            
            document.addEventListener('keydown', keyHandler);
            return 'Keyboard test started. Press any key.';
        };
        
        // Track exposed methods for cleanup
        this.exposedMethods = Object.keys(window.debugEdit);
        
        console.log('Debug methods exposed:', this.exposedMethods.join(', '));
    }

    cleanup() {
        // Remove all event listeners
        this.eventListeners.forEach(({ element, type, listener }) => {
            element.removeEventListener(type, listener);
        });
        this.eventListeners = [];
        
        // Remove all exposed debug methods
        if (window.debugEdit) {
            this.exposedMethods.forEach(method => {
                delete window.debugEdit[method];
            });
            
            // Remove the debugEdit object if it's empty
            if (Object.keys(window.debugEdit).length === 0) {
                delete window.debugEdit;
            }
        }
        
        // Remove reference to editModule
        this.editModule = null;
        this.isInitialized = false;
        
        console.log('Debug tools cleaned up');
    }
}