/**
 * useThemeMode Hook - Clear File Theme System
 * 테마 모드 관리를 위한 React Hook
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getStoredThemeMode,
  setStoredThemeMode,
  createSystemThemeListener,
  createAutoThemeTimer,
  getCurrentThemeMode,
  changeTheme,
  isDarkMode
} from '../core/themeUtils.js';
import {
  THEME_MODES,
  DEFAULT_THEME_MODE,
  resolveThemeMode,
  toggleThemeMode,
  cycleThemeMode
} from '../core/themeTypes.js';

/**
 * 테마 모드 관리 Hook
 * @param {Object} options - 설정 옵션
 * @param {boolean} options.enableAutoTheme - 자동 테마 활성화 여부
 * @param {boolean} options.enableSystemTheme - 시스템 테마 감지 활성화 여부
 * @param {Function} options.onThemeChange - 테마 변경 시 콜백
 * @returns {Object} 테마 상태 및 제어 함수들
 */
export const useThemeMode = (options = {}) => {
  const {
    enableAutoTheme = true,
    enableSystemTheme = true,
    onThemeChange
  } = options;

  // 현재 테마 모드 상태 (사용자 설정)
  const [themeMode, setThemeMode] = useState(() => {
    return getStoredThemeMode() || DEFAULT_THEME_MODE;
  });

  // 실제 적용되는 테마 모드 (system, auto 모드 해석된 결과)
  const [resolvedMode, setResolvedMode] = useState(() => {
    return getCurrentThemeMode(themeMode);
  });

  // 다크 모드 여부
  const isDark = isDarkMode(resolvedMode);

  /**
   * 테마 모드 변경 처리
   */
  const updateResolvedMode = useCallback((newThemeMode) => {
    const newResolvedMode = getCurrentThemeMode(newThemeMode);
    setResolvedMode(newResolvedMode);
    
    // 전역 테마 변경 적용
    changeTheme(newThemeMode, {
      saveToStorage: true,
      applyTransition: true
    });
    
    // 콜백 호출
    if (onThemeChange) {
      onThemeChange(newThemeMode, newResolvedMode);
    }
  }, [onThemeChange]);

  /**
   * 사용자 테마 모드 설정
   * @param {string} newMode - 새로운 테마 모드
   */
  const setMode = useCallback((newMode) => {
    setThemeMode(newMode);
    updateResolvedMode(newMode);
  }, [updateResolvedMode]);

  /**
   * 테마 모드 토글 (light ⇄ dark)
   */
  const toggle = useCallback(() => {
    const newMode = toggleThemeMode(themeMode);
    setMode(newMode);
  }, [themeMode, setMode]);

  /**
   * 테마 모드 순환 (light → dark → system → auto → light)
   */
  const cycle = useCallback(() => {
    const newMode = cycleThemeMode(themeMode);
    setMode(newMode);
  }, [themeMode, setMode]);

  /**
   * 특정 테마 모드로 설정하는 헬퍼 함수들
   */
  const setLight = useCallback(() => setMode(THEME_MODES.LIGHT), [setMode]);
  const setDark = useCallback(() => setMode(THEME_MODES.DARK), [setMode]);
  const setSystem = useCallback(() => setMode(THEME_MODES.SYSTEM), [setMode]);
  const setAuto = useCallback(() => setMode(THEME_MODES.AUTO), [setMode]);

  /**
   * 시스템 테마 변경 감지
   */
  useEffect(() => {
    if (!enableSystemTheme || themeMode !== THEME_MODES.SYSTEM) {
      return;
    }

    const cleanup = createSystemThemeListener((systemMode) => {
      updateResolvedMode(themeMode);
    });

    return cleanup;
  }, [themeMode, enableSystemTheme, updateResolvedMode]);

  /**
   * 자동 테마 변경 감지 (시간 기반)
   */
  useEffect(() => {
    if (!enableAutoTheme || themeMode !== THEME_MODES.AUTO) {
      return;
    }

    const cleanup = createAutoThemeTimer((autoMode) => {
      updateResolvedMode(themeMode);
    });

    return cleanup;
  }, [themeMode, enableAutoTheme, updateResolvedMode]);

  /**
   * 초기 테마 모드 동기화
   */
  useEffect(() => {
    updateResolvedMode(themeMode);
  }, [themeMode, updateResolvedMode]);

  return {
    // 현재 상태
    themeMode,        // 사용자 설정 모드 (light, dark, system, auto)
    resolvedMode,     // 실제 적용 모드 (light 또는 dark)
    isDark,           // 다크 모드 여부
    
    // 모드 설정 함수
    setMode,          // 임의 모드 설정
    setLight,         // 라이트 모드 설정
    setDark,          // 다크 모드 설정
    setSystem,        // 시스템 모드 설정
    setAuto,          // 자동 모드 설정
    
    // 모드 변경 함수
    toggle,           // 라이트 ⇄ 다크 토글
    cycle,            // 모든 모드 순환
    
    // 유틸리티
    isLight: !isDark,                           // 라이트 모드 여부
    isSystemMode: themeMode === THEME_MODES.SYSTEM,
    isAutoMode: themeMode === THEME_MODES.AUTO,
    currentMode: resolvedMode                   // 별칭
  };
};

export default useThemeMode;