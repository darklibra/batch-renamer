import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Pagination
} from '@mui/material';
import {
  FilePresent,
  CalendarToday,
  FolderOpen
} from '@mui/icons-material';
import { PageHeader, StandardCardActions } from '../components/common';
import { PageContainer, PageContent, ResponsiveGrid } from '../components/layout/index.js';
import dataProvider from '../dataProvider';

const FileListPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const perPage = 12;

  useEffect(() => {
    fetchFiles();
  }, [page, searchTerm]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const result = await dataProvider.getList('files', {
        pagination: { page, perPage },
        sort: { field: 'created_at', order: 'DESC' },
        filter: searchTerm ? { filename: searchTerm } : {}
      });
      
      // Defensive handling of API response
      const filesData = result.data || result.files || [];
      const totalCount = result.total || 0;
      
      // Ensure files is always an array
      if (!Array.isArray(filesData)) {
        console.error('Expected files array but got:', typeof filesData, filesData);
        throw new Error('Invalid response format: expected files array');
      }
      
      setFiles(filesData);
      setTotal(totalCount);
      setTotalPages(Math.ceil(totalCount / perPage));
      setError(null);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError(`Failed to load files: ${error.message}`);
      setFiles([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page when searching
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getFileExtensionColor = (extension) => {
    const colors = {
      '.js': 'warning',
      '.jsx': 'warning', 
      '.ts': 'info',
      '.tsx': 'info',
      '.py': 'success',
      '.txt': 'default',
      '.md': 'secondary',
      '.json': 'primary'
    };
    return colors[extension] || 'default';
  };

  if (loading && page === 1) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Files"
        count={total}
        subtitle="Browse and manage indexed files with extracted metadata"
        primaryAction={{
          label: "Scan Files",
          onClick: () => navigate('/scanner'),
          icon: <FolderOpen />
        }}
        searchProps={{
          placeholder: "Search files...",
          value: searchTerm,
          onChange: handleSearchChange
        }}
      />

      <PageContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

      {files.length === 0 && !loading ? (
        <Box textAlign="center" py={6}>
          <FilePresent sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No files found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {searchTerm ? 'Try adjusting your search terms' : 'Start by scanning some directories'}
          </Typography>
          {!searchTerm && (
            <Box sx={{ mt: 2 }}>
              <button
                onClick={() => navigate('/scanner')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#1976d2',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <FolderOpen /> Scan Files
              </button>
            </Box>
          )}
        </Box>
      ) : (
        <>
          <ResponsiveGrid breakpoints={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={3}>
            {Array.isArray(files) && files.map((file) => (
                <Card key={file.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <FilePresent sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                        {file.filename}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={file.extension || 'No ext'}
                        size="small"
                        color={getFileExtensionColor(file.extension)}
                        sx={{ mr: 1 }}
                      />
                      {file.extracted_data && Object.keys(file.extracted_data).length > 0 && (
                        <Chip
                          label="Has Metadata"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="textSecondary" noWrap sx={{ mb: 1 }}>
                      Path: {file.path}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CalendarToday sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="textSecondary">
                        {formatDate(file.created_at)}
                      </Typography>
                    </Box>

                  </CardContent>
                  
                  <StandardCardActions
                    onView={() => navigate(`/files/${file.id}`)}
                    showEdit={false}
                    showDelete={false}
                    viewLabel="View Details"
                    layout="grouped"
                  />
                </Card>
            ))}
          </ResponsiveGrid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}

          {loading && page > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </>
      )}
      </PageContent>
    </PageContainer>
  );
};

export default FileListPage;