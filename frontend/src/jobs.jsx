import React, { useState, useEffect } from 'react';
import {
    List, Datagrid, TextField, NumberField, DateField, FunctionField,
    Show, SimpleShowLayout, Button, useNotify, useRefresh, Loading,
    Pagination, TopToolbar, RefreshButton, Filter, SearchInput, SelectInput
} from 'react-admin';
import {
    Box, Typography, Paper, Grid, Card, CardContent, CardActions,
    LinearProgress, Chip, Alert, Table, TableBody, TableCell, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Badge
} from '@mui/material';
import {
    PlayArrow, Stop, Refresh, Visibility, Cancel, CheckCircle, Error as ErrorIcon,
    Warning, Info, Schedule, TrendingUp, Speed, Storage, Timer,
    ExpandMore, Close, Analytics, Assignment
} from '@mui/icons-material';
import dataProvider from './dataProvider';

// ===========================================
// JOB PROGRESS COMPONENT
// ===========================================
const JobProgress = ({ jobId, autoRefresh = false, onJobComplete }) => {
    const [jobData, setJobData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const notify = useNotify();

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
        return <Loading />;
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
    const percentage = progress.percentage || 0;
    const isActive = jobData.status === 'processing' || jobData.status === 'started';

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2 }}>
                    {getStatusIcon(jobData.status)}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                        Job {jobData.job_id}
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
                        Progress: {progress.processed || 0} / {progress.total || 0}
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
                {progress.current_item && (
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                        Current: {progress.current_item}
                    </Typography>
                )}
                {progress.stage && (
                    <Typography variant="caption" sx={{ display: 'block' }}>
                        Stage: {progress.stage}
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
                {jobData.duration_seconds && (
                    <Grid item xs={6} md={3}>
                        <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                <Typography variant="h6">
                                    {Math.round(jobData.duration_seconds)}s
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
                // This would call the job stats endpoint
                // For now, we'll use mock data
                const mockStats = {
                    total_jobs: 142,
                    completed_jobs: 128,
                    failed_jobs: 8,
                    active_jobs: 6,
                    success_rate: 90.1,
                    average_files_per_job: 245.3,
                    average_successful_extractions: 220.1,
                    average_failed_extractions: 25.2
                };
                setStats(mockStats);
            } catch (error) {
                console.error('Failed to fetch job stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <Loading />;
    }

    if (!stats) {
        return <Typography>No statistics available</Typography>;
    }

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
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
                                {stats.success_rate}%
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
                                {Math.round(stats.average_files_per_job)}
                            </Typography>
                            <Typography variant="body2">
                                Avg Files/Job
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
// JOB FILTERS
// ===========================================
const JobFilter = (props) => (
    <Filter {...props}>
        <SearchInput source="q" alwaysOn />
        <SelectInput source="status" choices={[
            { id: 'started', name: 'Started' },
            { id: 'processing', name: 'Processing' },
            { id: 'completed', name: 'Completed' },
            { id: 'error', name: 'Error' },
            { id: 'cancelled', name: 'Cancelled' },
        ]} />
        <SelectInput source="job_type" choices={[
            { id: 'batch_extract', name: 'Batch Extract' },
            { id: 'reapply_pattern', name: 'Reapply Pattern' },
            { id: 'test_pattern', name: 'Test Pattern' },
            { id: 'indexing_directory_scan', name: 'Directory Scan' },
        ]} />
    </Filter>
);

// ===========================================
// MAIN JOB COMPONENTS
// ===========================================

// Job List Actions
const JobListActions = (props) => (
    <TopToolbar>
        <RefreshButton />
    </TopToolbar>
);

// Job List
export const JobList = () => {
    const [monitorJobId, setMonitorJobId] = useState(null);
    
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

    return (
        <>
            <JobStatistics />
            
            <List 
                filters={<JobFilter />}
                actions={<JobListActions />}
                pagination={<Pagination />}
            >
                <Datagrid>
                    <TextField source="id" />
                    <FunctionField
                        label="Status"
                        source="status"
                        render={record => getStatusChip(record.status)}
                    />
                    <TextField source="job_type" />
                    <FunctionField
                        label="Progress"
                        render={record => {
                            const progress = record.progress || {};
                            const percentage = progress.percentage || 0;
                            return (
                                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '100px' }}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={percentage}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography variant="body2" sx={{ minWidth: '35px' }}>
                                        {percentage.toFixed(0)}%
                                    </Typography>
                                </Box>
                            );
                        }}
                    />
                    <FunctionField
                        label="Files"
                        render={record => (
                            <Typography variant="body2">
                                {record.progress?.processed || 0} / {record.progress?.total || 0}
                            </Typography>
                        )}
                    />
                    <FunctionField
                        label="Success Rate"
                        render={record => {
                            const total = (record.successful_extractions || 0) + (record.failed_extractions || 0);
                            const rate = total > 0 ? (record.successful_extractions || 0) / total * 100 : 0;
                            return (
                                <Typography variant="body2" color={rate > 80 ? 'success.main' : rate > 50 ? 'warning.main' : 'error.main'}>
                                    {rate.toFixed(1)}%
                                </Typography>
                            );
                        }}
                    />
                    <DateField source="started_at" showTime />
                    <FunctionField
                        label="Duration"
                        render={record => {
                            if (record.duration_seconds) {
                                return `${Math.round(record.duration_seconds)}s`;
                            }
                            if (record.started_at && record.status === 'processing') {
                                const started = new Date(record.started_at);
                                const now = new Date();
                                const duration = Math.round((now - started) / 1000);
                                return `${duration}s (running)`;
                            }
                            return '-';
                        }}
                    />
                    <FunctionField
                        label="Actions"
                        render={record => (
                            <Box>
                                <IconButton 
                                    onClick={() => setMonitorJobId(record.id)}
                                    size="small"
                                    color="primary"
                                >
                                    <Visibility />
                                </IconButton>
                            </Box>
                        )}
                    />
                </Datagrid>
            </List>

            <JobMonitorDialog
                jobId={monitorJobId}
                open={!!monitorJobId}
                onClose={() => setMonitorJobId(null)}
            />
        </>
    );
};

// Job Show
export const JobShow = () => (
    <Show>
        <SimpleShowLayout>
            <FunctionField
                label="Job Details"
                render={record => (
                    <JobProgress jobId={record.id} autoRefresh={true} />
                )}
            />
        </SimpleShowLayout>
    </Show>
);

// Export Job Monitor Dialog for use in other components
export { JobMonitorDialog };