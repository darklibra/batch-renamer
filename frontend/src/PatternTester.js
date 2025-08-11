import React, { useState, useEffect } from 'react';
import { Button, TextField, Typography, Box, Paper, List, ListItem, ListItemText } from '@mui/material';
import { useNotify } from 'react-admin';
import dataProvider from './dataProvider';
import FileSelectionPopup from './FileSelectionPopup'; // Added import

function PatternTester() {
    const [pattern, setPattern] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [popupSelectedFileIds, setPopupSelectedFileIds] = useState(new Set()); // New state for popup selection
    const [extractedData, setExtractedData] = useState([]);
    const [isPopupOpen, setIsPopupOpen] = useState(false); // Added state
    const notify = useNotify();

    const handleFileSelect = async (files) => {
        setSelectedFiles(files);
        setPopupSelectedFileIds(new Set(files.map(file => file.id))); // Update popup selection state
        // For now, we'll clear extractedData when new files are selected
        setExtractedData([]);
        setIsPopupOpen(false); // Close popup
    };

    const handleTestPattern = async () => {
        if (selectedFiles.length === 0) {
            notify('파일을 선택해주세요.', { type: 'warning' });
            return;
        }
        if (!pattern) {
            notify('패턴을 입력해주세요.', { type: 'warning' });
            return;
        }

        setExtractedData([]); // Clear previous results
        notify('패턴 테스트를 시작합니다...', { type: 'info' });

        try {
            const fileIds = selectedFiles.map(file => file.id);
            const response = await dataProvider.testPattern(fileIds, pattern);
            const results = Object.entries(response).map(([fileId, data]) => {
                const file = selectedFiles.find(f => f.id === Number(fileId));
                const fileName = file ? file.full_path : `ID: ${fileId}`;
                return `파일: ${fileName}, 결과: ${JSON.stringify(data)}`;
            });
            setExtractedData(results);
            notify('패턴 테스트 완료', { type: 'success' });
        } catch (error) {
            console.error('패턴 테스트 중 오류 발생:', error);
            notify(`패턴 테스트 중 오류 발생: ${error.message}`, { type: 'error' });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>패턴 테스트</Typography>
                <TextField
                    label="패턴 입력"
                    fullWidth
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleTestPattern}
                    disabled={selectedFiles.length === 0 || !pattern}
                >
                    테스트 실행
                </Button>
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>파일 선택</Typography>
                <Button variant="contained" component="span" onClick={() => setIsPopupOpen(true)}>
                    파일 선택
                </Button>
                {selectedFiles.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">선택된 파일:</Typography>
                        <List dense>
                            {selectedFiles.map((file) => (
                                <ListItem key={file.id} disablePadding>
                                    <ListItemText primary={file.full_path} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                <FileSelectionPopup
                    open={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                    onFileSelect={handleFileSelect}
                    initialSelectedFileIds={Array.from(popupSelectedFileIds)}
                    onSelectionChange={setPopupSelectedFileIds} // Add this line
                />
            </Paper>

            {extractedData.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>추출된 데이터</Typography>
                    <Box>
                        {extractedData.map((data, index) => (
                            <Typography key={index} variant="body2">{data}</Typography>
                        ))}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}

export default PatternTester;
