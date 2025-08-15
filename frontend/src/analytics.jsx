import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, CardHeader, Grid, Typography, Box, Paper,
    LinearProgress, CircularProgress, Alert, Chip, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    List, ListItem, ListItemText, ListItemIcon, IconButton, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Button,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    TrendingUp, TrendingDown, CheckCircle, Error as ErrorIcon, Warning,
    Speed, Storage, Analytics, Assignment, BugReport, Refresh,
    Timeline, PieChart, BarChart, ShowChart, ExpandMore, Close,
    InsertChart, Assessment, DataUsage, Security, Performance
} from '@mui/icons-material';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';

import dataProvider from './dataProvider';

// ===========================================
// ANALYTICS CARD COMPONENT
// ===========================================
const AnalyticsCard = ({ title, value, subtitle, icon, color = 'primary', trend, loading = false }) => {
    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                            {title}
                        </Typography>
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            <Typography variant="h4" color={`${color}.main`}>
                                {value}
                            </Typography>
                        )}
                        {subtitle && (
                            <Typography variant="body2" color="textSecondary">
                                {subtitle}
                            </Typography>
                        )}
                        {trend && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                {trend > 0 ? (
                                    <TrendingUp color="success" fontSize="small" />
                                ) : (
                                    <TrendingDown color="error" fontSize="small" />
                                )}
                                <Typography
                                    variant="body2"
                                    color={trend > 0 ? 'success.main' : 'error.main'}
                                    sx={{ ml: 0.5 }}
                                >
                                    {Math.abs(trend)}%
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ color: `${color}.main` }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

