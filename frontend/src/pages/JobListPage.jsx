import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent, CardActions,
    LinearProgress, Chip, Alert, Table, TableBody, TableCell, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Badge, TextField, MenuItem,
    Button, Divider
} from '@mui/material';
import {
    PlayArrow, Stop, Refresh, Visibility, Cancel, CheckCircle, Error as ErrorIcon,
    Warning, Info, Schedule, TrendingUp, Speed, Storage, Timer,
    ExpandMore, Close, Analytics, Assignment, FilterList
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

// ===========================================
// JOB PROGRESS COMPONENT
// ===========================================
const JobProgress = ({ jobId, autoRefresh = false, onJobComplete }) => {
    const [jobData, setJobData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchJobStatus = async () => {
        if (!jobId) return;
        
        try {
            const result = await dataProvider.getJobStatus(jobId);
            setJobData(result);
            setError(null);
            
            // Notify on job completion
            if (result.status === 'completed' && onJobComplete) {
                onJobComplete(result);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobStatus();
        
        if (autoRefresh && jobData?.status === 'processing') {
            const interval = setInterval(fetchJobStatus, 2000); // Poll every 2 seconds
            return () => clearInterval(interval);
        }
    }, [jobId, autoRefresh, jobData?.status]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <LinearProgress sx={{ width: '100%' }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" action={
                <Button onClick={fetchJobStatus}>Retry</Button>
            }>
                Failed to load job status: {error}
            </Alert>
        );
    }

    if (!jobData) {
        return <Typography>No job data available</Typography>;
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'error': return 'error';
            case 'cancelled': return 'default';
            case 'processing': return 'primary';
            default: return 'info';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle />;
            case 'error': return <ErrorIcon />;
            case 'cancelled': return <Cancel />;
            case 'processing': return <Schedule />;
            default: return <Info />;
        }
    };

    const progress = jobData.progress || {};
    // Calculate percentage from actual API data
    const total = jobData.total_count || 0;
    const processed = jobData.processed_count || 0;
    const percentage = total > 0 ? (processed / total * 100) : (progress.percentage || 0);
    const isActive = jobData.status === 'processing' || jobData.status === 'started';

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2 }}>
                    {getStatusIcon(jobData.status)}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                        Job {jobData.id}
                        <Chip 
                            label={jobData.status.toUpperCase()}
                            color={getStatusColor(jobData.status)}
                            size="small"
                            sx={{ ml: 2 }}
                        />
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {jobData.job_type}
                    </Typography>
                </Box>
                <IconButton onClick={fetchJobStatus} size="small">
                    <Refresh />
                </IconButton>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                        Progress: {processed} / {total}
                    </Typography>
                    <Typography variant="body2">
                        {percentage.toFixed(1)}%
                    </Typography>
                </Box>
                <LinearProgress 
                    variant="determinate" 
                    value={percentage}
                    color={isActive ? 'primary' : 'inherit'}
                />
                {jobData.stage && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                        Stage: {jobData.stage}
                    </Typography>
                )}
            </Box>

            {/* Job Metrics */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {jobData.successful_extractions !== undefined && (
                    <Grid item xs={6} md={3}>
                        <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                <Typography variant="h6" color="success.main">
                                    {jobData.successful_extractions || 0}
                                </Typography>
                                <Typography variant="caption">
                                    Successful
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
                {jobData.failed_extractions !== undefined && (
                    <Grid item xs={6} md={3}>
                        <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                <Typography variant="h6" color="error.main">
                                    {jobData.failed_extractions || 0}
                                </Typography>
                                <Typography variant="caption">
                                    Failed
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
                {jobData.newly_indexed !== undefined && (
                    <Grid item xs={6} md={3}>
                        <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                <Typography variant="h6" color="info.main">
                                    {jobData.newly_indexed || 0}
                                </Typography>
                                <Typography variant="caption">
                                    New Files
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
                {(jobData.started_at && jobData.completed_at) && (
                    <Grid item xs={6} md={3}>
                        <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                <Typography variant="h6">
                                    {Math.round((new Date(jobData.completed_at) - new Date(jobData.started_at)) / 1000)}s
                                </Typography>
                                <Typography variant="caption">
                                    Duration
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>

            {/* Error Message */}
            {jobData.error_message && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    <strong>Error:</strong> {jobData.error_message}
                </Alert>
            )}

            {/* Job Details */}
            {jobData.result_data && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>Job Results</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <pre style={{ 
                            fontSize: '0.8em', 
                            backgroundColor: '#f5f5f5',
                            padding: '8px',
                            borderRadius: '4px',
                            overflow: 'auto'
                        }}>
                            {JSON.stringify(jobData.result_data, null, 2)}
                        </pre>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Timestamps */}
            <Box sx={{ mt: 2, fontSize: '0.8em', color: 'text.secondary' }}>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="caption">
                            Started: {jobData.started_at ? new Date(jobData.started_at).toLocaleString() : 'N/A'}
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption">
                            Completed: {jobData.completed_at ? new Date(jobData.completed_at).toLocaleString() : 'N/A'}
                        </Typography>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
};

// ===========================================
// JOB STATISTICS COMPONENT
// ===========================================
const JobStatistics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Try to get actual stats from the API
                // For now, we'll calculate from jobs list
                const jobsResult = await dataProvider.getJobs({ per_page: 1000 });
                const jobs = jobsResult.jobs || [];
                
                const stats = {
                    total_jobs: jobs.length,
                    completed_jobs: jobs.filter(j => j.status === 'completed').length,
                    failed_jobs: jobs.filter(j => j.status === 'error').length,
                    active_jobs: jobs.filter(j => ['started', 'processing'].includes(j.status)).length,
                    success_rate: jobs.length > 0 ? (jobs.filter(j => j.status === 'completed').length / jobs.length * 100) : 0,
                    total_files_processed: jobs.reduce((sum, j) => sum + (j.processed_count || 0), 0),
                    total_successful_extractions: jobs.reduce((sum, j) => sum + (j.successful_extractions || 0), 0),
                    total_failed_extractions: jobs.reduce((sum, j) => sum + (j.failed_extractions || 0), 0)
                };
                
                setStats(stats);
            } catch (error) {
                console.error('Failed to fetch job stats:', error);
                // Fallback to empty stats
                setStats({
                    total_jobs: 0,
                    completed_jobs: 0,
                    failed_jobs: 0,
                    active_jobs: 0,
                    success_rate: 0,
                    total_files_processed: 0,
                    total_successful_extractions: 0,
                    total_failed_extractions: 0
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <Paper sx={{ p: 2, mb: 2 }}>
                <LinearProgress />
            </Paper>
        );
    }

    if (!stats) {
        return <Typography>No statistics available</Typography>;
    }

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Analytics sx={{ mr: 1 }} />
                Job Statistics
            </Typography>
            
            <Grid container spacing={2}>
                <Grid item xs={6} md={2}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary">
                                {stats.total_jobs}
                            </Typography>
                            <Typography variant="body2">
                                Total Jobs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main">
                                {stats.completed_jobs}
                            </Typography>
                            <Typography variant="body2">
                                Completed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="error.main">
                                {stats.failed_jobs}
                            </Typography>
                            <Typography variant="body2">
                                Failed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main">
                                {stats.active_jobs}
                            </Typography>
                            <Typography variant="body2">
                                Active
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4">
                                {stats.success_rate.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2">
                                Success Rate
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4">
                                {stats.total_files_processed}
                            </Typography>
                            <Typography variant="body2">
                                Files Processed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Paper>
    );
};

// ===========================================
// JOB MONITOR DIALOG
// ===========================================
const JobMonitorDialog = ({ jobId, open, onClose }) => {
    const [jobCompleted, setJobCompleted] = useState(false);

    const handleJobComplete = (jobData) => {
        setJobCompleted(true);
        if (jobData.status === 'completed') {
            // Could show success notification or additional actions
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                Job Monitor
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {jobId && (
                    <JobProgress 
                        jobId={jobId}
                        autoRefresh={!jobCompleted}
                        onJobComplete={handleJobComplete}
                    />
                )}
            </DialogContent>
            <DialogActions>
                {jobCompleted && (
                    <Button variant="contained" onClick={onClose}>
                        Done
                    </Button>
                )}
                <Button onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ===========================================
// MAIN JOBS PAGE COMPONENT
// ===========================================
const JobListPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [monitorJobId, setMonitorJobId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [page, setPage] = useState(1);
    const [totalJobs, setTotalJobs] = useState(0);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                per_page: 20,
                ...(filterStatus && { status: filterStatus }),
                ...(filterType && { job_type: filterType })
            };
            
            const result = await dataProvider.getJobs(params);
            setJobs(result.jobs || []);
            setTotalJobs(result.total || 0);
            setError(null);
        } catch (err) {
            setError(err.message);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [page, filterStatus, filterType]);

    const getStatusChip = (status) => {
        const statusConfig = {
            'started': { color: 'info', icon: <Info /> },
            'processing': { color: 'primary', icon: <Schedule /> },
            'completed': { color: 'success', icon: <CheckCircle /> },
            'error': { color: 'error', icon: <ErrorIcon /> },
            'cancelled': { color: 'default', icon: <Cancel /> }
        };

        const config = statusConfig[status] || statusConfig.info;
        return (
            <Chip
                label={status.toUpperCase()}
                color={config.color}
                size="small"
                icon={config.icon}
            />
        );
    };

    const getProgress = (job) => {
        const total = job.total_count || 0;
        const processed = job.processed_count || 0;
        return total > 0 ? (processed / total * 100) : 0;
    };

    const getSuccessRate = (job) => {
        const total = (job.successful_extractions || 0) + (job.failed_extractions || 0);
        return total > 0 ? (job.successful_extractions || 0) / total * 100 : 0;
    };

    const getDuration = (job) => {
        if (job.completed_at && job.started_at) {
            return Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 1000);
        }
        if (job.started_at && ['started', 'processing'].includes(job.status)) {
            return Math.round((new Date() - new Date(job.started_at)) / 1000);
        }
        return null;
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Assignment sx={{ mr: 1 }} />
                Jobs Management
            </Typography>

            {/* Statistics */}
            <JobStatistics />

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <FilterList sx={{ mr: 1 }} />
                    Filters
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            size="small"
                        >
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="started">Started</MenuItem>
                            <MenuItem value="processing">Processing</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="error">Error</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            fullWidth
                            label="Job Type"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            size="small"
                        >
                            <MenuItem value="">All Types</MenuItem>
                            <MenuItem value="batch_extract">Batch Extract</MenuItem>
                            <MenuItem value="reapply_pattern">Reapply Pattern</MenuItem>
                            <MenuItem value="test_pattern">Test Pattern</MenuItem>
                            <MenuItem value="indexing_directory_scan">Directory Scan</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button
                            variant="outlined"
                            onClick={fetchJobs}
                            startIcon={<Refresh />}
                            fullWidth
                        >
                            Refresh
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Jobs Table */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load jobs: {error}
                </Alert>
            )}

            {loading ? (
                <Paper sx={{ p: 2 }}>
                    <LinearProgress />
                </Paper>
            ) : (
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Job ID</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell>Files</TableCell>
                                <TableCell>Success Rate</TableCell>
                                <TableCell>Started</TableCell>
                                <TableCell>Duration</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {jobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">
                                        <Typography color="textSecondary">
                                            No jobs found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                jobs.map((job) => {
                                    const progress = getProgress(job);
                                    const successRate = getSuccessRate(job);
                                    const duration = getDuration(job);
                                    
                                    return (
                                        <TableRow key={job.id}>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                    {job.id.substring(0, 8)}...
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusChip(job.status)}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {job.job_type}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '100px' }}>
                                                    <Box sx={{ width: '100%', mr: 1 }}>
                                                        <LinearProgress 
                                                            variant="determinate" 
                                                            value={progress}
                                                            size="small"
                                                        />
                                                    </Box>
                                                    <Typography variant="body2" sx={{ minWidth: '35px' }}>
                                                        {progress.toFixed(0)}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {job.processed_count || 0} / {job.total_count || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography 
                                                    variant="body2" 
                                                    color={successRate > 80 ? 'success.main' : successRate > 50 ? 'warning.main' : 'error.main'}
                                                >
                                                    {successRate.toFixed(1)}%
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {duration ? `${duration}s` : '-'}
                                                    {['started', 'processing'].includes(job.status) && duration && ' (running)'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton 
                                                    onClick={() => setMonitorJobId(job.id)}
                                                    size="small"
                                                    color="primary"
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {totalJobs > 20 && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                            <Button 
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                                sx={{ mr: 1 }}
                            >
                                Previous
                            </Button>
                            <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                                Page {page} of {Math.ceil(totalJobs / 20)}
                            </Typography>
                            <Button 
                                disabled={page >= Math.ceil(totalJobs / 20)}
                                onClick={() => setPage(page + 1)}
                                sx={{ ml: 1 }}
                            >
                                Next
                            </Button>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Job Monitor Dialog */}
            <JobMonitorDialog
                jobId={monitorJobId}
                open={!!monitorJobId}
                onClose={() => setMonitorJobId(null)}
            />
        </Box>
    );
};

export default JobListPage;