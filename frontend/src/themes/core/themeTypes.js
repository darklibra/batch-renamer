/**
 * Theme Types and Constants - Clear File Theme System
 * 테마 타입 정의 및 상수들
 */

/**
 * 테마 모드 상수
 */
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system', // 시스템 설정을 따름
  AUTO: 'auto'      // 시간대에 따라 자동 전환
};

/**
 * 사용 가능한 테마 모드 배열
 */
export const AVAILABLE_THEME_MODES = Object.values(THEME_MODES);

/**
 * 테마 모드별 표시명
 */
export const THEME_MODE_LABELS = {
  [THEME_MODES.LIGHT]: 'Light Mode',
  [THEME_MODES.DARK]: 'Dark Mode',
  [THEME_MODES.SYSTEM]: 'System Setting',
  [THEME_MODES.AUTO]: 'Auto (Time-based)'
};

/**
 * 테마 모드별 아이콘
 */
export const THEME_MODE_ICONS = {
  [THEME_MODES.LIGHT]: 'light_mode',
  [THEME_MODES.DARK]: 'dark_mode',
  [THEME_MODES.SYSTEM]: 'settings',
  [THEME_MODES.AUTO]: 'schedule'
};

/**
 * 테마 설정 스토리지 키
 */
export const THEME_STORAGE_KEY = 'clearFile_theme_mode';

/**
 * 기본 테마 모드
 */
export const DEFAULT_THEME_MODE = THEME_MODES.LIGHT;

/**
 * 다크 모드 자동 전환 시간 설정
 */
export const AUTO_THEME_CONFIG = {
  DARK_START_HOUR: 18,   // 18:00부터 다크 모드
  DARK_END_HOUR: 6,      // 06:00까지 다크 모드
  CHECK_INTERVAL: 60000   // 1분마다 시간 체크
};

/**
 * 테마 관련 미디어 쿼리
 */
export const MEDIA_QUERIES = {
  PREFERS_DARK: '(prefers-color-scheme: dark)',
  PREFERS_LIGHT: '(prefers-color-scheme: light)',
  PREFERS_REDUCED_MOTION: '(prefers-reduced-motion: reduce)'
};

/**
 * 테마 전환 애니메이션 설정
 */
export const THEME_TRANSITION_CONFIG = {
  DURATION: 250,           // 전환 시간 (ms)
  EASING: 'ease-in-out',   // 전환 효과
  PROPERTY: 'all'          // 전환 대상
};

/**
 * 컴포넌트별 테마 변형 타입
 */
export const COMPONENT_VARIANTS = {
  CARD: {
    DEFAULT: 'default',
    ELEVATED: 'elevated',
    OUTLINED: 'outlined'
  },
  BUTTON: {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    INFO: 'info'
  },
  ALERT: {
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
  }
};

/**
 * 색상 강도 레벨
 */
export const COLOR_INTENSITIES = {
  50: 50,
  100: 100,
  200: 200,
  300: 300,
  400: 400,
  500: 500,  // 기본값
  600: 600,
  700: 700,
  800: 800,
  900: 900
};

/**
 * 스페이싱 스케일
 */
export const SPACING_SCALE = {
  TIGHT: 'tight',       // 4px
  ELEMENT: 'element',   // 8px
  COMPONENT: 'component', // 16px
  PAGE: 'page',         // 24px
  SECTION: 'section'    // 32px
};

/**
 * 브레이크포인트 별칭
 */
export const BREAKPOINT_ALIASES = {
  MOBILE: 'xs',      // 0px
  TABLET: 'sm',      // 600px
  LAPTOP: 'md',      // 900px
  DESKTOP: 'lg',     // 1200px
  WIDE: 'xl'         // 1536px
};

/**
 * 그림자 레벨
 */
export const SHADOW_LEVELS = {
  NONE: 0,
  CARD: 1,
  CARD_HOVER: 2,
  ELEVATED: 4,
  DIALOG: 8,
  TOOLTIP: 16
};

/**
 * 테마 검증 유틸리티
 */
export const validateThemeMode = (mode) => {
  return AVAILABLE_THEME_MODES.includes(mode);
};

/**
 * 시스템 다크 모드 감지
 */
export const isSystemDarkMode = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia(MEDIA_QUERIES.PREFERS_DARK).matches;
  }
  return false;
};

/**
 * 현재 시간 기반 다크 모드 여부 판단
 */
export const isAutoModeDark = () => {
  const now = new Date();
  const hour = now.getHours();
  
  // 18:00 이후 또는 06:00 이전이면 다크 모드
  return hour >= AUTO_THEME_CONFIG.DARK_START_HOUR || hour < AUTO_THEME_CONFIG.DARK_END_HOUR;
};

/**
 * 실제 테마 모드 계산 (system, auto 모드 해석)
 */
export const resolveThemeMode = (themeMode) => {
  switch (themeMode) {
    case THEME_MODES.SYSTEM:
      return isSystemDarkMode() ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    
    case THEME_MODES.AUTO:
      return isAutoModeDark() ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    
    case THEME_MODES.LIGHT:
    case THEME_MODES.DARK:
    default:
      return themeMode || DEFAULT_THEME_MODE;
  }
};

/**
 * 테마 모드 토글 (light ⇄ dark)
 */
export const toggleThemeMode = (currentMode) => {
  const resolvedMode = resolveThemeMode(currentMode);
  return resolvedMode === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK;
};

/**
 * 다음 테마 모드 순환 (light → dark → system → auto → light)
 */
export const cycleThemeMode = (currentMode) => {
  const modes = AVAILABLE_THEME_MODES;
  const currentIndex = modes.indexOf(currentMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  return modes[nextIndex];
};

export default {
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
};