/**
 * Theme Hooks Module - Clear File Theme System
 * 테마 Hook들의 중앙 진입점
 */

// Import hooks for internal use
import { useThemeMode as _useThemeMode } from './useThemeMode.js';
import { useCustomTheme as _useCustomTheme } from './useCustomTheme.js';
import {
  useThemeTokens as _useThemeTokens,
  useSpacingTokens as _useSpacingTokens,
  useColorTokens as _useColorTokens,
  useTypographyTokens as _useTypographyTokens,
  useLayoutTokens as _useLayoutTokens,
  useShadowTokens as _useShadowTokens,
  useAnimationTokens as _useAnimationTokens,
  useZIndexTokens as _useZIndexTokens,
  useThemeHelpers as _useThemeHelpers
} from './useThemeTokens.js';

// Re-export for external use
export { _useThemeMode as useThemeMode };
export { _useCustomTheme as useCustomTheme };
export {
  _useThemeTokens as useThemeTokens,
  _useSpacingTokens as useSpacingTokens,
  _useColorTokens as useColorTokens,
  _useTypographyTokens as useTypographyTokens,
  _useLayoutTokens as useLayoutTokens,
  _useShadowTokens as useShadowTokens,
  _useAnimationTokens as useAnimationTokens,
  _useZIndexTokens as useZIndexTokens,
  _useThemeHelpers as useThemeHelpers
};

// Default export - comprehensive hooks object
export default {
  useThemeMode: _useThemeMode,
  useCustomTheme: _useCustomTheme,
  useThemeTokens: _useThemeTokens,
  useSpacingTokens: _useSpacingTokens,
  useColorTokens: _useColorTokens,
  useTypographyTokens: _useTypographyTokens,
  useLayoutTokens: _useLayoutTokens,
  useShadowTokens: _useShadowTokens,
  useAnimationTokens: _useAnimationTokens,
  useZIndexTokens: _useZIndexTokens,
  useThemeHelpers: _useThemeHelpers
};