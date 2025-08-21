/**
 * Light Theme Tokens - Clear File Theme System
 * 라이트 테마 전용 색상 및 스타일 토큰들
 */

export const lightTokens = {
  // Color palette
  colors: {
    // Primary colors (Blue)
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff'
    },
    
    // Secondary colors (Pink)
    secondary: {
      50: '#fce4ec',
      100: '#f8bbd9',
      200: '#f48fb1',
      300: '#f06292',
      400: '#ec407a',
      500: '#e91e63',
      600: '#d81b60',
      700: '#c2185b',
      800: '#ad1457',
      900: '#880e4f',
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff'
    },
    
    // Success colors (Green)
    success: {
      50: '#e8f5e8',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50',
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20',
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff'
    },
    
    // Warning colors (Orange)
    warning: {
      50: '#fff3e0',
      100: '#ffe0b2',
      200: '#ffcc80',
      300: '#ffb74d',
      400: '#ffa726',
      500: '#ff9800',
      600: '#fb8c00',
      700: '#f57c00',
      800: '#ef6c00',
      900: '#e65100',
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#ffffff'
    },
    
    // Error colors (Red)
    error: {
      50: '#ffebee',
      100: '#ffcdd2',
      200: '#ef9a9a',
      300: '#e57373',
      400: '#ef5350',
      500: '#f44336',
      600: '#e53935',
      700: '#d32f2f',
      800: '#c62828',
      900: '#b71c1c',
      main: '#d32f2f',
      light: '#f44336',
      dark: '#c62828',
      contrastText: '#ffffff'
    },
    
    // Info colors (Light Blue)
    info: {
      50: '#e1f5fe',
      100: '#b3e5fc',
      200: '#81d4fa',
      300: '#4fc3f7',
      400: '#29b6f6',
      500: '#03a9f4',
      600: '#039be5',
      700: '#0288d1',
      800: '#0277bd',
      900: '#01579b',
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#ffffff'
    },

    // Grey scale
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121'
    },

    // Text colors
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
      hint: 'rgba(0, 0, 0, 0.38)'
    },
    
    // Background colors
    background: {
      default: '#fafafa',
      paper: '#ffffff',
      elevated: '#ffffff',
      surface: '#f5f5f5'
    },
    
    // Action colors
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
      focus: 'rgba(0, 0, 0, 0.12)'
    },
    
    // Divider
    divider: 'rgba(0, 0, 0, 0.12)',
    
    // Status indicators
    status: {
      online: '#4caf50',
      offline: '#f44336',
      pending: '#ff9800',
      processing: '#2196f3',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3'
    }
  },

  // Light theme specific shadows
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    cardHover: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
    elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    dialog: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    tooltip: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }
};

export default lightTokens;