import React, { useState } from 'react';
import {
    List, Datagrid, TextField, NumberField, BooleanField, DateField, FunctionField,
    Pagination, Button, useNotify, useRefresh, Filter, SearchInput, SelectInput,
    Show, SimpleShowLayout, TopToolbar, CreateButton, ExportButton, RefreshButton,
    BulkDeleteButton, EditButton, ShowButton
} from 'react-admin';
import {
    Box, Typography, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    Card, CardContent, Grid, Alert, LinearProgress, IconButton, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Paper
} from '@mui/material';
import {
    PlayArrow, Refresh, Visibility, Download, Search, FilterList,
    DataObject, CheckCircle, Error as ErrorIcon, Warning, Info,
    ExpandMore, Close, Analytics, Speed, Security, BugReport
} from '@mui/icons-material';

import RenameAndCopy from './RenameAndCopy';
import dataProvider from './dataProvider';
import { JobMonitorDialog } from './jobs';

// ===========================================
// METADATA DISPLAY COMPONENT
// ===========================================
const MetadataDisplay = ({ data, maxHeight = '200px' }) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return (
            <Typography variant="body2" color="textSecondary">
                No extracted data
            </Typography>
        );
    }

    const displayData = typeof data === 'string' ? JSON.parse(data) : data;

    return (
        <Box 
            sx={{ 
                maxHeight, 
                overflow: 'auto',
                backgroundColor: '#f5f5f5',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '0.8em'
            }}
        >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(displayData, null, 2)}
            </pre>
        </Box>
    );
};

// ===========================================
// FILE EXTRACTION STATUS COMPONENT
// ===========================================
const ExtractionStatus = ({ record }) => {
    if (record.extracted_data && Object.keys(record.extracted_data).length > 0) {
        return (
            <Tooltip title="Metadata extracted successfully">
                <Chip
                    label="Extracted"
                    color="success"
                    size="small"
                    icon={<CheckCircle />}
                />
            </Tooltip>
        );
    }

    if (record.extraction_failed) {
        return (
            <Tooltip title={record.extraction_failure_reason || "Extraction failed"}>
                <Chip
                    label="Failed"
                    color="error"
                    size="small"
                    icon={<ErrorIcon />}
                />
            </Tooltip>
        );
    }

    return (
        <Tooltip title="No extraction attempted">
            <Chip
                label="Pending"
                color="default"
                size="small"
                icon={<Warning />}
            />
        </Tooltip>
    );
};

// ===========================================
// BATCH METADATA EXTRACTION COMPONENT
// ===========================================
const BatchMetadataExtraction = () => {
    const [jobId, setJobId] = useState(null);
    const [showJobMonitor, setShowJobMonitor] = useState(false);
    const notify = useNotify();
    const refresh = useRefresh();

    const handleBatchExtraction = async (selectedIds) => {
        if (selectedIds.length === 0) {
            notify('파일을 선택해주세요.', { type: 'warning' });
            return;
        }

        try {
            const result = await dataProvider.startBatchExtraction(selectedIds);
            setJobId(result.job_id);
            setShowJobMonitor(true);
            notify(`${selectedIds.length}개 파일의 메타데이터 추출을 시작했습니다.`, { type: 'success' });
        } catch (error) {
            notify(`배치 추출 실패: ${error.message}`, { type: 'error' });
        }
    };

    const handleJobComplete = () => {
        refresh();
        setShowJobMonitor(false);
    };

    return (
        <>
            <Button
                label="Extract Metadata"
                onClick={(event, selectedIds) => handleBatchExtraction(selectedIds)}
                startIcon={<DataObject />}
            />
            
            {jobId && (
                <JobMonitorDialog
                    jobId={jobId}
                    open={showJobMonitor}
                    onClose={() => setShowJobMonitor(false)}
                    onJobComplete={handleJobComplete}
                />
            )}
        </>
    );
};

