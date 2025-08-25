import React, { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  Add,
  MoreVert,
  Visibility,
  Delete,
  PlayArrow,
  FilterList,
  Refresh
} from '@mui/icons-material';

import { PageHeader } from '../components/common';
import { PageContainer, PageContent, ResponsiveGrid } from '../components/layout/index.js';
import { CreateButton, IconActionButton } from '../components/common/ActionButtons';
import smartOperationsApi, { 
  getStatusColor, 
  getStatusIcon, 
  getOperationTypeIcon,
  formatDuration,
  OPERATION_STATUS,
  OPERATION_TYPE
} from '../services/smartOperationsApi';

const SmartOperationsListPage = () => {
  const navigate = useNavigate();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const loadOperations = async (skipValue = 0) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        skip: skipValue,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      if (statusFilter) params.status_filter = statusFilter;
      if (typeFilter) params.operation_type_filter = typeFilter;

      const response = await smartOperationsApi.getOperations(params);
      
      setOperations(response.operations);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load operations:', err);
      setError('Failed to load Smart Operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, [statusFilter, typeFilter, sortBy, sortOrder]);

  const handleRefresh = () => {
    loadOperations(page * limit);
  };

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

  const getStatusIcon = (status) => {
    switch (status) {
      case OPERATION_STATUS.PENDING:
        return 'schedule';
      case OPERATION_STATUS.RUNNING:
        return 'hourglass_empty';
      case OPERATION_STATUS.COMPLETED:
        return 'check_circle';
      case OPERATION_STATUS.FAILED:
        return 'error';
      case OPERATION_STATUS.CANCELLED:
        return 'cancel';
      default:
        return 'help';
    }
  };

  const renderOperationCard = (operation) => (
    <Grid item xs={12} sm={6} md={4} key={operation.id}>
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

          {/* Status and Type */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip
              label={operation.status}
              color={getStatusColor(operation.status)}
              size="small"
              icon={<Box component="span" className="material-icons" sx={{ fontSize: '16px !important' }}>
                {getStatusIcon(operation.status)}
              </Box>}
            />
            <Chip
              label={operation.operation_type}
              variant="outlined"
              size="small"
              icon={<Box component="span" className="material-icons" sx={{ fontSize: '16px !important' }}>
                {getOperationTypeIcon(operation.operation_type)}
              </Box>}
            />
          </Box>

          {/* Pattern and File Info */}
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Pattern: <strong>{operation.source_pattern_name}</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Files: {operation.source_file_count} total
          </Typography>

          {/* Progress */}
          {operation.status === OPERATION_STATUS.RUNNING && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Progress: {operation.progress_percentage}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={operation.progress_percentage} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {operation.successful_files} successful, {operation.failed_files} failed
              </Typography>
            </Box>
          )}

          {operation.status === OPERATION_STATUS.COMPLETED && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                ✓ Completed: {operation.successful_files}/{operation.processed_files} files
              </Typography>
              {operation.failed_files > 0 && (
                <Typography variant="body2" color="error.main">
                  {operation.failed_files} files failed
                </Typography>
              )}
            </Box>
          )}

          {operation.status === OPERATION_STATUS.FAILED && (
            <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
              ✗ Failed after processing {operation.processed_files} files
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
          icon: <Add />
        }}
        secondaryActions={[
          {
            icon: <Refresh />,
            onClick: handleRefresh,
            tooltip: "Refresh"
          },
          {
            icon: <FilterList />,
            onClick: () => {}, // TODO: Implement filter panel
            tooltip: "Filters"
          }
        ]}
      />

      <PageContent>
        {/* Filters */}
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

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Operations Grid */}
      <Grid container spacing={3}>
        {loading ? renderLoadingSkeleton() : operations.map(renderOperationCard)}
      </Grid>

      {/* Empty State */}
      {!loading && operations.length === 0 && (
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
          />
        </Box>
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

export default SmartOperationsListPage;