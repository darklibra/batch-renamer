import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, LinearProgress, 
  Chip, Alert, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableHead, TableRow,
  Collapse, Fade, Grid, Stack, Divider
} from '@mui/material';
import {
  PlayArrow, Pause, Stop, Refresh, ExpandMore, Speed, 
  CloudUpload, FileCopy, DriveFileMove, CheckCircle, Error as ErrorIcon,
  Warning, Info, Timeline, Memory, Storage
} from '@mui/icons-material';

/**
 * Async Smart Operation Manager Component
 * 
 * Features:
 * 1. Real-time job tracking via WebSocket
 * 2. Advanced progress visualization
 * 3. Job control (pause/resume/cancel)
 * 4. Performance monitoring
 * 5. Batch operation support
 * 6. Error handling and recovery
 */

const AsyncSmartOperationManager = ({ 
  onJobComplete, 
  showPerformanceMetrics = true,
  enableWebSocket = true 
}) => {
  const [jobs, setJobs] = useState(new Map());
  const [globalStats, setGlobalStats] = useState({
    active_jobs: 0,
    queued_jobs: 0,
    total_operations: 0,
    successful_operations: 0,
    failed_operations: 0
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // WebSocket connection
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const clientId = useRef(`client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket) return;
    
    try {
      const wsUrl = `ws://localhost:8000/api/v1/async-smart-operations/ws/${clientId.current}`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        
        // Subscribe to stats updates
        wsRef.current.send(JSON.stringify({
          type: 'get_stats'
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection failed');
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionError(error.message);
    }
  }, [enableWebSocket]);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'connection_confirmed':
        console.log('WebSocket connection confirmed');
        break;
        
      case 'job_status':
      case 'progress':
        if (message.job_id) {
          setJobs(prevJobs => {
            const newJobs = new Map(prevJobs);
            newJobs.set(message.job_id, {
              ...newJobs.get(message.job_id),
              ...message.data || message
            });
            return newJobs;
          });
        }
        break;
        
      case 'created':
        if (message.job_id) {
          fetchJobStatus(message.job_id);
        }
        break;
        
      case 'stats':
        if (message.data) {
          setGlobalStats(message.data);
        }
        break;
        
      case 'error':
        console.error('WebSocket error message:', message.message);
        break;
        
      case 'heartbeat':
      case 'pong':
        // Keep connection alive
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);
  
  // Fetch job status manually
  const fetchJobStatus = useCallback(async (jobId) => {
    try {
      const response = await fetch(`/api/v1/async-smart-operations/jobs/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJobs(prevJobs => {
          const newJobs = new Map(prevJobs);
          newJobs.set(jobId, data.job);
          return newJobs;
        });
        
        // Notify completion
        if (data.job.status === 'completed' && onJobComplete) {
          onJobComplete(data.job);
        }
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    }
  }, [onJobComplete]);
  
  // Control job (pause/resume/cancel)
  const controlJob = useCallback(async (jobId, action) => {
    try {
      const response = await fetch(`/api/v1/async-smart-operations/jobs/${jobId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        // Refresh job status
        fetchJobStatus(jobId);
      } else {
        const error = await response.json();
        console.error(`Failed to ${action} job:`, error);
      }
    } catch (error) {
      console.error(`Error ${action} job:`, error);
    }
  }, [fetchJobStatus]);
  
  // Refresh all jobs
  const refreshJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/async-smart-operations/jobs');
      if (response.ok) {
        const data = await response.json();
        const jobsMap = new Map();
        data.jobs.forEach(job => {
          jobsMap.set(job.job_id, job);
        });
        setJobs(jobsMap);
      }
    } catch (error) {
      console.error('Error refreshing jobs:', error);
    }
  }, []);
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'paused': return 'warning';
      case 'failed': case 'cancelled': return 'error';
      case 'queued': return 'info';
      default: return 'default';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'processing': return <PlayArrow />;
      case 'paused': return <Pause />;
      case 'failed': return <ErrorIcon />;
      case 'cancelled': return <Stop />;
      case 'queued': return <Info />;
      default: return <Info />;
    }
  };
  
  // Format duration
  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };
  
  // Job detail component
  const JobDetailCard = ({ job }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <Card sx={{ mb: 2, borderLeft: `4px solid`, borderLeftColor: `${getStatusColor(job.status)}.main` }}>
        <CardContent>
          {/* Job Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusIcon(job.status)}
              <Typography variant="h6" component="div">
                {job.operation_type === 'smart_copy' ? 'Copy' : 'Move'} Operation
              </Typography>
              <Chip
                label={job.status.toUpperCase()}
                color={getStatusColor(job.status)}
                size="small"
              />
              {isConnected && (
                <Chip
                  label="LIVE"
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* Control buttons */}
              {job.status === 'processing' && (
                <>
                  <Tooltip title="Pause">
                    <IconButton onClick={() => controlJob(job.job_id, 'pause')} size="small">
                      <Pause />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton onClick={() => controlJob(job.job_id, 'cancel')} size="small" color="error">
                      <Stop />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              
              {job.status === 'paused' && (
                <Tooltip title="Resume">
                  <IconButton onClick={() => controlJob(job.job_id, 'resume')} size="small" color="primary">
                    <PlayArrow />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Refresh">
                <IconButton onClick={() => fetchJobStatus(job.job_id)} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Details">
                <IconButton 
                  onClick={() => setExpanded(!expanded)} 
                  size="small"
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }}
                >
                  <ExpandMore />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Progress Bar */}
          {(job.status === 'processing' || job.status === 'paused') && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress: {job.processed_files || 0} / {job.total_files || 0} files
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(job.progress_percentage || 0).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={job.progress_percentage || 0}
                sx={{ height: 8, borderRadius: 1 }}
              />
              {job.processing_speed > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {job.processing_speed.toFixed(1)} files/sec
                  {job.estimated_completion && (
                    <> • ETA: {new Date(job.estimated_completion).toLocaleTimeString()}</>
                  )}
                </Typography>
              )}
            </Box>
          )}
          
          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {job.successful_operations || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Success
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="error.main">
                  {job.failed_operations || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {job.skipped_operations || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Skipped
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">
                  {formatDuration(job.started_at, job.completed_at)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Duration
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Current Status */}
          {job.current_file && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Current:</strong> {job.current_stage} - {job.current_file}
            </Alert>
          )}
          
          {/* Error Message */}
          {job.error_message && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {job.error_message}
            </Alert>
          )}
          
          {/* Expandable Details */}
          <Collapse in={expanded}>
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={3}>
              {/* Job Information */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Job Details
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>ID:</strong> {job.job_id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Started:</strong> {job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'}
                  </Typography>
                  {job.completed_at && (
                    <Typography variant="body2">
                      <strong>Completed:</strong> {new Date(job.completed_at).toLocaleString()}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Target:</strong> {job.target_directory || 'N/A'}
                  </Typography>
                </Stack>
              </Grid>
              
              {/* Performance Metrics */}
              {showPerformanceMetrics && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Performance
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Speed fontSize="small" />
                      <Typography variant="body2">
                        {(job.processing_speed || 0).toFixed(1)} files/sec
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Memory fontSize="small" />
                      <Typography variant="body2">
                        {(job.memory_usage_mb || 0).toFixed(1)} MB memory
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Storage fontSize="small" />
                      <Typography variant="body2">
                        {(job.disk_space_used_mb || 0).toFixed(1)} MB disk
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              )}
            </Grid>
            
            {/* Recent Results */}
            {job.recent_results && job.recent_results.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recent Operations
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {job.recent_results.slice(-5).map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {result.new_filename || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={result.success ? 'Success' : 'Failed'}
                            color={result.success ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {result.target_path}
                        </TableCell>
                        <TableCell>
                          {result.processing_time ? `${result.processing_time.toFixed(2)}s` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Collapse>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Async Smart Operations
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Connection Status */}
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
            variant={isConnected ? 'filled' : 'outlined'}
          />
          <Button
            variant="outlined"
            onClick={refreshJobs}
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      {/* Connection Error */}
      {connectionError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Real-time updates unavailable: {connectionError}
        </Alert>
      )}
      
      {/* Global Stats */}
      {showPerformanceMetrics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Statistics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {globalStats.active_jobs}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Jobs
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {globalStats.queued_jobs}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Queued Jobs
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {globalStats.successful_operations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {globalStats.failed_operations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {/* Jobs List */}
      <Box>
        {jobs.size === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No active operations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a smart file operation to see it here with real-time updates.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box>
            {Array.from(jobs.values())
              .sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))
              .map(job => (
                <Fade in key={job.job_id} timeout={300}>
                  <Box>
                    <JobDetailCard job={job} />
                  </Box>
                </Fade>
              ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AsyncSmartOperationManager;