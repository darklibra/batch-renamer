/**
 * Smart Operations API service - Improved with proper Material-UI icons
 * 
 * Fixes:
 * 1. Replace icon strings with React components
 * 2. Fix missing icon display issues
 * 3. Add proper imports
 */
import apiClient from '../utils/apiClient.js';
import { API_ENDPOINTS } from '../config/api.js';

// Import Material-UI Icons as React components
import {
  Schedule,
  HourglassEmpty,
  CheckCircle,
  Error as ErrorIcon,
  Cancel,
  Help,
  FileCopy,
  DriveFileMove,
  Description
} from '@mui/icons-material';

const smartOperationsApi = {
  // Get list of operations with pagination and filtering
  async getOperations(params = {}) {
    const {
      skip = 0,
      limit = 100,
      status_filter,
      operation_type_filter,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = params;

    const queryParams = {
      skip,
      limit,
      sort_by,
      sort_order
    };

    if (status_filter) queryParams.status_filter = status_filter;
    if (operation_type_filter) queryParams.operation_type_filter = operation_type_filter;

    return await apiClient.get(API_ENDPOINTS.smartOperations.list, { params: queryParams });
  },

  // Get operation by ID
  async getOperationById(operationId) {
    return await apiClient.get(API_ENDPOINTS.smartOperations.byId(operationId));
  },

  // Create new operation
  async createOperation(operationData) {
    return await apiClient.post(API_ENDPOINTS.smartOperations.create, operationData);
  },

  // Delete operation (only if pending)
  async deleteOperation(operationId) {
    return await apiClient.delete(API_ENDPOINTS.smartOperations.delete(operationId));
  },

  // Get files for an operation
  async getOperationFiles(operationId, params = {}) {
    const {
      skip = 0,
      limit = 100,
      status_filter
    } = params;

    const queryParams = { skip, limit };
    if (status_filter) queryParams.status_filter = status_filter;

    return await apiClient.get(API_ENDPOINTS.smartOperations.files(operationId, skip, limit), { params: queryParams });
  },

  // Preview operation without creating it
  async previewOperation(previewData) {
    return await apiClient.post(API_ENDPOINTS.smartOperations.preview, previewData);
  },

  // Get operations by pattern
  async getOperationsByPattern(patternId) {
    return await apiClient.get(API_ENDPOINTS.smartOperations.byPattern(patternId));
  },

  // Get operations statistics
  async getStatistics() {
    return await apiClient.get(API_ENDPOINTS.smartOperations.statistics);
  },

  // Start operation execution
  async startOperation(operationId) {
    return await apiClient.post(API_ENDPOINTS.smartOperations.start(operationId));
  },

  // Complete operation execution
  async completeOperation(operationId, resultData = null) {
    return await apiClient.post(API_ENDPOINTS.smartOperations.complete(operationId), resultData);
  },

  // Fail operation execution
  async failOperation(operationId, errorDetails = null) {
    return await apiClient.post(API_ENDPOINTS.smartOperations.fail(operationId), errorDetails);
  },

  // Update operation progress
  async updateProgress(operationId, progressData) {
    return await apiClient.put(API_ENDPOINTS.smartOperations.updateProgress(operationId), progressData);
  }
};

// Operation status constants
export const OPERATION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Operation type constants
export const OPERATION_TYPE = {
  COPY: 'copy',
  MOVE: 'move'
};

// File status constants
export const FILE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Status display helpers - FIXED: Return React components instead of strings
export const getStatusColor = (status) => {
  switch (status) {
    case OPERATION_STATUS.PENDING:
      return 'default';
    case OPERATION_STATUS.RUNNING:
      return 'primary';
    case OPERATION_STATUS.COMPLETED:
      return 'success';
    case OPERATION_STATUS.FAILED:
      return 'error';
    case OPERATION_STATUS.CANCELLED:
      return 'warning';
    default:
      return 'default';
  }
};

// FIXED: Return React icon components instead of Material Icons strings
export const getStatusIcon = (status, props = {}) => {
  switch (status) {
    case OPERATION_STATUS.PENDING:
      return <Schedule {...props} />;
    case OPERATION_STATUS.RUNNING:
      return <HourglassEmpty {...props} />;
    case OPERATION_STATUS.COMPLETED:
      return <CheckCircle {...props} />;
    case OPERATION_STATUS.FAILED:
      return <ErrorIcon {...props} />;
    case OPERATION_STATUS.CANCELLED:
      return <Cancel {...props} />;
    default:
      return <Help {...props} />;
  }
};

// FIXED: Return React icon components instead of Material Icons strings
export const getOperationTypeIcon = (type, props = {}) => {
  switch (type) {
    case OPERATION_TYPE.COPY:
      return <FileCopy {...props} />;
    case OPERATION_TYPE.MOVE:
      return <DriveFileMove {...props} />;
    default:
      return <Description {...props} />;
  }
};

export const formatDuration = (seconds) => {
  if (!seconds) return 'N/A';
  
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

export default smartOperationsApi;