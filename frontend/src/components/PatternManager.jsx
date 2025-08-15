import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, CardActions, Typography, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
    List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
    Chip, Tooltip, Switch, FormControlLabel, Divider, Alert,
    Accordion, AccordionSummary, AccordionDetails, Paper, Grid,
    Table, TableBody, TableCell, TableHead, TableRow, Badge,
    Fab, Collapse, LinearProgress
} from '@mui/material';
import {
    Add, Edit, Delete, PlayArrow, Stop, Visibility, Settings,
    ExpandMore, Close, Science, Analytics, TrendingUp, Security,
    CheckCircle, Error as ErrorIcon, Warning, Info, Speed,
    ContentCopy, Download, Upload, Refresh, BugReport
} from '@mui/icons-material';
// Removed useNotify to avoid Router context issues
import dataProvider from '../dataProvider';
import { notify } from '../utils/notifications';

// ===========================================
// PATTERN CARD COMPONENT
// ===========================================
const PatternCard = ({ pattern, onEdit, onDelete, onTest, onToggleActive }) => {
    const [expanded, setExpanded] = useState(false);
    const [stats, setStats] = useState(null);

    const fetchStats = async () => {
        try {
            const result = await dataProvider.getPatternStats(pattern.id);
            setStats(result);
        } catch (error) {
            console.error('Failed to fetch pattern stats:', error);
        }
    };

    useEffect(() => {
        if (expanded && pattern.id) {
            fetchStats();
        }
    }, [expanded, pattern.id]);

    const getScoreColor = (score) => {
        if (score >= 90) return 'success';
        if (score >= 70) return 'warning';
        return 'error';
    };

    return (
        <Card sx={{ mb: 2 }} variant="outlined">
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {pattern.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                            label={`Priority: ${pattern.priority}`}
                            size="small"
                            color="primary"
                        />
                        
                        <Chip
                            label={pattern.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={pattern.is_active ? 'success' : 'default'}
                        />
                        
                        <Switch
                            checked={pattern.is_active}
                            onChange={(e) => onToggleActive(pattern.id, e.target.checked)}
                            size="small"
                        />
                    </Box>
                </Box>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {pattern.description || 'No description provided'}
                </Typography>

                <Box sx={{ backgroundColor: '#f5f5f5', p: 1, borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" fontFamily="monospace">
                        {pattern.regex_pattern}
                    </Typography>
                </Box>

                <Accordion 
                    expanded={expanded} 
                    onChange={() => setExpanded(!expanded)}
                    elevation={0}
                >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="body2">
                            Advanced Details & Statistics
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Field Mapping:
                            </Typography>
                            <pre style={{
                                backgroundColor: '#f5f5f5',
                                padding: '8px',
                                borderRadius: '4px',
                                fontSize: '0.8em',
                                overflow: 'auto',
                                maxHeight: '150px'
                            }}>
                                {JSON.stringify(pattern.field_mapping, null, 2)}
                            </pre>
                        </Box>

                        {stats && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Performance Statistics:
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined">
                                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                                <Typography variant="h5" color="primary">
                                                    {stats.total_applications || 0}
                                                </Typography>
                                                <Typography variant="caption">
                                                    Total Applications
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined">
                                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                                <Typography variant="h5" color="success.main">
                                                    {stats.current_applications || 0}
                                                </Typography>
                                                <Typography variant="caption">
                                                    Current Active
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined">
                                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                                <Chip
                                                    label={`${stats.average_extraction_score || 0}/5`}
                                                    color={getScoreColor((stats.average_extraction_score || 0) * 20)}
                                                    size="small"
                                                />
                                                <Typography variant="caption" display="block">
                                                    Avg Score
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined">
                                            <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                                <Typography variant="h5">
                                                    {stats.average_processing_time_ms || 0}ms
                                                </Typography>
                                                <Typography variant="caption">
                                                    Avg Time
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </AccordionDetails>
                </Accordion>
            </CardContent>

            <CardActions>
                <Button 
                    startIcon={<Science />} 
                    onClick={() => onTest(pattern)}
                    size="small"
                >
                    Test Pattern
                </Button>
                <Button 
                    startIcon={<Edit />} 
                    onClick={() => onEdit(pattern)}
                    size="small"
                >
                    Edit
                </Button>
                <Button 
                    startIcon={<Delete />} 
                    onClick={() => onDelete(pattern.id)}
                    color="error"
                    size="small"
                >
                    Delete
                </Button>
            </CardActions>
        </Card>
    );
};

// ===========================================
// PATTERN FORM DIALOG
// ===========================================
const PatternFormDialog = ({ open, onClose, pattern, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        regex_pattern: '',
        field_mapping: {},
        priority: 1,
        description: '',
        is_active: true
    });
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    // Using imported notification system

    useEffect(() => {
        if (pattern) {
            setFormData({
                name: pattern.name || '',
                regex_pattern: pattern.regex_pattern || '',
                field_mapping: typeof pattern.field_mapping === 'string' 
                    ? pattern.field_mapping 
                    : JSON.stringify(pattern.field_mapping || {}, null, 2),
                priority: pattern.priority || 1,
                description: pattern.description || '',
                is_active: pattern.is_active !== undefined ? pattern.is_active : true
            });
        } else {
            setFormData({
                name: '',
                regex_pattern: '',
                field_mapping: '{}',
                priority: 1,
                description: '',
                is_active: true
            });
        }
        setValidation(null);
    }, [pattern, open]);

    const validatePattern = () => {
        const errors = [];
        
        if (!formData.name.trim()) {
            errors.push('Pattern name is required');
        }
        
        if (!formData.regex_pattern.trim()) {
            errors.push('Regex pattern is required');
        } else {
            try {
                new RegExp(formData.regex_pattern);
            } catch (error) {
                errors.push(`Invalid regex pattern: ${error.message}`);
            }
        }

        try {
            JSON.parse(formData.field_mapping);
        } catch (error) {
            errors.push('Invalid JSON in field mapping');
        }

        if (formData.priority < 1 || formData.priority > 100) {
            errors.push('Priority must be between 1 and 100');
        }

        setValidation({
            isValid: errors.length === 0,
            errors
        });

        return errors.length === 0;
    };

    const handleSave = async () => {
        if (!validatePattern()) {
            return;
        }

        setLoading(true);
        try {
            const patternData = {
                ...formData,
                field_mapping: JSON.parse(formData.field_mapping)
            };

            if (pattern?.id) {
                await dataProvider.updatePattern(pattern.id, patternData);
                notify('패턴이 업데이트되었습니다.', { type: 'success' });
            } else {
                await dataProvider.createPattern(patternData);
                notify('새 패턴이 생성되었습니다.', { type: 'success' });
            }
            
            onSave();
            onClose();
        } catch (error) {
            notify(`패턴 저장 실패: ${error.message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setValidation(null);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {pattern ? 'Edit Pattern' : 'Create New Pattern'}
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Pattern Name"
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        required
                        fullWidth
                    />

                    <TextField
                        label="Regular Expression"
                        value={formData.regex_pattern}
                        onChange={(e) => handleFieldChange('regex_pattern', e.target.value)}
                        required
                        fullWidth
                        multiline
                        minRows={2}
                        helperText="Enter a valid regular expression pattern"
                    />

                    <TextField
                        label="Field Mapping (JSON)"
                        value={formData.field_mapping}
                        onChange={(e) => handleFieldChange('field_mapping', e.target.value)}
                        required
                        fullWidth
                        multiline
                        minRows={4}
                        helperText='Example: {"name": "$1:s$", "episode": "$2:d$", "season": "$3:d$"}'
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Priority (1-100)"
                            type="number"
                            value={formData.priority}
                            onChange={(e) => handleFieldChange('priority', parseInt(e.target.value))}
                            inputProps={{ min: 1, max: 100 }}
                            sx={{ width: 150 }}
                        />
                        
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.is_active}
                                    onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                                />
                            }
                            label="Active"
                        />
                    </Box>

                    <TextField
                        label="Description"
                        value={formData.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        helperText="Optional description of what this pattern matches"
                    />

                    {validation && validation.errors.length > 0 && (
                        <Alert severity="error">
                            <Typography variant="body2" gutterBottom>
                                Please fix the following errors:
                            </Typography>
                            <ul>
                                {validation.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained"
                    disabled={loading}
                >
                    {loading ? 'Saving...' : (pattern ? 'Update' : 'Create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ===========================================
// PATTERN MANAGER COMPONENT
// ===========================================
const PatternManager = () => {
    const navigate = useNavigate();
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formDialog, setFormDialog] = useState({ open: false, pattern: null });
    const [systemStats, setSystemStats] = useState(null);
    // Using imported notification system

    const fetchPatterns = async () => {
        setLoading(true);
        try {
            const result = await dataProvider.getPatterns();
            setPatterns(result.patterns || []);
        } catch (error) {
            notify(`패턴 로딩 실패: ${error.message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemStats = async () => {
        try {
            const result = await dataProvider.getSystemOverview();
            setSystemStats(result);
        } catch (error) {
            console.error('Failed to fetch system stats:', error);
        }
    };

    useEffect(() => {
        fetchPatterns();
        fetchSystemStats();
    }, []);

    const handleCreatePattern = () => {
        setFormDialog({ open: true, pattern: null });
    };

    const handleEditPattern = (pattern) => {
        setFormDialog({ open: true, pattern });
    };

    const handleDeletePattern = async (patternId) => {
        if (!window.confirm('정말로 이 패턴을 삭제하시겠습니까?')) {
            return;
        }

        try {
            await dataProvider.deletePattern(patternId);
            notify('패턴이 삭제되었습니다.', { type: 'success' });
            fetchPatterns();
        } catch (error) {
            notify(`패턴 삭제 실패: ${error.message}`, { type: 'error' });
        }
    };

    const handleToggleActive = async (patternId, isActive) => {
        try {
            await dataProvider.updatePattern(patternId, { is_active: isActive });
            notify(`패턴이 ${isActive ? '활성화' : '비활성화'}되었습니다.`, { type: 'success' });
            fetchPatterns();
        } catch (error) {
            notify(`패턴 상태 변경 실패: ${error.message}`, { type: 'error' });
        }
    };

    const handleTestPattern = (pattern) => {
        // Navigate to pattern details page with built-in testing functionality
        navigate(`/patterns/${pattern.id}`);
    };

    const handleFormSave = () => {
        fetchPatterns();
        fetchSystemStats();
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Pattern Management System
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={fetchPatterns}
                    sx={{ mr: 2 }}
                >
                    Refresh
                </Button>
            </Box>

            {systemStats && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        System Overview
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4" color="primary">
                                        {systemStats.total_patterns || 0}
                                    </Typography>
                                    <Typography variant="body2">
                                        Total Patterns
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4" color="success.main">
                                        {systemStats.active_patterns || 0}
                                    </Typography>
                                    <Typography variant="body2">
                                        Active Patterns
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4">
                                        {systemStats.total_files || 0}
                                    </Typography>
                                    <Typography variant="body2">
                                        Total Files
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card variant="outlined">
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4" color="info.main">
                                        {systemStats.files_with_metadata || 0}
                                    </Typography>
                                    <Typography variant="body2">
                                        Files with Metadata
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <LinearProgress sx={{ width: '100%' }} />
                </Box>
            ) : (
                <>
                    {patterns.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="h6" gutterBottom>
                                No patterns found
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Create your first pattern to start extracting metadata from files
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={handleCreatePattern}
                                sx={{ mt: 2 }}
                            >
                                Create First Pattern
                            </Button>
                        </Paper>
                    ) : (
                        <Box>
                            {(patterns || [])
                                .sort((a, b) => b.priority - a.priority)
                                .map((pattern) => (
                                    <PatternCard
                                        key={pattern.id}
                                        pattern={pattern}
                                        onEdit={handleEditPattern}
                                        onDelete={handleDeletePattern}
                                        onTest={handleTestPattern}
                                        onToggleActive={handleToggleActive}
                                    />
                                ))}
                        </Box>
                    )}
                </>
            )}

            <Fab
                color="primary"
                onClick={handleCreatePattern}
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16
                }}
            >
                <Add />
            </Fab>

            <PatternFormDialog
                open={formDialog.open}
                onClose={() => setFormDialog({ open: false, pattern: null })}
                pattern={formDialog.pattern}
                onSave={handleFormSave}
            />
        </Box>
    );
};

export default PatternManager;