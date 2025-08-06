import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  TablePagination,
  Box,
  Typography,
  Checkbox // Added Checkbox
} from '@mui/material';

import dataProvider from './dataProvider';

const FileSelectionPopup = ({ open, onClose, onFileSelect, initialSelectedFileIds = [], onSelectionChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set()); // Initialize as empty Set
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Effect to initialize selectedFiles when popup opens
  useEffect(() => {
    if (open) {
      setSelectedFiles(new Set(initialSelectedFileIds.map(id => Number(id))));
    }
  }, [open]); // Only depend on 'open' prop

  const fetchFiles = useCallback(async () => {
    try {
      const response = await dataProvider.getList('files', {
        pagination: { page: page + 1, perPage: perPage },
        sort: { field: 'full_path', order: 'ASC' },
        filter: {},
      });
      setFiles(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('파일 목록을 불러오는 데 실패했습니다.', error);
    }
  }, [page, perPage]);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open, fetchFiles]);

  const handleToggle = (file) => {
    const newSelectedFiles = new Set(selectedFiles);
    const fileId = Number(file.id);
    const wasSelected = newSelectedFiles.has(fileId);

    if (wasSelected) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
    }

    setSelectedFiles(newSelectedFiles);

    // Only call onSelectionChange if the selection actually changed
    if (onSelectionChange) {
      // Compare the new set with the old set to avoid unnecessary calls
      if (newSelectedFiles.size !== selectedFiles.size || ![...newSelectedFiles].every(id => selectedFiles.has(id))) {
        onSelectionChange(newSelectedFiles); // Pass the Set directly
      }
    }
  };

  const handleSelect = async () => {
    const selectedFileIdsArray = Array.from(selectedFiles);
    if (selectedFileIdsArray.length > 0) {
      try {
        const response = await dataProvider.getMany('files', { ids: selectedFileIdsArray });
        onFileSelect(response.data);
      } catch (error) {
        console.error('선택된 파일 정보를 불러오는 데 실패했습니다.', error);
        onFileSelect([]); // Pass empty array on error
      }
    } else {
      onFileSelect([]);
    }
    onClose();
  };

  const handleSelectAll = () => {
    onFileSelect([{ id: 'all' }]); // 'all'을 나타내는 특수 객체 전달
    onClose();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };

  const displayedFiles = files.filter(file =>
    file.full_path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>파일 선택</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="파일명 검색"
          type="text"
          fullWidth
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ marginBottom: '1em' }}
        />
        <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
          {displayedFiles.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ padding: '1em' }}>
              검색 결과가 없습니다.
            </Typography>
          ) : (
            displayedFiles.map((file) => (
              <ListItem
                key={file.id}
                secondaryAction={
                  <Checkbox
                    edge="end"
                    onChange={() => handleToggle(file)}
                    checked={selectedFiles.has(Number(file.id))}
                  />
                }
                disablePadding
              >
                <ListItemText primary={file.full_path} />
              </ListItem>
            ))
          )}
        </List>
      </DialogContent>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={perPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSelectAll} variant="outlined">전체 적용</Button>
        <Button onClick={handleSelect} variant="contained" disabled={selectedFiles.size === 0}>선택</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileSelectionPopup;
