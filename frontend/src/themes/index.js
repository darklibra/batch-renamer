/**
 * Clear File Theme System - Main Entry Point
 * 테마 시스템의 메인 진입점
 */

// Core Theme System
export * from './core/index.js';

// Theme Management Hooks
export * from './hooks/index.js';

// Theme Components
export * from './components/index.js';

// Token System
export { baseTokens } from './tokens/base.js';
export { lightTokens } from './tokens/light.js';
export { darkTokens } from './tokens/dark.js';

// Import functions that we need to use internally
import {
  createClearFileTheme as _createClearFileTheme,
  createLightTheme,
  createDarkTheme,
  clearFileTheme,
  THEME_MODES,
  THEME_MODE_LABELS,
  THEME_MODE_ICONS,
  initializeTheme,
  changeTheme,
  isDarkMode
} from './core/index.js';

// Re-export for external use
export {
  _createClearFileTheme as createClearFileTheme,
  createLightTheme,
  createDarkTheme,
  clearFileTheme,
  THEME_MODES,
  THEME_MODE_LABELS,
  THEME_MODE_ICONS,
  initializeTheme,
  changeTheme,
  isDarkMode
};

// Hooks
export {
  useThemeMode,
  useCustomTheme,
  useThemeTokens,
  useThemeHelpers
} from './hooks/index.js';

// Components
export {
  ClearFileThemeProvider,
  ThemeSwitcher,
  useClearFileTheme
} from './components/index.js';

/**
 * 완전한 테마 시스템 객체 (기본 export)
 */
export default {
  // Factory functions
  createClearFileTheme: _createClearFileTheme,
  createLightTheme,
  createDarkTheme,
  clearFileTheme,
  
  // Tokens
  tokens: {
    base: () => import('./tokens/base.js').then(m => m.baseTokens),
    light: () => import('./tokens/light.js').then(m => m.lightTokens),
    dark: () => import('./tokens/dark.js').then(m => m.darkTokens),
  },
  
  // Core utilities
  core: () => import('./core/index.js'),
  
  // Hooks
  hooks: () => import('./hooks/index.js'),
  
  // Components
  components: () => import('./components/index.js'),
  
  // Constants
  THEME_MODES,
  THEME_MODE_LABELS,
  THEME_MODE_ICONS,
  
  // Quick setup helper
  setup: (options = {}) => {
    const { mode = 'light', customizations = {} } = options;
    return _createClearFileTheme(mode, customizations);
  }
};