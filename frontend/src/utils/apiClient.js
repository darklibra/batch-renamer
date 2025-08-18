/**
 * Standardized API Client using native fetch()
 * 
 * This module provides a unified interface for making HTTP requests
 * with consistent error handling, retry logic, and response parsing.
 */

import { API_CONFIG, buildUrl, buildUrlWithParams } from '../config/api.js';

// Custom error classes for better error handling
export class ApiError extends Error {
  constructor(message, status, statusText, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

export class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Utility function for timeout handling
const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new TimeoutError(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
};

// Utility function for exponential backoff retry
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main API client class
class ApiClient {
  constructor(config = {}) {
    this.config = {
      ...API_CONFIG,
      ...config
    };
  }

  // Build request headers
  getHeaders(customHeaders = {}) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };
  }

  // Handle response parsing and error checking
  async handleResponse(response, url) {
    // Check if response is ok
    if (!response.ok) {
      let errorData = null;
      
      try {
        // Try to parse error response as JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }
      } catch (parseError) {
        // If parsing fails, use status text
        errorData = response.statusText;
      }

      const message = errorData?.detail || errorData?.message || errorData || `HTTP ${response.status}`;
      throw new ApiError(
        `Request failed: ${message}`,
        response.status,
        response.statusText,
        errorData
      );
    }

    // Parse successful response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  }

  // Core request method with retry logic
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      params = {},
      timeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts,
      retryDelay = this.config.retryDelay,
      ...fetchOptions
    } = options;

    // Build URL
    const url = Object.keys(params).length > 0 
      ? buildUrlWithParams(endpoint, params)
      : buildUrl(endpoint);

    // Prepare request options
    const requestOptions = {
      method,
      headers: this.getHeaders(headers),
      ...fetchOptions
    };

    // Add body if provided
    if (body !== null) {
      if (typeof body === 'object' && !(body instanceof FormData)) {
        requestOptions.body = JSON.stringify(body);
      } else {
        requestOptions.body = body;
        // Remove Content-Type for FormData to let browser set it
        if (body instanceof FormData) {
          delete requestOptions.headers['Content-Type'];
        }
      }
    }

    // Retry logic
    let lastError;
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Make request with timeout
        const response = await withTimeout(
          fetch(url, requestOptions),
          timeout
        );

        // Handle response
        return await this.handleResponse(response, url);

      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx) or on last attempt
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt === retryAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delayMs = retryDelay * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }

    // Handle network errors
    if (lastError instanceof TypeError || lastError.name === 'TypeError') {
      throw new NetworkError('Network request failed', lastError);
    }

    throw lastError;
  }

  // Convenience methods for different HTTP verbs
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  async put(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  async patch(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // File upload helper
  async uploadFile(endpoint, file, additionalFields = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.request(endpoint, {
      method: 'POST',
      body: formData
    });
  }

  // Batch request helper
  async batchRequest(requests) {
    const promises = requests.map(request => 
      this.request(request.endpoint, request.options)
        .then(data => ({ success: true, data }))
        .catch(error => ({ success: false, error }))
    );

    return await Promise.all(promises);
  }
}

// Create and export default client instance
const apiClient = new ApiClient();

export { apiClient };
export default apiClient;