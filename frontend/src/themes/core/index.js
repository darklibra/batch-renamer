/**
 * Theme Core Module - Clear File Theme System
 * 테마 시스템 코어 모듈의 중앙 진입점
 */

// Import for internal use
import {
  createClearFileTheme as _createClearFileTheme,
  createLightTheme as _createLightTheme,
  createDarkTheme as _createDarkTheme,
  clearFileTheme as _clearFileTheme
} from './themeFactory.js';

// Re-export for external use
export {
  _createClearFileTheme as createClearFileTheme,
  _createLightTheme as createLightTheme,
  _createDarkTheme as createDarkTheme,
  _clearFileTheme as clearFileTheme
};

// Import types and constants for internal use
import {
  THEME_MODES as _THEME_MODES,
  AVAILABLE_THEME_MODES as _AVAILABLE_THEME_MODES,
  THEME_MODE_LABELS as _THEME_MODE_LABELS,
  THEME_MODE_ICONS as _THEME_MODE_ICONS,
  DEFAULT_THEME_MODE as _DEFAULT_THEME_MODE,
  resolveThemeMode as _resolveThemeMode,
  toggleThemeMode as _toggleThemeMode
} from './themeTypes.js';

// Import utilities for internal use
import {
  getStoredThemeMode as _getStoredThemeMode,
  setStoredThemeMode as _setStoredThemeMode,
  getCurrentThemeMode as _getCurrentThemeMode,
  initializeTheme as _initializeTheme,
  changeTheme as _changeTheme,
  isDarkMode as _isDarkMode
} from './themeUtils.js';

// Re-export Theme Types and Constants
export {
  THEME_MODES,
  AVAILABLE_THEME_MODES,
  THEME_MODE_LABELS,
  THEME_MODE_ICONS,
  THEME_STORAGE_KEY,
  DEFAULT_THEME_MODE,
  AUTO_THEME_CONFIG,
  MEDIA_QUERIES,
  THEME_TRANSITION_CONFIG,
  COMPONENT_VARIANTS,
  COLOR_INTENSITIES,
  SPACING_SCALE,
  BREAKPOINT_ALIASES,
  SHADOW_LEVELS,
  validateThemeMode,
  isSystemDarkMode,
  isAutoModeDark,
  resolveThemeMode,
  toggleThemeMode,
  cycleThemeMode
} from './themeTypes.js';

// Re-export Theme Utilities
export {
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
} from './themeUtils.js';

// Default export - comprehensive theme core object
export default {
  // Factory functions
  createClearFileTheme: _createClearFileTheme,
  createLightTheme: _createLightTheme,
  createDarkTheme: _createDarkTheme,
  clearFileTheme: _clearFileTheme,
  
  // Types and constants
  THEME_MODES: _THEME_MODES,
  AVAILABLE_THEME_MODES: _AVAILABLE_THEME_MODES,
  THEME_MODE_LABELS: _THEME_MODE_LABELS,
  THEME_MODE_ICONS: _THEME_MODE_ICONS,
  DEFAULT_THEME_MODE: _DEFAULT_THEME_MODE,
  
  // Utilities
  getStoredThemeMode: _getStoredThemeMode,
  setStoredThemeMode: _setStoredThemeMode,
  getCurrentThemeMode: _getCurrentThemeMode,
  initializeTheme: _initializeTheme,
  changeTheme: _changeTheme,
  isDarkMode: _isDarkMode,
  resolveThemeMode: _resolveThemeMode,
  toggleThemeMode: _toggleThemeMode
};