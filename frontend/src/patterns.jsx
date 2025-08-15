import React, { useState, useEffect } from 'react';
import {
    List, Datagrid, TextField, NumberField, BooleanField, DateField,
    Edit, Create, SimpleForm, TextInput, NumberInput, BooleanInput,
    Show, SimpleShowLayout, EditButton, ShowButton, DeleteButton,
    Toolbar, SaveButton, Button, useNotify, useRedirect, useRecordContext,
    FunctionField, ChipField, useRefresh, Loading, Error,
    Pagination, BulkDeleteButton, TopToolbar, CreateButton, ExportButton,
    Filter, SearchInput, SelectInput, ReferenceInput, AutocompleteInput
} from 'react-admin';
import {
    Box, Typography, Paper, Grid, Card, CardContent, CardActions,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
    LinearProgress, Table, TableBody, TableCell, TableHead, TableRow,
    Accordion, AccordionSummary, AccordionDetails, FormControlLabel,
    Switch, IconButton, Tooltip, Badge
} from '@mui/material';
import {
    CheckCircle, Error as ErrorIcon, Warning, Info,
    PlayArrow, Stop, Refresh, Visibility, Edit as EditIcon,
    Delete, Science, Analytics, TrendingUp, BugReport,
    ExpandMore, Settings, Speed, Security, CheckCircleOutline
} from '@mui/icons-material';
import dataProvider from './dataProvider';
import FileSelectionPopup from './FileSelectionPopup.jsx';

