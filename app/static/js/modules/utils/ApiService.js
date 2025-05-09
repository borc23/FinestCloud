import appErrorHandler from './AppErrorHandler.js';

/**
 * Service for making API calls with consistent error handling
 */
export class ApiService {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        this.showErrorToasts = false; // Default to not showing error toasts
    }

    /**
     * Set the base URL for API calls
     * @param {string} url - The base URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    }

    /**
     * Set default headers for all requests
     * @param {Object} headers - Headers object
     */
    setDefaultHeaders(headers) {
        this.defaultHeaders = {
            ...this.defaultHeaders,
            ...headers
        };
    }

    /**
     * Enable or disable error toast notifications
     * @param {boolean} show - Whether to show error toasts
     */
    setShowErrorToasts(show) {
        this.showErrorToasts = show;
    }

    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - URL parameters
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise resolving to response data
     */
    async get(endpoint, params = {}, options = {}) {
        const url = this._buildUrl(endpoint, params);
        return this._request(url, 'GET', null, options);
    }

    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request payload
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise resolving to response data
     */
    async post(endpoint, data = {}, options = {}) {
        const url = this._buildUrl(endpoint);
        return this._request(url, 'POST', data, options);
    }

    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request payload
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise resolving to response data
     */
    async put(endpoint, data = {}, options = {}) {
        const url = this._buildUrl(endpoint);
        return this._request(url, 'PUT', data, options);
    }

    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise resolving to response data
     */
    async delete(endpoint, options = {}) {
        const url = this._buildUrl(endpoint);
        return this._request(url, 'DELETE', null, options);
    }

    /**
     * Build a URL with query parameters
     * @param {string} endpoint - API endpoint
     * @param {Object} params - URL parameters
     * @returns {string} - Complete URL
     * @private
     */
    _buildUrl(endpoint, params = {}) {
        const url = this.baseUrl + endpoint;
        
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                queryParams.append(key, value);
            }
        });
        
        const queryString = queryParams.toString();
        return queryString ? `${url}?${queryString}` : url;
    }

    /**
     * Make an HTTP request with error handling
     * @param {string} url - Request URL
     * @param {string} method - HTTP method
     * @param {Object} data - Request payload
     * @param {Object} options - Additional fetch options
     * @returns {Promise} - Promise resolving to response data
     * @private
     */
    async _request(url, method, data, options = {}) {
        const headers = {
            ...this.defaultHeaders,
            ...options.headers
        };
        
        const config = {
            method,
            headers,
            ...options
        };
        
        if (data !== null && method !== 'GET') {
            config.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, config);
            
            // Handle success responses
            if (response.ok) {
                if (response.headers.get('Content-Type')?.includes('application/json')) {
                    return response.json();
                }
                return response.text();
            }
            
            // Handle error responses
            const context = `${method} ${url.split('/').pop()}`;
            const error = await appErrorHandler.handleApiError(response, context, this.showErrorToasts);
            throw error;
        } catch (error) {
            // Handle network errors or other exceptions
            if (error.type !== 'api') {
                appErrorHandler.handleComponentError(error, 'api', this.showErrorToasts);
            }
            throw error;
        }
    }
}

// Create a singleton instance
const apiService = new ApiService();
export default apiService;
