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
    <PageContainer widthMode="full">
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
            <Card 
              key={index} 
              sx={{ 
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: (theme) => theme.shadows[4]
                }
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  flexDirection: { xs: 'column', sm: 'row' },
                  textAlign: { xs: 'center', sm: 'left' },
                  gap: { xs: 1, sm: 2 }
                }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: { xs: 48, md: 56 },
                    height: { xs: 48, md: 56 },
                    borderRadius: 2,
                    backgroundColor: `${stat.color}.light`,
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.5rem', md: '2rem' }
                    }
                  }}>
                    {stat.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '2rem', md: '2.5rem' },
                        lineHeight: 1,
                        color: 'text.primary',
                        mb: 0.5
                      }}
                    >
                      {stat.value.toLocaleString()}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 500,
                        fontSize: { xs: '0.875rem', md: '1rem' }
                      }}
                    >
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </ResponsiveGrid>

        {/* Quick Actions Section */}
        <Box sx={{ mt: { xs: 4, md: 6 } }}>
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 3,
              fontWeight: 600,
              fontSize: { xs: '1.5rem', md: '2rem' },
              color: 'text.primary'
            }}
          >
            Quick Actions
          </Typography>
          <ResponsiveGrid
            breakpoints={{ xs: 1, sm: 2, md: 2, lg: 4 }}
            spacing={3}
          >
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[6],
                    borderColor: `${action.color}.main`,
                    '& .action-icon': {
                      transform: 'scale(1.1)',
                      color: `${action.color}.main`
                    }
                  }
                }}
                onClick={action.action}
              >
                <CardContent sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  p: { xs: 2, md: 3 },
                  textAlign: 'center'
                }}>
                  <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 2
                  }}>
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: { xs: 56, md: 64 },
                      height: { xs: 56, md: 64 },
                      borderRadius: '50%',
                      backgroundColor: `${action.color}.light`,
                      transition: 'all 0.2s ease-in-out',
                      '& .MuiSvgIcon-root': {
                        fontSize: { xs: '2rem', md: '2.5rem' }
                      }
                    }}
                    className="action-icon"
                    >
                      {action.icon}
                    </Box>
                  </Box>
                  
                  <Typography 
                    variant="h6"
                    sx={{
                      mb: 1,
                      fontWeight: 600,
                      fontSize: { xs: '1.1rem', md: '1.25rem' },
                      color: 'text.primary'
                    }}
                  >
                    {action.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    sx={{
                      color: 'text.secondary',
                      flex: 1,
                      mb: 3,
                      lineHeight: 1.5,
                      fontSize: { xs: '0.875rem', md: '0.9rem' }
                    }}
                  >
                    {action.description}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color={action.color}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.action();
                    }}
                    fullWidth
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      py: { xs: 1, md: 1.5 },
                      fontSize: { xs: '0.875rem', md: '0.95rem' },
                      textTransform: 'none'
                    }}
                  >
                    {action.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </Box>
      </PageContent>
    </PageContainer>
  );
};

export default Dashboard;