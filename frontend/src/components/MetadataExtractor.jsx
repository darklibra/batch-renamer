import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import {
    Science,
    PlayArrow,
    CheckCircle,
    Error as ErrorIcon,
    Warning,
    Info,
    Refresh,
    Pattern,
    DataObject
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

const MetadataExtractor = ({ fileId, fileName, onExtractionComplete, onError }) => {
    const [extractionStatus, setExtractionStatus] = useState('idle'); // idle, extracting, completed, failed
    const [extractedData, setExtractedData] = useState(null);
    const [availablePatterns, setAvailablePatterns] = useState([]);
    const [selectedPatterns, setSelectedPatterns] = useState([]);
    const [forceReapply, setForceReapply] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [extractionProgress, setExtractionProgress] = useState(0);
    const [jobId, setJobId] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Load available patterns on component mount
    useEffect(() => {
        fetchAvailablePatterns();
        fetchExistingData();
    }, [fileId]);

    const fetchAvailablePatterns = async () => {
        try {
            const result = await dataProvider.getList('patterns', {
                pagination: { page: 1, perPage: 100 },
                sort: { field: 'priority', order: 'DESC' },
                filter: { is_active: true }
            });
            setAvailablePatterns(result.data || []);
        } catch (error) {
            console.error('Failed to fetch patterns:', error);
        }
    };

    const fetchExistingData = async () => {
        try {
            const result = await dataProvider.getFileExtractedData(fileId, false);
            if (result.extracted_data) {
                setExtractedData(result);
                setExtractionStatus('completed');
            }
        } catch (error) {
            // No existing data or error - that's okay
            console.log('No existing extracted data found');
        }
    };

    const handleExtractMetadata = async () => {
        setExtractionStatus('extracting');
        setLoading(true);
        setError(null);
        setExtractionProgress(0);

        try {
            const options = {
                forceReapply,
                patternIds: selectedPatterns.length > 0 ? selectedPatterns : null
            };

            const result = await dataProvider.extractFileMetadata(fileId, options);
            
            if (result.job_id) {
                setJobId(result.job_id);
                // Start polling for job status
                pollJobStatus(result.job_id);
            } else {
                // Direct result
                setExtractedData(result);
                setExtractionStatus('completed');
                setExtractionProgress(100);
                onExtractionComplete?.(result);
            }
            
        } catch (error) {
            setError(error.message);
            setExtractionStatus('failed');
            onError?.(error);
        } finally {
            setLoading(false);
        }
    };

    const pollJobStatus = async (jobId) => {
        const poll = async () => {
            try {
                const status = await dataProvider.getExtractionJobStatus(jobId);
                
                if (status.progress_data?.progress_percentage) {
                    setExtractionProgress(status.progress_data.progress_percentage);
                }

                if (status.status === 'completed') {
                    setExtractionStatus('completed');
                    setExtractionProgress(100);
                    // Fetch the final extracted data
                    await fetchExistingData();
                    onExtractionComplete?.(status.result_data);
                } else if (status.status === 'failed') {
                    setError(status.result_data?.error || 'Extraction failed');
                    setExtractionStatus('failed');
                    onError?.(new Error(status.result_data?.error || 'Extraction failed'));
                } else if (status.status === 'running') {
                    // Continue polling
                    setTimeout(poll, 2000);
                }
            } catch (error) {
                setError(error.message);
                setExtractionStatus('failed');
                onError?.(error);
            }
        };

        poll();
    };

    const getStatusIcon = () => {
        switch (extractionStatus) {
            case 'extracting':
                return <CircularProgress size={20} />;
            case 'completed':
                return <CheckCircle color="success" />;
            case 'failed':
                return <ErrorIcon color="error" />;
            default:
                return <Science />;
        }
    };

    const getStatusColor = () => {
        switch (extractionStatus) {
            case 'extracting':
                return 'info';
            case 'completed':
                return 'success';
            case 'failed':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Card variant="outlined">
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DataObject sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Metadata Extraction
                    </Typography>
                    <Chip
                        icon={getStatusIcon()}
                        label={extractionStatus === 'idle' ? 'Ready' : extractionStatus}
                        color={getStatusColor()}
                        size="small"
                    />
                </Box>

                {fileName && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Target File: {fileName}
                    </Typography>
                )}

                {/* Pattern Selection */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Patterns (Optional)</InputLabel>
                    <Select
                        multiple
                        value={selectedPatterns}
                        onChange={(e) => setSelectedPatterns(e.target.value)}
                        disabled={extractionStatus === 'extracting'}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => {
                                    const pattern = availablePatterns.find(p => p.id === value);
                                    return (
                                        <Chip 
                                            key={value} 
                                            label={pattern?.name || `Pattern ${value}`} 
                                            size="small" 
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    >
                        {availablePatterns.map((pattern) => (
                            <MenuItem key={pattern.id} value={pattern.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <Pattern sx={{ mr: 1, fontSize: 16 }} />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="body2">{pattern.name}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Priority: {pattern.priority}
                                        </Typography>
                                    </Box>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Force Reapply Option */}
                <Box sx={{ mb: 2 }}>
                    <Button
                        variant={forceReapply ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setForceReapply(!forceReapply)}
                        disabled={extractionStatus === 'extracting'}
                        startIcon={<Refresh />}
                    >
                        Force Re-extraction
                    </Button>
                    {forceReapply && (
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                            This will overwrite existing extracted data
                        </Typography>
                    )}
                </Box>

                {/* Progress Bar */}
                {extractionStatus === 'extracting' && (
                    <Box sx={{ mb: 2 }}>
                        <LinearProgress 
                            variant="determinate" 
                            value={extractionProgress} 
                            sx={{ mb: 1 }}
                        />
                        <Typography variant="caption" color="textSecondary">
                            Progress: {Math.round(extractionProgress)}%
                        </Typography>
                    </Box>
                )}

                {/* Error Display */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Success Display */}
                {extractionStatus === 'completed' && extractedData && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">
                                Metadata extracted successfully!
                            </Typography>
                            <Button
                                size="small"
                                onClick={() => setShowDetails(true)}
                                startIcon={<Info />}
                            >
                                View Details
                            </Button>
                        </Box>
                    </Alert>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleExtractMetadata}
                        disabled={extractionStatus === 'extracting' || loading}
                        startIcon={<PlayArrow />}
                    >
                        {extractionStatus === 'extracting' ? 'Extracting...' : 'Extract Metadata'}
                    </Button>
                    
                    {extractedData && (
                        <Button
                            variant="outlined"
                            onClick={() => setShowDetails(true)}
                            startIcon={<Info />}
                        >
                            View Results
                        </Button>
                    )}
                </Box>

                {/* Results Details Dialog */}
                <Dialog 
                    open={showDetails} 
                    onClose={() => setShowDetails(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Extraction Results</DialogTitle>
                    <DialogContent>
                        {extractedData && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    File: {fileName}
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                
                                {extractedData.extracted_data && Object.keys(extractedData.extracted_data).length > 0 ? (
                                    <List>
                                        {Object.entries(extractedData.extracted_data).map(([key, value]) => (
                                            <ListItem key={key}>
                                                <ListItemIcon>
                                                    <DataObject fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={key}
                                                    secondary={String(value)}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" color="textSecondary">
                                        No metadata was extracted. The file may not match any active patterns.
                                    </Typography>
                                )}
                                
                                {extractedData.pattern_name && (
                                    <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                                        <Typography variant="caption" color="textSecondary">
                                            Applied Pattern: {extractedData.pattern_name}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowDetails(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default MetadataExtractor;