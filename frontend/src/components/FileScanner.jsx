import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
// Removed useNotify to avoid Router context issues
import dataProvider from '../dataProvider';
import { notify } from '../utils/notifications';

// ===========================================
// DIRECTORY BROWSER COMPONENT
// ===========================================
const DirectoryBrowser = ({ onDirectorySelect, selectedPath }) => {
    const [open, setOpen] = useState(false);
    const [currentPath, setCurrentPath] = useState('/');
    const [directories, setDirectories] = useState([]);
    const [loading, setLoading] = useState(false);
    // Using imported notification system

    const fetchDirectories = async () => {
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
        <Card sx={{ mb: 3 }}>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Scan Configuration</Typography>
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
                            <MenuItem value="epub">Epub Files (.epub)</MenuItem>
                            <MenuItem value="pdf">PDF Files (.pdf)</MenuItem>
                            <MenuItem value="doc">Word Documents (.doc, .docx)</MenuItem>
                            <MenuItem value="docx">Word Documents (.docx)</MenuItem>
                            <MenuItem value="xls">Excel Files (.xls)</MenuItem>
                            <MenuItem value="xlsx">Excel Files (.xlsx)</MenuItem>
                            <MenuItem value="ppt">PowerPoint (.ppt, .pptx)</MenuItem>
                            <MenuItem value="jpg">JPEG Images (.jpg)</MenuItem>
                            <MenuItem value="jpeg">JPEG Images (.jpeg)</MenuItem>
                            <MenuItem value="png">PNG Images (.png)</MenuItem>
                            <MenuItem value="gif">GIF Images (.gif)</MenuItem>
                            <MenuItem value="bmp">Bitmap Images (.bmp)</MenuItem>
                            <MenuItem value="mp4">MP4 Videos (.mp4)</MenuItem>
                            <MenuItem value="avi">AVI Videos (.avi)</MenuItem>
                            <MenuItem value="mov">QuickTime (.mov)</MenuItem>
                            <MenuItem value="wmv">Windows Media (.wmv)</MenuItem>
                            <MenuItem value="mp3">MP3 Audio (.mp3)</MenuItem>
                            <MenuItem value="wav">WAV Audio (.wav)</MenuItem>
                            <MenuItem value="flac">FLAC Audio (.flac)</MenuItem>
                            <MenuItem value="js">JavaScript (.js)</MenuItem>
                            <MenuItem value="py">Python (.py)</MenuItem>
                            <MenuItem value="java">Java (.java)</MenuItem>
                            <MenuItem value="cpp">C++ (.cpp)</MenuItem>
                            <MenuItem value="html">HTML (.html)</MenuItem>
                            <MenuItem value="css">CSS (.css)</MenuItem>
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
                            <MenuItem value={1}>현재 디렉토리만 (빠름)</MenuItem>
                            <MenuItem value={2}>1단계 하위까지 (빠름)</MenuItem>
                            <MenuItem value={3}>2단계 하위까지 (보통)</MenuItem>
                            <MenuItem value={5}>5단계 하위까지 (권장)</MenuItem>
                            <MenuItem value={10}>10단계 하위까지 (느림)</MenuItem>
                            <MenuItem value={-1}>무제한 (모든 하위 디렉토리, 매우 느림)</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </AccordionDetails>
            </Accordion>
        </Card>
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
                            New Files Indexed
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 120 }}>
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="h4" color="info.main">
                            {results.already_indexed || 0}
                        </Typography>
                        <Typography variant="body2">
                            Already Indexed
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
    const navigate = useNavigate();
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
    const [, setCurrentJobId] = useState(null);
    const [pollingInterval, setPollingInterval] = useState(null);
    
    // Using imported notification system

    // Phase 3: 진행률 계산 로직
    const calculateProgress = (jobData) => {
        if (!jobData) return 0;

        switch (jobData.status) {
            case 'started':
                return 5;
            case 'processing':
                if (jobData.stage === 'discovery') {
                    return Math.min(30, 5 + (jobData.processed_count / Math.max(jobData.processed_count || 1, 100)) * 25);
                } else if (jobData.stage === 'checking_existing') {
                    return 35;
                } else if (jobData.stage === 'indexing') {
                    const indexingProgress = jobData.total_count > 0 ? 
                        (jobData.processed_count / jobData.total_count) * 55 : 0;
                    return 40 + indexingProgress;
                }
                return 10;
            case 'completed':
                return 100;
            case 'error':
                return 0;
            default:
                return 0;
        }
    };

    // Phase 4: UI 상태 메시지 개선
    const getStatusMessage = (jobData) => {
        if (!jobData) return 'Initializing...';

        switch (jobData.stage) {
            case 'initializing':
                return 'Initializing scan...';
            case 'discovery':
                return `Discovering files... (${jobData.processed_count || 0} found)`;
            case 'checking_existing':
                return 'Checking existing files...';
            case 'indexing':
                return `Indexing files... (${jobData.processed_count || 0}/${jobData.total_count || 0})`;
            case 'complete':
                return 'Scan completed!';
            case 'error':
                return 'Scan failed';
            default:
                return 'Processing...';
        }
    };

    // 실시간 상태 폴링 함수
    const pollJobProgress = async (jobId) => {
        try {
            const jobData = await dataProvider.getJobProgress(jobId);
            
            // 진행률 및 상태 업데이트
            const progress = calculateProgress(jobData);
            setScanProgress({
                percentage: progress,
                current_file: getStatusMessage(jobData)
            });

            // 통계 업데이트
            setScanStats({
                files_scanned: jobData.processed_count || 0,
                files_indexed: jobData.newly_indexed || 0,
                errors: 0 // 에러 카운트는 필요시 백엔드에서 추가
            });

            // 완료 상태 확인
            if (jobData.status === 'completed') {
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                }
                setIsScanning(false);
                setScanProgress(null);
                
                // Map backend result_data to frontend expectations
                const mappedResults = {
                    // The backend now provides these fields directly in result_data
                    total_files_found: jobData.result_data?.total_files_found || jobData.result_data?.total_discovered || 0,
                    files_indexed: jobData.result_data?.files_indexed || jobData.result_data?.newly_indexed || 0,
                    already_indexed: jobData.result_data?.already_indexed || 0,
                    processing_time_seconds: jobData.result_data?.processing_time_seconds || 0,
                    file_type_summary: jobData.result_data?.file_type_summary || {},
                    errors: jobData.result_data?.errors || 0,
                    error_details: jobData.result_data?.error_details || []
                };
                
                setScanResults(mappedResults);
                setCurrentJobId(null);
                notify('파일 스캔이 완료되었습니다.', { type: 'success' });
                
                if (onScanComplete) {
                    onScanComplete(mappedResults);
                }
            } else if (jobData.status === 'error') {
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                }
                setIsScanning(false);
                setScanProgress(null);
                setCurrentJobId(null);
                notify(`스캔 실패: ${jobData.error_message || 'Unknown error'}`, { type: 'error' });
            }
        } catch (error) {
            console.error('Progress polling failed:', error);
            // 네트워크 오류는 계속 재시도
        }
    };

    const startScan = async () => {
        if (!selectedDirectory) {
            notify('스캔할 디렉토리를 선택해주세요.', { type: 'warning' });
            return;
        }

        // 이전 폴링 정리
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }

        setIsScanning(true);
        setScanProgress({ percentage: 0, current_file: 'Initializing scan...' });
        setScanResults(null);
        setScanStats({ files_scanned: 0, files_indexed: 0, errors: 0 });

        try {
            // 스캔 시작 요청
            const result = await dataProvider.indexFiles(selectedDirectory, scanConfig);
            const jobId = result.job_id;
            setCurrentJobId(jobId);
            
            // 실시간 폴링 시작
            const interval = setInterval(() => {
                pollJobProgress(jobId);
            }, 1000); // 1초마다 폴링
            
            setPollingInterval(interval);
            
            // 첫 번째 상태 확인
            pollJobProgress(jobId);
            
        } catch (error) {
            setIsScanning(false);
            setScanProgress(null);
            setCurrentJobId(null);
            notify(`스캔 실패: ${error.message}`, { type: 'error' });
        }
    };

    const cancelScan = () => {
        // 폴링 중지
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
        
        setIsScanning(false);
        setScanProgress(null);
        setCurrentJobId(null);
        notify('스캔이 취소되었습니다.', { type: 'info' });
        
        // TODO: 백엔드에 잡 취소 요청도 보낼 수 있음
    };

    // 컴포넌트 언마운트 시 정리
    React.useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    const handleViewFiles = () => {
        // Navigate to files list view using React Router
        navigate('/files');
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Directory Selection
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

            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Scan Controls
                    </Typography>
                    <CardActions sx={{ p: 0, justifyContent: 'flex-start' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={startScan}
                            disabled={isScanning || !selectedDirectory}
                            startIcon={<Search />}
                            sx={{ minWidth: 140, py: 1.5 }}
                        >
                            {isScanning ? 'Scanning...' : 'Start Scan'}
                        </Button>
                        
                        {scanResults && (
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => setScanResults(null)}
                                startIcon={<Refresh />}
                                sx={{ minWidth: 140, py: 1.5, ml: 2 }}
                            >
                                Clear Results
                            </Button>
                        )}
                    </CardActions>
                </CardContent>
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