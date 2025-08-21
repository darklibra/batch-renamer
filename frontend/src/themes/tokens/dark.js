/**
 * Dark Theme Tokens - Clear File Theme System
 * 다크 테마 전용 색상 및 스타일 토큰들
 */

export const darkTokens = {
  // Color palette
  colors: {
    // Primary colors (Light Blue for dark theme)
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
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: '#000000'
    },
    
    // Secondary colors (Light Pink for dark theme)
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
      main: '#f48fb1',
      light: '#fce4ec',
      dark: '#e91e63',
      contrastText: '#000000'
    },
    
    // Success colors (Light Green)
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
      main: '#81c784',
      light: '#a5d6a7',
      dark: '#388e3c',
      contrastText: '#000000'
    },
    
    // Warning colors (Light Orange)
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
      main: '#ffb74d',
      light: '#ffe0b2',
      dark: '#f57c00',
      contrastText: '#000000'
    },
    
    // Error colors (Light Red)
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
      main: '#ef5350',
      light: '#ffcdd2',
      dark: '#c62828',
      contrastText: '#000000'
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
      main: '#4fc3f7',
      light: '#81d4fa',
      dark: '#0277bd',
      contrastText: '#000000'
    },

    // Grey scale (inverted for dark theme)
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

    // Text colors (light text on dark background)
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.38)',
      hint: 'rgba(255, 255, 255, 0.38)'
    },
    
    // Background colors (dark backgrounds)
    background: {
      default: '#121212',
      paper: '#1e1e1e',
      elevated: '#2a2a2a',
      surface: '#262626'
    },
    
    // Action colors (adjusted for dark theme)
    action: {
      active: 'rgba(255, 255, 255, 0.54)',
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.08)',
      disabled: 'rgba(255, 255, 255, 0.26)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
      focus: 'rgba(255, 255, 255, 0.12)'
    },
    
    // Divider (light divider on dark background)
    divider: 'rgba(255, 255, 255, 0.12)',
    
    // Status indicators (adjusted for dark theme)
    status: {
      online: '#81c784',
      offline: '#ef5350',
      pending: '#ffb74d',
      processing: '#4fc3f7',
      success: '#81c784',
      warning: '#ffb74d',
      error: '#ef5350',
      info: '#4fc3f7'
    }
  },

  // Dark theme specific shadows
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.7)',
    cardHover: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.4)',
    elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    dialog: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
    tooltip: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
  }
};

export default darkTokens;