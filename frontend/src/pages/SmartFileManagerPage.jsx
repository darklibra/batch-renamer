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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
    FileCopy,
    DriveFileMove,
    Preview,
    ExpandMore,
    Info,
    CheckCircle,
    Error as ErrorIcon,
    Settings,
    Speed,
    Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dataProvider from '../dataProvider';
import SmartFileManager from '../components/SmartFileManager';
import PatternBasedFileSelector from '../components/PatternBasedFileSelector';

const SmartFileManagerPage = () => {
    const navigate = useNavigate();
    
    // File management state
    const [files, setFiles] = useState([]);
    const [selectedFileIds, setSelectedFileIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination and filtering
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [extensionFilter, setExtensionFilter] = useState('');
    const [hasMetadataFilter, setHasMetadataFilter] = useState('all');
    
    // UI state
    const [showFilters, setShowFilters] = useState(false);
    const [showStats, setShowStats] = useState(true);
    const [operationComplete, setOperationComplete] = useState(false);
    
    // Statistics
    const [fileStats, setFileStats] = useState({
        total_files: 0,
        files_with_metadata: 0,
        unique_extensions: [],
        average_file_size: 0
    });

    // Pattern and auto-selection state
    const [availablePatterns, setAvailablePatterns] = useState([]);
    const [patternsLoading, setPatternsLoading] = useState(false);
    const [autoSelectionEnabled, setAutoSelectionEnabled] = useState(false);

    const perPage = 20;

    // Load files with filters
    const loadFiles = async (resetPage = false) => {
        try {
            setLoading(true);
            setError(null);
            
            const currentPage = resetPage ? 1 : page;
            if (resetPage) setPage(1);
            
            const params = {
                page: currentPage,
                per_page: perPage,
                ...(searchQuery && { search: searchQuery }),
                ...(extensionFilter && { extension: extensionFilter }),
                ...(hasMetadataFilter !== 'all' && { 
                    has_extracted_data: hasMetadataFilter === 'with_metadata' 
                })
            };

            const result = await dataProvider.getList('files', {
                pagination: { page: currentPage, perPage },
                sort: { field: 'created_at', order: 'DESC' },
                filter: params
            });

            setFiles(result.data || []);
            setTotalFiles(result.total || 0);
            setTotalPages(Math.ceil((result.total || 0) / perPage));
            
        } catch (error) {
            console.error('Failed to load files:', error);
            setError(`Failed to load files: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Load file statistics
    const loadFileStats = async () => {
        try {
            const stats = await dataProvider.getExtractionStats();
            setFileStats(stats);
        } catch (error) {
            console.error('Failed to load file stats:', error);
        }
    };

    // Load available patterns for auto-selection
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
        } finally {
            setPatternsLoading(false);
        }
    };

    // Auto-selection handlers
    const handleAutoSelectedFiles = (fileIds) => {
        setSelectedFileIds(fileIds);
    };

    const handleAnalysisComplete = (analysisResult) => {
        // Debug: Pattern analysis completed
        console.log('Pattern analysis completed:', analysisResult);
    };

    // Initial load
    useEffect(() => {
        loadFiles();
        loadFileStats();
        loadAvailablePatterns();
        
        // Check for test mode URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const selectedFiles = urlParams.get('selectedFiles');
        if (selectedFiles) {
            const fileIds = selectedFiles.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (fileIds.length > 0) {
                setSelectedFileIds(fileIds);
                // Debug: Test mode file selection
                console.log('Test mode: Selected files from URL:', fileIds);
            }
        }
    }, [page]);

    // Reload when filters change
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            loadFiles(true);
        }, 500);
        
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, extensionFilter, hasMetadataFilter]);

    // File selection handlers
    const handleSelectAll = () => {
        if (selectedFileIds.length === files.length) {
            setSelectedFileIds([]);
        } else {
            setSelectedFileIds(files.map(file => file.id));
        }
    };

    const handleFileSelect = (fileId) => {
        setSelectedFileIds(prev => {
            if (prev.includes(fileId)) {
                return prev.filter(id => id !== fileId);
            } else {
                return [...prev, fileId];
            }
        });
    };

    const handleOperationComplete = (result) => {
        // Debug: Operation completion
        console.log('Smart operation completed:', result);
        setOperationComplete(true);
        setSelectedFileIds([]);
        loadFiles(); // Reload files to reflect changes
        loadFileStats(); // Update statistics
        
        // Reset completion status after 3 seconds
        setTimeout(() => setOperationComplete(false), 3000);
    };

    const renderFileStats = () => (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DashboardIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">
                        File Statistics
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showStats}
                                onChange={(e) => setShowStats(e.target.checked)}
                                size="small"
                            />
                        }
                        label="Show Stats"
                    />
                </Box>

                {showStats && (
                    <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                                <Typography variant="h4" color="primary.contrastText">
                                    {fileStats.total_files || 0}
                                </Typography>
                                <Typography variant="body2" color="primary.contrastText">
                                    Total Files
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                                <Typography variant="h4" color="success.contrastText">
                                    {fileStats.files_with_metadata || 0}
                                </Typography>
                                <Typography variant="body2" color="success.contrastText">
                                    With Metadata
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                                <Typography variant="h4" color="info.contrastText">
                                    {fileStats.unique_extensions?.length || 0}
                                </Typography>
                                <Typography variant="body2" color="info.contrastText">
                                    File Types
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                                <Typography variant="h4" color="warning.contrastText">
                                    {selectedFileIds.length}
                                </Typography>
                                <Typography variant="body2" color="warning.contrastText">
                                    Selected
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                )}
            </CardContent>
        </Card>
    );

    const renderFilters = () => (
        <Accordion expanded={showFilters} onChange={() => setShowFilters(!showFilters)}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FilterList sx={{ mr: 1 }} />
                    <Typography>Advanced Filters</Typography>
                    <Badge 
                        badgeContent={
                            (searchQuery ? 1 : 0) + 
                            (extensionFilter ? 1 : 0) + 
                            (hasMetadataFilter !== 'all' ? 1 : 0)
                        } 
                        color="primary" 
                        sx={{ ml: 2 }}
                    >
                        <Settings />
                    </Badge>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Search Files"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by filename or path..."
                            InputProps={{
                                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>File Extension</InputLabel>
                            <Select
                                value={extensionFilter}
                                onChange={(e) => setExtensionFilter(e.target.value)}
                                label="File Extension"
                            >
                                <MenuItem value="">All Extensions</MenuItem>
                                {fileStats.unique_extensions?.map(ext => (
                                    <MenuItem key={ext} value={ext}>
                                        .{ext} files
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Metadata Status</InputLabel>
                            <Select
                                value={hasMetadataFilter}
                                onChange={(e) => setHasMetadataFilter(e.target.value)}
                                label="Metadata Status"
                            >
                                <MenuItem value="all">All Files</MenuItem>
                                <MenuItem value="with_metadata">With Metadata</MenuItem>
                                <MenuItem value="without_metadata">Without Metadata</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>
    );

    const renderFileTable = () => (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        File Selection ({selectedFileIds.length} selected)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={selectedFileIds.length === files.length ? "Deselect All" : "Select All Visible"}>
                            <IconButton onClick={handleSelectAll} size="small">
                                {selectedFileIds.length === files.length ? <ClearAll /> : <SelectAll />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Refresh Files">
                            <IconButton onClick={() => loadFiles()} size="small">
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {loading && <LinearProgress sx={{ mb: 2 }} />}

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={files.length > 0 && selectedFileIds.length === files.length}
                                        indeterminate={selectedFileIds.length > 0 && selectedFileIds.length < files.length}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                                <TableCell>Filename</TableCell>
                                <TableCell>Path</TableCell>
                                <TableCell>Extension</TableCell>
                                <TableCell>Metadata</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.map((file) => (
                                <TableRow 
                                    key={file.id}
                                    selected={selectedFileIds.includes(file.id)}
                                    hover
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedFileIds.includes(file.id)}
                                            onChange={() => handleFileSelect(file.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <FilePresent sx={{ mr: 1, color: 'action.active' }} />
                                            <Typography variant="body2">
                                                {file.filename}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="textSecondary">
                                            {file.path}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {file.extension && (
                                            <Chip 
                                                label={`.${file.extension}`} 
                                                size="small" 
                                                variant="outlined"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {file.extracted_data ? (
                                            <Chip 
                                                icon={<CheckCircle />}
                                                label="Available" 
                                                color="success" 
                                                size="small"
                                            />
                                        ) : (
                                            <Chip 
                                                icon={<ErrorIcon />}
                                                label="Missing" 
                                                color="default" 
                                                size="small"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="View Details">
                                            <IconButton 
                                                size="small"
                                                onClick={() => navigate(`/files/${file.id}`)}
                                            >
                                                <Preview />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {files.length === 0 && !loading && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <FilePresent sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary">
                            No files found
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Try adjusting your search filters or scan for new files
                        </Typography>
                        <Button 
                            variant="outlined" 
                            sx={{ mt: 2 }}
                            onClick={() => navigate('/scanner')}
                        >
                            Scan Files
                        </Button>
                    </Box>
                )}

                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(event, value) => setPage(value)}
                            color="primary"
                        />
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto', p: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <DriveFileMoveOutlined sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                <Box>
                    <Typography variant="h4">
                        Smart File Manager
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Select files and perform smart copy/move operations using metadata templates
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

            {/* File Statistics */}
            {renderFileStats()}

            {/* Filters */}
            {renderFilters()}

            <Box sx={{ mt: 3 }}>
                <Grid container spacing={3}>
                    {/* File Selection Table */}
                    <Grid item xs={12} lg={7}>
                        {renderFileTable()}
                    </Grid>

                    {/* Smart File Manager */}
                    <Grid item xs={12} lg={5}>
                        {/* Pattern-Based Auto File Selection */}
                        <PatternBasedFileSelector
                            availablePatterns={availablePatterns}
                            onFilesSelected={handleAutoSelectedFiles}
                            onAnalysisComplete={handleAnalysisComplete}
                            disabled={patternsLoading}
                        />
                        
                        <SmartFileManager
                            selectedFileIds={selectedFileIds}
                            onOperationComplete={handleOperationComplete}
                        />

                        {/* Quick Help */}
                        <Card sx={{ mt: 2 }} variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Info sx={{ mr: 1, color: 'info.main' }} />
                                    <Typography variant="h6">
                                        Quick Guide
                                    </Typography>
                                </Box>
                                <Typography variant="body2" paragraph>
                                    1. Select files from the table on the left
                                </Typography>
                                <Typography variant="body2" paragraph>
                                    2. Choose copy or move operation
                                </Typography>
                                <Typography variant="body2" paragraph>
                                    3. Set target directory and filename template
                                </Typography>
                                <Typography variant="body2">
                                    4. Preview and start the operation
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button 
                                        size="small" 
                                        variant="outlined"
                                        onClick={() => navigate('/pattern-manager')}
                                    >
                                        Manage Patterns
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="outlined"
                                        onClick={() => navigate('/scanner')}
                                    >
                                        Scan Files
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default SmartFileManagerPage;