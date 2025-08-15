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
  Grid,
  TextField
} from '@mui/material';
import {
  ArrowBack,
  Pattern,
  CalendarToday,
  Edit,
  CheckCircle,
  Cancel,
  Code,
  Label
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

const PatternDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pattern, setPattern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (id) {
      fetchPattern();
    }
  }, [id]);

  const fetchPattern = async () => {
    try {
      setLoading(true);
      const result = await dataProvider.getOne('patterns', { id });
      setPattern(result.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch pattern:', error);
      setError('Failed to load pattern details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    if (priority >= 8) return 'error';
    if (priority >= 5) return 'warning';
    if (priority >= 3) return 'info';
    return 'default';
  };

  const handleTestPattern = () => {
    if (!testInput || !pattern) return;

    try {
      const regex = new RegExp(pattern.regex_pattern);
      const match = regex.exec(testInput);
      
      if (match) {
        const result = {};
        if (pattern.field_mapping && typeof pattern.field_mapping === 'object') {
          Object.entries(pattern.field_mapping).forEach(([field, groupIndex]) => {
            if (match[groupIndex]) {
              result[field] = match[groupIndex];
            }
          });
        }
        setTestResult({ success: true, match: result, groups: match });
      } else {
        setTestResult({ success: false, message: 'No match found' });
      }
    } catch (error) {
      setTestResult({ success: false, message: `Regex error: ${error.message}` });
    }
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
          onClick={() => navigate('/patterns')}
          sx={{ mb: 2 }}
        >
          Back to Patterns
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!pattern) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/patterns')}
          sx={{ mb: 2 }}
        >
          Back to Patterns
        </Button>
        <Alert severity="warning">Pattern not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/patterns')}
        >
          Back to Patterns
        </Button>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => navigate('/pattern-manager')}
        >
          Edit Pattern
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Pattern Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Pattern sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4">
                    {pattern.name}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Chip
                      label={`Priority ${pattern.priority || 1}`}
                      size="small"
                      color={getPriorityColor(pattern.priority)}
                    />
                    <Chip
                      icon={pattern.is_active ? <CheckCircle /> : <Cancel />}
                      label={pattern.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={pattern.is_active ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <List>
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Regex Pattern
                  </Typography>
                  <TextField
                    value={pattern.regex_pattern}
                    multiline
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      style: { fontFamily: 'monospace' }
                    }}
                    size="small"
                  />
                </ListItem>

                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Created
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarToday sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      {formatDate(pattern.created_at)}
                    </Typography>
                  </Box>
                </ListItem>

                {pattern.updated_at && (
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Last Updated
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarToday sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="body2">
                        {formatDate(pattern.updated_at)}
                      </Typography>
                    </Box>
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Pattern Tester */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Pattern
              </Typography>
              <TextField
                fullWidth
                label="Test Input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter a filename to test..."
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                onClick={handleTestPattern}
                disabled={!testInput}
                sx={{ mb: 2 }}
              >
                Test Pattern
              </Button>

              {testResult && (
                <Box sx={{ mt: 2 }}>
                  {testResult.success ? (
                    <Alert severity="success">
                      <Typography variant="subtitle2" gutterBottom>
                        Pattern matched successfully!
                      </Typography>
                      {testResult.match && Object.keys(testResult.match).length > 0 ? (
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            Extracted fields:
                          </Typography>
                          {Object.entries(testResult.match).map(([field, value]) => (
                            <Chip
                              key={field}
                              label={`${field}: ${value}`}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2">
                          Pattern matched but no fields were extracted.
                        </Typography>
                      )}
                    </Alert>
                  ) : (
                    <Alert severity="error">
                      {testResult.message}
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Field Mapping */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Label sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Field Mapping
                </Typography>
              </Box>

              {pattern.field_mapping && Object.keys(pattern.field_mapping).length > 0 ? (
                <List dense>
                  {Object.entries(pattern.field_mapping).map(([field, groupIndex]) => (
                    <ListItem key={field} sx={{ pl: 0 }}>
                      <ListItemText
                        primary={field}
                        secondary={`Group ${groupIndex}`}
                        primaryTypographyProps={{ variant: 'subtitle2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No field mapping configured. Add field mappings to extract structured data from matches.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatternDetailsPage;