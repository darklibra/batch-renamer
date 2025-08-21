/**
 * Theme Factory - Clear File Theme System
 * Material-UI 테마를 토큰 계층구조로부터 동적 생성하는 팩토리
 */

import { createTheme } from '@mui/material/styles';
import { baseTokens } from '../tokens/base.js';
import { lightTokens } from '../tokens/light.js';
import { darkTokens } from '../tokens/dark.js';

/**
 * 토큰으로부터 Material-UI 테마 팔레트 생성
 * @param {Object} colorTokens - 색상 토큰 (light 또는 dark)
 * @returns {Object} Material-UI 팔레트 구성
 */
const createPalette = (colorTokens) => ({
  mode: colorTokens === lightTokens ? 'light' : 'dark',
  primary: colorTokens.colors.primary,
  secondary: colorTokens.colors.secondary,
  error: colorTokens.colors.error,
  warning: colorTokens.colors.warning,
  info: colorTokens.colors.info,
  success: colorTokens.colors.success,
  grey: colorTokens.colors.grey,
  text: colorTokens.colors.text,
  background: colorTokens.colors.background,
  action: colorTokens.colors.action,
  divider: colorTokens.colors.divider,
});

/**
 * 기본 토큰으로부터 Typography 설정 생성
 * @returns {Object} Material-UI Typography 구성
 */
const createTypography = () => ({
  fontFamily: baseTokens.typography.fontFamily.primary,
  fontWeightLight: baseTokens.typography.weights.light,
  fontWeightRegular: baseTokens.typography.weights.regular,
  fontWeightMedium: baseTokens.typography.weights.medium,
  fontWeightBold: baseTokens.typography.weights.bold,
  
  // Font sizes mapping
  h1: {
    fontSize: baseTokens.typography.fontSizes['5xl'],
    fontWeight: baseTokens.typography.weights.bold,
    lineHeight: baseTokens.typography.lineHeights.tight,
    letterSpacing: baseTokens.typography.letterSpacing.tight,
  },
  h2: {
    fontSize: baseTokens.typography.fontSizes['4xl'],
    fontWeight: baseTokens.typography.weights.bold,
    lineHeight: baseTokens.typography.lineHeights.tight,
    letterSpacing: baseTokens.typography.letterSpacing.tight,
  },
  h3: {
    fontSize: baseTokens.typography.fontSizes['3xl'],
    fontWeight: baseTokens.typography.weights.semibold,
    lineHeight: baseTokens.typography.lineHeights.tight,
  },
  h4: {
    fontSize: baseTokens.typography.fontSizes['2xl'],
    fontWeight: baseTokens.typography.weights.semibold,
    lineHeight: baseTokens.typography.lineHeights.normal,
  },
  h5: {
    fontSize: baseTokens.typography.fontSizes.xl,
    fontWeight: baseTokens.typography.weights.medium,
    lineHeight: baseTokens.typography.lineHeights.normal,
  },
  h6: {
    fontSize: baseTokens.typography.fontSizes.lg,
    fontWeight: baseTokens.typography.weights.medium,
    lineHeight: baseTokens.typography.lineHeights.normal,
  },
  subtitle1: {
    fontSize: baseTokens.typography.fontSizes.base,
    fontWeight: baseTokens.typography.weights.medium,
    lineHeight: baseTokens.typography.lineHeights.normal,
  },
  subtitle2: {
    fontSize: baseTokens.typography.fontSizes.sm,
    fontWeight: baseTokens.typography.weights.medium,
    lineHeight: baseTokens.typography.lineHeights.normal,
  },
  body1: {
    fontSize: baseTokens.typography.fontSizes.base,
    fontWeight: baseTokens.typography.weights.regular,
    lineHeight: baseTokens.typography.lineHeights.relaxed,
  },
  body2: {
    fontSize: baseTokens.typography.fontSizes.sm,
    fontWeight: baseTokens.typography.weights.regular,
    lineHeight: baseTokens.typography.lineHeights.normal,
  },
  caption: {
    fontSize: baseTokens.typography.fontSizes.xs,
    fontWeight: baseTokens.typography.weights.regular,
    lineHeight: baseTokens.typography.lineHeights.normal,
  },
  overline: {
    fontSize: baseTokens.typography.fontSizes.xs,
    fontWeight: baseTokens.typography.weights.medium,
    lineHeight: baseTokens.typography.lineHeights.normal,
    textTransform: 'uppercase',
    letterSpacing: baseTokens.typography.letterSpacing.wide,
  }
});

