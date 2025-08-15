import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid
} from '@mui/material';
import {
  ArrowBack,
  FilePresent,
  CalendarToday,
  Folder,
  Label
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

const FileDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchFile();
    }
  }, [id]);

  const fetchFile = async () => {
    try {
      setLoading(true);
      const result = await dataProvider.getOne('files', { id });
      setFile(result.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch file:', error);
      setError('Failed to load file details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/files')}
          sx={{ mb: 2 }}
        >
          Back to Files
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!file) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/files')}
          sx={{ mb: 2 }}
        >
          Back to Files
        </Button>
        <Alert severity="warning">File not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/files')}
        sx={{ mb: 3 }}
      >
        Back to Files
      </Button>

      <Grid container spacing={3}>
        {/* File Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <FilePresent sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4">
                    {file.filename}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={file.extension || 'No extension'}
                      size="small"
                      color={getFileExtensionColor(file.extension)}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <List>
                <ListItem>
                  <ListItemText
                    primary="Full Path"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Folder sx={{ mr: 1, fontSize: 16 }} />
                        {file.full_path}
                      </Box>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Directory"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Folder sx={{ mr: 1, fontSize: 16 }} />
                        {file.path}
                      </Box>
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Created"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <CalendarToday sx={{ mr: 1, fontSize: 16 }} />
                        {formatDate(file.created_at)}
                      </Box>
                    }
                  />
                </ListItem>

                {file.updated_at && (
                  <ListItem>
                    <ListItemText
                      primary="Last Updated"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <CalendarToday sx={{ mr: 1, fontSize: 16 }} />
                          {formatDate(file.updated_at)}
                        </Box>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Extracted Metadata */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Label sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Extracted Metadata
                </Typography>
              </Box>

              {file.extracted_data && Object.keys(file.extracted_data).length > 0 ? (
                <List dense>
                  {Object.entries(file.extracted_data).map(([key, value]) => (
                    <ListItem key={key} sx={{ pl: 0 }}>
                      <ListItemText
                        primary={key}
                        secondary={String(value)}
                        primaryTypographyProps={{ variant: 'subtitle2' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No metadata extracted for this file. Try running pattern matching to extract structured data from the filename.
                </Typography>
              )}

              {file.pattern_id && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`Pattern ID: ${file.pattern_id}`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FileDetailsPage;