// ===========================================
// PATTERN VALIDATION COMPONENT
// ===========================================
const PatternValidator = ({ pattern, onValidationChange }) => {
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);

    const validatePattern = async () => {
        if (!pattern?.regex_pattern || !pattern?.field_mapping) return;
        
        setLoading(true);
        try {
            // This would call a validation endpoint if available
            // For now, we'll do basic client-side validation
            const result = performBasicValidation(pattern);
            setValidation(result);
            onValidationChange?.(result);
        } catch (error) {
            console.error('Validation error:', error);
        } finally {
            setLoading(false);
        }
    };

    const performBasicValidation = (pattern) => {
        const results = [];
        let score = 100;

        // Test regex syntax
        try {
            new RegExp(pattern.regex_pattern);
            results.push({
                severity: 'success',
                message: 'Regex syntax is valid',
                field: 'regex_pattern'
            });
        } catch (error) {
            results.push({
                severity: 'error',
                message: `Invalid regex: ${error.message}`,
                field: 'regex_pattern'
            });
            score -= 30;
        }

        // Test field mapping
        try {
            const mapping = typeof pattern.field_mapping === 'string' 
                ? JSON.parse(pattern.field_mapping) 
                : pattern.field_mapping;
            
            if (Object.keys(mapping).length === 0) {
                results.push({
                    severity: 'warning',
                    message: 'Field mapping is empty',
                    field: 'field_mapping'
                });
                score -= 10;
            } else {
                results.push({
                    severity: 'success',
                    message: `Field mapping has ${Object.keys(mapping).length} fields`,
                    field: 'field_mapping'
                });
            }
        } catch (error) {
            results.push({
                severity: 'error',
                message: 'Invalid JSON in field mapping',
                field: 'field_mapping'
            });
            score -= 20;
        }

        return {
            is_valid: score >= 70,
            score: Math.max(0, score),
            results
        };
    };

    useEffect(() => {
        validatePattern();
    }, [pattern?.regex_pattern, pattern?.field_mapping]);

    if (loading) {
        return (
            <Box sx={{ p: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Validating pattern...
                </Typography>
            </Box>
        );
    }

    if (!validation) return null;

    const getScoreColor = (score) => {
        if (score >= 90) return 'success';
        if (score >= 70) return 'warning';
        return 'error';
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Pattern Validation
                <Chip 
                    label={`Score: ${validation.score}/100`}
                    color={getScoreColor(validation.score)}
                    sx={{ ml: 2 }}
                />
            </Typography>
            
            {validation.results.map((result, index) => (
                <Alert 
                    key={index} 
                    severity={result.severity} 
                    sx={{ mb: 1 }}
                >
                    <strong>{result.field}:</strong> {result.message}
                </Alert>
            ))}
        </Paper>
    );
};

// ===========================================
// PATTERN TESTING COMPONENT
// ===========================================
const PatternTester = ({ pattern }) => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [testResults, setTestResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const notify = useNotify();

    const handleFileSelect = (files) => {
        setSelectedFiles(files);
        setIsPopupOpen(false);
    };

    const runTest = async () => {
        if (!pattern || selectedFiles.length === 0) {
            notify('패턴과 테스트 파일을 선택해주세요.', { type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const result = await dataProvider.testPatternAdvanced(
                pattern,
                selectedFiles.map(f => f.id)
            );
            setTestResults(result);
            notify('패턴 테스트 완료', { type: 'success' });
        } catch (error) {
            notify(`테스트 실패: ${error.message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Pattern Testing
            </Typography>
            
            <Box sx={{ mb: 2 }}>
                <Button
                    variant="outlined"
                    onClick={() => setIsPopupOpen(true)}
                    sx={{ mr: 2 }}
                >
                    Select Test Files ({selectedFiles.length} selected)
                </Button>
                
                <Button
                    variant="contained"
                    onClick={runTest}
                    disabled={!pattern || selectedFiles.length === 0 || loading}
                    startIcon={loading ? <LinearProgress /> : <Science />}
                >
                    Run Test
                </Button>
            </Box>

            {selectedFiles.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>Selected Files:</Typography>
                    {selectedFiles.slice(0, 5).map(file => (
                        <Chip 
                            key={file.id} 
                            label={file.filename} 
                            size="small" 
                            sx={{ m: 0.5 }} 
                        />
                    ))}
                    {selectedFiles.length > 5 && (
                        <Chip label={`+${selectedFiles.length - 5} more`} size="small" sx={{ m: 0.5 }} />
                    )}
                </Box>
            )}

            {testResults && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>Test Results</Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4" color="primary">
                                        {testResults.successful_matches || 0}
                                    </Typography>
                                    <Typography variant="body2">
                                        Successful Matches
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4">
                                        {testResults.total_files_tested || 0}
                                    </Typography>
                                    <Typography variant="body2">
                                        Total Files Tested
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4" color="success.main">
                                        {testResults.total_files_tested > 0 
                                            ? Math.round((testResults.successful_matches / testResults.total_files_tested) * 100)
                                            : 0}%
                                    </Typography>
                                    <Typography variant="body2">
                                        Success Rate
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {testResults.results && Object.keys(testResults.results).length > 0 && (
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography>Detailed Results</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>File ID</TableCell>
                                            <TableCell>Matched</TableCell>
                                            <TableCell>Extracted Data</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(testResults.results).map(([fileId, result]) => (
                                            <TableRow key={fileId}>
                                                <TableCell>{fileId}</TableCell>
                                                <TableCell>
                                                    {result.matched ? (
                                                        <CheckCircle color="success" />
                                                    ) : (
                                                        <ErrorIcon color="error" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {result.extracted_data && (
                                                        <pre style={{ fontSize: '0.8em', maxWidth: '300px', overflow: 'auto' }}>
                                                            {JSON.stringify(result.extracted_data, null, 2)}
                                                        </pre>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionDetails>
                        </Accordion>
                    )}
                </Box>
            )}

            <FileSelectionPopup
                open={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                onFileSelect={handleFileSelect}
            />
        </Paper>
    );
};

// ===========================================
// PATTERN PERFORMANCE COMPONENT  
// ===========================================
const PatternPerformance = ({ patternId }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!patternId) return;
            
            try {
                const result = await dataProvider.getPatternStats(patternId);
                setStats(result);
            } catch (error) {
                console.error('Failed to fetch pattern stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [patternId]);

    if (loading) {
        return <Loading />;
    }

    if (!stats) {
        return <Typography>No performance data available</Typography>;
    }

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Pattern Performance
            </Typography>
            
            <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" color="primary">
                                {stats.total_applications || 0}
                            </Typography>
                            <Typography variant="body2">
                                Total Applications
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" color="success.main">
                                {stats.current_applications || 0}
                            </Typography>
                            <Typography variant="body2">
                                Current Applications
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h5">
                                {stats.average_extraction_score || 0}
                            </Typography>
                            <Typography variant="body2">
                                Avg Extraction Score
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h5">
                                {stats.average_processing_time_ms || 0}ms
                            </Typography>
                            <Typography variant="body2">
                                Avg Processing Time
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Paper>
    );
};

// ===========================================
// PATTERN FILTERS
// ===========================================
const PatternFilter = (props) => (
    <Filter {...props}>
        <SearchInput source="q" alwaysOn />
        <SelectInput source="is_active" choices={[
            { id: true, name: 'Active' },
            { id: false, name: 'Inactive' },
        ]} />
        <SelectInput source="sort_by" choices={[
            { id: 'priority', name: 'Priority' },
            { id: 'name', name: 'Name' },
            { id: 'created_at', name: 'Created Date' },
            { id: 'updated_at', name: 'Updated Date' },
        ]} />
    </Filter>
);

// ===========================================
// PATTERN BULK ACTIONS
// ===========================================
const PatternBulkActions = () => {
    const notify = useNotify();
    const refresh = useRefresh();

    const handleBulkActivate = async (ids) => {
        try {
            await Promise.all(
                ids.map(id => dataProvider.updatePattern(id, { is_active: true }))
            );
            notify('패턴들이 활성화되었습니다.', { type: 'success' });
            refresh();
        } catch (error) {
            notify(`활성화 실패: ${error.message}`, { type: 'error' });
        }
    };

    const handleBulkDeactivate = async (ids) => {
        try {
            await Promise.all(
                ids.map(id => dataProvider.updatePattern(id, { is_active: false }))
            );
            notify('패턴들이 비활성화되었습니다.', { type: 'success' });
            refresh();
        } catch (error) {
            notify(`비활성화 실패: ${error.message}`, { type: 'error' });
        }
    };

    return (
        <>
            <Button
                label="Activate Selected"
                onClick={(event, ids) => handleBulkActivate(ids)}
            />
            <Button
                label="Deactivate Selected"
                onClick={(event, ids) => handleBulkDeactivate(ids)}
            />
            <BulkDeleteButton />
        </>
    );
};

// ===========================================
// MAIN PATTERN COMPONENTS
// ===========================================

// Pattern List Actions
const PatternListActions = (props) => (
    <TopToolbar>
        <CreateButton />
        <ExportButton />
    </TopToolbar>
);

// Pattern List
export const PatternList = () => (
    <List 
        filters={<PatternFilter />}
        actions={<PatternListActions />}
        bulkActionButtons={<PatternBulkActions />}
        pagination={<Pagination />}
    >
        <Datagrid rowClick="show">
            <TextField source="id" />
            <TextField source="name" />
            <FunctionField 
                label="Regex Pattern"
                source="regex_pattern"
                render={record => (
                    <code style={{ fontSize: '0.8em', maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {record.regex_pattern}
                    </code>
                )}
            />
            <NumberField source="priority" />
            <BooleanField source="is_active" />
            <DateField source="created_at" showTime />
            <DateField source="updated_at" showTime />
            <EditButton />
            <ShowButton />
            <DeleteButton />
        </Datagrid>
    </List>
);

// Pattern Show
export const PatternShow = () => {
    const record = useRecordContext();

    return (
        <Show>
            <SimpleShowLayout>
                <TextField source="id" />
                <TextField source="name" />
                <FunctionField 
                    label="Regex Pattern"
                    source="regex_pattern"
                    render={record => (
                        <code style={{ 
                            display: 'block', 
                            padding: '8px', 
                            backgroundColor: '#f5f5f5',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '0.9em',
                            wordBreak: 'break-all'
                        }}>
                            {record.regex_pattern}
                        </code>
                    )}
                />
                <FunctionField 
                    label="Field Mapping"
                    source="field_mapping"
                    render={record => (
                        <pre style={{ 
                            backgroundColor: '#f5f5f5',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '0.9em'
                        }}>
                            {JSON.stringify(record.field_mapping, null, 2)}
                        </pre>
                    )}
                />
                <NumberField source="priority" />
                <BooleanField source="is_active" />
                <TextField source="description" />
                <DateField source="created_at" showTime />
                <DateField source="updated_at" showTime />
                
                {record && <PatternPerformance patternId={record.id} />}
            </SimpleShowLayout>
        </Show>
    );
};

// Pattern Create
export const PatternCreate = () => {
    const [currentPattern, setCurrentPattern] = useState({
        name: '',
        regex_pattern: '',
        field_mapping: {},
        priority: 1,
        description: ''
    });
    const [validation, setValidation] = useState(null);

    const CustomToolbar = () => (
        <Toolbar>
            <SaveButton 
                disabled={!validation?.is_valid}
                label="Create Pattern"
            />
        </Toolbar>
    );

    return (
        <Create>
            <SimpleForm 
                toolbar={<CustomToolbar />}
                onChange={(values) => setCurrentPattern(values)}
            >
                <TextInput 
                    source="name" 
                    label="Pattern Name"
                    required
                    fullWidth
                />
                <TextInput 
                    source="regex_pattern" 
                    label="Regular Expression"
                    required
                    fullWidth
                    multiline
                    minRows={2}
                />
                <TextInput 
                    source="field_mapping" 
                    label="Field Mapping (JSON)"
                    required
                    fullWidth
                    multiline
                    minRows={3}
                    helperText='Example: {"name": "$1:s$", "version": "$2:d$", "extension": "$3:s$"}'
                />
                <NumberInput 
                    source="priority" 
                    label="Priority (1-100)"
                    defaultValue={1}
                    min={1}
                    max={100}
                />
                <TextInput 
                    source="description" 
                    label="Description"
                    fullWidth
                    multiline
                    minRows={2}
                />
                <BooleanInput 
                    source="is_active" 
                    label="Active"
                    defaultValue={true}
                />

                <PatternValidator 
                    pattern={currentPattern}
                    onValidationChange={setValidation}
                />
                
                <PatternTester pattern={currentPattern} />
            </SimpleForm>
        </Create>
    );
};

// Pattern Edit  
export const PatternEdit = () => {
    const [currentPattern, setCurrentPattern] = useState(null);
    const [validation, setValidation] = useState(null);
    const record = useRecordContext();

    useEffect(() => {
        if (record) {
            setCurrentPattern(record);
        }
    }, [record]);

    const CustomToolbar = () => (
        <Toolbar>
            <SaveButton 
                disabled={!validation?.is_valid}
                label="Update Pattern"
            />
        </Toolbar>
    );

    return (
        <Edit>
            <SimpleForm 
                toolbar={<CustomToolbar />}
                onChange={(values) => setCurrentPattern({ ...record, ...values })}
            >
                <TextInput 
                    source="name" 
                    label="Pattern Name"
                    required
                    fullWidth
                />
                <TextInput 
                    source="regex_pattern" 
                    label="Regular Expression"
                    required
                    fullWidth
                    multiline
                    minRows={2}
                />
                <TextInput 
                    source="field_mapping" 
                    label="Field Mapping (JSON)"
                    required
                    fullWidth
                    multiline
                    minRows={3}
                    helperText='Example: {"name": "$1:s$", "version": "$2:d$", "extension": "$3:s$"}'
                />
                <NumberInput 
                    source="priority" 
                    label="Priority (1-100)"
                    min={1}
                    max={100}
                />
                <TextInput 
                    source="description" 
                    label="Description"
                    fullWidth
                    multiline
                    minRows={2}
                />
                <BooleanInput 
                    source="is_active" 
                    label="Active"
                />

                {currentPattern && (
                    <>
                        <PatternValidator 
                            pattern={currentPattern}
                            onValidationChange={setValidation}
                        />
                        
                        <PatternTester pattern={currentPattern} />
                    </>
                )}
            </SimpleForm>
        </Edit>
    );
};