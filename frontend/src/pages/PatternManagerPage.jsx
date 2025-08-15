import React from 'react';
import { Box, Typography } from '@mui/material';
import PatternManager from '../components/PatternManager.jsx';

const PatternManagerPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pattern Manager
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Create, test, and manage regex patterns for extracting structured data from filenames.
      </Typography>
      <PatternManager />
    </Box>
  );
};

export default PatternManagerPage;