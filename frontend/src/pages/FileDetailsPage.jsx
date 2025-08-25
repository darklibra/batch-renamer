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
  Label,
  DataObject
} from '@mui/icons-material';
import dataProvider from '../dataProvider';
import MetadataExtractor from '../components/MetadataExtractor';
import MetadataViewer from '../components/MetadataViewer';

const FileDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [metadataRefreshKey, setMetadataRefreshKey] = useState(0);

  useEffect(() => {
    if (id) {
      fetchFile();
      fetchExtractedData();
    }
  }, [id, metadataRefreshKey]);

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

  const fetchExtractedData = async () => {
    try {
      const result = await dataProvider.getFileExtractedData(id, false);
      setExtractedData(result);
    } catch (error) {
      // No extracted data available - that's okay
      // No extracted data found for file: id
      setExtractedData(null);
    }
  };

  const handleExtractionComplete = (data) => {
    setExtractedData(data);
    setMetadataRefreshKey(prev => prev + 1);
  };

  const handleExtractionError = (error) => {
    console.error('Extraction error:', error);
    // You could show a toast notification here
  };

  const handleMetadataUpdate = (updatedData) => {
    setExtractedData(updatedData);
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
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Full Path
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Folder sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      {file.full_path}
                    </Typography>
                  </Box>
                </ListItem>
                
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Directory
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Folder sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      {file.path}
                    </Typography>
                  </Box>
                </ListItem>

                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Created
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarToday sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      {formatDate(file.created_at)}
                    </Typography>
                  </Box>
                </ListItem>

                {file.updated_at && (
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Last Updated
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarToday sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="body2">
                        {formatDate(file.updated_at)}
                      </Typography>
                    </Box>
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Basic File Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Label sx={{ mr: 1 }} />
                <Typography variant="h6">
                  File Info
                </Typography>
              </Box>

              <List dense>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primary="File Size"
                    secondary={file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Unknown'}
                    primaryTypographyProps={{ variant: 'subtitle2' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primary="Extension"
                    secondary={file.extension || 'No extension'}
                    primaryTypographyProps={{ variant: 'subtitle2' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primary="Directory"
                    secondary={file.path || 'Unknown'}
                    primaryTypographyProps={{ variant: 'subtitle2' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>

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

        {/* Metadata Extraction Section */}
        <Grid item xs={12}>
          <MetadataExtractor
            fileId={parseInt(id)}
            fileName={file.filename}
            onExtractionComplete={handleExtractionComplete}
            onError={handleExtractionError}
          />
        </Grid>

        {/* Metadata Viewer Section */}
        <Grid item xs={12}>
          <MetadataViewer
            fileId={parseInt(id)}
            fileName={file.filename}
            extractedData={extractedData}
            onDataUpdate={handleMetadataUpdate}
          />
        </Grid>

      </Grid>
    </Box>
  );
};

export default FileDetailsPage;