// ===========================================
// FILE DETAIL EXTRACTION COMPONENT
// ===========================================
const FileExtractionDetails = ({ fileId }) => {
    const [extractionHistory, setExtractionHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchHistory = async () => {
            if (!fileId) return;
            
            try {
                // This would call the file extraction history endpoint
                // For now, using mock data
                const mockHistory = [
                    {
                        id: 1,
                        pattern_id: 1,
                        pattern_name: "Episode Pattern",
                        extraction_score: 3,
                        extracted_data: { name: "Episode 1", start: 1, end: 5 },
                        applied_at: new Date().toISOString(),
                        is_current: true
                    }
                ];
                setExtractionHistory(mockHistory);
            } catch (error) {
                console.error('Failed to fetch extraction history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [fileId]);

    if (loading) {
        return <LinearProgress />;
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Extraction History
            </Typography>
            
            {extractionHistory.length === 0 ? (
                <Alert severity="info">
                    No extraction history available for this file.
                </Alert>
            ) : (
                extractionHistory.map((extraction, index) => (
                    <Card key={index} sx={{ mb: 2 }} variant="outlined">
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                    {extraction.pattern_name}
                                </Typography>
                                {extraction.is_current && (
                                    <Chip label="Current" color="primary" size="small" />
                                )}
                                <Chip 
                                    label={`Score: ${extraction.extraction_score}`}
                                    color={extraction.extraction_score > 2 ? 'success' : 'warning'}
                                    size="small"
                                    sx={{ ml: 1 }}
                                />
                            </Box>
                            
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Applied: {new Date(extraction.applied_at).toLocaleString()}
                            </Typography>
                            
                            <Typography variant="subtitle2" gutterBottom>
                                Extracted Data:
                            </Typography>
                            <MetadataDisplay data={extraction.extracted_data} maxHeight="150px" />
                        </CardContent>
                    </Card>
                ))
            )}
        </Box>
    );
};

// ===========================================
// ADVANCED SEARCH COMPONENT
// ===========================================
const AdvancedFileSearch = () => {
    const [searchDialog, setSearchDialog] = useState(false);
    const [searchParams, setSearchParams] = useState({
        query: '',
        search_in: 'all',
        pattern_id: null,
        has_extracted_data: null
    });
    const [searchResults, setSearchResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const notify = useNotify();

    const performSearch = async () => {
        if (!searchParams.query.trim()) {
            notify('검색어를 입력해주세요.', { type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const result = await dataProvider.searchFiles(searchParams);
            setSearchResults(result);
        } catch (error) {
            notify(`검색 실패: ${error.message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                label="Advanced Search"
                onClick={() => setSearchDialog(true)}
                startIcon={<Search />}
            />
            
            <Dialog
                open={searchDialog}
                onClose={() => setSearchDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Advanced File Search
                    <IconButton
                        onClick={() => setSearchDialog(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Search Query"
                                fullWidth
                                value={searchParams.query}
                                onChange={(e) => setSearchParams({
                                    ...searchParams,
                                    query: e.target.value
                                })}
                            />
                        </Grid>
                        
                        <Grid item xs={6}>
                            <SelectInput
                                source="search_in"
                                label="Search In"
                                choices={[
                                    { id: 'all', name: 'All Fields' },
                                    { id: 'filename', name: 'Filename Only' },
                                    { id: 'path', name: 'Path Only' },
                                    { id: 'extracted_data', name: 'Extracted Data Only' }
                                ]}
                                value={searchParams.search_in}
                                onChange={(value) => setSearchParams({
                                    ...searchParams,
                                    search_in: value
                                })}
                            />
                        </Grid>
                        
                        <Grid item xs={6}>
                            <SelectInput
                                source="has_extracted_data"
                                label="Extraction Status"
                                choices={[
                                    { id: true, name: 'Has Extracted Data' },
                                    { id: false, name: 'No Extracted Data' }
                                ]}
                                value={searchParams.has_extracted_data}
                                onChange={(value) => setSearchParams({
                                    ...searchParams,
                                    has_extracted_data: value
                                })}
                            />
                        </Grid>
                    </Grid>
                    
                    {loading && <LinearProgress sx={{ mt: 2 }} />}
                    
                    {searchResults && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Search Results ({searchResults.total} files found)
                            </Typography>
                            
                            {searchResults.files?.slice(0, 10).map((file) => (
                                <Card key={file.id} sx={{ mb: 1 }} variant="outlined">
                                    <CardContent sx={{ py: 1 }}>
                                        <Typography variant="subtitle1">
                                            {file.filename}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {file.full_path}
                                        </Typography>
                                        {file.extracted_data && (
                                            <Box sx={{ mt: 1 }}>
                                                <MetadataDisplay data={file.extracted_data} maxHeight="100px" />
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                
                <DialogActions>
                    <Button onClick={performSearch} disabled={loading}>
                        Search
                    </Button>
                    <Button onClick={() => setSearchDialog(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// ===========================================
// ENHANCED BULK ACTIONS
// ===========================================
export const FileBulkActionButtons = () => (
    <>
        <BatchMetadataExtraction />
        <RenameAndCopy />
        <BulkDeleteButton />
    </>
);

// ===========================================
// FILE FILTERS
// ===========================================
const FileFilter = (props) => (
    <Filter {...props}>
        <SearchInput source="q" alwaysOn />
        <SelectInput source="extension" choices={[
            { id: 'txt', name: 'Text Files (.txt)' },
            { id: 'pdf', name: 'PDF Files (.pdf)' },
            { id: 'doc', name: 'Word Documents (.doc)' },
            { id: 'jpg', name: 'JPEG Images (.jpg)' },
            { id: 'png', name: 'PNG Images (.png)' },
        ]} />
        <SelectInput source="has_extracted_data" choices={[
            { id: true, name: 'Has Extracted Data' },
            { id: false, name: 'No Extracted Data' },
        ]} />
        <SelectInput source="extraction_failed" choices={[
            { id: true, name: 'Extraction Failed' },
            { id: false, name: 'Extraction Successful' },
        ]} />
    </Filter>
);

// ===========================================
// FILE LIST ACTIONS
// ===========================================
const FileListActions = (props) => (
    <TopToolbar>
        <AdvancedFileSearch />
        <RefreshButton />
    </TopToolbar>
);

// ===========================================
// MAIN FILE LIST COMPONENT
// ===========================================
export const FileList = () => (
    <List 
        filters={<FileFilter />}
        actions={<FileListActions />}
        bulkActionButtons={<FileBulkActionButtons />}
        pagination={<Pagination />}
    >
        <Datagrid rowClick="show">
            <TextField source="id" />
            <TextField source="filename" />
            <TextField source="extension" />
            <TextField source="path" />
            <NumberField source="file_size" />
            <FunctionField
                label="Extraction Status"
                render={record => <ExtractionStatus record={record} />}
            />
            <FunctionField
                label="Extracted Data"
                render={record => (
                    <Box sx={{ maxWidth: '200px' }}>
                        <MetadataDisplay data={record.extracted_data} maxHeight="60px" />
                    </Box>
                )}
            />
            <FunctionField
                label="Pattern"
                render={record => (
                    record.pattern_id ? (
                        <Chip 
                            label={`Pattern ${record.pattern_id}`}
                            size="small"
                            color="primary"
                        />
                    ) : (
                        <Typography variant="body2" color="textSecondary">
                            No pattern
                        </Typography>
                    )
                )}
            />
            <DateField source="indexed_at" showTime />
            <DateField source="updated_at" showTime />
            <ShowButton />
        </Datagrid>
    </List>
);

// ===========================================
// ENHANCED FILE SHOW COMPONENT
// ===========================================
export const FileShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="filename" />
            <TextField source="extension" />
            <TextField source="path" />
            <TextField source="full_path" />
            <NumberField source="file_size" />
            <DateField source="last_modified" showTime />
            <DateField source="indexed_at" showTime />
            <DateField source="updated_at" showTime />
            
            <FunctionField
                label="Extraction Status"
                render={record => <ExtractionStatus record={record} />}
            />
            
            <FunctionField
                label="Extracted Metadata"
                render={record => (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Extracted Metadata
                        </Typography>
                        <MetadataDisplay data={record.extracted_data} />
                        
                        {record.id && <FileExtractionDetails fileId={record.id} />}
                    </Box>
                )}
            />
        </SimpleShowLayout>
    </Show>
);
