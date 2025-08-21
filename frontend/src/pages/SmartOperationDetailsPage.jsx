import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  LinearProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Stop,
  Refresh,
  Delete,
  FilePresent,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Info
} from '@mui/icons-material';

import { PageHeader } from '../components/common';
import { PageContainer, PageContent } from '../components/layout/index.js';
import { BackButton } from '../components/common/ActionButtons';
import smartOperationsApi, { 
  getStatusColor, 
  getOperationTypeIcon,
  formatDuration,
  OPERATION_STATUS,
  FILE_STATUS
} from '../services/smartOperationsApi';

const SmartOperationDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [operation, setOperation] = useState(null);
  const [operationFiles, setOperationFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filesPage, setFilesPage] = useState(0);
  const [filesLimit] = useState(50);
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadOperationDetails();
    loadOperationFiles();
  }, [id]);

  // Status filter 변경 시 파일 목록 새로고침
  useEffect(() => {
    loadOperationFiles(filesPage, statusFilter);
  }, [statusFilter, filesPage]);

  // 실행 중인 작업에 대한 자동 새로고침
  useEffect(() => {
    let intervalId;
    
    if (operation && operation.status === OPERATION_STATUS.RUNNING) {
      setAutoRefresh(true);
      intervalId = setInterval(() => {
        handleRefresh();
      }, 2000); // 2초마다 새로고침
    } else {
      setAutoRefresh(false);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [operation?.status]);

  const loadOperationDetails = async () => {
    try {
      setLoading(true);
      const response = await smartOperationsApi.getOperationById(id);
      setOperation(response.operation);
      setError(null);
    } catch (err) {
      console.error('Failed to load operation details:', err);
      setError('Failed to load operation details');
    } finally {
      setLoading(false);
    }
  };

  const loadOperationFiles = async (page = 0, status = '') => {
    try {
      setFilesLoading(true);
      const response = await smartOperationsApi.getOperationFiles(id, {
        skip: page * filesLimit,
        limit: filesLimit,
        status_filter: status
      });
      setOperationFiles(response.files);
    } catch (err) {
      console.error('Failed to load operation files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadOperationDetails(),
      loadOperationFiles(filesPage, statusFilter)
    ]);
    setRefreshing(false);
  };

  const handleStatusFilter = (newFilter) => {
    setStatusFilter(newFilter);
    setFilesPage(0); // 필터 변경 시 첫 페이지로 리셋
  };

  const handleStartOperation = async () => {
    try {
      await smartOperationsApi.startOperation(id);
      await loadOperationDetails();
    } catch (err) {
      console.error('Failed to start operation:', err);
      setError('Failed to start operation');
    }
  };

  const handleDeleteOperation = async () => {
    try {
      await smartOperationsApi.deleteOperation(id);
      navigate('/smart-operations');
    } catch (err) {
      console.error('Failed to delete operation:', err);
      setError('Failed to delete operation');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case OPERATION_STATUS.PENDING:
        return <Schedule />;
      case OPERATION_STATUS.RUNNING:
        return <CircularProgress size={20} />;
      case OPERATION_STATUS.COMPLETED:
        return <CheckCircle color="success" />;
      case OPERATION_STATUS.FAILED:
        return <Error color="error" />;
      case OPERATION_STATUS.CANCELLED:
        return <Warning color="warning" />;
      default:
        return <Info />;
    }
  };

  const getFileStatusIcon = (status) => {
    switch (status) {
      case FILE_STATUS.PENDING:
        return <Schedule color="disabled" />;
      case FILE_STATUS.PROCESSING:
        return <CircularProgress size={16} />;
      case FILE_STATUS.COMPLETED:
        return <CheckCircle color="success" />;
      case FILE_STATUS.FAILED:
        return <Error color="error" />;
      default:
        return <Info />;
    }
  };

  const renderOperationSummary = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {getStatusIcon(operation.status)}
          <Typography variant="h5">{operation.name}</Typography>
          <Chip
            label={operation.status}
            color={getStatusColor(operation.status)}
            sx={{ ml: 'auto' }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="textSecondary">Operation Type</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" className="material-icons" sx={{ fontSize: 20 }}>
                {getOperationTypeIcon(operation.operation_type)}
              </Box>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {operation.operation_type}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="textSecondary">Source Pattern</Typography>
            <Typography variant="body1">{operation.source_pattern_name}</Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="textSecondary">Total Files</Typography>
            <Typography variant="body1">{operation.source_file_count}</Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="textSecondary">Created</Typography>
            <Typography variant="body1">
              {new Date(operation.created_at).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>

        {operation.status === OPERATION_STATUS.RUNNING && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                Progress: {operation.progress_percentage}%
              </Typography>
              {autoRefresh && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="primary">
                    Auto-refreshing...
                  </Typography>
                </Box>
              )}
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={operation.progress_percentage} 
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="body2">
                Processed: {operation.processed_files}
              </Typography>
              <Typography variant="body2" color="success.main">
                Successful: {operation.successful_files}
              </Typography>
              <Typography variant="body2" color="error.main">
                Failed: {operation.failed_files}
              </Typography>
            </Box>
          </Box>
        )}

        {operation.completed_at && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Duration: {formatDuration(operation.duration_seconds)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderConfigurationDetails = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Configuration</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">Target Directory</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
              {operation.target_directory}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">Target Template</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
              {operation.target_template}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderFilesList = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Files</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              size="small"
              onClick={() => handleStatusFilter('')}
              variant={statusFilter === '' ? 'contained' : 'outlined'}
              disabled={filesLoading}
            >
              All
            </Button>
            <Button
              size="small"
              onClick={() => handleStatusFilter(FILE_STATUS.COMPLETED)}
              variant={statusFilter === FILE_STATUS.COMPLETED ? 'contained' : 'outlined'}
              color="success"
              disabled={filesLoading}
            >
              Completed
            </Button>
            <Button
              size="small"
              onClick={() => handleStatusFilter(FILE_STATUS.FAILED)}
              variant={statusFilter === FILE_STATUS.FAILED ? 'contained' : 'outlined'}
              color="error"
              disabled={filesLoading}
            >
              Failed
            </Button>
          </Box>
        </Box>

        {filesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Filename</TableCell>
                  <TableCell>Source Path</TableCell>
                  <TableCell>Target Path</TableCell>
                  <TableCell>Processed At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {operationFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFileStatusIcon(file.status)}
                        <Typography variant="caption">{file.status}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{file.filename}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {file.source_path}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {file.target_path || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {file.processed_at ? new Date(file.processed_at).toLocaleString() : 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {operationFiles.length === 0 && !filesLoading && (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', p: 3 }}>
            No files found
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!operation) {
    return (
      <PageContainer>
        <PageContent>
          <Alert severity="error">Operation not found</Alert>
        </PageContent>
      </PageContainer>
    );
  }

  const canStart = operation.status === OPERATION_STATUS.PENDING;
  const canDelete = operation.status === OPERATION_STATUS.PENDING;

  return (
    <PageContainer>
      <PageHeader
        title="Smart Operation Details"
        primaryAction={{
          label: "Back to Operations",
          onClick: () => navigate('/smart-operations'),
          icon: <ArrowBack />
        }}
        secondaryActions={[
          {
            icon: <Refresh />,
            onClick: handleRefresh,
            disabled: refreshing,
            tooltip: "Refresh"
          },
          ...(canStart ? [{
            icon: <PlayArrow />,
            onClick: handleStartOperation,
            tooltip: "Start Operation",
            color: "primary"
          }] : []),
          ...(canDelete ? [{
            icon: <Delete />,
            onClick: () => setDeleteDialogOpen(true),
            tooltip: "Delete Operation",
            color: "error"
          }] : [])
        ]}
      />

      <PageContent>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {renderOperationSummary()}
      {renderConfigurationDetails()}
      {renderFilesList()}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the operation "{operation?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteOperation} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      </PageContent>
    </PageContainer>
  );
};

export default SmartOperationDetailsPage;