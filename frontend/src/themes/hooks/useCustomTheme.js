/**
 * useCustomTheme Hook - Clear File Theme System
 * 커스텀 테마 생성 및 관리를 위한 React Hook
 */

import { useMemo, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { createClearFileTheme } from '../core/themeFactory.js';
import { useThemeMode } from './useThemeMode.js';

/**
 * 커스텀 테마 관리 Hook
 * @param {Object} customizations - 테마 커스터마이징 옵션
 * @param {Object} customizations.palette - 팔레트 오버라이드
 * @param {Object} customizations.typography - 타이포그래피 오버라이드
 * @param {Object} customizations.components - 컴포넌트 오버라이드
 * @param {Object} options - 추가 옵션
 * @param {boolean} options.useCurrentMode - 현재 테마 모드 사용 여부
 * @returns {Object} 커스텀 테마 및 관련 유틸리티
 */
export const useCustomTheme = (customizations = {}, options = {}) => {
  const {
    palette: customPalette = {},
    typography: customTypography = {},
    components: customComponents = {},
    ...otherCustomizations
  } = customizations;

  const { useCurrentMode = true } = options;

  // 현재 테마 모드 가져오기
  const { resolvedMode } = useThemeMode();
  
  // 현재 Material-UI 테마 (fallback용)
  const muiTheme = useTheme();

  /**
   * 커스터마이징된 테마 생성
   */
  const customTheme = useMemo(() => {
    const mode = useCurrentMode ? resolvedMode : 'light';
    
    const overrides = {
      palette: customPalette,
      typography: customTypography,
      components: customComponents,
      ...otherCustomizations
    };

    return createClearFileTheme(mode, overrides);
  }, [
    resolvedMode,
    useCurrentMode,
    customPalette,
    customTypography,
    customComponents,
    otherCustomizations
  ]);

  /**
   * 테마 토큰 접근 헬퍼
   */
  const tokens = useMemo(() => {
    return customTheme.clearFile?.tokens || {};
  }, [customTheme]);

  /**
   * 색상 팔레트 접근 헬퍼
   */
  const colors = useMemo(() => {
    return {
      primary: customTheme.palette.primary,
      secondary: customTheme.palette.secondary,
      error: customTheme.palette.error,
      warning: customTheme.palette.warning,
      info: customTheme.palette.info,
      success: customTheme.palette.success,
      grey: customTheme.palette.grey,
      text: customTheme.palette.text,
      background: customTheme.palette.background,
      action: customTheme.palette.action,
      status: customTheme.clearFile?.status || {},
    };
  }, [customTheme]);

  /**
   * 스페이싱 헬퍼
   */
  const spacing = useMemo(() => {
    const spacingFn = customTheme.spacing;
    const baseSpacing = customTheme.clearFile?.spacing || {};
    
    return {
      // Material-UI spacing function
      unit: spacingFn,
      
      // 명명된 스페이싱 값들
      tight: baseSpacing.tight || spacingFn(0.5),
      element: baseSpacing.element || spacingFn(1),
      component: baseSpacing.component || spacingFn(2),
      page: baseSpacing.page || spacingFn(3),
      section: baseSpacing.section || spacingFn(4),
      
      // 헬퍼 함수들
      px: (value) => spacingFn(value),
      rem: (value) => `${value * 0.5}rem`,
    };
  }, [customTheme]);

  /**
   * 브레이크포인트 헬퍼
   */
  const breakpoints = useMemo(() => {
    const bp = customTheme.breakpoints;
    
    return {
      // Material-UI breakpoints object
      ...bp,
      
      // 헬퍼 함수들
      up: bp.up,
      down: bp.down,
      between: bp.between,
      only: bp.only,
      
      // 값 접근
      values: bp.values,
      
      // 미디어 쿼리 생성 헬퍼
      mobile: `@media ${bp.down('sm')}`,
      tablet: `@media ${bp.between('sm', 'md')}`,
      desktop: `@media ${bp.up('md')}`,
      wide: `@media ${bp.up('xl')}`,
    };
  }, [customTheme]);

  /**
   * 그림자 헬퍼
   */
  const shadows = useMemo(() => {
    const themeShadows = customTheme.shadows;
    const customShadows = tokens.colors?.shadows || {};
    
    return {
      // Material-UI shadows array
      mui: themeShadows,
      
      // 명명된 그림자들
      card: customShadows.card || themeShadows[1],
      cardHover: customShadows.cardHover || themeShadows[2],
      elevated: customShadows.elevated || themeShadows[4],
      dialog: customShadows.dialog || themeShadows[8],
      tooltip: customShadows.tooltip || themeShadows[16],
      
      // 헬퍼 함수
      elevation: (level) => themeShadows[level] || themeShadows[0],
    };
  }, [customTheme, tokens]);

  /**
   * 애니메이션 헬퍼
   */
  const animations = useMemo(() => {
    const transitions = customTheme.transitions;
    const baseAnimation = tokens.base?.animation || {};
    
    return {
      // Material-UI transitions
      transitions,
      
      // 지속 시간
      duration: {
        fast: baseAnimation.duration?.fast || '150ms',
        normal: baseAnimation.duration?.normal || '250ms',
        slow: baseAnimation.duration?.slow || '350ms',
        slower: baseAnimation.duration?.slower || '500ms',
      },
      
      // 이징
      easing: {
        easeInOut: baseAnimation.easing?.easeInOut || transitions.easing.easeInOut,
        easeOut: baseAnimation.easing?.easeOut || transitions.easing.easeOut,
        easeIn: baseAnimation.easing?.easeIn || transitions.easing.easeIn,
        sharp: baseAnimation.easing?.sharp || transitions.easing.sharp,
      },
      
      // 헬퍼 함수
      create: transitions.create,
      getAutoHeightDuration: transitions.getAutoHeightDuration,
    };
  }, [customTheme, tokens]);

  /**
   * 실시간 테마 업데이트
   */
  const updateTheme = useCallback((newCustomizations) => {
    // 이 함수는 상위 컴포넌트에서 상태를 업데이트하도록 유도
    // 실제 구현은 ThemeProvider 레벨에서 처리
    console.warn('updateTheme: This function should be implemented at ThemeProvider level');
  }, []);

  /**
   * 조건부 스타일 헬퍼
   */
  const conditionalStyles = useMemo(() => ({
    // 다크 모드 조건부 스타일
    darkMode: (darkStyles, lightStyles = {}) => 
      customTheme.palette.mode === 'dark' ? darkStyles : lightStyles,
    
    // 라이트 모드 조건부 스타일
    lightMode: (lightStyles, darkStyles = {}) => 
      customTheme.palette.mode === 'light' ? lightStyles : darkStyles,
    
    // 브레이크포인트 조건부 스타일
    responsive: {
      mobile: (styles) => ({ [breakpoints.mobile]: styles }),
      tablet: (styles) => ({ [breakpoints.tablet]: styles }),
      desktop: (styles) => ({ [breakpoints.desktop]: styles }),
      wide: (styles) => ({ [breakpoints.wide]: styles }),
    }
  }), [customTheme, breakpoints]);

  return {
    // 메인 테마 객체
    theme: customTheme,
    
    // 토큰 접근
    tokens,
    
    // 스타일링 헬퍼들
    colors,
    spacing,
    breakpoints,
    shadows,
    animations,
    
    // 유틸리티
    conditionalStyles,
    updateTheme,
    
    // 메타 정보
    mode: customTheme.palette.mode,
    isDark: customTheme.palette.mode === 'dark',
    isLight: customTheme.palette.mode === 'light',
    
    // 호환성을 위한 별칭들
    palette: colors,
    typography: customTheme.typography,
    shape: customTheme.shape,
    zIndex: customTheme.zIndex,
  };
};

export default useCustomTheme;