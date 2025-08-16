import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    LinearProgress,
    Alert,
    Slider,
    Switch,
    FormControlLabel,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Tooltip,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    AutoFixHigh,
    DataObject,
    Speed,
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    Refresh,
    PlayArrow,
    Visibility,
    Settings,
    Info,
    Star,
    TrendingUp,
    History,
    RestartAlt,
    CheckCircleOutline,
    CancelOutlined
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

const PatternBasedFileSelector = ({ 
    availablePatterns, 
    onFilesSelected, 
    onAnalysisComplete,
    disabled = false 
}) => {
    // State for auto-selection
    const [autoSelectionEnabled, setAutoSelectionEnabled] = useState(false);
    const [selectedPatternId, setSelectedPatternId] = useState(null);
    const [qualityThreshold, setQualityThreshold] = useState(25); // Lower default based on backend results
    const [maxFiles, setMaxFiles] = useState(20);
    
    // Analysis state
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);
    const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
    
    // Selected files state
    const [autoSelectedFiles, setAutoSelectedFiles] = useState([]);
    const [selectionStats, setSelectionStats] = useState(null);
    
    // Selection history management state
    const [excludePreviouslySelected, setExcludePreviouslySelected] = useState(true);
    const [forceIncludeAll, setForceIncludeAll] = useState(false);
    const [selectionHistory, setSelectionHistory] = useState([]);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetScope, setResetScope] = useState('pattern'); // 'pattern' | 'all'
    const [resetting, setResetting] = useState(false);
    
    // History dialog state
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Reset when auto-selection is disabled
    useEffect(() => {
        if (!autoSelectionEnabled) {
            setAnalysisResult(null);
            setAutoSelectedFiles([]);
            setSelectionStats(null);
            setAnalysisError(null);
            setSelectionHistory([]);
        }
    }, [autoSelectionEnabled]);

    const handlePatternAnalysis = async () => {
        if (!selectedPatternId) {
            setAnalysisError('Please select a pattern first');
            return;
        }

        setAnalyzing(true);
        setAnalysisError(null);
        
        try {
            // Analyze pattern effectiveness
            const result = await dataProvider.autoSelectFilesForPattern(selectedPatternId, {
                qualityThreshold,
                maxFiles,
                limit: 100, // Analyze up to 100 files
                excludePrevious: excludePreviouslySelected,
                forceIncludeAll: forceIncludeAll
            });
            
            setAnalysisResult(result.analysis);
            setAutoSelectedFiles(result.selected_files);
            setSelectionStats(result.selection_criteria);
            
            // Notify parent components
            onAnalysisComplete?.(result.analysis);
            onFilesSelected?.(result.selected_files.map(f => f.id));
            
        } catch (error) {
            console.error('Pattern analysis failed:', error);
            setAnalysisError(error.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const getQualityColor = (score) => {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'error';
    };

    const getQualityLabel = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    };

    // Selection history management functions
    const handleRecordSelection = async () => {
        if (!selectedPatternId || autoSelectedFiles.length === 0) return;
        
        try {
            const fileIds = autoSelectedFiles.map(f => f.id);
            const selectionContext = {
                quality_threshold: qualityThreshold,
                max_files: maxFiles,
                analysis_timestamp: new Date().toISOString()
            };
            
            await dataProvider.recordPatternSelection(selectedPatternId, fileIds, selectionContext);
            console.log('Selection recorded successfully');
        } catch (error) {
            console.error('Failed to record selection:', error);
        }
    };

    const handleResetSelections = async () => {
        setResetting(true);
        
        try {
            if (resetScope === 'pattern' && selectedPatternId) {
                await dataProvider.resetPatternSelections(selectedPatternId);
            } else if (resetScope === 'all') {
                await dataProvider.resetAllSelections();
            }
            
            setShowResetDialog(false);
            setSelectionHistory([]);
            
            // Trigger a new analysis to show the difference
            if (selectedPatternId) {
                await handlePatternAnalysis();
            }
            
        } catch (error) {
            console.error('Failed to reset selections:', error);
            setAnalysisError(error.message);
        } finally {
            setResetting(false);
        }
    };

    const loadSelectionHistory = async () => {
        if (!selectedPatternId) return;
        
        setHistoryLoading(true);
        try {
            const result = await dataProvider.getPatternSelectionHistory(selectedPatternId);
            setSelectionHistory(result.history || []);
            setShowHistoryDialog(true); // Show the dialog with loaded history
        } catch (error) {
            console.error('Failed to load selection history:', error);
            setAnalysisError('Failed to load selection history');
        } finally {
            setHistoryLoading(false);
        }
    };

    // Load selection history when pattern changes
    useEffect(() => {
        if (selectedPatternId && autoSelectionEnabled) {
            loadSelectionHistory();
        }
    }, [selectedPatternId, autoSelectionEnabled]);

    const renderPatternSelector = () => (
        <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Pattern for Analysis</InputLabel>
            <Select
                value={selectedPatternId || ''}
                onChange={(e) => setSelectedPatternId(e.target.value || null)}
                label="Pattern for Analysis"
                disabled={disabled || analyzing}
            >
                <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Info sx={{ mr: 1, color: 'action.active' }} />
                        Select a pattern to analyze
                    </Box>
                </MenuItem>
                {availablePatterns.map((pattern) => (
                    <MenuItem key={pattern.id} value={pattern.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <DataObject sx={{ mr: 1, color: 'primary.main' }} />
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {pattern.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Fields: {Object.keys(pattern.field_mapping || {}).length} | 
                                    Priority: {pattern.priority}
                                </Typography>
                            </Box>
                        </Box>
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    const renderSelectionControls = () => (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                Selection Criteria
            </Typography>
            
            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    Quality Threshold: {qualityThreshold}%
                </Typography>
                <Slider
                    value={qualityThreshold}
                    onChange={(e, value) => setQualityThreshold(value)}
                    min={0}
                    max={100}
                    step={5}
                    marks={[
                        { value: 0, label: '0%' },
                        { value: 25, label: '25%' },
                        { value: 50, label: '50%' },
                        { value: 75, label: '75%' },
                        { value: 100, label: '100%' }
                    ]}
                    disabled={disabled || analyzing}
                    valueLabelDisplay="auto"
                />
            </Box>

            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    Maximum Files to Select: {maxFiles}
                </Typography>
                <Slider
                    value={maxFiles}
                    onChange={(e, value) => setMaxFiles(value)}
                    min={1}
                    max={100}
                    step={1}
                    marks={[
                        { value: 1, label: '1' },
                        { value: 20, label: '20' },
                        { value: 50, label: '50' },
                        { value: 100, label: '100' }
                    ]}
                    disabled={disabled || analyzing}
                    valueLabelDisplay="auto"
                />
            </Box>
        </Box>
    );

    const renderHistoryControls = () => (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                Selection History Options
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={excludePreviouslySelected}
                            onChange={(e) => {
                                setExcludePreviouslySelected(e.target.checked);
                                if (e.target.checked) {
                                    setForceIncludeAll(false);
                                }
                            }}
                            disabled={disabled || analyzing}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CancelOutlined sx={{ mr: 1, fontSize: 18 }} />
                            Exclude Previously Selected Files
                        </Box>
                    }
                />
                
                <FormControlLabel
                    control={
                        <Switch
                            checked={forceIncludeAll}
                            onChange={(e) => {
                                setForceIncludeAll(e.target.checked);
                                if (e.target.checked) {
                                    setExcludePreviouslySelected(false);
                                }
                            }}
                            disabled={disabled || analyzing}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircleOutline sx={{ mr: 1, fontSize: 18 }} />
                            Force Include All Files (Override History)
                        </Box>
                    }
                />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={historyLoading ? <Refresh sx={{ animation: 'spin 1s linear infinite' }} /> : <History />}
                    onClick={loadSelectionHistory}
                    disabled={!selectedPatternId || disabled || historyLoading}
                >
                    {historyLoading ? 'Loading...' : `View History (${selectionHistory.length})`}
                </Button>
                
                <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<RestartAlt />}
                    onClick={() => setShowResetDialog(true)}
                    disabled={!selectedPatternId || disabled}
                >
                    Reset History
                </Button>
            </Box>
        </Box>
    );

    const renderResetDialog = () => (
        <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
            <DialogTitle>Reset Selection History</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Choose what selection history to reset:
                </Typography>
                
                <FormControl component="fieldset">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={resetScope === 'pattern'}
                                    onChange={() => setResetScope('pattern')}
                                />
                            }
                            label="Reset this pattern only"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={resetScope === 'all'}
                                    onChange={() => setResetScope('all')}
                                />
                            }
                            label="Reset all patterns"
                        />
                    </Box>
                </FormControl>
                
                {selectionHistory.length > 0 && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                        Current pattern has {selectionHistory.length} selection records
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowResetDialog(false)}>Cancel</Button>
                <Button 
                    onClick={handleResetSelections} 
                    color="warning" 
                    variant="contained"
                    disabled={resetting}
                >
                    {resetting ? 'Resetting...' : 'Reset History'}
                </Button>
            </DialogActions>
        </Dialog>
    );

    const renderHistoryDialog = () => (
        <Dialog 
            open={showHistoryDialog} 
            onClose={() => setShowHistoryDialog(false)}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <History sx={{ mr: 1, color: 'primary.main' }} />
                        Selection History
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                        {selectionHistory.length} records
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                {renderHistoryContent()}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowHistoryDialog(false)}>Close</Button>
            </DialogActions>
        </Dialog>
    );

    const renderHistoryContent = () => {
        if (selectionHistory.length === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <History sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary">
                        No Selection History
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        This pattern hasn't been used for file selection yet.
                    </Typography>
                </Box>
            );
        }

        return (
            <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Selection Time</TableCell>
                            <TableCell align="center">Files Selected</TableCell>
                            <TableCell align="center">Quality Threshold</TableCell>
                            <TableCell align="center">Max Files</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectionHistory.map((record, index) => (
                            <TableRow key={index} hover>
                                <TableCell>
                                    <Typography variant="body2">
                                        {new Date(record.selection_timestamp).toLocaleString()}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        label={record.file_count || 0}
                                        size="small"
                                        color="primary"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="body2">
                                        {record.selection_context?.quality_threshold || 'N/A'}%
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="body2">
                                        {record.selection_context?.max_files || 'N/A'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label="Completed"
                                        size="small"
                                        color="success"
                                        icon={<CheckCircle />}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderAnalysisButton = () => (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
                variant="contained"
                startIcon={analyzing ? <Speed /> : <AutoFixHigh />}
                onClick={handlePatternAnalysis}
                disabled={disabled || analyzing || !selectedPatternId}
                sx={{ flexGrow: 1 }}
            >
                {analyzing ? 'Analyzing Files...' : 'Analyze & Auto-Select Files'}
            </Button>
            
            {analysisResult && (
                <Tooltip title={showAnalysisDetails ? "Hide Details" : "Show Analysis Details"}>
                    <IconButton 
                        onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
                        color="primary"
                    >
                        <Visibility />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );

    const renderAnalysisProgress = () => (
        analyzing && (
            <Box sx={{ mb: 2 }}>
                <LinearProgress />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Analyzing files with selected pattern...
                </Typography>
            </Box>
        )
    );

    const renderAnalysisResults = () => {
        if (!analysisResult) return null;

        const { recommendations } = analysisResult;
        
        return (
            <Box sx={{ mb: 2 }}>
                {/* Summary Alert */}
                <Alert 
                    severity={autoSelectedFiles.length > 0 ? 'success' : 'warning'} 
                    sx={{ mb: 2 }}
                    icon={autoSelectedFiles.length > 0 ? <CheckCircle /> : <Warning />}
                >
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Analysis Complete: {autoSelectedFiles.length} files auto-selected
                    </Typography>
                    <Typography variant="caption">
                        {recommendations.recommendation_message}
                    </Typography>
                </Alert>

                {/* Quality Distribution */}
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Quality Distribution ({analysisResult.analyzed_files} files analyzed)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                            icon={<Star />}
                            label={`Excellent: ${recommendations.quality_distribution.excellent}`}
                            color="success"
                            size="small"
                        />
                        <Chip 
                            icon={<TrendingUp />}
                            label={`Good: ${recommendations.quality_distribution.good}`}
                            color="warning"
                            size="small"
                        />
                        <Chip 
                            icon={<ErrorIcon />}
                            label={`Poor: ${recommendations.quality_distribution.poor}`}
                            color="error"
                            size="small"
                        />
                    </Box>
                </Paper>

                {/* Analysis Details */}
                {showAnalysisDetails && (
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Analysis Details
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" color="textSecondary">
                                    Execution Time
                                </Typography>
                                <Typography variant="body2">
                                    {analysisResult.execution_time_ms}ms
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="textSecondary">
                                    Recommended Count
                                </Typography>
                                <Typography variant="body2">
                                    {recommendations.optimal_file_count} files
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                )}
            </Box>
        );
    };

    const renderSelectedFiles = () => {
        if (autoSelectedFiles.length === 0) return null;

        return (
            <Paper sx={{ mt: 2 }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2">
                        Auto-Selected Files ({autoSelectedFiles.length})
                    </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Filename</TableCell>
                                <TableCell align="center">Score</TableCell>
                                <TableCell align="center">Fields</TableCell>
                                <TableCell align="center">Quality</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {autoSelectedFiles.map((file, index) => (
                                <TableRow key={file.id}>
                                    <TableCell>
                                        <Typography variant="body2" noWrap>
                                            {file.filename}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Badge 
                                            badgeContent={file.extraction_score} 
                                            color={getQualityColor(file.extraction_score)}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={file.extracted_fields}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={getQualityLabel(file.extraction_score)}
                                            color={getQualityColor(file.extraction_score)}
                                            size="small"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    if (!autoSelectionEnabled) {
        return (
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AutoFixHigh sx={{ mr: 1, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="subtitle1">
                                    Smart Auto File Selection
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Automatically select files with the best pattern matches
                                </Typography>
                            </Box>
                        </Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={autoSelectionEnabled}
                                    onChange={(e) => setAutoSelectionEnabled(e.target.checked)}
                                    disabled={disabled}
                                />
                            }
                            label="Enable"
                        />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AutoFixHigh sx={{ mr: 1, color: 'primary.main' }} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">
                            Smart Auto File Selection
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Select pattern and criteria to automatically choose optimal files
                        </Typography>
                    </Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoSelectionEnabled}
                                onChange={(e) => setAutoSelectionEnabled(e.target.checked)}
                                disabled={disabled}
                            />
                        }
                        label="Enabled"
                    />
                </Box>

                <Divider sx={{ mb: 2 }} />

                {renderPatternSelector()}
                {renderSelectionControls()}
                {renderHistoryControls()}
                {renderAnalysisButton()}
                {renderAnalysisProgress()}
                
                {analysisError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {analysisError}
                    </Alert>
                )}
                
                {renderAnalysisResults()}
                {renderSelectedFiles()}
            </CardContent>
            {renderResetDialog()}
            {renderHistoryDialog()}
        </Card>
    );
};

export default PatternBasedFileSelector;