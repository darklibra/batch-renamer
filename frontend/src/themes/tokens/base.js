/**
 * Base Design Tokens - Clear File Theme System
 * 모든 테마에서 공통으로 사용되는 기반 토큰들
 */

export const baseTokens = {
  // Spacing System (8px 기반 그리드)
  spacing: {
    // Core spacing values
    unit: 8,             // 기본 단위
    
    // Page-level spacing
    page: 16,            // 2 * 8px - Main page padding (reduced from 24)
    section: 24,         // 3 * 8px - Section spacing (reduced from 32)
    component: 12,       // 1.5 * 8px - Component spacing (reduced from 16)
    element: 6,          // 0.75 * 8px - Element spacing (reduced from 8)
    tight: 4,            // 0.5 * 8px - Tight spacing
    
    // Semantic spacing
    headerBottom: 16,      // reduced from 24
    cardPadding: 12,       // reduced from 16
    listItemGap: 6,        // reduced from 8
    buttonGroup: 8,        // reduced from 12
    formField: 12          // reduced from 16
  },

  // Typography Scale
  typography: {
    // Font families
    fontFamily: {
      primary: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
      mono: [
        '"Fira Code"',
        '"SF Mono"',
        'Monaco',
        '"Cascadia Code"',
        '"Roboto Mono"',
        'Consolas',
        '"Courier New"',
        'monospace'
      ].join(',')
    },

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
    },

    // Font sizes
    fontSizes: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem'       // 48px
    }
  },

  // Layout 차원
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
      none: 0,
      small: 4,
      medium: 8,
      large: 12,
      xl: 16,
      '2xl': 24,
      '3xl': 32,
      round: 50,
      full: 9999
    },
    
    // Shadows (elevation)
    elevation: {
      none: 0,
      low: 1,
      medium: 2,
      high: 4,
      highest: 8,
      dialog: 12,
      tooltip: 16
    }
  },

  // Breakpoints (Material-UI 호환)
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536
  },

  // Animation timing
  animation: {
    // Duration
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms'
    },
    
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

export default baseTokens;