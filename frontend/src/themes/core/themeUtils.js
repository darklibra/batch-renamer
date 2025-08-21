/**
 * Theme Utilities - Clear File Theme System
 * 테마 관련 유틸리티 함수들
 */

import { 
  THEME_MODES, 
  THEME_STORAGE_KEY, 
  DEFAULT_THEME_MODE,
  MEDIA_QUERIES,
  AUTO_THEME_CONFIG,
  resolveThemeMode,
  isSystemDarkMode,
  isAutoModeDark
} from './themeTypes.js';

/**
 * 로컬 스토리지에서 테마 모드 읽기
 * @returns {string} 저장된 테마 모드 또는 기본값
 */
export const getStoredThemeMode = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_MODE;
  }
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored || DEFAULT_THEME_MODE;
  } catch (error) {
    console.warn('Failed to read theme mode from localStorage:', error);
    return DEFAULT_THEME_MODE;
  }
};

/**
 * 로컬 스토리지에 테마 모드 저장
 * @param {string} themeMode - 저장할 테마 모드
 */
export const setStoredThemeMode = (themeMode) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  } catch (error) {
    console.warn('Failed to store theme mode to localStorage:', error);
  }
};

/**
 * 시스템 다크 모드 변경 감지 리스너 생성
 * @param {Function} callback - 변경 시 호출될 콜백
 * @returns {Function} 리스너 제거 함수
 */
export const createSystemThemeListener = (callback) => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}; // 서버사이드에서는 빈 함수 반환
  }
  
  const mediaQuery = window.matchMedia(MEDIA_QUERIES.PREFERS_DARK);
  
  const handleChange = (event) => {
    callback(event.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT);
  };
  
  // 모던 브라우저에서는 addEventListener 사용
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  } 
  // 레거시 브라우저 지원
  else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }
  
  return () => {}; // 지원하지 않는 브라우저
};

/**
 * 자동 모드를 위한 시간 기반 테마 변경 감지
 * @param {Function} callback - 변경 시 호출될 콜백
 * @returns {Function} 타이머 정리 함수
 */
export const createAutoThemeTimer = (callback) => {
  let previousIsDark = isAutoModeDark();
  
  const checkTime = () => {
    const currentIsDark = isAutoModeDark();
    
    if (currentIsDark !== previousIsDark) {
      previousIsDark = currentIsDark;
      callback(currentIsDark ? THEME_MODES.DARK : THEME_MODES.LIGHT);
    }
  };
  
  const interval = setInterval(checkTime, AUTO_THEME_CONFIG.CHECK_INTERVAL);
  
  return () => clearInterval(interval);
};

/**
 * 현재 유효한 테마 모드 계산
 * @param {string} preferenceMode - 사용자 설정 모드
 * @returns {string} 실제 적용될 테마 모드 (light 또는 dark)
 */
export const getCurrentThemeMode = (preferenceMode) => {
  return resolveThemeMode(preferenceMode);
};

/**
 * 테마 전환 애니메이션을 위한 CSS 클래스 추가/제거
 * @param {number} duration - 전환 시간 (ms)
 */
export const applyThemeTransition = (duration = 250) => {
  if (typeof document === 'undefined') {
    return;
  }
  
  const root = document.documentElement;
  
  // 전환 스타일 적용
  root.style.transition = `all ${duration}ms ease-in-out`;
  
  // 전환 완료 후 스타일 제거
  setTimeout(() => {
    root.style.transition = '';
  }, duration);
};

/**
 * CSS 변수로 테마 토큰 주입
 * @param {Object} theme - Material-UI 테마 객체
 */
export const injectThemeTokens = (theme) => {
  if (typeof document === 'undefined' || !theme.clearFile) {
    return;
  }
  
  const root = document.documentElement;
  const { tokens } = theme.clearFile;
  
  // 기본 토큰 주입
  if (tokens.base) {
    const { spacing, layout, typography } = tokens.base;
    
    // Spacing tokens
    Object.entries(spacing).forEach(([key, value]) => {
      if (typeof value === 'number') {
        root.style.setProperty(`--spacing-${key}`, `${value}px`);
      }
    });
    
    // Layout tokens
    Object.entries(layout.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, `${value}px`);
    });
    
    // Typography tokens
    Object.entries(typography.fontSizes).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
  }
  
  // 색상 토큰 주입
  if (tokens.colors && tokens.colors.colors) {
    const { colors } = tokens.colors;
    
    // Primary colors
    Object.entries(colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });
    
    // Secondary colors
    Object.entries(colors.secondary).forEach(([key, value]) => {
      root.style.setProperty(`--color-secondary-${key}`, value);
    });
    
    // Status colors
    Object.entries(colors.status).forEach(([key, value]) => {
      root.style.setProperty(`--color-status-${key}`, value);
    });
    
    // Background colors
    Object.entries(colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--color-background-${key}`, value);
    });
    
    // Text colors
    Object.entries(colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--color-text-${key}`, value);
    });
  }
};

