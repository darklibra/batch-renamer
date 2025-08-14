import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, CardActions, Typography, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
    LinearProgress, Alert, List, ListItem, ListItemText, ListItemIcon,
    Chip, Tooltip, FormControl, InputLabel, Select, MenuItem,
    Accordion, AccordionSummary, AccordionDetails, Paper
} from '@mui/material';
import {
    FolderOpen, Search, Refresh, CheckCircle, Error as ErrorIcon,
    Warning, Info, PlayArrow, Stop, Visibility, Settings,
    ExpandMore, Close, InsertDriveFile, Folder
} from '@mui/icons-material';
import { useNotify } from 'react-admin';
import dataProvider from '../dataProvider';

// ===========================================
// DIRECTORY BROWSER COMPONENT
// ===========================================
const DirectoryBrowser = ({ onDirectorySelect, selectedPath }) => {
    const [open, setOpen] = useState(false);
    const [currentPath, setCurrentPath] = useState('/');
    const [directories, setDirectories] = useState([]);
    const [loading, setLoading] = useState(false);
    const notify = useNotify();

    const fetchDirectories = async (path) => {
        setLoading(true);
        try {
            // Mock directory structure - replace with actual API call
            const mockDirs = [
                { name: 'Documents', path: '/Documents', type: 'directory' },
                { name: 'Downloads', path: '/Downloads', type: 'directory' },
                { name: 'Pictures', path: '/Pictures', type: 'directory' },
                { name: 'Music', path: '/Music', type: 'directory' }
            ];
            setDirectories(mockDirs);
        } catch (error) {
            notify(`디렉토리 로딩 실패: ${error.message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchDirectories(currentPath);
        }
    }, [currentPath, open]);

    const handleDirectoryClick = (directory) => {
        if (directory.type === 'directory') {
            setCurrentPath(directory.path);
        }
    };

    const handleSelect = () => {
        onDirectorySelect(currentPath);
        setOpen(false);
    };

    return (
        <>
            <Button
                variant="outlined"
                startIcon={<FolderOpen />}
                onClick={() => setOpen(true)}
                fullWidth
            >
                {selectedPath ? `Selected: ${selectedPath}` : 'Select Directory'}
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Select Directory to Scan
                    <IconButton
                        onClick={() => setOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                
                <DialogContent>
                    <TextField
                        label="Current Path"
                        value={currentPath}
                        onChange={(e) => setCurrentPath(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                    />
                    
                    {loading && <LinearProgress sx={{ mb: 2 }} />}
                    
                    <List>
                        {directories.map((dir) => (
                            <ListItem
                                key={dir.path}
                                button
                                onClick={() => handleDirectoryClick(dir)}
                            >
                                <ListItemIcon>
                                    <Folder />
                                </ListItemIcon>
                                <ListItemText
                                    primary={dir.name}
                                    secondary={dir.path}
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                
                <DialogActions>
                    <Button onClick={handleSelect} variant="contained">
                        Select This Directory
                    </Button>
                    <Button onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// ===========================================
// SCAN PROGRESS COMPONENT
// ===========================================
const ScanProgress = ({ progress, onCancel, scanStats }) => {
    if (!progress) return null;

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Scanning Files...
                </Typography>
                <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={onCancel}
                    startIcon={<Stop />}
                >
                    Cancel
                </Button>
            </Box>
            
            <LinearProgress
                variant="determinate"
                value={progress.percentage}
                sx={{ mb: 2 }}
            />
            
            <Typography variant="body2" color="textSecondary" gutterBottom>
                {progress.current_file && `Scanning: ${progress.current_file}`}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                    label={`Files Scanned: ${scanStats.files_scanned || 0}`}
                    color="primary"
                    size="small"
                />
                <Chip
                    label={`Files Indexed: ${scanStats.files_indexed || 0}`}
                    color="success"
                    size="small"
                />
                <Chip
                    label={`Errors: ${scanStats.errors || 0}`}
                    color={scanStats.errors > 0 ? "error" : "default"}
                    size="small"
                />
                <Chip
                    label={`Progress: ${progress.percentage.toFixed(1)}%`}
                    color="info"
                    size="small"
                />
            </Box>
        </Paper>
    );
};

// ===========================================
// SCAN CONFIGURATION COMPONENT
// ===========================================
const ScanConfiguration = ({ config, onChange }) => {
    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Scan Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>File Types</InputLabel>
                        <Select
                            multiple
                            value={config.file_extensions || []}
                            onChange={(e) => onChange({
                                ...config,
                                file_extensions: e.target.value
                            })}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} size="small" />
                                    ))}
                                </Box>
                            )}
                        >
                            <MenuItem value="txt">Text Files (.txt)</MenuItem>
                            <MenuItem value="pdf">PDF Files (.pdf)</MenuItem>
                            <MenuItem value="doc">Word Documents (.doc)</MenuItem>
                            <MenuItem value="jpg">JPEG Images (.jpg)</MenuItem>
                            <MenuItem value="png">PNG Images (.png)</MenuItem>
                            <MenuItem value="mp4">Video Files (.mp4)</MenuItem>
                            <MenuItem value="mp3">Audio Files (.mp3)</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Max File Size (MB)"
                        type="number"
                        value={config.max_file_size_mb || 100}
                        onChange={(e) => onChange({
                            ...config,
                            max_file_size_mb: parseInt(e.target.value)
                        })}
                        fullWidth
                    />

                    <TextField
                        label="Max Files to Scan"
                        type="number"
                        value={config.max_files || 10000}
                        onChange={(e) => onChange({
                            ...config,
                            max_files: parseInt(e.target.value)
                        })}
                        fullWidth
                    />

                    <FormControl fullWidth>
                        <InputLabel>Recursion Depth</InputLabel>
                        <Select
                            value={config.recursion_depth || 5}
                            onChange={(e) => onChange({
                                ...config,
                                recursion_depth: e.target.value
                            })}
                        >
                            <MenuItem value={1}>Current Directory Only</MenuItem>
                            <MenuItem value={2}>1 Level Deep</MenuItem>
                            <MenuItem value={3}>2 Levels Deep</MenuItem>
                            <MenuItem value={5}>5 Levels Deep</MenuItem>
                            <MenuItem value={-1}>Unlimited (All Subdirectories)</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

// ===========================================
// SCAN RESULTS COMPONENT
// ===========================================
const ScanResults = ({ results, onViewFiles }) => {
    if (!results) return null;

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Scan Results
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Card sx={{ minWidth: 120 }}>
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="h4" color="primary">
                            {results.total_files_found || 0}
                        </Typography>
                        <Typography variant="body2">
                            Files Found
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 120 }}>
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="h4" color="success.main">
                            {results.files_indexed || 0}
                        </Typography>
                        <Typography variant="body2">
                            Successfully Indexed
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 120 }}>
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="h4" color="error">
                            {results.errors || 0}
                        </Typography>
                        <Typography variant="body2">
                            Errors
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 120 }}>
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="h4">
                            {results.processing_time_seconds || 0}s
                        </Typography>
                        <Typography variant="body2">
                            Processing Time
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {results.file_type_summary && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>File Types Summary</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {Object.entries(results.file_type_summary).map(([ext, count]) => (
                                <Chip
                                    key={ext}
                                    label={`${ext}: ${count}`}
                                    variant="outlined"
                                    size="small"
                                />
                            ))}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            )}

            {results.errors > 0 && results.error_details && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>Error Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <List>
                            {results.error_details.slice(0, 10).map((error, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon>
                                        <ErrorIcon color="error" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={error.file_path}
                                        secondary={error.error_message}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </AccordionDetails>
                </Accordion>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                    variant="contained"
                    onClick={onViewFiles}
                    startIcon={<Visibility />}
                >
                    View Indexed Files
                </Button>
            </Box>
        </Paper>
    );
};

// ===========================================
// MAIN FILE SCANNER COMPONENT
// ===========================================
const FileScanner = ({ onScanComplete }) => {
    const [selectedDirectory, setSelectedDirectory] = useState('');
    const [scanConfig, setScanConfig] = useState({
        file_extensions: ['txt', 'pdf', 'doc'],
        max_file_size_mb: 100,
        max_files: 10000,
        recursion_depth: 5
    });
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(null);
    const [scanResults, setScanResults] = useState(null);
    const [scanStats, setScanStats] = useState({
        files_scanned: 0,
        files_indexed: 0,
        errors: 0
    });
    
    const notify = useNotify();

    const startScan = async () => {
        if (!selectedDirectory) {
            notify('스캔할 디렉토리를 선택해주세요.', { type: 'warning' });
            return;
        }

        setIsScanning(true);
        setScanProgress({ percentage: 0, current_file: null });
        setScanResults(null);
        setScanStats({ files_scanned: 0, files_indexed: 0, errors: 0 });

        try {
            const result = await dataProvider.indexFiles(selectedDirectory, scanConfig);
            
            // Simulate progress updates (replace with actual progress tracking)
            const simulateProgress = () => {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 20;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(interval);
                        setIsScanning(false);
                        setScanProgress(null);
                        setScanResults(result);
                        onScanComplete?.(result);
                        notify('파일 스캔이 완료되었습니다.', { type: 'success' });
                    }
                    setScanProgress({
                        percentage: Math.min(progress, 100),
                        current_file: `file_${Math.floor(progress)}.txt`
                    });
                    setScanStats(prev => ({
                        files_scanned: Math.floor(progress * 10),
                        files_indexed: Math.floor(progress * 8),
                        errors: Math.floor(progress * 0.1)
                    }));
                }, 500);
            };

            simulateProgress();
            
        } catch (error) {
            setIsScanning(false);
            setScanProgress(null);
            notify(`스캔 실패: ${error.message}`, { type: 'error' });
        }
    };

    const cancelScan = () => {
        setIsScanning(false);
        setScanProgress(null);
        notify('스캔이 취소되었습니다.', { type: 'info' });
    };

    const handleViewFiles = () => {
        // Navigate to files list view
        window.location.href = '#/files';
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            <Typography variant="h4" gutterBottom>
                File Scanner
            </Typography>

            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Select Directory
                    </Typography>
                    <DirectoryBrowser
                        onDirectorySelect={setSelectedDirectory}
                        selectedPath={selectedDirectory}
                    />
                </CardContent>
            </Card>

            <ScanConfiguration
                config={scanConfig}
                onChange={setScanConfig}
            />

            <Card sx={{ mt: 2 }}>
                <CardActions sx={{ p: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={startScan}
                        disabled={isScanning || !selectedDirectory}
                        startIcon={<Search />}
                    >
                        {isScanning ? 'Scanning...' : 'Start Scan'}
                    </Button>
                    
                    {scanResults && (
                        <Button
                            variant="outlined"
                            onClick={() => setScanResults(null)}
                            startIcon={<Refresh />}
                        >
                            Clear Results
                        </Button>
                    )}
                </CardActions>
            </Card>

            <ScanProgress
                progress={scanProgress}
                onCancel={cancelScan}
                scanStats={scanStats}
            />

            <ScanResults
                results={scanResults}
                onViewFiles={handleViewFiles}
            />
        </Box>
    );
};

export default FileScanner;