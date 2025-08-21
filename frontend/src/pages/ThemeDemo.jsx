/**
 * Theme Demo Page - Clear File Theme System
 * 새로운 테마 시스템의 기능들을 보여주는 데모 페이지
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Palette,
  Brightness4,
  Brightness7,
  Settings,
  Schedule,
  Code,
  Speed,
  Security
} from '@mui/icons-material';

import { 
  ThemeSwitcher, 
  useClearFileTheme,
  useThemeTokens,
  useThemeHelpers
} from '../themes/index.js';

const ThemeDemo = () => {
  const { theme, themeMode, resolvedMode, isDark } = useClearFileTheme();
  const tokens = useThemeTokens();
  const { spacing, colors, breakpoints, shadows } = useThemeHelpers();

  const demoFeatures = [
    {
      icon: <Palette />,
      title: 'Multi-Theme Support',
      description: 'Light, Dark, System, and Auto modes with smooth transitions',
      color: 'primary'
    },
    {
      icon: <Code />,
      title: 'Token System',
      description: 'Structured design tokens for consistent styling',
      color: 'secondary'
    },
    {
      icon: <Speed />,
      title: 'Performance Optimized',
      description: 'Efficient theme switching and caching mechanisms',
      color: 'success'
    },
    {
      icon: <Security />,
      title: 'Type Safe',
      description: 'Full TypeScript support with theme type definitions',
      color: 'info'
    }
  ];

  const colorPalette = [
    { name: 'Primary', color: colors.primary },
    { name: 'Secondary', color: colors.secondary },
    { name: 'Success', color: colors.success },
    { name: 'Warning', color: colors.warning },
    { name: 'Error', color: colors.error },
    { name: 'Info', color: colors.info }
  ];

  const spacingScale = [
    { name: 'Tight', value: spacing.tight, label: '4px' },
    { name: 'Element', value: spacing.element, label: '8px' },
    { name: 'Component', value: spacing.component, label: '16px' },
    { name: 'Page', value: spacing.page, label: '24px' },
    { name: 'Section', value: spacing.section, label: '32px' }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🎨 Theme System Demo
        </Typography>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Clear File 향상된 테마 시스템의 기능들을 체험해보세요
        </Typography>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>현재 활성 테마:</strong> {themeMode} 모드 
          (해석된 테마: {resolvedMode}) • {isDark ? '다크' : '라이트'} 테마 적용 중
        </Alert>
      </Box>

      {/* Theme Controls */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            테마 제어
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            다양한 테마 스위처 컴포넌트들을 체험해보세요
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Toggle Button
                </Typography>
                <ThemeSwitcher variant="button" />
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Switch Control
                </Typography>
                <ThemeSwitcher variant="toggle" />
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Menu Selector
                </Typography>
                <ThemeSwitcher variant="selector" />
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  With Label
                </Typography>
                <ThemeSwitcher variant="button" showLabel />
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* Features */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                주요 기능
              </Typography>
              
              <List>
                {demoFeatures.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Box color={`${feature.color}.main`}>
                        {feature.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={feature.title}
                      secondary={feature.description}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Color Palette */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                색상 팔레트
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                현재 테마의 색상 구성
              </Typography>
              
              <Grid container spacing={1}>
                {colorPalette.map((item) => (
                  <Grid item xs={6} key={item.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: item.color.main,
                          border: 1,
                          borderColor: 'divider'
                        }}
                      />
                      <Typography variant="body2">
                        {item.name}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Spacing Scale */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                스페이싱 스케일
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                8px 기반 그리드 시스템
              </Typography>
              
              {spacingScale.map((item) => (
                <Box key={item.name} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {item.label}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8,
                      width: item.value * 4, // 시각적 표현을 위해 4배
                      bgcolor: 'primary.main',
                      borderRadius: 1
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Components Showcase */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                컴포넌트 쇼케이스
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                테마 시스템이 적용된 UI 컴포넌트들
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Buttons
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="contained">Primary</Button>
                  <Button variant="outlined">Outlined</Button>
                  <Button variant="text">Text</Button>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Chips
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="Default" />
                  <Chip label="Primary" color="primary" />
                  <Chip label="Secondary" color="secondary" />
                  <Chip label="Success" color="success" />
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Progress
                </Typography>
                <LinearProgress variant="determinate" value={75} sx={{ mb: 1 }} />
                <LinearProgress color="secondary" variant="determinate" value={50} />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Alerts
                </Typography>
                <Alert severity="success" sx={{ mb: 1 }}>
                  This is a success alert!
                </Alert>
                <Alert severity="warning">
                  This is a warning alert!
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Technical Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                기술 세부사항
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="h6" gutterBottom>
                    Theme Mode
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`User Setting: ${themeMode}
Resolved Mode: ${resolvedMode}
Is Dark: ${isDark}`}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="h6" gutterBottom>
                    Breakpoints
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`xs: ${breakpoints.values.xs}px
sm: ${breakpoints.values.sm}px
md: ${breakpoints.values.md}px
lg: ${breakpoints.values.lg}px
xl: ${breakpoints.values.xl}px`}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="h6" gutterBottom>
                    Token Count
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`Base Tokens: ${Object.keys(tokens.base || {}).length}
Color Tokens: ${Object.keys(tokens.colors || {}).length}
Spacing Values: ${Object.keys(tokens.spacing || {}).length}
Typography Sizes: ${Object.keys(tokens.typography?.fontSizes || {}).length}`}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ThemeDemo;