/**
 * Application-wide error handling system that provides consistent error management,
 * logging, and user feedback.
 */
export class AppErrorHandler {
    constructor() {
        this.listeners = new Set();
        this.errorLog = [];
        this.maxLogSize = 50;
        this.toastContainer = null;
        this.initialized = false;
        this.showToastsByDefault = true; // New property to control toast visibility globally
    }

    /**
     * Initialize the error handler
     * @param {Object} options - Configuration options
     */
    initialize(options = {}) {
        if (this.initialized) return;
        
        // Set configuration options
        this.maxLogSize = options.maxLogSize || 50;
        
        // Allow configuration of toast visibility
        if (options.showToasts !== undefined) {
            this.showToastsByDefault = options.showToasts;
        }
        
        // Capture global errors
        window.addEventListener('error', this.handleGlobalError.bind(this));
        
        // Capture promise rejections
        window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
        
        // Create toast container for error messages if it doesn't exist
        this.createToastContainer();
        
        this.initialized = true;
        console.log('AppErrorHandler initialized');
    }

    /**
     * Create a container for toast notifications if it doesn't exist
     */
    createToastContainer() {
        let container = document.getElementById('app-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'app-toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
            
            // Add basic styles if not already in CSS
            const style = document.createElement('style');
            style.textContent = `
                .toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    max-width: 350px;
                }
                .toast {
                    margin-bottom: 10px;
                    padding: 15px;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    animation: toast-in 0.5s ease-in-out;
                    color: white;
                }
                .toast-error {
                    background-color: #f44336;
                }
                .toast-warning {
                    background-color: #ff9800;
                }
                .toast-info {
                    background-color: #2196F3;
                }
                .toast-success {
                    background-color: #4CAF50;
                }
                @keyframes toast-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        this.toastContainer = container;
    }

    /**
     * Handle a global error
     * @param {ErrorEvent} event - The error event
     */
    handleGlobalError(event) {
        const error = {
            type: 'global',
            message: event.message || 'Unknown error occurred',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error ? event.error.stack : null,
            timestamp: new Date().toISOString()
        };
        
        this.processError(error);
        return false;
    }

    /**
     * Handle an unhandled promise rejection
     * @param {PromiseRejectionEvent} event - The rejection event
     */
    handlePromiseRejection(event) {
        const reason = event.reason;
        const error = {
            type: 'promise',
            message: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : null,
            timestamp: new Date().toISOString()
        };
        
        this.processError(error);
        return false;
    }

    /**
     * Process API errors from server responses
     * @param {Object} response - The response from the server
     * @param {string} context - Context information about the request
     * @param {boolean} showToast - Whether to show a toast notification (overrides default)
     */
    handleApiError(response, context = '', showToast) {
        let error = {
            type: 'api',
            status: response.status,
            context: context,
            timestamp: new Date().toISOString()
        };

        // If showToast is undefined, use the default setting
        if (showToast === undefined) {
            showToast = this.showToastsByDefault;
        }

        // Try to parse the response for error information
        if (response.json) {
            return response.json()
                .then(data => {
                    error.message = data.error || 'Unknown API error';
                    error.details = data;
                    this.processError(error, showToast);
                    return error;
                })
                .catch(() => {
                    error.message = `API error (${response.status})`;
                    this.processError(error, showToast);
                    return error;
                });
        } else {
            error.message = `API error (${response.status})`;
            this.processError(error, showToast);
            return Promise.resolve(error);
        }
    }

    /**
     * Handle component-specific errors
     * @param {Error|string} error - The error object or message
     * @param {string} component - The component where the error occurred
     * @param {boolean} showToast - Whether to show a toast notification (overrides default)
     */
    handleComponentError(error, component, showToast) {
        const errorObj = {
            type: 'component',
            component: component,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            timestamp: new Date().toISOString()
        };
        
        // If showToast is undefined, use the default setting
        if (showToast === undefined) {
            showToast = this.showToastsByDefault;
        }
        
        this.processError(errorObj, showToast);
        return errorObj;
    }

    /**
     * Process and log errors, notify listeners, and potentially show UI notification
     * @param {Object} error - The error object
     * @param {boolean} showToast - Whether to show a toast notification
     */
    processError(error, showToast = true) {
        // Log to console
        console.error(`[${error.type} error]`, error.message, error);
        
        // Add to error log, maintaining max size
        this.errorLog.push(error);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        // Notify all error listeners
        this.notifyListeners(error);
        
        // Show toast notification if requested
        if (showToast) {
            this.showErrorToast(error);
        }
        
        // Attempt recovery based on error type
        this.attemptRecovery(error);
    }

    /**
     * Show an error toast notification
     * @param {Object} error - The error object
     */
    showErrorToast(error) {
        if (!this.toastContainer) this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        
        // Create appropriate message based on error type
        let message = '';
        switch (error.type) {
            case 'api':
                message = `API Error: ${error.message}`;
                break;
            case 'component':
                message = `Error in ${error.component}: ${error.message}`;
                break;
            default:
                message = error.message;
        }
        
        toast.textContent = message;
        this.toastContainer.appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    /**
     * Attempt recovery actions based on error type
     * @param {Object} error - The error object
     */
    attemptRecovery(error) {
        try {
            // Attempt to recover map functionality
            if (window.mapInstance) {
                window.mapInstance.setOptions({
                    draggable: true,
                    scrollwheel: true,
                    gestureHandling: 'auto'
                });
            }
            
            // Specific component-based recovery
            if (error.type === 'component') {
                switch (error.component) {
                    case 'polygon':
                    case 'drawingManager':
                        if (window.emergencyPolygonFix) {
                            window.emergencyPolygonFix();
                        }
                        break;
                }
            }
        } catch (recoveryError) {
            console.error('Error in recovery attempt:', recoveryError);
        }
    }

    /**
     * Add a listener for error events
     * @param {Function} listener - The listener callback
     */
    addListener(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all registered listeners about an error
     * @param {Object} error - The error object
     */
    notifyListeners(error) {
        this.listeners.forEach(listener => {
            try {
                listener(error);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        });
    }

    /**
     * Get the current error log
     * @returns {Array} - The error log
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * Clean up the error handler
     */
    cleanup() {
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
        
        this.listeners.clear();
        this.errorLog = [];
        
        if (this.toastContainer && this.toastContainer.parentNode) {
            this.toastContainer.parentNode.removeChild(this.toastContainer);
        }
        this.toastContainer = null;
        this.initialized = false;
        
        console.log('AppErrorHandler cleaned up');
    }

    /**
     * Set whether error toasts should be shown by default
     * @param {boolean} show - Whether to show error toasts
     */
    setShowToasts(show) {
        this.showToastsByDefault = show;
    }
}

// Create a singleton instance
const appErrorHandler = new AppErrorHandler();
export default appErrorHandler;
