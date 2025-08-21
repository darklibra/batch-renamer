import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  FilePresent,
  Pattern,
  Analytics,
  Security,
  FolderOpen,
  Refresh
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

// New standardized components
import { PageContainer, PageContent, ResponsiveGrid } from '../components/layout/index.js';
import { DashboardHeader } from '../components/headers/index.js';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_files: 0,
    total_patterns: 0,
    files_with_metadata: 0,
    active_patterns: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const result = await dataProvider.getSystemOverview();
      setStats(result);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <PageContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </PageContent>
      </PageContainer>
    );
  }

  const statCards = [
    {
      title: 'Total Files',
      value: stats.total_files || 0,
      icon: <FilePresent color="primary" />,
      color: 'primary'
    },
    {
      title: 'Total Patterns',
      value: stats.total_patterns || 0,
      icon: <Pattern color="success" />,
      color: 'success'
    },
    {
      title: 'Files with Metadata',
      value: stats.files_with_metadata || 0,
      icon: <Analytics color="info" />,
      color: 'info'
    },
    {
      title: 'Active Patterns',
      value: stats.active_patterns || 0,
      icon: <Security color="warning" />,
      color: 'warning'
    }
  ];

  const quickActions = [
    {
      title: 'Scan Files',
      description: 'Scan new directories and discover files',
      action: () => navigate('/scanner'),
      color: 'primary',
      icon: <FolderOpen />
    },
    {
      title: 'View Files',
      description: 'Browse and manage existing files',
      action: () => navigate('/files'),
      color: 'success',
      icon: <FilePresent />
    },
    {
      title: 'Manage Patterns',
      description: 'Create and edit regex patterns',
      action: () => navigate('/pattern-manager'),
      color: 'warning',
      icon: <Pattern />
    },
    {
      title: 'View Patterns',
      description: 'Browse all available patterns',
      action: () => navigate('/patterns'),
      color: 'secondary',
      icon: <Analytics />
    }
  ];

  return (
    <PageContainer>
      {/* Enhanced Dashboard Header */}
      <DashboardHeader
        title="Clear File Dashboard"
        subtitle="Manage files, patterns, and organize your data efficiently"
        systemStatus="healthy"
        lastUpdated={new Date()}
        quickActions={[
          {
            label: 'Scan',
            icon: <FolderOpen />,
            onClick: () => navigate('/scanner'),
            variant: 'outlined',
            size: 'small'
          }
        ]}
        onRefresh={fetchStats}
        showSystemStatus={true}
        showLastUpdated={true}
      />

      <PageContent>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        <ResponsiveGrid
          breakpoints={{ xs: 1, sm: 2, md: 4, lg: 4 }}
          spacing={3}
        >
          {statCards.map((stat, index) => (
            <Card key={index} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 2 }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </ResponsiveGrid>

        {/* Quick Actions Section */}
        <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
          Quick Actions
        </Typography>
        <ResponsiveGrid
          breakpoints={{ xs: 1, sm: 2, md: 4, lg: 4 }}
          spacing={3}
        >
          {quickActions.map((action, index) => (
            <Card key={index} sx={{ height: '100%' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 1 }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6">
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph sx={{ flex: 1 }}>
                  {action.description}
                </Typography>
                <Button
                  variant="contained"
                  color={action.color}
                  onClick={action.action}
                  fullWidth
                >
                  {action.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </ResponsiveGrid>
      </PageContent>
    </PageContainer>
  );
};

export default Dashboard;