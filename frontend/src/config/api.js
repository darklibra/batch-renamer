/**
 * Centralized API Configuration
 * 
 * This file provides centralized configuration for all API endpoints
 * and base URL management across the application.
 */

// Environment-based API base URL configuration
const getApiBaseUrl = () => {
  // Priority: Environment variable > Default
  const envUrl = import.meta.env.VITE_REACT_APP_API_BASE_URL;
  const defaultUrl = 'http://localhost:8000';
  
  return envUrl || defaultUrl;
};

// Base API configuration
export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  version: 'v1',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000 // 1 second
};

// API endpoint paths
export const API_ENDPOINTS = {
  // Files endpoints
  files: {
    list: '/api/v1/files',
    byId: (id) => `/api/v1/files/${id}`,
    byPattern: (patternId, perPage = 10) => `/api/v1/files/by-pattern/${patternId}?per_page=${perPage}`,
    index: '/api/v1/files/index',
    extractMetadata: '/api/v1/files/extract-metadata'
  },
  
  // Patterns endpoints
  patterns: {
    list: '/api/v1/patterns',
    byId: (id) => `/api/v1/patterns/${id}`,
    create: '/api/v1/patterns',
    update: (id) => `/api/v1/patterns/${id}`,
    delete: (id) => `/api/v1/patterns/${id}`,
    test: '/api/v1/patterns/test',
    validate: '/api/v1/patterns/validate'
  },
  
  // Jobs endpoints
  jobs: {
    list: '/api/v1/jobs',
    byId: (id) => `/api/v1/jobs/${id}`,
    cancel: (id) => `/api/v1/jobs/cancel/${id}`
  },
  
  // Smart Operations endpoints
  smartOperations: {
    list: '/api/v1/smart-operations',
    byId: (id) => `/api/v1/smart-operations/${id}`,
    create: '/api/v1/smart-operations',
    delete: (id) => `/api/v1/smart-operations/${id}`,
    files: (id, skip = 0, limit = 100) => `/api/v1/smart-operations/${id}/files?skip=${skip}&limit=${limit}`,
    byPattern: (patternId) => `/api/v1/smart-operations/by-pattern/${patternId}`,
    preview: '/api/v1/smart-operations/preview',
    statistics: '/api/v1/smart-operations/statistics/overview',
    start: (id) => `/api/v1/smart-operations/${id}/start`,
    complete: (id) => `/api/v1/smart-operations/${id}/complete`,
    fail: (id) => `/api/v1/smart-operations/${id}/fail`,
    updateProgress: (id) => `/api/v1/smart-operations/${id}/progress`
  },
  
  // System endpoints
  system: {
    overview: '/api/v1/system/overview',
    health: '/api/v1/system/health'
  }
};

// Helper function to build full URLs
export const buildUrl = (endpoint) => {
  const baseUrl = API_CONFIG.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

// Helper function to build URLs with query parameters
export const buildUrlWithParams = (endpoint, params = {}) => {
  const url = buildUrl(endpoint);
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Export default configuration
export default API_CONFIG;