/**
 * useThemeTokens Hook - Clear File Theme System
 * 테마 토큰에 쉽게 접근하기 위한 React Hook
 */

import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * 테마 토큰 접근 Hook
 * @param {string} category - 토큰 카테고리 ('colors', 'spacing', 'typography' 등)
 * @returns {Object} 요청된 카테고리의 토큰들 또는 전체 토큰
 */
export const useThemeTokens = (category = null) => {
  const theme = useTheme();

  /**
   * 전체 토큰 추출
   */
  const allTokens = useMemo(() => {
    const clearFileTokens = theme.clearFile?.tokens || {};
    const { base = {}, colors = {} } = clearFileTokens;

    return {
      // 기본 토큰들
      spacing: base.spacing || {},
      typography: base.typography || {},
      layout: base.layout || {},
      breakpoints: base.breakpoints || {},
      animation: base.animation || {},
      zIndex: base.zIndex || {},
      
      // 색상 토큰들
      colors: colors.colors || {},
      shadows: colors.shadows || {},
      
      // Material-UI 테마 정보
      mode: theme.palette.mode,
      palette: theme.palette,
      muiSpacing: theme.spacing,
      muiBreakpoints: theme.breakpoints,
      muiShadows: theme.shadows,
      muiTransitions: theme.transitions,
      muiTypography: theme.typography,
      muiShape: theme.shape,
      muiZIndex: theme.zIndex,
    };
  }, [theme]);

  /**
   * 카테고리별 토큰 추출
   */
  const categoryTokens = useMemo(() => {
    if (!category) {
      return allTokens;
    }

    switch (category) {
      case 'spacing':
        return {
          ...allTokens.spacing,
          unit: allTokens.muiSpacing,
          px: (value) => allTokens.muiSpacing(value),
          rem: (value) => `${value * 0.5}rem`,
        };

      case 'colors':
        return {
          ...allTokens.colors,
          palette: allTokens.palette,
          mode: allTokens.mode,
        };

      case 'typography':
        return {
          ...allTokens.typography,
          mui: allTokens.muiTypography,
        };

      case 'layout':
        return {
          ...allTokens.layout,
          breakpoints: allTokens.muiBreakpoints,
          shape: allTokens.muiShape,
        };

      case 'shadows':
        return {
          ...allTokens.shadows,
          mui: allTokens.muiShadows,
        };

      case 'animation':
        return {
          ...allTokens.animation,
          transitions: allTokens.muiTransitions,
        };

      case 'zIndex':
        return {
          ...allTokens.zIndex,
          mui: allTokens.muiZIndex,
        };

      default:
        return allTokens[category] || {};
    }
  }, [allTokens, category]);

  /**
   * 편의 함수들
   */
  const helpers = useMemo(() => ({
    // 스페이싱 헬퍼
    spacing: {
      px: (value) => allTokens.muiSpacing(value),
      rem: (value) => `${value * 0.5}rem`,
      tight: allTokens.spacing.tight || 4,
      element: allTokens.spacing.element || 8,
      component: allTokens.spacing.component || 16,
      page: allTokens.spacing.page || 24,
      section: allTokens.spacing.section || 32,
    },

    // 색상 헬퍼
    colors: {
      primary: allTokens.palette.primary,
      secondary: allTokens.palette.secondary,
      error: allTokens.palette.error,
      warning: allTokens.palette.warning,
      info: allTokens.palette.info,
      success: allTokens.palette.success,
      text: allTokens.palette.text,
      background: allTokens.palette.background,
      action: allTokens.palette.action,
      divider: allTokens.palette.divider,
      status: allTokens.colors.status || {},
    },

    // 브레이크포인트 헬퍼
    breakpoints: {
      up: allTokens.muiBreakpoints.up,
      down: allTokens.muiBreakpoints.down,
      between: allTokens.muiBreakpoints.between,
      only: allTokens.muiBreakpoints.only,
      values: allTokens.muiBreakpoints.values,
      mobile: `@media ${allTokens.muiBreakpoints.down('sm')}`,
      tablet: `@media ${allTokens.muiBreakpoints.between('sm', 'md')}`,
      desktop: `@media ${allTokens.muiBreakpoints.up('md')}`,
      wide: `@media ${allTokens.muiBreakpoints.up('xl')}`,
    },

    // 그림자 헬퍼
    shadows: {
      card: allTokens.shadows.card || allTokens.muiShadows[1],
      cardHover: allTokens.shadows.cardHover || allTokens.muiShadows[2],
      elevated: allTokens.shadows.elevated || allTokens.muiShadows[4],
      dialog: allTokens.shadows.dialog || allTokens.muiShadows[8],
      tooltip: allTokens.shadows.tooltip || allTokens.muiShadows[16],
      elevation: (level) => allTokens.muiShadows[level] || allTokens.muiShadows[0],
    },

    // 애니메이션 헬퍼
    animation: {
      duration: {
        fast: allTokens.animation.duration?.fast || '150ms',
        normal: allTokens.animation.duration?.normal || '250ms',
        slow: allTokens.animation.duration?.slow || '350ms',
        slower: allTokens.animation.duration?.slower || '500ms',
      },
      easing: {
        easeInOut: allTokens.animation.easing?.easeInOut || allTokens.muiTransitions.easing.easeInOut,
        easeOut: allTokens.animation.easing?.easeOut || allTokens.muiTransitions.easing.easeOut,
        easeIn: allTokens.animation.easing?.easeIn || allTokens.muiTransitions.easing.easeIn,
        sharp: allTokens.animation.easing?.sharp || allTokens.muiTransitions.easing.sharp,
      },
      create: allTokens.muiTransitions.create,
    },

    // 조건부 스타일링 헬퍼
    conditional: {
      darkMode: (darkStyles, lightStyles = {}) => 
        allTokens.mode === 'dark' ? darkStyles : lightStyles,
      lightMode: (lightStyles, darkStyles = {}) => 
        allTokens.mode === 'light' ? lightStyles : darkStyles,
      mode: (lightStyles, darkStyles) => 
        allTokens.mode === 'light' ? lightStyles : darkStyles,
    },

    // 타이포그래피 헬퍼
    typography: {
      fontFamily: allTokens.typography.fontFamily?.primary || allTokens.muiTypography.fontFamily,
      monoFamily: allTokens.typography.fontFamily?.mono || 'monospace',
      fontSize: allTokens.typography.fontSizes || {},
      fontWeight: allTokens.typography.weights || {},
      lineHeight: allTokens.typography.lineHeights || {},
      letterSpacing: allTokens.typography.letterSpacing || {},
    },

    // 레이아웃 헬퍼
    layout: {
      maxWidth: allTokens.layout.maxWidth || 1400,
      contentMaxWidth: allTokens.layout.contentMaxWidth || 1200,
      drawerWidth: allTokens.layout.drawerWidth || 240,
      appBarHeight: allTokens.layout.appBarHeight || 64,
      borderRadius: allTokens.layout.borderRadius || {},
    }
  }), [allTokens]);

  return category ? categoryTokens : { ...categoryTokens, helpers };
};

/**
 * 특정 토큰 카테고리에 특화된 Hook들
 */
export const useSpacingTokens = () => useThemeTokens('spacing');
export const useColorTokens = () => useThemeTokens('colors');
export const useTypographyTokens = () => useThemeTokens('typography');
export const useLayoutTokens = () => useThemeTokens('layout');
export const useShadowTokens = () => useThemeTokens('shadows');
export const useAnimationTokens = () => useThemeTokens('animation');
export const useZIndexTokens = () => useThemeTokens('zIndex');

/**
 * 편의 함수들만 반환하는 Hook
 */
export const useThemeHelpers = () => {
  const { helpers } = useThemeTokens();
  return helpers;
};

export default useThemeTokens;