/**
 * 테마 모드에 따른 body 클래스 업데이트
 * @param {string} themeMode - 현재 테마 모드
 */
export const updateBodyClass = (themeMode) => {
  if (typeof document === 'undefined') {
    return;
  }
  
  const body = document.body;
  const resolvedMode = resolveThemeMode(themeMode);
  
  // 기존 테마 클래스 제거
  body.classList.remove('theme-light', 'theme-dark');
  
  // 새 테마 클래스 추가
  body.classList.add(`theme-${resolvedMode}`);
  
  // data attribute도 설정
  body.setAttribute('data-theme', resolvedMode);
};

/**
 * 다크 모드 여부 확인
 * @param {string} themeMode - 테마 모드
 * @returns {boolean} 다크 모드인지 여부
 */
export const isDarkMode = (themeMode) => {
  return resolveThemeMode(themeMode) === THEME_MODES.DARK;
};

/**
 * 테마 변경에 따른 메타 태그 업데이트
 * @param {string} themeMode - 현재 테마 모드
 */
export const updateMetaThemeColor = (themeMode) => {
  if (typeof document === 'undefined') {
    return;
  }
  
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const resolvedMode = resolveThemeMode(themeMode);
  
  // 테마 색상 설정
  const themeColor = resolvedMode === THEME_MODES.DARK ? '#121212' : '#ffffff';
  
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor);
  } else {
    // 메타 태그가 없으면 생성
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = themeColor;
    document.head.appendChild(meta);
  }
};

/**
 * 테마 디버깅을 위한 로그 출력
 * @param {string} action - 수행된 액션
 * @param {string} mode - 테마 모드
 * @param {Object} additionalInfo - 추가 정보
 */
export const logThemeChange = (action, mode, additionalInfo = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🎨 Theme Change');
    console.log('Action:', action);
    console.log('Mode:', mode);
    console.log('Resolved Mode:', resolveThemeMode(mode));
    console.log('System Dark Mode:', isSystemDarkMode());
    console.log('Auto Mode Dark:', isAutoModeDark());
    console.log('Additional Info:', additionalInfo);
    console.groupEnd();
  }
};

/**
 * 테마 초기화 (애플리케이션 시작 시 호출)
 * @returns {string} 초기 테마 모드
 */
export const initializeTheme = () => {
  const storedMode = getStoredThemeMode();
  const resolvedMode = resolveThemeMode(storedMode);
  
  // Body 클래스 및 메타 태그 업데이트
  updateBodyClass(storedMode);
  updateMetaThemeColor(storedMode);
  
  logThemeChange('Initialize', storedMode, {
    stored: storedMode,
    resolved: resolvedMode
  });
  
  return storedMode;
};

/**
 * 완전한 테마 변경 처리
 * @param {string} newMode - 새로운 테마 모드
 * @param {Object} options - 옵션
 * @param {boolean} options.saveToStorage - 스토리지에 저장할지 여부
 * @param {boolean} options.applyTransition - 전환 애니메이션 적용할지 여부
 */
export const changeTheme = (newMode, options = {}) => {
  const { 
    saveToStorage = true, 
    applyTransition = true 
  } = options;
  
  if (applyTransition) {
    applyThemeTransition();
  }
  
  if (saveToStorage) {
    setStoredThemeMode(newMode);
  }
  
  updateBodyClass(newMode);
  updateMetaThemeColor(newMode);
  
  logThemeChange('Change', newMode, options);
  
  return resolveThemeMode(newMode);
};

export default {
  getStoredThemeMode,
  setStoredThemeMode,
  createSystemThemeListener,
  createAutoThemeTimer,
  getCurrentThemeMode,
  applyThemeTransition,
  injectThemeTokens,
  updateBodyClass,
  isDarkMode,
  updateMetaThemeColor,
  logThemeChange,
  initializeTheme,
  changeTheme
};