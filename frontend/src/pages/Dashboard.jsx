import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  FilePresent,
  Pattern,
  Analytics,
  Security,
  FolderOpen
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

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

  useEffect(() => {
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
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Clear File Dashboard
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
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
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" gutterBottom>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 1 }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6">
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
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
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;