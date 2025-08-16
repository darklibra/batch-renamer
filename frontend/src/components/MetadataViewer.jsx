import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Tooltip
} from '@mui/material';
import {
    DataObject,
    History,
    Code,
    Edit,
    Save,
    Cancel,
    ExpandMore,
    CheckCircle,
    Error as ErrorIcon,
    Warning,
    Info,
    Refresh,
    Pattern,
    CalendarToday,
    Speed
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

const MetadataViewer = ({ fileId, fileName, extractedData, onDataUpdate }) => {
    const [activeTab, setActiveTab] = useState(0); // 0: current, 1: history, 2: raw
    const [history, setHistory] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [editedData, setEditedData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showRawDialog, setShowRawDialog] = useState(false);

    useEffect(() => {
        if (extractedData?.extracted_data) {
            setEditedData(extractedData.extracted_data);
        }
    }, [extractedData]);

    useEffect(() => {
        if (activeTab === 1) {
            fetchExtractionHistory();
        }
    }, [activeTab, fileId]);

    const fetchExtractionHistory = async () => {
        try {
            setLoading(true);
            const result = await dataProvider.getFileExtractedData(fileId, true);
            setHistory(result.history || []);
        } catch (error) {
            console.error('Failed to fetch extraction history:', error);
            setError('Failed to load extraction history');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleEditSave = async () => {
        try {
            setLoading(true);
            // Note: This would require a backend endpoint to update extracted data
            // For now, we'll just update the local state
            const updatedData = { ...extractedData, extracted_data: editedData };
            onDataUpdate?.(updatedData);
            setEditMode(false);
        } catch (error) {
            setError('Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    const handleEditCancel = () => {
        setEditedData(extractedData?.extracted_data || {});
        setEditMode(false);
    };

    const handleFieldChange = (key, value) => {
        setEditedData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const getDataTypeIcon = (value) => {
        const type = typeof value;
        switch (type) {
            case 'string':
                return <Typography variant="caption" sx={{ color: 'blue' }}>S</Typography>;
            case 'number':
                return <Typography variant="caption" sx={{ color: 'green' }}>N</Typography>;
            case 'boolean':
                return <Typography variant="caption" sx={{ color: 'orange' }}>B</Typography>;
            default:
                return <Typography variant="caption" sx={{ color: 'grey' }}>O</Typography>;
        }
    };

    const formatValue = (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const renderCurrentDataTab = () => {
        if (!extractedData?.extracted_data || Object.keys(extractedData.extracted_data).length === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <DataObject sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                        No Metadata Available
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Extract metadata from this file to view structured data
                    </Typography>
                </Box>
            );
        }

        return (
            <Box>
                {/* Metadata Info */}
                {extractedData.pattern_name && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Pattern fontSize="small" />
                            <Typography variant="body2">
                                Extracted using pattern: <strong>{extractedData.pattern_name}</strong>
                            </Typography>
                            {extractedData.extraction_score && (
                                <Chip 
                                    label={`Score: ${extractedData.extraction_score}/5`}
                                    size="small"
                                    color={extractedData.extraction_score >= 4 ? 'success' : extractedData.extraction_score >= 3 ? 'warning' : 'error'}
                                />
                            )}
                        </Box>
                    </Alert>
                )}

                {/* Edit Controls */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Extracted Fields</Typography>
                    <Box>
                        {!editMode ? (
                            <Button
                                startIcon={<Edit />}
                                onClick={() => setEditMode(true)}
                                size="small"
                            >
                                Edit
                            </Button>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    startIcon={<Save />}
                                    onClick={handleEditSave}
                                    disabled={loading}
                                    color="primary"
                                    size="small"
                                >
                                    Save
                                </Button>
                                <Button
                                    startIcon={<Cancel />}
                                    onClick={handleEditCancel}
                                    color="secondary"
                                    size="small"
                                >
                                    Cancel
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Data Table */}
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Field</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Value</TableCell>
                                {editMode && <TableCell width={100}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(editMode ? editedData : extractedData.extracted_data).map(([key, value]) => (
                                <TableRow key={key}>
                                    <TableCell>
                                        <Typography variant="subtitle2">{key}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={typeof value}>
                                            {getDataTypeIcon(value)}
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        {editMode ? (
                                            <TextField
                                                value={formatValue(value)}
                                                onChange={(e) => handleFieldChange(key, e.target.value)}
                                                size="small"
                                                fullWidth
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {formatValue(value)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    {editMode && (
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    const newData = { ...editedData };
                                                    delete newData[key];
                                                    setEditedData(newData);
                                                }}
                                                color="error"
                                            >
                                                <Cancel fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Metadata Stats */}
                {extractedData.created_at && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                            <CalendarToday sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            Extracted: {new Date(extractedData.created_at).toLocaleString()}
                        </Typography>
                        {extractedData.processing_time_ms && (
                            <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
                                <Speed sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                Processing Time: {extractedData.processing_time_ms}ms
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        );
    };

    const renderHistoryTab = () => {
        if (loading) {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography>Loading history...</Typography>
                </Box>
            );
        }

        if (!history || history.length === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <History sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                        No History Available
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Extraction history will appear here after multiple extractions
                    </Typography>
                </Box>
            );
        }

        return (
            <Box>
                {history.map((entry, index) => (
                    <Accordion key={index} defaultExpanded={index === 0}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {entry.is_current ? <CheckCircle color="success" /> : <History />}
                                    <Typography variant="subtitle2">
                                        {entry.pattern_name || 'Unknown Pattern'}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="textSecondary">
                                    {new Date(entry.created_at).toLocaleString()}
                                </Typography>
                                {entry.extraction_score && (
                                    <Chip 
                                        label={`${entry.extraction_score}/5`}
                                        size="small"
                                        color={entry.extraction_score >= 4 ? 'success' : 'warning'}
                                    />
                                )}
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List dense>
                                {Object.entries(entry.extracted_data || {}).map(([key, value]) => (
                                    <ListItem key={key}>
                                        <ListItemIcon>
                                            {getDataTypeIcon(value)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={key}
                                            secondary={formatValue(value)}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        );
    };

    const renderRawTab = () => {
        const rawData = {
            file_id: fileId,
            file_name: fileName,
            current_data: extractedData,
            history: history
        };

        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Raw JSON Data</Typography>
                    <Button
                        startIcon={<Code />}
                        onClick={() => setShowRawDialog(true)}
                        size="small"
                    >
                        Full Screen View
                    </Button>
                </Box>
                <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                    <pre style={{ 
                        margin: 0, 
                        fontSize: '0.8rem', 
                        overflow: 'auto',
                        maxHeight: '400px',
                        fontFamily: 'monospace'
                    }}>
                        {JSON.stringify(rawData, null, 2)}
                    </pre>
                </Paper>
            </Box>
        );
    };

    return (
        <Card variant="outlined">
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DataObject sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Metadata Viewer
                    </Typography>
                    <IconButton 
                        size="small" 
                        onClick={() => window.location.reload()}
                        title="Refresh"
                    >
                        <Refresh />
                    </IconButton>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={activeTab} onChange={handleTabChange}>
                        <Tab label="Current Data" icon={<DataObject />} />
                        <Tab label="History" icon={<History />} />
                        <Tab label="Raw JSON" icon={<Code />} />
                    </Tabs>
                </Box>

                {activeTab === 0 && renderCurrentDataTab()}
                {activeTab === 1 && renderHistoryTab()}
                {activeTab === 2 && renderRawTab()}

                {/* Raw Data Dialog */}
                <Dialog 
                    open={showRawDialog} 
                    onClose={() => setShowRawDialog(false)}
                    maxWidth="lg"
                    fullWidth
                >
                    <DialogTitle>Raw JSON Data</DialogTitle>
                    <DialogContent>
                        <pre style={{ 
                            margin: 0, 
                            fontSize: '0.9rem', 
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            backgroundColor: '#f5f5f5',
                            padding: '16px',
                            borderRadius: '4px'
                        }}>
                            {JSON.stringify({
                                file_id: fileId,
                                file_name: fileName,
                                current_data: extractedData,
                                history: history
                            }, null, 2)}
                        </pre>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowRawDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default MetadataViewer;