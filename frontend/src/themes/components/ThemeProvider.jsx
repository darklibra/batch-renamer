/**
 * ThemeProvider Component - Clear File Theme System
 * 향상된 테마 제공자 컴포넌트
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createClearFileTheme } from '../core/themeFactory.js';
import { useThemeMode } from '../hooks/useThemeMode.js';
import { injectThemeTokens } from '../core/themeUtils.js';

/**
 * 테마 컨텍스트
 */
const ClearFileThemeContext = createContext({
  theme: null,
  themeMode: 'light',
  resolvedMode: 'light',
  isDark: false,
  setMode: () => {},
  toggle: () => {},
  cycle: () => {},
});

/**
 * 테마 컨텍스트 Hook
 * @returns {Object} 테마 컨텍스트 값
 */
export const useClearFileTheme = () => {
  const context = useContext(ClearFileThemeContext);
  if (!context) {
    throw new Error('useClearFileTheme must be used within ClearFileThemeProvider');
  }
  return context;
};

/**
 * Clear File 테마 제공자 컴포넌트
 * @param {Object} props - 컴포넌트 props
 * @param {React.ReactNode} props.children - 자식 컴포넌트들
 * @param {Object} props.customizations - 테마 커스터마이징
 * @param {Object} props.options - 테마 옵션
 * @param {boolean} props.options.enableAutoTheme - 자동 테마 활성화
 * @param {boolean} props.options.enableSystemTheme - 시스템 테마 감지 활성화
 * @param {boolean} props.options.enableCssBaseline - CSS 기본값 적용 여부
 * @param {boolean} props.options.enableTokenInjection - CSS 변수 주입 여부
 * @param {Function} props.onThemeChange - 테마 변경 콜백
 */
export const ClearFileThemeProvider = ({ 
  children, 
  customizations = {},
  options = {},
  onThemeChange
}) => {
  const {
    enableAutoTheme = true,
    enableSystemTheme = true,
    enableCssBaseline = true,
    enableTokenInjection = true
  } = options;

  // 테마 모드 관리
  const themeMode = useThemeMode({
    enableAutoTheme,
    enableSystemTheme,
    onThemeChange
  });

  // Material-UI 테마 생성
  const muiTheme = useMemo(() => {
    return createClearFileTheme(themeMode.resolvedMode, customizations);
  }, [themeMode.resolvedMode, customizations]);

  // CSS 변수 주입
  useEffect(() => {
    if (enableTokenInjection) {
      injectThemeTokens(muiTheme);
    }
  }, [muiTheme, enableTokenInjection]);

  // 컨텍스트 값 생성
  const contextValue = useMemo(() => ({
    theme: muiTheme,
    ...themeMode
  }), [muiTheme, themeMode]);

  return (
    <ClearFileThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        {enableCssBaseline && <CssBaseline />}
        {children}
      </MuiThemeProvider>
    </ClearFileThemeContext.Provider>
  );
};

/**
 * 간단한 래퍼 컴포넌트 (이전 버전과의 호환성)
 */
export const EnhancedThemeProvider = ClearFileThemeProvider;

export default ClearFileThemeProvider;