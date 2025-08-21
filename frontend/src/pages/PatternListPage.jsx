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
  Pattern,
  CalendarToday,
  CheckCircle,
  Cancel,
  Add
} from '@mui/icons-material';
import { PageHeader, StandardCardActions } from '../components/common';
import { PageContainer, PageContent, ResponsiveGrid } from '../components/layout/index.js';
import dataProvider from '../dataProvider';

const PatternListPage = () => {
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const perPage = 12;

  useEffect(() => {
    fetchPatterns();
  }, [page, searchTerm]);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const result = await dataProvider.getList('patterns', {
        pagination: { page, perPage },
        sort: { field: 'priority', order: 'DESC' },
        filter: searchTerm ? { name: searchTerm } : {}
      });
      
      setPatterns(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(Math.ceil((result.total || 0) / perPage));
      setError(null);
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
      setError('Failed to load patterns');
      setPatterns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    if (priority >= 8) return 'error';
    if (priority >= 5) return 'warning';
    if (priority >= 3) return 'info';
    return 'default';
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
        title="Patterns"
        count={total}
        subtitle="Create and manage regex patterns for extracting structured data from filenames"
        primaryAction={{
          label: "Create Pattern",
          onClick: () => navigate('/pattern-manager'),
          icon: <Add />
        }}
        searchProps={{
          placeholder: "Search patterns...",
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

      {patterns.length === 0 && !loading ? (
        <Box textAlign="center" py={6}>
          <Pattern sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No patterns found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first pattern to extract structured data from filenames'}
          </Typography>
          {!searchTerm && (
            <Box sx={{ mt: 2 }}>
              <button
                onClick={() => navigate('/pattern-manager')}
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
                  gap: '8px'
                }}
              >
                <Add /> Create Pattern
              </button>
            </Box>
          )}
        </Box>
      ) : (
        <>
          <ResponsiveGrid breakpoints={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={3}>
            {patterns.map((pattern) => (
                <Card key={pattern.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Pattern sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                        {pattern.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={`Priority ${pattern.priority || 1}`}
                        size="small"
                        color={getPriorityColor(pattern.priority)}
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        icon={pattern.is_active ? <CheckCircle /> : <Cancel />}
                        label={pattern.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={pattern.is_active ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>

                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        bgcolor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        mb: 2,
                        wordBreak: 'break-all'
                      }}
                    >
                      {pattern.regex_pattern}
                    </Typography>

                    {pattern.field_mapping && Object.keys(pattern.field_mapping).length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">
                          Fields: {Object.keys(pattern.field_mapping).join(', ')}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CalendarToday sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="textSecondary">
                        {formatDate(pattern.created_at)}
                      </Typography>
                    </Box>

                  </CardContent>
                  
                  <StandardCardActions
                    onView={() => navigate(`/patterns/${pattern.id}`)}
                    onEdit={() => navigate(`/patterns/${pattern.id}`)}
                    showDelete={false}
                    viewLabel="View Details"
                    editLabel="Edit"
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

export default PatternListPage;