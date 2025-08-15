import React from 'react';
import { Box, Typography } from '@mui/material';
import FileScanner from '../components/FileScanner.jsx';

const FileScannerPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Scanner
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Scan directories to discover and index files for pattern matching and metadata extraction.
      </Typography>
      <FileScanner />
    </Box>
  );
};

export default FileScannerPage;