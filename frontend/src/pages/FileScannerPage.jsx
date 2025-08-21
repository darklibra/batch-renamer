import React from 'react';
import { PageHeader } from '../components/common';
import { PageContainer, PageContent } from '../components/layout/index.js';
import FileScanner from '../components/FileScanner.jsx';

const FileScannerPage = () => {
  return (
    <PageContainer>
      <PageHeader
        title="File Scanner"
        subtitle="Scan directories to discover and index files for pattern matching and metadata extraction."
      />
      <PageContent>
        <FileScanner />
      </PageContent>
    </PageContainer>
  );
};

export default FileScannerPage;