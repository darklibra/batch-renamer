import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, TextField, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
    List, ListItem, ListItemText,
    Chip, Switch, FormControlLabel, Alert,
    Accordion, AccordionSummary, AccordionDetails, Paper, Grid,
    LinearProgress, InputAdornment, CircularProgress
} from '@mui/material';
import {
    Add, Edit, Delete, ExpandMore, Close, Science, Security,
    CheckCircle, Error as ErrorIcon, Warning, Info, Refresh, Preview,
    CloudDone, PlayArrow
} from '@mui/icons-material';
import { PageHeader, StandardCardActions } from './common';
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

            <StandardCardActions
                onEdit={() => onEdit(pattern)}
                onDelete={() => onDelete(pattern.id)}
                onTest={() => onTest(pattern)}
                showView={false}
                showTest={true}
                testLabel="Test Pattern"
                deleteConfirmMessage="정말로 이 패턴을 삭제하시겠습니까?"
            />
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
    const [securityValidation, setSecurityValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validatingPattern, setValidatingPattern] = useState(false);
    
    // Pattern Preview State
    const [patternPreview, setPatternPreview] = useState({
        loading: false,
        matchCount: 0,
        sampleFiles: [],
        errors: [],
        showPreview: false
    });
    const [isRegexLocked, setIsRegexLocked] = useState(false);
    const [previewCache, setPreviewCache] = useState(new Map());
    
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
        setSecurityValidation(null);
        setPatternPreview({
            loading: false,
            matchCount: 0,
            sampleFiles: [],
            errors: [],
            showPreview: false
        });
    }, [pattern, open]);


    // Pattern Preview Functions
    const fetchPatternPreview = async (pattern) => {
        if (!pattern || pattern.trim() === '') {
            setPatternPreview(prev => ({ 
                ...prev, 
                loading: false, 
                matchCount: 0, 
                sampleFiles: [], 
                errors: [],
                showPreview: false 
            }));
            return;
        }

        setIsRegexLocked(true);
        setPatternPreview(prev => ({ ...prev, loading: true, errors: [] }));
        
        try {
            // Check cache first
            if (previewCache.has(pattern)) {
                const cached = previewCache.get(pattern);
                setPatternPreview({
                    loading: false,
                    matchCount: cached.match_count,
                    sampleFiles: cached.sample_files,
                    errors: [],
                    showPreview: true
                });
                setIsRegexLocked(false);
                return;
            }

            const result = await dataProvider.previewPatternMatch({ 
                regex_pattern: pattern,
                max_sample_files: 1,
                include_metadata: true
            });

            // Cache the result
            const newCache = new Map(previewCache);
            newCache.set(pattern, result);
            setPreviewCache(newCache);
            
            setPatternPreview({
                loading: false,
                matchCount: result.match_count,
                sampleFiles: result.sample_files,
                errors: result.validation_errors || [],
                showPreview: true
            });
            
        } catch (error) {
            console.error('Pattern preview error:', error);
            setPatternPreview(prev => ({ 
                ...prev, 
                loading: false, 
                errors: [error.message || 'Preview failed'],
                showPreview: true
            }));
        } finally {
            setIsRegexLocked(false);
        }
    };

    const handlePreviewClick = () => {
        const regexValue = formData.regex_pattern.trim();
        if (regexValue) {
            fetchPatternPreview(regexValue);
        }
    };

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

    const validatePatternSecurity = async (showNotifications = true) => {
        if (!formData.regex_pattern || !formData.name) {
            return null;
        }

        setValidatingPattern(true);
        try {
            const patternData = {
                name: formData.name,
                regex_pattern: formData.regex_pattern,
                field_mapping: typeof formData.field_mapping === 'string' 
                    ? JSON.parse(formData.field_mapping) 
                    : formData.field_mapping,
                priority: formData.priority
            };

            const securityResult = await dataProvider.validatePatternSecurity(patternData);
            setSecurityValidation(securityResult);

            // Show notifications for security issues
            if (showNotifications && securityResult && !securityResult.is_valid) {
                const riskLevel = securityResult.security?.risk_level || 'unknown';
                const message = securityResult.security?.message || 'Pattern has security issues';
                
                if (riskLevel === 'high') {
                    notify(`🚨 High Security Risk: ${message}`, { type: 'error' });
                } else if (riskLevel === 'medium') {
                    notify(`⚠️ Security Warning: ${message}`, { type: 'warning' });
                } else {
                    notify(`ℹ️ Security Info: ${message}`, { type: 'info' });
                }
            }

            return securityResult;
        } catch (error) {
            console.error('Security validation failed:', error);
            if (showNotifications) {
                notify(`보안 검증 실패: ${error.message}`, { type: 'error' });
            }
            setSecurityValidation({
                is_valid: false,
                security: { 
                    is_secure: false, 
                    risk_level: 'unknown',
                    message: 'Security validation failed',
                    recommendations: ['Please check pattern syntax and try again']
                }
            });
            return null;
        } finally {
            setValidatingPattern(false);
        }
    };

    const handleSave = async () => {
        if (!validatePattern()) {
            return;
        }

        // SECURITY: Validate pattern security before saving
        const securityResult = await validatePatternSecurity(false); // Don't show notifications here
        if (securityResult && !securityResult.is_valid) {
            const riskLevel = securityResult.security?.risk_level || 'unknown';
            const riskScore = securityResult.security?.risk_score || 0;
            
            // Block high-risk patterns
            if (riskLevel === 'high' || riskScore >= 0.7) {
                notify(`🚨 패턴이 보안 위험으로 인해 차단되었습니다: ${securityResult.security?.message}`, { type: 'error' });
                return;
            }
            
            // Warn about medium-risk patterns
            if (riskLevel === 'medium' || riskScore >= 0.3) {
                const proceed = window.confirm(
                    `⚠️ 보안 경고: ${securityResult.security?.message}\n\n계속 진행하시겠습니까?`
                );
                if (!proceed) {
                    return;
                }
            }
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
        
        // Real-time security validation for regex pattern
        if (field === 'regex_pattern' && value && value.length > 3) {
            // Debounced security validation (after user stops typing for 1 second)
            const timeoutId = setTimeout(() => {
                validatePatternSecurity(false);
            }, 1000);
            
            // Clear previous timeout if user is still typing
            return () => clearTimeout(timeoutId);
        }
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
                        disabled={isRegexLocked}
                        required
                        fullWidth
                        multiline
                        minRows={2}
                        helperText="Enter a valid regular expression pattern and click the ▶ button to test it"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={handlePreviewClick}
                                        disabled={!formData.regex_pattern.trim() || patternPreview.loading || isRegexLocked}
                                        size="medium"
                                        color="primary"
                                        title="Test pattern and show matches"
                                        sx={{ 
                                            p: 1.5,
                                            '&:hover': {
                                                bgcolor: 'primary.main',
                                                color: 'primary.contrastText'
                                            }
                                        }}
                                    >
                                        {patternPreview.loading ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : (
                                            <PlayArrow fontSize="medium" />
                                        )}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {/* Pattern Preview Results */}
                    {patternPreview.showPreview && (
                        <Card variant="outlined" sx={{ mt: 1, mb: 1 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Preview sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Pattern Preview
                                    </Typography>
                                    {patternPreview.loading && (
                                        <LinearProgress sx={{ ml: 2, width: 100 }} />
                                    )}
                                </Box>
                                
                                {patternPreview.errors.length > 0 ? (
                                    <Alert severity="error" sx={{ mt: 1 }}>
                                        {patternPreview.errors.map((error, index) => (
                                            <Typography key={index} variant="body2">
                                                {error}
                                            </Typography>
                                        ))}
                                    </Alert>
                                ) : (
                                    <>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <CloudDone sx={{ mr: 1, color: 'success.main' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                <strong>{patternPreview.matchCount}</strong> files match this pattern
                                            </Typography>
                                        </Box>
                                        
                                        {patternPreview.sampleFiles.length > 0 && (
                                            <Box sx={{ 
                                                bgcolor: 'grey.50', 
                                                p: 1.5, 
                                                borderRadius: 1, 
                                                border: '1px solid',
                                                borderColor: 'grey.200'
                                            }}>
                                                <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                                                    Sample file:
                                                </Typography>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontFamily: 'monospace',
                                                        color: 'primary.main',
                                                        fontWeight: 500,
                                                        mb: 0.5
                                                    }}
                                                >
                                                    {patternPreview.sampleFiles[0].filename}
                                                </Typography>
                                                {patternPreview.sampleFiles[0].extracted_data && 
                                                 Object.keys(patternPreview.sampleFiles[0].extracted_data).length > 0 && (
                                                    <Chip 
                                                        label={`${Object.keys(patternPreview.sampleFiles[0].extracted_data).length} fields extracted`}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                )}
                                                {patternPreview.sampleFiles[0].match_groups && 
                                                 patternPreview.sampleFiles[0].match_groups.length > 0 && (
                                                    <Box sx={{ mt: 1 }}>
                                                        <Typography variant="caption" color="textSecondary">
                                                            Match groups: {patternPreview.sampleFiles[0].match_groups.join(', ')}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                        
                                        {patternPreview.matchCount === 0 && (
                                            <Alert severity="info" sx={{ mt: 1 }}>
                                                <Typography variant="body2">
                                                    No files match this pattern. Try adjusting your regular expression.
                                                </Typography>
                                            </Alert>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

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

                    {/* Security Validation Display */}
                    {validatingPattern && (
                        <Alert severity="info" icon={<Science />}>
                            <Typography variant="body2">
                                🔍 Validating pattern security...
                            </Typography>
                        </Alert>
                    )}

                    {securityValidation && !validatingPattern && (
                        <Alert 
                            severity={
                                securityValidation.security?.risk_level === 'high' ? 'error' :
                                securityValidation.security?.risk_level === 'medium' ? 'warning' :
                                securityValidation.is_valid ? 'success' : 'info'
                            }
                            icon={
                                securityValidation.security?.risk_level === 'high' ? <ErrorIcon /> :
                                securityValidation.security?.risk_level === 'medium' ? <Warning /> :
                                securityValidation.is_valid ? <CheckCircle /> : <Info />
                            }
                        >
                            <Typography variant="body2" gutterBottom>
                                <strong>Security Validation Results:</strong>
                            </Typography>
                            
                            <Typography variant="body2" gutterBottom>
                                🛡️ Security Status: {securityValidation.is_valid ? '✅ Safe' : '⚠️ Issues Found'}
                                {securityValidation.security?.risk_score && (
                                    <span> (Risk Score: {(securityValidation.security.risk_score * 100).toFixed(0)}%)</span>
                                )}
                            </Typography>
                            
                            <Typography variant="body2" gutterBottom>
                                📊 Quality Score: {securityValidation.validation_score || 0}/100
                            </Typography>

                            <Typography variant="body2" gutterBottom>
                                💬 {securityValidation.security?.message || 'No security issues detected'}
                            </Typography>

                            {securityValidation.security?.recommendations && securityValidation.security.recommendations.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">
                                        💡 Recommendations:
                                    </Typography>
                                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                        {securityValidation.security.recommendations.map((rec, index) => (
                                            <li key={index}>
                                                <Typography variant="body2">{rec}</Typography>
                                            </li>
                                        ))}
                                    </ul>
                                </Box>
                            )}

                            {securityValidation.validation_details?.errors && securityValidation.validation_details.errors.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">
                                        🔧 Pattern Issues:
                                    </Typography>
                                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                        {securityValidation.validation_details.errors
                                            .filter(err => err.severity === 'error' || err.severity === 'critical')
                                            .slice(0, 3)
                                            .map((error, index) => (
                                            <li key={index}>
                                                <Typography variant="body2">{error.message}</Typography>
                                            </li>
                                        ))}
                                    </ul>
                                </Box>
                            )}
                        </Alert>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button 
                    onClick={() => validatePatternSecurity(true)} 
                    startIcon={<Security />}
                    disabled={loading || validatingPattern || !formData.regex_pattern}
                    sx={{ mr: 1 }}
                >
                    {validatingPattern ? 'Validating...' : 'Security Check'}
                </Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained"
                    disabled={loading || validatingPattern}
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
        <Box sx={{ width: '100%' }}>

            {systemStats && (
                <Paper sx={{ p: 3, mb: 3 }}>
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
                            <Box sx={{ mt: 2 }}>
                                <button
                                    onClick={handleCreatePattern}
                                    style={{
                                        padding: '12px 24px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        background: '#1976d2',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        margin: '0 auto'
                                    }}
                                >
                                    <Add /> Create First Pattern
                                </button>
                            </Box>
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

            <PatternFormDialog
                open={formDialog.open}
                onClose={() => setFormDialog({ open: false, pattern: null })}
                pattern={formDialog.pattern}
                onSave={handleFormSave}
            />
            
            {/* Hidden button for external access - used by PatternManagerPage */}
            <button
                data-testid="create-pattern-button"
                onClick={handleCreatePattern}
                style={{ display: 'none' }}
                aria-hidden="true"
            >
                Create Pattern
            </button>
        </Box>
    );
};

export default PatternManager;