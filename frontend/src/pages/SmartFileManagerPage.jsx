import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Alert,
    Divider
} from '@mui/material';
import {
    DriveFileMoveOutlined,
    CheckCircle,
    Pattern
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dataProvider from '../dataProvider';
import SmartFileManager from '../components/SmartFileManager';

// New standardized components
import { PageContainer, PageContent, ResponsiveGrid } from '../components/layout/index.js';
import { WorkflowHeader } from '../components/headers/index.js';

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


    // Determine workflow status
    const getWorkflowStatus = () => {
        if (operationComplete) return 'completed';
        if (error) return 'error';
        if (loading) return 'in_progress';
        return 'pending';
    };

    return (
        <PageContainer>
            {/* Enhanced Workflow Header */}
            <WorkflowHeader
                title="Pattern-Based File Operations"
                subtitle={selectedPatternInfo 
                    ? `Organize files using "${selectedPatternInfo.name}" pattern`
                    : 'Pattern-based file organization and management'
                }
                breadcrumbs={[
                    {
                        label: 'Patterns',
                        onClick: () => navigate('/patterns')
                    },
                    {
                        label: selectedPatternInfo?.name || 'Pattern Details',
                        onClick: handleBackToPatternDetails
                    },
                    {
                        label: 'File Operations'
                    }
                ]}
                status={getWorkflowStatus()}
                statusMessage={
                    operationComplete ? 'Smart file operation completed successfully!' :
                    error ? error :
                    loading ? 'Loading pattern files...' :
                    selectedPatternInfo ? `Ready to organize ${selectedFileIds.length} files` :
                    undefined
                }
                onBack={handleBackToPatternDetails}
                showProgress={false}
            />

            <PageContent>
                {/* Pattern Information Alert */}
                {selectedPatternInfo && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            <Pattern sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'inherit' }} />
                            Using pattern "<strong>{selectedPatternInfo.name || `Pattern ${selectedPatternInfo.id}`}</strong>" 
                            with <strong>{selectedPatternInfo.fileCount || selectedFileIds.length}</strong> files. 
                            Configure the file operation below to proceed.
                        </Typography>
                    </Alert>
                )}

                {/* File Operations */}
                <ResponsiveGrid breakpoints={{ xs: 1 }} spacing={3}>
                    {/* Smart File Manager - Full Width */}
                    <SmartFileManager
                        selectedFileIds={selectedFileIds}
                        onOperationComplete={handleOperationComplete}
                    />
                    
                    {/* Pattern Information Card */}
                    {selectedPatternInfo && (
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Pattern sx={{ mr: 1, color: 'primary.main' }} />
                                    Pattern Information
                                </Typography>
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
                            </CardContent>
                        </Card>
                    )}
                </ResponsiveGrid>
            </PageContent>
        </PageContainer>
    );
};

export default SmartFileManagerPage;