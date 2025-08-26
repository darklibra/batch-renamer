/**
 * Grid Consistency Guide - Clear File System
 * Provides standardized grid usage patterns and recommendations
 */

import React from 'react';
import { Box, Typography, Alert, Chip } from '@mui/material';

/**
 * Grid Usage Guide Component
 * Shows developers which grid component to use when
 */
export const GridUsageGuide = () => {
  const gridTypes = [
    {
      component: 'UniformGrid',
      use: 'Dashboard cards, metrics, stat displays',
      description: 'Perfect width consistency, uniform heights, ideal for cards with similar content',
      example: 'Dashboard statistics cards, KPI cards',
      color: 'success'
    },
    {
      component: 'ResponsiveGrid',
      use: 'General content with flexible widths',
      description: 'Good for mixed content where items may have different widths',
      example: 'Content lists, mixed media galleries',
      color: 'info'
    },
    {
      component: 'CardGrid',
      use: 'Card layouts with minimum width constraints',
      description: 'Auto-fit grid with minimum and maximum width constraints',
      example: 'Product cards, portfolio items',
      color: 'warning'
    },
    {
      component: 'FlexGrid',
      use: 'Complex layouts requiring flex properties',
      description: 'Maximum flexibility for complex alignment needs',
      example: 'Navigation bars, complex forms',
      color: 'secondary'
    }
  ];

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Grid Component Selection Guide
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Use <strong>UniformGrid</strong> for dashboard sections to ensure perfect width consistency
      </Alert>

      {gridTypes.map((type, index) => (
        <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Chip label={type.component} color={type.color} size="small" sx={{ mr: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {type.use}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {type.description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Examples: {type.example}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Width Consistency Rules
 */
export const WidthConsistencyRules = {
  // Dashboard sections should use identical column configurations
  DASHBOARD_STATS: { xs: 1, sm: 2, md: 4, lg: 4 },
  DASHBOARD_ACTIONS: { xs: 1, sm: 2, md: 2, lg: 4 },
  
  // Job statistics
  JOB_STATS: { xs: 1, sm: 2, md: 3, lg: 6 },
  
  // General metrics
  METRICS_2_COL: { xs: 1, sm: 2, md: 2, lg: 2 },
  METRICS_3_COL: { xs: 1, sm: 2, md: 3, lg: 3 },
  METRICS_4_COL: { xs: 1, sm: 2, md: 4, lg: 4 },
  
  // Content grids
  CONTENT_RESPONSIVE: { xs: 1, sm: 2, md: 3, lg: 4 },
  CONTENT_WIDE: { xs: 1, sm: 2, md: 2, lg: 3 },
};

export default GridUsageGuide;