/**
 * 기본 토큰으로부터 Spacing 설정 생성
 * @returns {Function} Material-UI spacing function
 */
const createSpacing = () => (factor) => baseTokens.spacing.unit * factor;

/**
 * 기본 토큰으로부터 Breakpoints 설정 생성
 * @returns {Object} Material-UI breakpoints 구성
 */
const createBreakpoints = () => ({
  values: baseTokens.breakpoints
});

/**
 * 기본 토큰으로부터 Shape 설정 생성
 * @returns {Object} Material-UI shape 구성
 */
const createShape = () => ({
  borderRadius: baseTokens.layout.borderRadius.medium
});

/**
 * 기본 토큰으로부터 Shadows 설정 생성
 * @param {Object} colorTokens - 색상 토큰 (light 또는 dark)
 * @returns {Array} Material-UI shadows 배열
 */
const createShadows = (colorTokens) => [
  'none',
  colorTokens.shadows.card,
  colorTokens.shadows.cardHover,
  colorTokens.shadows.elevated,
  colorTokens.shadows.elevated,
  colorTokens.shadows.elevated,
  colorTokens.shadows.elevated,
  colorTokens.shadows.elevated,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog,
  colorTokens.shadows.dialog
];

/**
 * 기본 토큰으로부터 Transitions 설정 생성
 * @returns {Object} Material-UI transitions 구성
 */
const createTransitions = () => ({
  duration: {
    shortest: parseInt(baseTokens.animation.duration.fast),
    shorter: parseInt(baseTokens.animation.duration.normal),
    short: parseInt(baseTokens.animation.duration.slow),
    standard: parseInt(baseTokens.animation.duration.normal),
    complex: parseInt(baseTokens.animation.duration.slower),
    enteringScreen: parseInt(baseTokens.animation.duration.slow),
    leavingScreen: parseInt(baseTokens.animation.duration.normal),
  },
  easing: {
    easeInOut: baseTokens.animation.easing.easeInOut,
    easeOut: baseTokens.animation.easing.easeOut,
    easeIn: baseTokens.animation.easing.easeIn,
    sharp: baseTokens.animation.easing.sharp,
  }
});

/**
 * 기본 토큰으로부터 Z-Index 설정 생성
 * @returns {Object} Material-UI zIndex 구성
 */
const createZIndex = () => ({
  mobileStepper: baseTokens.zIndex.docked,
  fab: baseTokens.zIndex.dropdown,
  speedDial: baseTokens.zIndex.dropdown,
  appBar: baseTokens.zIndex.sticky,
  drawer: baseTokens.zIndex.overlay,
  modal: baseTokens.zIndex.modal,
  snackbar: baseTokens.zIndex.toast,
  tooltip: baseTokens.zIndex.tooltip,
});

/**
 * 컴포넌트별 스타일 오버라이드 생성
 * @param {Object} colorTokens - 색상 토큰
 * @returns {Object} Material-UI components 오버라이드
 */
