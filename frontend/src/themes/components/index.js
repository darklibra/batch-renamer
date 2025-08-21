/**
 * Theme Components Module - Clear File Theme System
 * 테마 컴포넌트들의 중앙 진입점
 */

// Import components for internal use
import {
  ClearFileThemeProvider as _ClearFileThemeProvider,
  EnhancedThemeProvider as _EnhancedThemeProvider,
  useClearFileTheme as _useClearFileTheme
} from './ThemeProvider.jsx';

import {
  ThemeSwitcher as _ThemeSwitcher,
  DarkModeToggle as _DarkModeToggle,
  ThemeToggleButton as _ThemeToggleButton,
  ThemeSelector as _ThemeSelector,
  DarkModeSwitch as _DarkModeSwitch,
  ThemeToggle as _ThemeToggle,
  ThemeMenu as _ThemeMenu
} from './ThemeSwitcher.jsx';

// Re-export for external use
export {
  _ClearFileThemeProvider as ClearFileThemeProvider,
  _EnhancedThemeProvider as EnhancedThemeProvider,
  _useClearFileTheme as useClearFileTheme
};

export {
  _ThemeSwitcher as ThemeSwitcher,
  _DarkModeToggle as DarkModeToggle,
  _ThemeToggleButton as ThemeToggleButton,
  _ThemeSelector as ThemeSelector,
  
  // Legacy aliases
  _DarkModeSwitch as DarkModeSwitch,
  _ThemeToggle as ThemeToggle,
  _ThemeMenu as ThemeMenu
};

// Default export - comprehensive components object
export default {
  // Provider
  ClearFileThemeProvider: _ClearFileThemeProvider,
  EnhancedThemeProvider: _EnhancedThemeProvider,
  useClearFileTheme: _useClearFileTheme,
  
  // Switchers
  ThemeSwitcher: _ThemeSwitcher,
  DarkModeToggle: _DarkModeToggle,
  ThemeToggleButton: _ThemeToggleButton,
  ThemeSelector: _ThemeSelector,
  
  // Legacy
  DarkModeSwitch: _DarkModeSwitch,
  ThemeToggle: _ThemeToggle,
  ThemeMenu: _ThemeMenu
};