// ===========================================
// SYSTEM OVERVIEW COMPONENT
// ===========================================
const SystemOverview = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const result = await dataProvider.getSystemOverview();
            setOverview(result);
            setError(null);
        } catch (err) {
            setError(err.message);
            // Use mock data for demonstration
            const mockOverview = {
                total_files: 15420,
                files_with_extractions: 12340,
                total_applications: 18650,
                total_failures: 987,
                active_patterns: 23,
                recent_jobs: [
                    { id: '1', status: 'completed', job_type: 'batch_extract' },
                    { id: '2', status: 'processing', job_type: 'reapply_pattern' },
                    { id: '3', status: 'completed', job_type: 'test_pattern' },
                    { id: '4', status: 'error', job_type: 'batch_extract' },
                    { id: '5', status: 'completed', job_type: 'directory_scan' }
                ]
            };
            setOverview(mockOverview);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const extractionRate = overview ? 
        (overview.files_with_extractions / overview.total_files * 100).toFixed(1) : 0;
    
    const failureRate = overview ? 
        (overview.total_failures / (overview.total_applications + overview.total_failures) * 100).toFixed(1) : 0;

    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                    System Overview
                </Typography>
                <IconButton onClick={fetchOverview} size="small">
                    <Refresh />
                </IconButton>
            </Box>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Failed to load real-time data. Showing demo data.
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <AnalyticsCard
                        title="Total Files"
                        value={overview?.total_files?.toLocaleString() || '0'}
                        icon={<Storage fontSize="large" />}
                        color="primary"
                        loading={loading}
                        trend={5.2}
                    />
                </Grid>
                
                <Grid item xs={12} sm={6} md={2.4}>
                    <AnalyticsCard
                        title="Extracted Files"
                        value={overview?.files_with_extractions?.toLocaleString() || '0'}
                        subtitle={`${extractionRate}% of total files`}
                        icon={<CheckCircle fontSize="large" />}
                        color="success"
                        loading={loading}
                        trend={8.7}
                    />
                </Grid>
                
                <Grid item xs={12} sm={6} md={2.4}>
                    <AnalyticsCard
                        title="Active Patterns"
                        value={overview?.active_patterns || '0'}
                        icon={<Analytics fontSize="large" />}
                        color="info"
                        loading={loading}
                        trend={2.1}
                    />
                </Grid>
                
                <Grid item xs={12} sm={6} md={2.4}>
                    <AnalyticsCard
                        title="Pattern Applications"
                        value={overview?.total_applications?.toLocaleString() || '0'}
                        icon={<Assignment fontSize="large" />}
                        color="secondary"
                        loading={loading}
                        trend={12.3}
                    />
                </Grid>
                
                <Grid item xs={12} sm={6} md={2.4}>
                    <AnalyticsCard
                        title="Failures"
                        value={overview?.total_failures?.toLocaleString() || '0'}
                        subtitle={`${failureRate}% failure rate`}
                        icon={<BugReport fontSize="large" />}
                        color="error"
                        loading={loading}
                        trend={-3.2}
                    />
                </Grid>
            </Grid>

            {/* Recent Jobs Status */}
            {overview?.recent_jobs && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Recent Job Activity
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {overview.recent_jobs.map((job) => {
                            const statusColors = {
                                'completed': 'success',
                                'processing': 'primary',
                                'error': 'error',
                                'cancelled': 'default'
                            };
                            
                            return (
                                <Chip
                                    key={job.id}
                                    label={`${job.job_type}: ${job.status}`}
                                    color={statusColors[job.status] || 'default'}
                                    size="small"
                                />
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Paper>
    );
};

// ===========================================
// EXTRACTION PERFORMANCE CHART
// ===========================================
const ExtractionPerformanceChart = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock performance data
        const mockData = [
            { name: 'Mon', successful: 45, failed: 5, total: 50 },
            { name: 'Tue', successful: 67, failed: 8, total: 75 },
            { name: 'Wed', successful: 89, failed: 11, total: 100 },
            { name: 'Thu', successful: 123, failed: 7, total: 130 },
            { name: 'Fri', successful: 156, failed: 14, total: 170 },
            { name: 'Sat', successful: 98, failed: 12, total: 110 },
            { name: 'Sun', successful: 78, failed: 9, total: 87 }
        ];
        
        setTimeout(() => {
            setData(mockData);
            setLoading(false);
        }, 1000);
    }, []);

    if (loading) {
        return (
            <Paper sx={{ p: 2, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Daily Extraction Performance
            </Typography>
            <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Area 
                            type="monotone" 
                            dataKey="successful" 
                            stackId="1"
                            stroke="#4caf50" 
                            fill="#4caf50"
                            name="Successful Extractions"
                        />
                        <Area 
                            type="monotone" 
                            dataKey="failed" 
                            stackId="1"
                            stroke="#f44336" 
                            fill="#f44336"
                            name="Failed Extractions"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
};

// ===========================================
// PATTERN PERFORMANCE TABLE
// ===========================================
const PatternPerformanceTable = () => {
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock pattern performance data
        const mockPatterns = [
            {
                id: 1,
                name: "Episode Pattern v2",
                applications: 1250,
                success_rate: 94.2,
                avg_score: 8.7,
                avg_time: 15.3,
                status: 'active'
            },
            {
                id: 2,
                name: "Date Extraction Pattern",
                applications: 890,
                success_rate: 87.5,
                avg_score: 7.2,
                avg_time: 22.1,
                status: 'active'
            },
            {
                id: 3,
                name: "Version Pattern",
                applications: 567,
                success_rate: 91.8,
                avg_score: 6.8,
                avg_time: 18.7,
                status: 'active'
            },
            {
                id: 4,
                name: "Legacy Pattern v1",
                applications: 234,
                success_rate: 76.3,
                avg_score: 5.4,
                avg_time: 35.2,
                status: 'inactive'
            },
            {
                id: 5,
                name: "Experimental Pattern",
                applications: 123,
                success_rate: 82.1,
                avg_score: 7.9,
                avg_time: 28.4,
                status: 'testing'
            }
        ];

        setTimeout(() => {
            setPatterns(mockPatterns);
            setLoading(false);
        }, 800);
    }, []);

    const getStatusChip = (status) => {
        const statusConfig = {
            'active': { color: 'success', label: 'Active' },
            'inactive': { color: 'default', label: 'Inactive' },
            'testing': { color: 'warning', label: 'Testing' }
        };
        
        const config = statusConfig[status] || statusConfig.active;
        return (
            <Chip
                label={config.label}
                color={config.color}
                size="small"
            />
        );
    };

    const getPerformanceColor = (rate) => {
        if (rate >= 90) return 'success.main';
        if (rate >= 75) return 'warning.main';
        return 'error.main';
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Pattern Performance Analysis
            </Typography>
            
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Pattern Name</TableCell>
                                <TableCell align="right">Applications</TableCell>
                                <TableCell align="right">Success Rate</TableCell>
                                <TableCell align="right">Avg Score</TableCell>
                                <TableCell align="right">Avg Time (ms)</TableCell>
                                <TableCell align="center">Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {patterns.map((pattern) => (
                                <TableRow key={pattern.id}>
                                    <TableCell component="th" scope="row">
                                        <Typography variant="body2" fontWeight="medium">
                                            {pattern.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        {pattern.applications.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            variant="body2"
                                            color={getPerformanceColor(pattern.success_rate)}
                                            fontWeight="medium"
                                        >
                                            {pattern.success_rate}%
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        {pattern.avg_score.toFixed(1)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {pattern.avg_time.toFixed(1)}
                                    </TableCell>
                                    <TableCell align="center">
                                        {getStatusChip(pattern.status)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

// ===========================================
// FAILURE ANALYSIS COMPONENT
// ===========================================
const FailureAnalysis = () => {
    const [failureData, setFailureData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock failure analysis data
        const mockFailureData = {
            categories: [
                { name: 'No Pattern Match', value: 45, color: '#ff6b6b' },
                { name: 'Regex Error', value: 23, color: '#feca57' },
                { name: 'Field Mapping Error', value: 18, color: '#48dbfb' },
                { name: 'Timeout', value: 10, color: '#ff9ff3' },
                { name: 'Other', value: 4, color: '#54a0ff' }
            ],
            trends: [
                { week: 'Week 1', failures: 45 },
                { week: 'Week 2', failures: 38 },
                { week: 'Week 3', failures: 52 },
                { week: 'Week 4', failures: 31 }
            ],
            recent_failures: [
                {
                    file: 'episode_special_001.mkv',
                    reason: 'No matching pattern found',
                    timestamp: '2024-01-15 14:30:22',
                    patterns_tried: 3
                },
                {
                    file: 'temp_file_abc123.tmp',
                    reason: 'Field mapping JSON parse error',
                    timestamp: '2024-01-15 14:28:15',
                    patterns_tried: 2
                },
                {
                    file: 'document_final_v2_FINAL.docx',
                    reason: 'Regex compilation timeout',
                    timestamp: '2024-01-15 14:25:43',
                    patterns_tried: 1
                }
            ]
        };

        setTimeout(() => {
            setFailureData(mockFailureData);
            setLoading(false);
        }, 1200);
    }, []);

    if (loading) {
        return (
            <Paper sx={{ p: 2, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Paper>
        );
    }

    const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'];

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Failure Analysis
            </Typography>

            <Grid container spacing={3}>
                {/* Failure Categories Pie Chart */}
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                        Failure Categories
                    </Typography>
                    <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie
                                    data={failureData.categories}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {failureData.categories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>

                {/* Failure Trends */}
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                        Failure Trends
                    </Typography>
                    <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={failureData.trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="week" />
                                <YAxis />
                                <RechartsTooltip />
                                <Line 
                                    type="monotone" 
                                    dataKey="failures" 
                                    stroke="#f44336" 
                                    strokeWidth={2}
                                    dot={{ fill: '#f44336' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>

                {/* Recent Failures */}
                <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                        Recent Failures
                    </Typography>
                    <List>
                        {failureData.recent_failures.map((failure, index) => (
                            <ListItem key={index} divider>
                                <ListItemIcon>
                                    <ErrorIcon color="error" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={failure.file}
                                    secondary={
                                        <>
                                            <Typography component="span" variant="body2" color="error">
                                                {failure.reason}
                                            </Typography>
                                            <br />
                                            <Typography component="span" variant="caption" color="textSecondary">
                                                {failure.timestamp} • {failure.patterns_tried} patterns tried
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </Grid>
            </Grid>
        </Paper>
    );
};

// ===========================================
// MAIN ANALYTICS DASHBOARD
// ===========================================
export const AnalyticsDashboard = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                Comprehensive insights into file processing and pattern extraction performance
            </Typography>

            {/* System Overview */}
            <SystemOverview />

            {/* Performance Charts */}
            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <ExtractionPerformanceChart />
                </Grid>
                <Grid item xs={12} lg={4}>
                    <FailureAnalysis />
                </Grid>
            </Grid>

            {/* Pattern Performance Table */}
            <Box sx={{ mt: 3 }}>
                <PatternPerformanceTable />
            </Box>

            {/* Advanced Analytics Sections */}
            <Box sx={{ mt: 3 }}>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMore />}
                        aria-controls="advanced-analytics-content"
                        id="advanced-analytics-header"
                    >
                        <Typography variant="h6">Advanced Analytics</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Performance sx={{ mr: 1, color: 'primary.main' }} />
                                            <Typography variant="h6">Performance Metrics</Typography>
                                        </Box>
                                        <Typography variant="body2" color="textSecondary">
                                            Average processing time per file: 18.7ms
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Peak throughput: 450 files/minute
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Memory usage: 156MB average
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <DataUsage sx={{ mr: 1, color: 'success.main' }} />
                                            <Typography variant="h6">Data Quality</Typography>
                                        </Box>
                                        <Typography variant="body2" color="textSecondary">
                                            Data completeness: 92.3%
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Field extraction accuracy: 94.7%
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Duplicate detection rate: 99.1%
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Security sx={{ mr: 1, color: 'warning.main' }} />
                                            <Typography variant="h6">System Health</Typography>
                                        </Box>
                                        <Typography variant="body2" color="textSecondary">
                                            Uptime: 99.87%
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Error rate: 0.13%
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Active connections: 847
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Box>
    );
};

export default AnalyticsDashboard;