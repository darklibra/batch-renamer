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
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Alert,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    IconButton,
    Tooltip,
    Switch,
    FormControlLabel,
    Collapse,
    Paper,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    FolderOpen,
    FileCopy,
    DriveFileMove,
    Preview,
    CheckCircle,
    Error as ErrorIcon,
    Cancel,
    ExpandMore,
    ExpandLess,
    Settings,
    Help,
    PlayArrow,
    NavigateNext,
    NavigateBefore
} from '@mui/icons-material';
import dataProvider from '../dataProvider';
import { useDialogAccessibility, useScreenReaderAnnouncement, useKeyboardNavigation } from '../hooks/useAccessibility';

/**
 * Smart File Manager Wizard - Step-by-step interface for file operations
 * Replaces the complex single-page interface with a guided workflow
 */
const SmartFileManagerWizard = ({ 
    selectedFileIds = [], 
    onOperationComplete,
    onClose 
}) => {

    // Wizard state
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState({});
    
    // Operation configuration
    const [config, setConfig] = useState({
        operationType: 'copy',
        targetDirectory: '',
        filenameTemplate: '{name}_{start}_{end}.{extension}',
        selectedPatternId: null,
        conflictResolution: 'skip',
        createBackup: false,
        validateTemplate: true
    });
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [validationResults, setValidationResults] = useState(null);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    
    // Data
    const [availablePatterns, setAvailablePatterns] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [operationJob, setOperationJob] = useState(null);
    
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
            template: '{name}.{extension}',
            description: 'Original filename only',
            example: '소설제목.txt'
        },
        {
            template: '{start:03d}_{name}.{extension}',
            description: 'Zero-padded start number prefix',
            example: '001_소설제목.txt'
        }
    ];

    // Wizard steps configuration
    const wizardSteps = [
        {
            label: 'Select Operation Type',
            description: 'Choose between copy or move operation',
            optional: false
        },
        {
            label: 'Configure Template',
            description: 'Set filename template and pattern selection',
            optional: false
        },
        {
            label: 'Set Destination',
            description: 'Choose target directory and options',
            optional: false
        },
        {
            label: 'Preview & Confirm',
            description: 'Review operation details before execution',
            optional: false
        }
    ];

    // Accessibility hooks
    const dialogRef = useDialogAccessibility(true);
    const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();
    const { currentIndex, handleKeyDown } = useKeyboardNavigation(
        wizardSteps,
        {
            orientation: 'vertical',
            loop: false,
            onSelect: (index) => setActiveStep(index),
            onEscape: onClose
        }
    );

    // Load initial data
    useEffect(() => {
        loadSelectedFiles();
        loadAvailablePatterns();
    }, [selectedFileIds]);

    const loadSelectedFiles = async () => {
        if (!selectedFileIds?.length) return;
        
        try {
            setLoading(true);
            const files = await Promise.all(
                selectedFileIds.map(id => dataProvider.getFile(id))
            );
            setSelectedFiles(files);
        } catch (err) {
            setError('Failed to load selected files');
            console.error('Error loading files:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailablePatterns = async () => {
        try {
            const patterns = await dataProvider.getPatterns();
            setAvailablePatterns(patterns || []);
        } catch (err) {
            console.error('Error loading patterns:', err);
            // Non-critical error, continue without patterns
        }
    };

    // Step navigation
    const handleNext = () => {
        const newCompleted = { ...completed };
        newCompleted[activeStep] = true;
        setCompleted(newCompleted);
        
        if (activeStep === wizardSteps.length - 1) {
            // Final step - execute operation
            handleExecuteOperation();
        } else {
            setActiveStep(activeStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(activeStep - 1);
    };

    const handleStepClick = (step) => {
        setActiveStep(step);
    };

    // Configuration handlers
    const updateConfig = (updates) => {
        setConfig(prev => ({ ...prev, ...updates }));
        setValidationResults(null); // Clear validation when config changes
    };

    // Template validation
    const validateTemplate = async () => {
        if (!config.filenameTemplate) return;
        
        try {
            setLoading(true);
            const result = await dataProvider.validateSmartFileTemplate({
                template: config.filenameTemplate,
                pattern_id: config.selectedPatternId,
                file_ids: selectedFileIds.slice(0, 3) // Validate with sample
            });
            
            setValidationResults(result);
            return result.valid;
        } catch (err) {
            setError('Template validation failed');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Preview generation
    const generatePreview = async () => {
        try {
            setLoading(true);
            const preview = await dataProvider.previewSmartFileTemplate({
                template: config.filenameTemplate,
                pattern_id: config.selectedPatternId,
                file_ids: selectedFileIds.slice(0, 10) // Preview first 10
            });
            
            setPreviewData(preview);
        } catch (err) {
            setError('Failed to generate preview');
        } finally {
            setLoading(false);
        }
    };

    // Operation execution
    const handleExecuteOperation = async () => {
        try {
            setLoading(true);
            
            const operationData = {
                operation_type: config.operationType,
                file_ids: selectedFileIds,
                destination_directory: config.targetDirectory,
                filename_template: config.filenameTemplate,
                pattern_id: config.selectedPatternId,
                conflict_resolution: config.conflictResolution,
                create_backup: config.createBackup
            };
            
            const job = await dataProvider.startSmartFileOperation(operationData);
            setOperationJob(job);
            
            // Monitor job progress
            monitorJob(job.id);
            
        } catch (err) {
            setError('Failed to start operation');
        } finally {
            setLoading(false);
        }
    };

    const monitorJob = async (jobId) => {
        const checkJob = async () => {
            try {
                const job = await dataProvider.getSmartFileOperationStatus(jobId);
                setOperationJob(job);
                
                if (job.status === 'completed') {
                    onOperationComplete?.(job);
                } else if (job.status === 'failed') {
                    setError(job.error_message || 'Operation failed');
                } else if (['running', 'pending'].includes(job.status)) {
                    setTimeout(checkJob, 2000); // Check again in 2 seconds
                }
            } catch (err) {
                setError('Failed to check job status');
            }
        };
        
        checkJob();
    };

    // Step content renderers
    const renderStepContent = (stepIndex) => {
        switch (stepIndex) {
            case 0:
                return renderOperationTypeStep();
            case 1:
                return renderTemplateConfigStep();
            case 2:
                return renderDestinationStep();
            case 3:
                return renderPreviewStep();
            default:
                return null;
        }
    };

    const renderOperationTypeStep = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Select Operation Type
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
                Choose whether to copy or move the selected files to a new location.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Card 
                    sx={{ 
                        flex: 1, 
                        cursor: 'pointer',
                        border: config.operationType === 'copy' ? 2 : 1,
                        borderColor: config.operationType === 'copy' ? 'primary.main' : 'divider'
                    }}
                    onClick={() => updateConfig({ operationType: 'copy' })}
                >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <FileCopy 
                            sx={{ 
                                fontSize: '3rem', 
                                color: config.operationType === 'copy' ? 'primary.main' : 'text.secondary',
                                mb: 2
                            }} 
                        />
                        <Typography variant="h6">Copy Files</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Create copies of files in the target location. Original files remain untouched.
                        </Typography>
                    </CardContent>
                </Card>
                
                <Card 
                    sx={{ 
                        flex: 1, 
                        cursor: 'pointer',
                        border: config.operationType === 'move' ? 2 : 1,
                        borderColor: config.operationType === 'move' ? 'primary.main' : 'divider'
                    }}
                    onClick={() => updateConfig({ operationType: 'move' })}
                >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <DriveFileMove 
                            sx={{ 
                                fontSize: '3rem', 
                                color: config.operationType === 'move' ? 'primary.main' : 'text.secondary',
                                mb: 2
                            }} 
                        />
                        <Typography variant="h6">Move Files</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Move files to the target location. Original files will be moved from their current location.
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
            
            <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="textSecondary">
                    Selected {selectedFiles.length} file(s) for {config.operationType} operation
                </Typography>
            </Box>
        </Box>
    );

    const renderTemplateConfigStep = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Configure Filename Template
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
                Set how the new filenames should be generated using metadata from the files.
            </Typography>
            
            {/* Pattern Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Pattern (Optional)</InputLabel>
                <Select
                    value={config.selectedPatternId || ''}
                    label="Pattern (Optional)"
                    onChange={(e) => updateConfig({ selectedPatternId: e.target.value || null })}
                >
                    <MenuItem value="">
                        <em>No specific pattern (use existing metadata)</em>
                    </MenuItem>
                    {availablePatterns.map(pattern => (
                        <MenuItem key={pattern.id} value={pattern.id}>
                            {pattern.name} - {pattern.regex_pattern}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            
            {/* Template Input */}
            <TextField
                fullWidth
                label="Filename Template"
                value={config.filenameTemplate}
                onChange={(e) => updateConfig({ filenameTemplate: e.target.value })}
                placeholder="{name}_{start}_{end}.{extension}"
                sx={{ mb: 2 }}
                InputProps={{
                    endAdornment: (
                        <Tooltip title="Template Help">
                            <IconButton size="small" onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}>
                                <Help />
                            </IconButton>
                        </Tooltip>
                    )
                }}
            />
            
            {/* Template Examples */}
            <Collapse in={showAdvancedOptions}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Template Examples:
                    </Typography>
                    <List dense>
                        {templateExamples.map((example, index) => (
                            <ListItem 
                                key={index}
                                button
                                onClick={() => updateConfig({ filenameTemplate: example.template })}
                            >
                                <ListItemText
                                    primary={example.template}
                                    secondary={`${example.description} → ${example.example}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Collapse>
            
            {/* Validation */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                    variant="outlined"
                    onClick={validateTemplate}
                    disabled={loading || !config.filenameTemplate}
                    startIcon={loading ? <LinearProgress /> : <CheckCircle />}
                >
                    Validate Template
                </Button>
                
                {validationResults && (
                    <Chip
                        label={validationResults.valid ? "Valid" : "Invalid"}
                        color={validationResults.valid ? "success" : "error"}
                        size="small"
                    />
                )}
            </Box>
            
            {validationResults && !validationResults.valid && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {validationResults.error}
                </Alert>
            )}
        </Box>
    );

    const renderDestinationStep = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Set Destination & Options
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
                Choose where to save the processed files and configure advanced options.
            </Typography>
            
            {/* Target Directory */}
            <TextField
                fullWidth
                label="Target Directory"
                value={config.targetDirectory}
                onChange={(e) => updateConfig({ targetDirectory: e.target.value })}
                placeholder="/path/to/destination"
                sx={{ mb: 3 }}
                InputProps={{
                    endAdornment: (
                        <Tooltip title="Browse Directory">
                            <IconButton size="small">
                                <FolderOpen />
                            </IconButton>
                        </Tooltip>
                    )
                }}
            />
            
            {/* Conflict Resolution */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Conflict Resolution</InputLabel>
                <Select
                    value={config.conflictResolution}
                    label="Conflict Resolution"
                    onChange={(e) => updateConfig({ conflictResolution: e.target.value })}
                >
                    <MenuItem value="skip">Skip existing files</MenuItem>
                    <MenuItem value="overwrite">Overwrite existing files</MenuItem>
                    <MenuItem value="rename">Auto-rename duplicates</MenuItem>
                </Select>
            </FormControl>
            
            {/* Advanced Options */}
            <FormControlLabel
                control={
                    <Switch
                        checked={config.createBackup}
                        onChange={(e) => updateConfig({ createBackup: e.target.checked })}
                    />
                }
                label="Create backup before operation"
                sx={{ mb: 2 }}
            />
        </Box>
    );

    const renderPreviewStep = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Preview & Confirm Operation
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
                Review the operation details and preview the results before execution.
            </Typography>
            
            {/* Operation Summary */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Operation Summary:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip label={`${config.operationType.toUpperCase()} ${selectedFiles.length} files`} />
                    <Chip label={`Template: ${config.filenameTemplate}`} />
                    <Chip label={`Target: ${config.targetDirectory}`} />
                    {config.selectedPatternId && <Chip label="Using pattern" color="primary" />}
                    {config.createBackup && <Chip label="Backup enabled" color="secondary" />}
                </Box>
            </Paper>
            
            {/* Generate Preview Button */}
            {!previewData && (
                <Button
                    variant="outlined"
                    onClick={generatePreview}
                    disabled={loading}
                    startIcon={<Preview />}
                    sx={{ mb: 2 }}
                >
                    Generate Preview
                </Button>
            )}
            
            {/* Preview Results */}
            {previewData && (
                <Paper sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto' }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Preview (first 10 files):
                    </Typography>
                    <List dense>
                        {previewData.previews?.slice(0, 10).map((preview, index) => (
                            <ListItem key={index}>
                                <ListItemText
                                    primary={preview.new_filename}
                                    secondary={`From: ${preview.original_filename}`}
                                />
                                {preview.status === 'success' ? (
                                    <CheckCircle color="success" />
                                ) : (
                                    <ErrorIcon color="error" />
                                )}
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}
            
            {/* Operation in Progress */}
            {operationJob && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Operation Status: {operationJob.status}
                    </Typography>
                    {operationJob.progress && (
                        <LinearProgress 
                            variant="determinate" 
                            value={operationJob.progress.percentage || 0}
                            sx={{ mb: 2 }}
                        />
                    )}
                    <Typography variant="body2" color="textSecondary">
                        {operationJob.progress?.current_item || 'Processing...'}
                    </Typography>
                </Paper>
            )}
        </Box>
    );

    // Step change announcements
    useEffect(() => {
        if (activeStep >= 0 && activeStep < wizardSteps.length) {
            announce(`Step ${activeStep + 1}: ${wizardSteps[activeStep].label}`);
        }
    }, [activeStep, announce]);

    // Main render
    return (
        <>
            <AnnouncementRegion />
            <Dialog 
                ref={dialogRef}
                open={true} 
                onClose={onClose}
                maxWidth="md"
                fullWidth
                onKeyDown={handleKeyDown}
                aria-labelledby="wizard-title"
                aria-describedby="wizard-description"
                PaperProps={{
                    sx: { minHeight: '70vh' },
                    role: 'dialog',
                    'aria-modal': true
                }}
            >
                <DialogTitle id="wizard-title">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Settings aria-hidden="true" />
                        Smart File Manager
                    </Box>
                </DialogTitle>
                
                <DialogContent id="wizard-description">
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Step-by-step guide to configure and execute file operations. 
                        Use arrow keys to navigate between steps, Enter to select, and Escape to close.
                    </Typography>

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 2 }} 
                            onClose={() => setError(null)}
                            role="alert"
                            aria-live="assertive"
                        >
                            {error}
                        </Alert>
                    )}
                    
                    <Stepper 
                        activeStep={activeStep} 
                        orientation="vertical"
                        role="navigation"
                        aria-label="Wizard steps"
                    >
                        {wizardSteps.map((step, index) => (
                            <Step key={step.label}>
                                <StepLabel 
                                    onClick={() => handleStepClick(index)}
                                    sx={{ cursor: 'pointer' }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`Go to step ${index + 1}: ${step.label}`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleStepClick(index);
                                        }
                                    }}
                                >
                                    {step.label}
                                </StepLabel>
                                <StepContent>
                                    <div role="tabpanel" aria-labelledby={`step-${index}`}>
                                        {renderStepContent(index)}
                                        
                                        <Box sx={{ mb: 2, mt: 3 }} role="group" aria-label="Step navigation">
                                            <Button
                                                variant="contained"
                                                onClick={handleNext}
                                                disabled={loading}
                                                sx={{ mr: 1 }}
                                                startIcon={index === wizardSteps.length - 1 ? <PlayArrow /> : <NavigateNext />}
                                                aria-label={index === wizardSteps.length - 1 ? 
                                                    'Execute the file operation' : 
                                                    `Go to next step: ${wizardSteps[index + 1]?.label || 'Next'}`
                                                }
                                            >
                                                {index === wizardSteps.length - 1 ? 'Execute Operation' : 'Next'}
                                            </Button>
                                            {index > 0 && (
                                                <Button
                                                    onClick={handleBack}
                                                    disabled={loading}
                                                    startIcon={<NavigateBefore />}
                                                    aria-label={`Go to previous step: ${wizardSteps[index - 1]?.label || 'Previous'}`}
                                                >
                                                    Back
                                                </Button>
                                            )}
                                        </Box>
                                    </div>
                                </StepContent>
                            </Step>
                        ))}
                    </Stepper>
                </DialogContent>
                
                <DialogActions>
                    <Button 
                        onClick={onClose} 
                        disabled={loading}
                        aria-label={operationJob?.status === 'completed' ? 'Close wizard' : 'Cancel operation'}
                    >
                        {operationJob?.status === 'completed' ? 'Close' : 'Cancel'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SmartFileManagerWizard;