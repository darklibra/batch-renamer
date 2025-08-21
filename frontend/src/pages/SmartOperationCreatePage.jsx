import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Preview,
  Save,
  Warning
} from '@mui/icons-material';

import { PageHeader } from '../components/common';
import { PageContainer, PageContent } from '../components/layout/index.js';
import { CreateButton, BackButton } from '../components/common/ActionButtons';
import smartOperationsApi, { OPERATION_TYPE } from '../services/smartOperationsApi';
import dataProvider from '../dataProvider';

const steps = ['Basic Information', 'Pattern Selection', 'Target Configuration', 'Preview & Confirm'];

const SmartOperationCreatePage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    operation_type: OPERATION_TYPE.COPY,
    source_pattern_id: '',
    target_directory: '',
    target_template: '',
    created_by: 'user' // TODO: Get from auth context
  });

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      const response = await dataProvider.getList('patterns', {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: 'name', order: 'ASC' }
      });
      setPatterns(response.data.filter(pattern => pattern.is_active));
    } catch (err) {
      console.error('Failed to load patterns:', err);
      setError('Failed to load patterns');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear preview when key fields change
    if (['source_pattern_id', 'target_directory', 'target_template'].includes(field)) {
      setPreview(null);
    }
  };

  const validateStep = (stepIndex) => {
    switch (stepIndex) {
      case 0: // Basic Information
        return formData.name.trim() !== '' && formData.operation_type !== '';
      case 1: // Pattern Selection
        return formData.source_pattern_id !== '';
      case 2: // Target Configuration
        return formData.target_directory.trim() !== '' && formData.target_template.trim() !== '';
      case 3: // Preview & Confirm
        // Preview must exist and either have no warnings or warnings are acceptable
        return preview !== null && (!preview.warnings || preview.warnings.length === 0);
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (validateStep(activeStep)) {
      if (activeStep === 2) {
        // Generate preview before moving to final step
        try {
          await generatePreview();
          // Only advance to next step if preview generation succeeded
          setActiveStep(prev => prev + 1);
        } catch (error) {
          // Error is already handled in generatePreview, just don't advance
          console.error('Preview generation failed, staying on current step');
        }
      } else {
        // For other steps, advance immediately
        setActiveStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const generatePreview = async () => {
    setPreviewLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      const previewData = {
        source_pattern_id: parseInt(formData.source_pattern_id),
        target_directory: formData.target_directory,
        target_template: formData.target_template,
        limit: 10
      };

      const response = await smartOperationsApi.previewOperation(previewData);
      setPreview(response);
      
      // Return success to indicate the preview was generated successfully
      return response;
      
    } catch (err) {
      console.error('Failed to generate preview:', err);
      
      // Extract more specific error message
      let errorMessage = 'Failed to generate preview. Please check your configuration.';
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMessage = detail;
        
        // Check for common template placeholder typos
        if (detail.includes('Invalid template placeholders')) {
          if (detail.includes('extentions')) {
            errorMessage += '\n\nDid you mean "{extension}" instead of "{extentions}"?';
          } else if (detail.includes('extensions')) {
            errorMessage += '\n\nDid you mean "{extension}" instead of "{extensions}"?';
          } else if (detail.includes('file_name')) {
            errorMessage += '\n\nDid you mean "{filename}" instead of "{file_name}"?';
          } else if (detail.includes('file-name')) {
            errorMessage += '\n\nDid you mean "{filename}" instead of "{file-name}"?';
          }
        }
      }
      
      setError(errorMessage);
      setPreview(null); // Clear preview on error
      
      // Re-throw the error so handleNext knows it failed
      throw err;
      
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const operationData = {
        ...formData,
        source_pattern_id: parseInt(formData.source_pattern_id)
      };

      const response = await smartOperationsApi.createOperation(operationData);
      
      if (response.success) {
        navigate(`/smart-operations/${response.operation.id}`);
      } else {
        setError('Failed to create operation');
      }
    } catch (err) {
      console.error('Failed to create operation:', err);
      setError('Failed to create operation');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInformation = () => (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>Basic Operation Information</Typography>
        
        <TextField
          fullWidth
          label="Operation Name"
          placeholder="e.g., Organize Photos by Date"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          sx={{ mb: 3 }}
          required
        />

        <FormControl fullWidth required>
          <InputLabel>Operation Type</InputLabel>
          <Select
            value={formData.operation_type}
            label="Operation Type"
            onChange={(e) => handleInputChange('operation_type', e.target.value)}
          >
            <MenuItem value={OPERATION_TYPE.COPY}>
              Copy - Keep original files in place
            </MenuItem>
            <MenuItem value={OPERATION_TYPE.MOVE}>
              Move - Remove files from original location
            </MenuItem>
          </Select>
        </FormControl>
      </CardContent>
    </Card>
  );

  const renderPatternSelection = () => {
    const selectedPattern = patterns.find(p => p.id === parseInt(formData.source_pattern_id));
    
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Select Source Pattern</Typography>
          
          <FormControl fullWidth required sx={{ mb: 3 }}>
            <InputLabel>Pattern</InputLabel>
            <Select
              value={formData.source_pattern_id}
              label="Pattern"
              onChange={(e) => handleInputChange('source_pattern_id', e.target.value)}
            >
              {patterns.map(pattern => (
                <MenuItem key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedPattern && (
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Pattern Details:</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Regex:</strong> {selectedPattern.regex_pattern}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Available Fields:</strong>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.keys(selectedPattern.field_mapping).map(field => (
                  <Chip key={field} label={field} size="small" variant="outlined" />
                ))}
              </Box>
            </Paper>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTargetConfiguration = () => (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>Target Configuration</Typography>
        
        <TextField
          fullWidth
          label="Target Directory"
          placeholder="/path/to/organized/files"
          value={formData.target_directory}
          onChange={(e) => handleInputChange('target_directory', e.target.value)}
          sx={{ mb: 3 }}
          required
          helperText="Directory where files will be copied/moved to"
        />

        <TextField
          fullWidth
          label="Target Filename Template"
          placeholder="e.g., {name}_{start}_{end}.{extension}"
          value={formData.target_template}
          onChange={(e) => handleInputChange('target_template', e.target.value)}
          required
          helperText="Use placeholders: {name}, {extension}, {filename} and pattern fields. Example: {name}_{start}_{end}.{extension}"
        />

        <Button
          variant="outlined"
          startIcon={previewLoading ? <CircularProgress size={16} /> : <Preview />}
          onClick={generatePreview}
          disabled={!formData.source_pattern_id || !formData.target_directory || !formData.target_template || previewLoading}
          sx={{ mt: 2 }}
        >
          {previewLoading ? 'Generating Preview...' : 'Generate Preview'}
        </Button>

        {/* Preview Status Indicator */}
        {(preview || previewLoading) && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            {previewLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Generating preview for template validation...
                </Typography>
              </Box>
            )}
            
            {preview && !previewLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: preview.warnings?.length > 0 ? 'warning.main' : 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {preview.warnings?.length > 0 ? (
                    <Warning sx={{ fontSize: 14, color: 'white' }} />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: 'white' }}>✓</Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Preview ready: {preview.total_files} files found
                  {preview.warnings?.length > 0 && ` (${preview.warnings.length} warnings)`}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderPreviewAndConfirm = () => (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>Preview & Confirm</Typography>
        
        {previewLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CircularProgress size={20} />
            <Typography>Generating preview...</Typography>
          </Box>
        )}

        {preview && (
          <>
            {/* Summary */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Operation Summary</Typography>
              <Typography variant="body2">
                <strong>{formData.operation_type === OPERATION_TYPE.COPY ? 'Copy' : 'Move'}</strong> {preview.total_files} files using pattern "<strong>{preview.pattern_name}</strong>"
              </Typography>
              <Typography variant="body2">
                Target: {preview.target_directory}
              </Typography>
            </Paper>

            {/* Warnings */}
            {preview.warnings && preview.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle2">Warnings:</Typography>
                {preview.warnings.map((warning, index) => (
                  <Typography key={index} variant="body2">• {warning}</Typography>
                ))}
              </Alert>
            )}

            {/* Sample Files */}
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Sample Files ({preview.sample_files.length} of {preview.total_files}):</Typography>
            <List sx={{ bgcolor: 'grey.50', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
              {preview.sample_files.map((file, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={file.source_filename}
                    secondary={`→ ${file.target_path}`}
                    primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    secondaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace', color: 'primary.main' }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {!preview && !previewLoading && (
          <Alert severity="info">
            Please generate a preview to continue.
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderBasicInformation();
      case 1:
        return renderPatternSelection();
      case 2:
        return renderTargetConfiguration();
      case 3:
        return renderPreviewAndConfirm();
      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Create Smart Operation"
        subtitle="Set up automated file copy or move operations based on patterns"
        primaryAction={{
          label: "Back to Operations",
          onClick: () => navigate('/smart-operations'),
          icon: <ArrowBack />
        }}
      />

      <PageContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === steps.length - 1 ? (
            <CreateButton
              onClick={handleSubmit}
              disabled={!validateStep(activeStep) || loading}
              loading={loading}
              label="Create Operation"
              icon={<Save />}
            />
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validateStep(activeStep) || (activeStep === 2 && previewLoading)}
              startIcon={activeStep === 2 && previewLoading ? <CircularProgress size={16} /> : null}
            >
              {activeStep === 2 && previewLoading ? 'Generating Preview...' : 'Next'}
            </Button>
          )}
        </Box>
      </Box>
      </PageContent>
    </PageContainer>
  );
};

export default SmartOperationCreatePage;