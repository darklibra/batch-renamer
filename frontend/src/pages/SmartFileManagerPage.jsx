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
    Alert,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    IconButton,
    Tooltip,
    Pagination,
    LinearProgress,
    FormControlLabel,
    Switch,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Badge,
    Divider
} from '@mui/material';
import {
    Search,
    FilterList,
    SelectAll,
    ClearAll,
    Refresh,
    DriveFileMoveOutlined,
    FilePresent,
    Preview,
    ExpandMore,
    Info,
    CheckCircle,
    Error as ErrorIcon,
    Settings,
    Dashboard as DashboardIcon,
    ArrowBack,
    Pattern
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dataProvider from '../dataProvider';
import SmartFileManager from '../components/SmartFileManager';

const SmartFileManagerPage = () => {
    const navigate = useNavigate();
    
    // Pattern-only mode state
    const [selectedFileIds, setSelectedFileIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [operationComplete, setOperationComplete] = useState(false);

    // Pattern-only mode state (File Selection removed)
    const [selectedPatternInfo, setSelectedPatternInfo] = useState(null);
    const [isPatternMode, setIsPatternMode] = useState(false);


    // Initialize Pattern-only mode from URL parameters
    const initializePatternMode = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const patternId = urlParams.get('pattern');
        const autoMode = urlParams.get('auto') === 'true';
        const patternName = urlParams.get('name');
        
        if (patternId && autoMode) {
            setIsPatternMode(true);
            setSelectedPatternInfo({
                id: patternId,
                name: patternName,
                fileCount: 0 // Will be updated when files are loaded
            });
            loadFilesByPattern(patternId, patternName);
            return true;
        }
        
        // If no pattern specified, redirect to pattern list
        navigate('/patterns');
        return false;
    };

    // Load files by pattern for pattern-only mode
    const loadFilesByPattern = async (patternId, patternName) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`http://localhost:8000/api/v1/files/by-pattern/${patternId}?per_page=1000`);
            if (!response.ok) {
                throw new Error(`Failed to load files for pattern: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.files && data.files.length > 0) {
                // Auto-select all files from this pattern
                const fileIds = data.files.map(file => file.id);
                setSelectedFileIds(fileIds);
                
                // Update pattern info with file count
                setSelectedPatternInfo(prev => ({
                    ...prev,
                    fileCount: data.total
                }));
                
                console.log(`Loaded ${fileIds.length} files for pattern "${patternName || patternId}"`);
                setError(null);
            } else {
                setError(`No files found using pattern "${patternName || patternId}"`);
                setSelectedFileIds([]);
            }
            
        } catch (error) {
            console.error('Failed to load files by pattern:', error);
            setError(`Failed to load files for pattern: ${error.message}`);
            setSelectedFileIds([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial load - Pattern-only mode
    useEffect(() => {
        // Initialize pattern mode or redirect if no pattern
        initializePatternMode();
    }, []);

    // Pattern mode handlers
    const handleBackToPatterns = () => {
        navigate('/patterns');
    };

    const handleBackToPatternDetails = () => {
        if (selectedPatternInfo?.id) {
            navigate(`/patterns/${selectedPatternInfo.id}`);
        } else {
            navigate('/patterns');
        }
    };

    const handleOperationComplete = (result) => {
        console.log('Smart operation completed:', result);
        setOperationComplete(true);
        
        // In pattern mode, operation completion means the task is done
        // User can navigate back or start a new operation
        setTimeout(() => setOperationComplete(false), 3000);
    };


    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto', p: 2 }}>
            {/* Header with Breadcrumb - Pattern-only Mode */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                {/* Breadcrumb Navigation */}
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                    <Button
                        variant="text"
                        startIcon={<ArrowBack />}
                        onClick={handleBackToPatternDetails}
                        sx={{ 
                            color: 'text.secondary',
                            textTransform: 'none',
                            fontSize: '0.875rem'
                        }}
                    >
                        Pattern Details
                    </Button>
                    <Typography variant="body2" sx={{ mx: 1, color: 'text.secondary' }}>
                        /
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                        File Operations
                    </Typography>
                </Box>
                
                <DriveFileMoveOutlined sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                <Box>
                    <Typography variant="h4">
                        Pattern-Based File Operations
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        {selectedPatternInfo 
                            ? `Organize files using "${selectedPatternInfo.name}" pattern`
                            : 'Pattern-based file organization and management'
                        }
                    </Typography>
                </Box>
            </Box>

            {/* Success Message */}
            {operationComplete && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle sx={{ mr: 1 }} />
                        Smart file operation completed successfully!
                    </Box>
                </Alert>
            )}

            {/* Error Message */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Pattern Information */}
            {selectedPatternInfo && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Pattern sx={{ mr: 1 }} />
                            <Typography variant="body2">
                                Using pattern "<strong>{selectedPatternInfo.name || `Pattern ${selectedPatternInfo.id}`}</strong>" 
                                with <strong>{selectedPatternInfo.fileCount || selectedFileIds.length}</strong> files. 
                                Configure the file operation below to proceed.
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handleBackToPatterns}
                            sx={{ ml: 2 }}
                        >
                            Back to Patterns
                        </Button>
                    </Box>
                </Alert>
            )}

            {/* Pattern-Only File Operations */}
            <Box sx={{ mt: 3 }}>
                <Grid container spacing={3}>
                    {/* Smart File Manager - Full Width */}
                    <Grid item xs={12}>
                        <SmartFileManager
                            selectedFileIds={selectedFileIds}
                            onOperationComplete={handleOperationComplete}
                        />
                    </Grid>
                    
                    {/* Pattern Information Card */}
                    <Grid item xs={12}>
                        {selectedPatternInfo && (
                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Pattern sx={{ mr: 1, color: 'primary.main' }} />
                                        <Typography variant="h6">
                                            Pattern Information
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" paragraph>
                                        <strong>Pattern Name:</strong> {selectedPatternInfo.name}
                                    </Typography>
                                    <Typography variant="body2" paragraph>
                                        <strong>Target Files:</strong> {selectedPatternInfo.fileCount || selectedFileIds.length} files
                                    </Typography>
                                    <Typography variant="body2" paragraph>
                                        All files using this pattern are automatically included in the operation. 
                                        Configure your target directory and filename template above to proceed.
                                    </Typography>
                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button 
                                            size="small" 
                                            variant="outlined"
                                            onClick={handleBackToPatternDetails}
                                        >
                                            View Pattern Details
                                        </Button>
                                        <Button 
                                            size="small" 
                                            variant="outlined"
                                            onClick={handleBackToPatterns}
                                        >
                                            Back to Pattern List
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default SmartFileManagerPage;