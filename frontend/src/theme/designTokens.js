/**
 * Design Tokens - Clear File UI System
 * Standardized spacing, typography, colors, and layout tokens
 */

export const designTokens = {
  // Spacing System (8px base grid)
  spacing: {
    // Page-level spacing
    page: 24,        // 3 * 8px - Main page padding
    section: 32,     // 4 * 8px - Section spacing  
    component: 16,   // 2 * 8px - Component spacing
    element: 8,      // 1 * 8px - Element spacing
    tight: 4,        // 0.5 * 8px - Tight spacing
    
    // Semantic spacing
    headerBottom: 24,
    cardPadding: 16,
    listItemGap: 8,
    buttonGroup: 12,
    formField: 16
  },

  // Typography Scale
  typography: {
    // Font weights
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    
    // Line heights
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
      loose: 1.8
    },
    
    // Letter spacing
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em'
    }
  },

  // Color Semantic Mapping
  colors: {
    // Primary actions and focus
    primary: {
      main: '#1976d2',
      light: '#42a5f5', 
      dark: '#1565c0',
      contrastText: '#ffffff'
    },
    
    // Secondary actions
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff'
    },
    
    // Semantic colors
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff'
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#ffffff'
    },
    error: {
      main: '#d32f2f',
      light: '#f44336',
      dark: '#c62828',
      contrastText: '#ffffff'
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#ffffff'
    },
    
    // Text colors
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)'
    },
    
    // Background colors
    background: {
      default: '#fafafa',
      paper: '#ffffff',
      elevated: '#ffffff'
    },
    
    // Border colors
    divider: 'rgba(0, 0, 0, 0.12)',
    
    // Status indicators
    status: {
      online: '#4caf50',
      offline: '#f44336',
      pending: '#ff9800',
      processing: '#2196f3'
    }
  },

  // Layout Dimensions
  layout: {
    // Container widths
    maxWidth: 1400,
    contentMaxWidth: 1200,
    
    // Sidebar and navigation
    drawerWidth: 240,
    miniDrawerWidth: 56,
    
    // Header heights
    appBarHeight: 64,
    tabBarHeight: 48,
    
    // Border radius
    borderRadius: {
      small: 4,
      medium: 8,
      large: 12,
      round: 50
    },
    
    // Shadows (elevation)
    elevation: {
      none: 0,
      low: 1,
      medium: 2,
      high: 4,
      highest: 8
    }
  },

  // Breakpoints (Material-UI compatible)
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536
  },

  // Animation timing
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    
    // Easing functions
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
    }
  },

  // Z-index layers
  zIndex: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1020,
    banner: 1030,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    skipLink: 1070,
    toast: 1080,
    tooltip: 1090
  }
};

// Utility functions for design tokens
export const getSpacing = (multiplier = 1) => designTokens.spacing.element * multiplier;

export const getElevation = (level = 'medium') => designTokens.layout.elevation[level];

export const getBreakpoint = (size) => `${designTokens.breakpoints[size]}px`;

export const getColor = (color, variant = 'main') => {
  const colorObj = designTokens.colors[color];
  return colorObj?.[variant] || colorObj || color;
};

// Helper for responsive values
export const responsive = (values) => {
  const breakpoints = Object.keys(designTokens.breakpoints);
  const result = {};
  
  breakpoints.forEach((breakpoint, index) => {
    if (values[index] !== undefined) {
      result[breakpoint] = values[index];
    }
  });
  
  return result;
};

export default designTokens;