import React from 'react';
import { Add } from '@mui/icons-material';
import { PageHeader } from '../components/common';
import { PageContainer, PageContent } from '../components/layout/index.js';
import PatternManager from '../components/PatternManager.jsx';

const PatternManagerPage = () => {
  const handleCreatePattern = () => {
    // This will be handled by the PatternManager component's create functionality
    const createButton = document.querySelector('[data-testid="create-pattern-button"]');
    if (createButton) {
      createButton.click();
    }
  };

  return (
    <PageContainer widthMode="wide">
      <PageHeader
        title="Pattern Manager"
        subtitle="Create, test, and manage regex patterns for extracting structured data from filenames"
        primaryAction={{
          label: "Create Pattern",
          onClick: handleCreatePattern,
          icon: <Add />
        }}
      />
      <PageContent>
        <PatternManager />
      </PageContent>
    </PageContainer>
  );
};

export default PatternManagerPage;