const createComponentOverrides = (colorTokens) => ({
  // Card 컴포넌트 스타일링
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: baseTokens.layout.borderRadius.large,
        boxShadow: colorTokens.shadows.card,
        transition: `box-shadow ${baseTokens.animation.duration.normal} ${baseTokens.animation.easing.easeInOut}`,
        '&:hover': {
          boxShadow: colorTokens.shadows.cardHover,
        }
      }
    }
  },

  // Button 컴포넌트 스타일링
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: baseTokens.layout.borderRadius.medium,
        fontWeight: baseTokens.typography.weights.medium,
        textTransform: 'none',
        padding: `${baseTokens.spacing.element}px ${baseTokens.spacing.component}px`,
        transition: `all ${baseTokens.animation.duration.normal} ${baseTokens.animation.easing.easeInOut}`,
      },
      sizeLarge: {
        padding: `${baseTokens.spacing.component}px ${baseTokens.spacing.page}px`,
        fontSize: baseTokens.typography.fontSizes.lg,
      },
      sizeSmall: {
        padding: `${baseTokens.spacing.tight}px ${baseTokens.spacing.element}px`,
        fontSize: baseTokens.typography.fontSizes.sm,
      }
    }
  },

  // Paper 컴포넌트 스타일링
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: baseTokens.layout.borderRadius.medium,
      },
      elevation1: {
        boxShadow: colorTokens.shadows.card,
      },
      elevation2: {
        boxShadow: colorTokens.shadows.cardHover,
      },
      elevation4: {
        boxShadow: colorTokens.shadows.elevated,
      },
      elevation8: {
        boxShadow: colorTokens.shadows.dialog,
      }
    }
  },

  // Chip 컴포넌트 스타일링
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: baseTokens.layout.borderRadius.full,
        fontWeight: baseTokens.typography.weights.medium,
      }
    }
  },

  // Container 컴포넌트 스타일링
  MuiContainer: {
    styleOverrides: {
      root: {
        paddingLeft: `${baseTokens.spacing.page}px`,
        paddingRight: `${baseTokens.spacing.page}px`,
      },
      maxWidthLg: {
        maxWidth: `${baseTokens.layout.maxWidth}px !important`,
      }
    }
  },

  // AppBar 컴포넌트 스타일링
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: colorTokens.shadows.card,
        height: `${baseTokens.layout.appBarHeight}px`,
      }
    }
  },

  // Drawer 컴포넌트 스타일링
  MuiDrawer: {
    styleOverrides: {
      paper: {
        width: `${baseTokens.layout.drawerWidth}px`,
        boxShadow: colorTokens.shadows.elevated,
      }
    }
  },

  // Dialog 컴포넌트 스타일링
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: baseTokens.layout.borderRadius.large,
        boxShadow: colorTokens.shadows.dialog,
      }
    }
  },

  // Tooltip 컴포넌트 스타일링
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: baseTokens.layout.borderRadius.medium,
        boxShadow: colorTokens.shadows.tooltip,
        fontSize: baseTokens.typography.fontSizes.sm,
      }
    }
  }
});

/**
 * 테마 팩토리 - 토큰으로부터 완전한 Material-UI 테마 생성
 * @param {'light'|'dark'} mode - 테마 모드
 * @param {Object} customOverrides - 사용자 정의 오버라이드 (선택사항)
 * @returns {Object} 완전한 Material-UI 테마 객체
 */
export const createClearFileTheme = (mode = 'light', customOverrides = {}) => {
  // 모드에 따른 색상 토큰 선택
  const colorTokens = mode === 'dark' ? darkTokens : lightTokens;
  
  // 기본 테마 생성
  const baseTheme = createTheme({
    palette: createPalette(colorTokens),
    typography: createTypography(),
    spacing: createSpacing(),
    breakpoints: createBreakpoints(),
    shape: createShape(),
    shadows: createShadows(colorTokens),
    transitions: createTransitions(),
    zIndex: createZIndex(),
  });

  // 컴포넌트 오버라이드와 함께 최종 테마 생성
  return createTheme(baseTheme, {
    components: {
      ...createComponentOverrides(colorTokens),
      ...customOverrides.components
    },
    // 사용자 정의 추가 속성
    clearFile: {
      tokens: {
        base: baseTokens,
        colors: colorTokens,
      },
      mode,
      spacing: baseTokens.spacing,
      layout: baseTokens.layout,
      status: colorTokens.colors.status,
    },
    
    // Backward compatibility with old theme system
    custom: {
      layout: {
        pageSpacing: baseTokens.spacing.page,
        sectionSpacing: baseTokens.spacing.section,
        componentSpacing: baseTokens.spacing.component,
        elementSpacing: baseTokens.spacing.element
      },
      
      animations: {
        fast: baseTokens.animation.duration.fast,
        normal: baseTokens.animation.duration.normal,
        slow: baseTokens.animation.duration.slow
      },
      
      shadows: {
        card: colorTokens.shadows.card,
        cardHover: colorTokens.shadows.cardHover,
        elevated: colorTokens.shadows.elevated
      }
    },
    ...customOverrides
  });
};

/**
 * 라이트 테마 생성 헬퍼
 * @param {Object} customOverrides - 사용자 정의 오버라이드
 * @returns {Object} 라이트 테마
 */
export const createLightTheme = (customOverrides = {}) => 
  createClearFileTheme('light', customOverrides);

/**
 * 다크 테마 생성 헬퍼
 * @param {Object} customOverrides - 사용자 정의 오버라이드
 * @returns {Object} 다크 테마
 */
export const createDarkTheme = (customOverrides = {}) => 
  createClearFileTheme('dark', customOverrides);

/**
 * 기본 라이트 테마 (이전 시스템과의 호환성)
 */
export const clearFileTheme = createClearFileTheme('light');

export default createClearFileTheme;