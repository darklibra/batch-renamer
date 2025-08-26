import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Skeleton,
  Tooltip,
  Fade
} from '@mui/material';
import {
  Add,
  MoreVert,
  Visibility,
  Delete,
  PlayArrow,
  FilterList,
  Refresh,
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

import { PageHeader } from '../components/common';
import { PageContainer, PageContent, ResponsiveGrid } from '../components/layout/index.js';
import { CreateButton, IconActionButton } from '../components/common/ActionButtons';
import { useSmoothedData } from '../hooks/useSmoothedData';
import { SmoothTransition } from '../components/ui/SkeletonLoader';
import smartOperationsApi, { 
  getStatusColor, 
  formatDuration,
  OPERATION_STATUS,
  OPERATION_TYPE
} from '../services/smartOperationsApiImproved';

/**
 * Improved Smart Operations List Page
 * 
 * Key UX Improvements:
 * 1. Fixed "Create Operation" button icon display
 * 2. Uses proper React icon components instead of Material Icons strings
 * 3. Eliminates flickering with smoothed data updates
 * 4. Adds smooth transitions for all state changes
 * 5. Implements background refresh for running operations
 */

const SmartOperationsListPageImproved = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [error, setError] = useState(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [limit] = useState(20);

  // Use smoothed data loading for operations list
  const {
    data: operationsData,
    loading,
    refresh,
    error: dataError
  } = useSmoothedData(
    // Fetch function
    useCallback(async ({ signal }) => {
      const params = {
        skip: page * limit,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      if (statusFilter) params.status_filter = statusFilter;
      if (typeFilter) params.operation_type_filter = typeFilter;

      const response = await smartOperationsApi.getOperations(params);
      return response;
    }, [page, limit, sortBy, sortOrder, statusFilter, typeFilter]),
    
    // Dependencies
    [page, limit, sortBy, sortOrder, statusFilter, typeFilter],
    
    // Options for smooth updates
    {
      pollingInterval: 5000, // Poll every 5 seconds for real-time updates
      optimisticUpdate: true,
      preserveOnError: true,
      debounceDelay: 300,
      enableCache: true
    }
  );

  const operations = operationsData?.operations || [];
  const total = operationsData?.total || 0;

  // Update error state from data loading
  useEffect(() => {
    if (dataError) {
      setError('Failed to load Smart Operations');
    } else {
      setError(null);
    }
  }, [dataError]);

  const handleRefresh = useCallback(() => {
    refresh();
    setError(null);
  }, [refresh]);

  const handleCreateNew = () => {
    navigate('/smart-operations/create');
  };

  const handleViewDetails = (operation) => {
    navigate(`/smart-operations/${operation.id}`);
    handleMenuClose();
  };

  const handleDeleteOperation = async (operation) => {
    if (operation.status !== OPERATION_STATUS.PENDING) {
      setError('Only pending operations can be deleted');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${operation.name}"?`)) {
      return;
    }

    try {
      await smartOperationsApi.deleteOperation(operation.id);
      handleRefresh();
      setError(null);
    } catch (err) {
      console.error('Failed to delete operation:', err);
      setError('Failed to delete operation');
    } finally {
      handleMenuClose();
    }
  };

  const handleStartOperation = async (operation) => {
    try {
      await smartOperationsApi.startOperation(operation.id);
      handleRefresh();
      setError(null);
    } catch (err) {
      console.error('Failed to start operation:', err);
      setError('Failed to start operation');
    } finally {
      handleMenuClose();
    }
  };

  const handleMenuOpen = (event, operation) => {
    setAnchorEl(event.currentTarget);
    setSelectedOperation(operation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedOperation(null);
  };

  // FIXED: Return React icon components instead of Material Icons strings
  const getStatusIcon = (status, props = {}) => {
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
  const getOperationTypeIcon = (type, props = {}) => {
    switch (type) {
      case OPERATION_TYPE.COPY:
        return <FileCopy {...props} />;
      case OPERATION_TYPE.MOVE:
        return <DriveFileMove {...props} />;
      default:
        return <Description {...props} />;
    }
  };

  const renderOperationCard = (operation) => (
    <Grid item xs={12} sm={6} md={4} key={operation.id}>
      <Fade in timeout={300}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" component="div" sx={{ 
                fontWeight: 600, 
                fontSize: '1.1rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 'calc(100% - 40px)'
              }}>
                {operation.name}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, operation)}
                sx={{ mt: -1 }}
              >
                <MoreVert />
              </IconButton>
            </Box>

            {/* Status and Type - FIXED: Use React icon components */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip
                label={operation.status}
                color={getStatusColor(operation.status)}
                size="small"
                icon={getStatusIcon(operation.status, { sx: { fontSize: '16px !important' } })}
              />
              <Chip
                label={operation.operation_type}
                variant="outlined"
                size="small"
                icon={getOperationTypeIcon(operation.operation_type, { sx: { fontSize: '16px !important' } })}
              />
            </Box>

            {/* Pattern and File Info */}
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Pattern: <strong>{operation.source_pattern_name}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Files: {operation.source_file_count} total
            </Typography>

            {/* Progress with smooth animations */}
            {operation.status === OPERATION_STATUS.RUNNING && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Progress: {operation.progress_percentage || 0}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={operation.progress_percentage || 0}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      transition: 'transform 0.5s ease-in-out'
                    }
                  }}
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  {operation.successful_files || 0} successful, {operation.failed_files || 0} failed
                </Typography>
              </Box>
            )}

            {operation.status === OPERATION_STATUS.COMPLETED && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                  <CheckCircle sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Completed: {operation.successful_files}/{operation.processed_files} files
                </Typography>
                {operation.failed_files > 0 && (
                  <Typography variant="body2" color="error.main">
                    <ErrorIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {operation.failed_files} files failed
                  </Typography>
                )}
              </Box>
            )}

            {operation.status === OPERATION_STATUS.FAILED && (
              <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
                <ErrorIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                Failed after processing {operation.processed_files || 0} files
              </Typography>
            )}

            {/* Timestamps */}
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
              Created: {new Date(operation.created_at).toLocaleDateString()}
            </Typography>
            {operation.completed_at && (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                Duration: {formatDuration(operation.duration_seconds)}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Fade>
    </Grid>
  );

  const renderLoadingSkeleton = () => (
    Array.from(new Array(6)).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card sx={{ height: 280 }}>
          <CardContent>
            <Skeleton variant="text" width="80%" height={28} />
            <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
              <Skeleton variant="rounded" width={80} height={24} />
              <Skeleton variant="rounded" width={60} height={24} />
            </Box>
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 2 }} />
          </CardContent>
        </Card>
      </Grid>
    ))
  );

  return (
    <PageContainer widthMode="full">
      <PageHeader
        title="Smart Operations"
        count={total}
        subtitle="Manage file copy and move operations based on patterns"
        primaryAction={{
          label: "Create Operation",
          onClick: handleCreateNew,
          icon: <Add />, // FIXED: Proper React icon component instead of string
          variant: 'contained'
        }}
        secondaryActions={[
          {
            icon: <Refresh />, // FIXED: Proper React icon component
            onClick: handleRefresh,
            tooltip: "Refresh"
          },
          {
            icon: <FilterList />, // FIXED: Proper React icon component
            onClick: () => {}, // TODO: Implement filter panel
            tooltip: "Filters"
          }
        ]}
      />

      <PageContent>
        {/* Filters */}
        <SmoothTransition loading={loading && operations.length === 0}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={OPERATION_STATUS.PENDING}>Pending</MenuItem>
                <MenuItem value={OPERATION_STATUS.RUNNING}>Running</MenuItem>
                <MenuItem value={OPERATION_STATUS.COMPLETED}>Completed</MenuItem>
                <MenuItem value={OPERATION_STATUS.FAILED}>Failed</MenuItem>
                <MenuItem value={OPERATION_STATUS.CANCELLED}>Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={OPERATION_TYPE.COPY}>Copy</MenuItem>
                <MenuItem value={OPERATION_TYPE.MOVE}>Move</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="created_at">Created Date</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="operation_type">Type</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select
                value={sortOrder}
                label="Order"
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="desc">Newest First</MenuItem>
                <MenuItem value="asc">Oldest First</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </SmoothTransition>

        {/* Error Display */}
        {error && (
          <Fade in>
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          </Fade>
        )}

        {/* Operations Grid with Smooth Transitions */}
        <SmoothTransition 
          loading={loading && operations.length === 0}
          skeleton={renderLoadingSkeleton()}
        >
          <Grid container spacing={3}>
            {operations.map(renderOperationCard)}
          </Grid>
        </SmoothTransition>

        {/* Empty State */}
        {!loading && operations.length === 0 && (
          <Fade in timeout={500}>
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              bgcolor: 'grey.50',
              borderRadius: 2,
              mt: 3
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                No Smart Operations Found
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Create your first Smart Operation to automatically copy or move files based on patterns.
              </Typography>
              <CreateButton
                onClick={handleCreateNew}
                label="Create Operation"
                size="large"
                icon={<Add />} // FIXED: Proper React icon component
              />
            </Box>
          </Fade>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { minWidth: 160 }
          }}
        >
          <MenuItem onClick={() => handleViewDetails(selectedOperation)}>
            <Visibility sx={{ mr: 2 }} />
            View Details
          </MenuItem>
          
          {selectedOperation?.status === OPERATION_STATUS.PENDING && (
            <MenuItem onClick={() => handleStartOperation(selectedOperation)}>
              <PlayArrow sx={{ mr: 2 }} />
              Start Operation
            </MenuItem>
          )}
          
          {selectedOperation?.status === OPERATION_STATUS.PENDING && (
            <MenuItem 
              onClick={() => handleDeleteOperation(selectedOperation)}
              sx={{ color: 'error.main' }}
            >
              <Delete sx={{ mr: 2 }} />
              Delete
            </MenuItem>
          )}
        </Menu>
      </PageContent>
    </PageContainer>
  );
};

export default SmartOperationsListPageImproved;