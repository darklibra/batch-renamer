import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    LinearProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Switch,
    FormControlLabel
} from '@mui/material';
import {
    FolderOpen,
    FileCopy,
    DriveFileMove,
    Preview,
    CheckCircle,
    Error as ErrorIcon,
    Cancel,
    Refresh,
    ExpandMore,
    Settings,
    Help,
    DataObject,
    Speed,
    Info
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

const SmartFileManager = ({ selectedFileIds, onOperationComplete }) => {
    // State management
    const [operationType, setOperationType] = useState('copy'); // 'copy' or 'move'
    const [targetDirectory, setTargetDirectory] = useState('');
    const [filenameTemplate, setFilenameTemplate] = useState('{name}_{start}_{end}.{extension}');
    const [conflictResolution, setConflictResolution] = useState('skip');
    const [createBackup, setCreateBackup] = useState(false);
    
    // UI state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isTemplateHelpOpen, setIsTemplateHelpOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    
    // Data state
    const [previewData, setPreviewData] = useState(null);
    const [templateValidation, setTemplateValidation] = useState(null);
    const [currentJob, setCurrentJob] = useState(null);
    const [jobProgress, setJobProgress] = useState(null);
    
    // Pattern selection state
    const [selectedPatternId, setSelectedPatternId] = useState(null);
    const [availablePatterns, setAvailablePatterns] = useState([]);
    const [showPatternSelection, setShowPatternSelection] = useState(false);
    const [patternsLoading, setPatternsLoading] = useState(false);
    
    // Errors and loading
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);

    // Template examples for help
    const templateExamples = [
        {
            template: '{name}_{start}_{end}.{extension}',
            description: 'Name with start and end numbers',
            example: '소설제목_1_100.txt'
        },
        {
            template: '{name} ({start}-{end}).{extension}',
            description: 'Name with parentheses and range',
            example: '소설제목 (1-100).txt'
        },
        {
            template: '{name}/{name}_{start}_{end}.{extension}',
            description: 'Organized in folders by name',
            example: '소설제목/소설제목_1_100.txt'
        },
        {
            template: '{name}_{start}화-{end}화.{extension}',
            description: 'Korean episode format',
            example: '소설제목_1화-100화.txt'
        }
    ];

    // Available metadata fields for template suggestions
    const getAvailableFields = () => {
        const standardFields = ['original_filename', 'basename', 'extension'];
        
        if (selectedPatternId) {
            const selectedPattern = availablePatterns.find(p => p.id === selectedPatternId);
            if (selectedPattern && selectedPattern.field_mapping) {
                return [...Object.keys(selectedPattern.field_mapping), ...standardFields];
            }
        }
        
        // Default fields when no pattern selected
        return [
            'title', 'author', 'year', 'category', 'episode', 'season',
            ...standardFields
        ];
    };
    
    const availableFields = getAvailableFields();

    // Load available patterns
    const loadAvailablePatterns = async () => {
        try {
            setPatternsLoading(true);
            const result = await dataProvider.getList('patterns', {
                pagination: { page: 1, perPage: 100 },
                sort: { field: 'priority', order: 'DESC' },
                filter: { is_active: true }
            });
            setAvailablePatterns(result.data || []);
        } catch (error) {
            console.error('Failed to load patterns:', error);
            setError('Failed to load available patterns');
        } finally {
            setPatternsLoading(false);
        }
    };

    // Validate template on change
    useEffect(() => {
        const validateTemplate = async () => {
            if (!filenameTemplate.trim()) {
                setTemplateValidation(null);
                setValidationError('Template cannot be empty');
                return;
            }

            try {
                // Use sample file if available
                const sampleFileId = selectedFileIds && selectedFileIds.length > 0 ? selectedFileIds[0] : null;
                
                const result = await dataProvider.validateFilenameTemplate(
                    filenameTemplate,
                    sampleFileId,
                    selectedPatternId
                );
                setTemplateValidation(result);
                setValidationError(result.is_valid ? null : result.error_message);
            } catch (error) {
                console.error('Template validation error:', error);
                setValidationError(error.message || 'Template validation failed');
                setTemplateValidation(null);
            }
        };

        const debounceTimer = setTimeout(validateTemplate, 500);
        return () => clearTimeout(debounceTimer);
    }, [filenameTemplate, selectedFileIds, selectedPatternId]);

    // Load patterns when component mounts or selected files change
    useEffect(() => {
        if (selectedFileIds && selectedFileIds.length > 0) {
            loadAvailablePatterns();
        }
    }, [selectedFileIds]);

    // Poll job progress
    useEffect(() => {
        if (!currentJob) return;

        const pollInterval = setInterval(async () => {
            try {
                const status = await dataProvider.getSmartOperationStatus(currentJob.job_id);
                setJobProgress(status);

                if (status.status === 'completed' || status.status === 'failed') {
                    setIsProcessing(false);
                    setCurrentJob(null);
                    
                    if (status.status === 'completed') {
                        onOperationComplete?.(status);
                    }
                    
                    clearInterval(pollInterval);
                }
            } catch (error) {
                console.error('Progress polling error:', error);
                clearInterval(pollInterval);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [currentJob, onOperationComplete]);

    const handlePreviewGeneration = async () => {
        if (!selectedFileIds || selectedFileIds.length === 0) {
            setError('No files selected');
            return;
        }

        if (!filenameTemplate.trim()) {
            setError('Please enter a filename template');
            return;
        }

        try {
            setError(null);
            const preview = await dataProvider.previewFilenameTemplate(
                selectedFileIds,
                filenameTemplate,
                selectedPatternId
            );
            setPreviewData(preview);
            setIsPreviewOpen(true);
        } catch (error) {
            console.error('Preview generation failed:', error);
            setError(`Preview failed: ${error.message}`);
        }
    };

    const handleOperationStart = async () => {
        if (!selectedFileIds || selectedFileIds.length === 0) {
            setError('No files selected');
            return;
        }

        if (!targetDirectory.trim()) {
            setError('Please select a target directory');
            return;
        }

        if (!filenameTemplate.trim()) {
            setError('Please enter a filename template');
            return;
        }

        if (validationError) {
            setError('Please fix template validation errors first');
            return;
        }

        try {
            setError(null);
            setIsProcessing(true);

            const operationData = {
                file_ids: selectedFileIds,
                target_directory: targetDirectory,
                filename_template: filenameTemplate,
                conflict_resolution: conflictResolution,
                create_backup: createBackup,
                pattern_id: selectedPatternId
            };

            let result;
            if (operationType === 'copy') {
                result = await dataProvider.startSmartCopy(operationData);
            } else {
                result = await dataProvider.startSmartMove(operationData);
            }

            setCurrentJob(result);
            
        } catch (error) {
            console.error('Operation start failed:', error);
            setError(`Operation failed: ${error.message}`);
            setIsProcessing(false);
        }
    };

    const handleJobCancel = async () => {
        if (!currentJob) return;

        try {
            await dataProvider.cancelSmartOperation(currentJob.job_id);
            setIsProcessing(false);
            setCurrentJob(null);
            setJobProgress(null);
        } catch (error) {
            console.error('Job cancellation failed:', error);
            setError(`Cancellation failed: ${error.message}`);
        }
    };

    // Pattern selector component
    const renderPatternSelector = () => (
        <Card sx={{ mb: 2 }} variant="outlined">
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DataObject sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">
                        Extraction Pattern
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                        size="small"
                        startIcon={<Refresh />}
                        onClick={loadAvailablePatterns}
                        disabled={patternsLoading}
                    >
                        Refresh
                    </Button>
                </Box>

                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Choose Pattern</InputLabel>
                    <Select
                        value={selectedPatternId || ''}
                        onChange={(e) => setSelectedPatternId(e.target.value || null)}
                        label="Choose Pattern"
                        disabled={patternsLoading}
                    >
                        <MenuItem value="">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Info sx={{ mr: 1, color: 'action.active' }} />
                                Auto (use existing metadata)
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
                                            Priority: {pattern.priority} | Fields: {Object.keys(pattern.field_mapping || {}).length}
                                        </Typography>
                                    </Box>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {selectedPatternId && (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {(() => {
                            const selectedPattern = availablePatterns.find(p => p.id === selectedPatternId);
                            if (!selectedPattern) return null;
                            
                            return (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        📋 {selectedPattern.name}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                        Pattern: <code>{selectedPattern.regex_pattern}</code>
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        Available Fields:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {Object.keys(selectedPattern.field_mapping || {}).map(field => (
                                            <Chip 
                                                key={field}
                                                label={`{${field}}`}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    setFilenameTemplate(prev => prev + `{${field}}`);
                                                }}
                                                clickable
                                            />
                                        ))}
                                    </Box>
                                    <Button
                                        size="small"
                                        sx={{ mt: 1 }}
                                        onClick={async () => {
                                            try {
                                                setError(null);
                                                const result = await dataProvider.applyPatternToFiles(selectedFileIds, selectedPatternId);
                                                // Debug: Pattern application result
                                                // Pattern applied successfully
                                                // Show success message or update UI
                                            } catch (error) {
                                                setError(`Failed to apply pattern: ${error.message}`);
                                            }
                                        }}
                                        disabled={!selectedFileIds || selectedFileIds.length === 0}
                                    >
                                        Apply to Selected Files
                                    </Button>
                                </Box>
                            );
                        })()}
                    </Box>
                )}

                {patternsLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <LinearProgress sx={{ flexGrow: 1 }} />
                        <Typography variant="caption">Loading patterns...</Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    const renderTemplateHelp = () => (
        <Dialog 
            open={isTemplateHelpOpen} 
            onClose={() => setIsTemplateHelpOpen(false)}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Help />
                    Filename Template Guide
                </Box>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        How to Use Templates
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                        Use curly braces to insert metadata fields: <code>{'{field_name}'}</code>
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Available Fields
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {availableFields.map(field => (
                            <Chip 
                                key={field} 
                                label={`{${field}}`} 
                                size="small" 
                                onClick={() => {
                                    setFilenameTemplate(prev => prev + `{${field}}`);
                                }}
                                clickable
                            />
                        ))}
                    </Box>
                </Box>

                <Box>
                    <Typography variant="h6" gutterBottom>
                        Template Examples
                    </Typography>
                    {templateExamples.map((example, index) => (
                        <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                    <code>{example.template}</code>
                                </Typography>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    {example.description}
                                </Typography>
                                <Typography variant="caption" color="primary">
                                    Example: {example.example}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <Button 
                                        size="small" 
                                        onClick={() => setFilenameTemplate(example.template)}
                                    >
                                        Use This Template
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setIsTemplateHelpOpen(false)}>Close</Button>
            </DialogActions>
        </Dialog>
    );

    const renderPreviewDialog = () => (
        <Dialog 
            open={isPreviewOpen} 
            onClose={() => setIsPreviewOpen(false)}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Preview />
                    Filename Preview
                </Box>
            </DialogTitle>
            <DialogContent>
                {previewData && (
                    <Box>
                        <Alert 
                            severity={previewData.error_count > 0 ? 'warning' : 'success'} 
                            sx={{ mb: 2 }}
                        >
                            Preview generated for {previewData.preview_count} of {previewData.total_files} files
                            {previewData.error_count > 0 && ` (${previewData.error_count} errors)`}
                        </Alert>

                        {previewData.errors.length > 0 && (
                            <Accordion sx={{ mb: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Typography>
                                        <ErrorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Errors ({previewData.errors.length})
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <List dense>
                                        {previewData.errors.map((error, index) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <ErrorIcon color="error" />
                                                </ListItemIcon>
                                                <ListItemText primary={error} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        )}

                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Original Filename</TableCell>
                                        <TableCell>New Filename</TableCell>
                                        <TableCell>Path</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.previews.map((preview, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {preview.original_filename}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ fontWeight: 'bold', color: 'primary.main' }}
                                                >
                                                    {preview.new_filename}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="textSecondary">
                                                    {preview.original_path}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
                {previewData && previewData.preview_count > 0 && (
                    <Button 
                        variant="contained" 
                        onClick={() => {
                            setIsPreviewOpen(false);
                            handleOperationStart();
                        }}
                        startIcon={operationType === 'copy' ? <FileCopy /> : <DriveFileMove />}
                    >
                        Start {operationType === 'copy' ? 'Copy' : 'Move'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );

    const renderProgressMonitor = () => {
        if (!isProcessing || !jobProgress) return null;

        return (
            <Card sx={{ mt: 2 }} variant="outlined">
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                            <Speed sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                {operationType === 'copy' ? 'Copying' : 'Moving'} Files
                            </Typography>
                        </Box>
                        <Button
                            startIcon={<Cancel />}
                            onClick={handleJobCancel}
                            color="secondary"
                            size="small"
                        >
                            Cancel
                        </Button>
                    </Box>

                    <LinearProgress 
                        variant="determinate" 
                        value={jobProgress.progress_percentage} 
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">
                            Progress: {Math.round(jobProgress.progress_percentage)}%
                        </Typography>
                        <Typography variant="body2">
                            {jobProgress.processed_files} / {jobProgress.total_files} files
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Chip 
                            icon={<CheckCircle />} 
                            label={`${jobProgress.successful_operations} Success`} 
                            color="success"
                            size="small"
                        />
                        <Chip 
                            icon={<ErrorIcon />} 
                            label={`${jobProgress.failed_operations} Failed`} 
                            color="error"
                            size="small"
                        />
                    </Box>

                    {jobProgress.status === 'completed' && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            Operation completed! {jobProgress.successful_operations} files processed successfully.
                        </Alert>
                    )}

                    {jobProgress.status === 'failed' && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            Operation failed: {jobProgress.error_message}
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <FolderOpen sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                    <Box>
                        <Typography variant="h5">
                            Smart File Manager
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Copy or move files using extracted metadata templates
                        </Typography>
                    </Box>
                </Box>

                {selectedFileIds && selectedFileIds.length > 0 ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {selectedFileIds.length} file(s) selected for processing
                    </Alert>
                ) : (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        No files selected. Please go to the Files page to select files first, or test with dummy data.
                        <Button 
                            size="small" 
                            sx={{ ml: 1 }}
                            onClick={() => {
                                // Set dummy file IDs for testing
                                // Debug: Test mode activation
                                // Development: Setting test file IDs
                                // This would normally come from the parent component
                                if (window.location.search.includes('test=true')) {
                                    window.location.href = '?selectedFiles=2763,2762,2761';
                                }
                            }}
                        >
                            Test Mode
                        </Button>
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Operation Type Selection */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Operation Type</InputLabel>
                    <Select
                        value={operationType}
                        onChange={(e) => setOperationType(e.target.value)}
                        disabled={isProcessing}
                    >
                        <MenuItem value="copy">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FileCopy sx={{ mr: 1 }} />
                                Copy Files (Keep originals)
                            </Box>
                        </MenuItem>
                        <MenuItem value="move">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DriveFileMove sx={{ mr: 1 }} />
                                Move Files (Remove originals)
                            </Box>
                        </MenuItem>
                    </Select>
                </FormControl>

                {/* Pattern Selection */}
                {selectedFileIds && selectedFileIds.length > 0 && renderPatternSelector()}

                {/* Target Directory */}
                <TextField
                    fullWidth
                    label="Target Directory"
                    value={targetDirectory}
                    onChange={(e) => setTargetDirectory(e.target.value)}
                    disabled={isProcessing}
                    placeholder="/path/to/destination"
                    sx={{ mb: 2 }}
                    helperText="Absolute path to destination directory"
                />

                {/* Filename Template */}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Filename Template"
                        value={filenameTemplate}
                        onChange={(e) => setFilenameTemplate(e.target.value)}
                        disabled={isProcessing}
                        error={!!validationError}
                        helperText={validationError || "Use {field} placeholders for metadata"}
                        InputProps={{
                            endAdornment: (
                                <IconButton onClick={() => setIsTemplateHelpOpen(true)}>
                                    <Help />
                                </IconButton>
                            )
                        }}
                    />
                    
                    {templateValidation && templateValidation.is_valid && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                            <Typography variant="caption" color="success.dark">
                                ✓ Template valid - Preview: {templateValidation.sample_output}
                            </Typography>
                        </Box>
                    )}
                    
                    {/* Debug information */}
                    {process.env.NODE_ENV === 'development' && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                                Debug: validationError={validationError ? 'YES' : 'NO'}, 
                                selectedFiles={selectedFileIds?.length || 0}, 
                                targetDir={targetDirectory ? 'YES' : 'NO'}, 
                                template={filenameTemplate ? 'YES' : 'NO'}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Advanced Options */}
                <FormControlLabel
                    control={
                        <Switch
                            checked={showAdvancedOptions}
                            onChange={(e) => setShowAdvancedOptions(e.target.checked)}
                        />
                    }
                    label="Show Advanced Options"
                    sx={{ mb: 2 }}
                />

                {showAdvancedOptions && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Conflict Resolution</InputLabel>
                            <Select
                                value={conflictResolution}
                                onChange={(e) => setConflictResolution(e.target.value)}
                                disabled={isProcessing}
                            >
                                <MenuItem value="skip">Skip existing files</MenuItem>
                                <MenuItem value="overwrite">Overwrite existing files</MenuItem>
                                <MenuItem value="rename">Auto-rename duplicates</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={createBackup}
                                    onChange={(e) => setCreateBackup(e.target.checked)}
                                    disabled={isProcessing}
                                />
                            }
                            label="Create backup of overwritten files"
                        />
                    </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Preview />}
                        onClick={handlePreviewGeneration}
                        disabled={isProcessing || !selectedFileIds || selectedFileIds.length === 0}
                    >
                        Preview
                    </Button>
                    
                    <Button
                        variant="contained"
                        startIcon={operationType === 'copy' ? <FileCopy /> : <DriveFileMove />}
                        onClick={handleOperationStart}
                        disabled={
                            isProcessing || 
                            !targetDirectory.trim() ||
                            !filenameTemplate.trim() ||
                            !!validationError ||
                            (!selectedFileIds || selectedFileIds.length === 0)
                        }
                    >
                        Start {operationType === 'copy' ? 'Copy' : 'Move'}
                    </Button>
                </Box>

                {/* Progress Monitor */}
                {renderProgressMonitor()}

                {/* Dialogs */}
                {renderTemplateHelp()}
                {renderPreviewDialog()}
            </CardContent>
        </Card>
    );
};

export default SmartFileManager;