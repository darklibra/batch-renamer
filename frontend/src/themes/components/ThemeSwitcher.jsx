/**
 * ThemeSwitcher Component - Clear File Theme System
 * 테마 모드 전환을 위한 UI 컴포넌트들
 */

import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Divider,
  Chip
} from '@mui/material';
import {
  LightMode,
  DarkMode,
  Settings,
  Schedule,
  MoreVert,
  Brightness4,
  Brightness6
} from '@mui/icons-material';

import { 
  THEME_MODES, 
  THEME_MODE_LABELS, 
  THEME_MODE_ICONS 
} from '../core/themeTypes.js';
import { useClearFileTheme } from './ThemeProvider.jsx';

/**
 * 간단한 다크 모드 토글 스위치
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.size - 스위치 크기
 * @param {string} props.color - 스위치 색상
 * @param {Object} props.sx - 추가 스타일
 */
export const DarkModeToggle = ({ size = 'medium', color = 'primary', sx = {} }) => {
  const { isDark, toggle } = useClearFileTheme();

  return (
    <FormControlLabel
      control={
        <Switch
          checked={isDark}
          onChange={toggle}
          size={size}
          color={color}
        />
      }
      label={isDark ? 'Dark Mode' : 'Light Mode'}
      sx={sx}
    />
  );
};

/**
 * 아이콘 버튼 형태의 테마 토글
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.size - 버튼 크기
 * @param {string} props.color - 버튼 색상
 * @param {boolean} props.showTooltip - 툴팁 표시 여부
 */
export const ThemeToggleButton = ({ 
  size = 'medium', 
  color = 'inherit', 
  showTooltip = true 
}) => {
  const { isDark, toggle, themeMode } = useClearFileTheme();

  const getIcon = () => {
    switch (themeMode) {
      case THEME_MODES.DARK:
        return <DarkMode />;
      case THEME_MODES.LIGHT:
        return <LightMode />;
      case THEME_MODES.SYSTEM:
        return <Settings />;
      case THEME_MODES.AUTO:
        return <Schedule />;
      default:
        return isDark ? <DarkMode /> : <LightMode />;
    }
  };

  const getTooltipTitle = () => {
    return `Current: ${THEME_MODE_LABELS[themeMode]}. Click to toggle.`;
  };

  const button = (
    <IconButton
      onClick={toggle}
      size={size}
      color={color}
      aria-label="Toggle theme"
    >
      {getIcon()}
    </IconButton>
  );

  return showTooltip ? (
    <Tooltip title={getTooltipTitle()}>
      {button}
    </Tooltip>
  ) : button;
};

/**
 * 고급 테마 선택 메뉴
 * @param {Object} props - 컴포넌트 props
 * @param {React.ReactNode} props.trigger - 메뉴 트리거 요소
 * @param {string} props.placement - 메뉴 위치
 */
export const ThemeSelector = ({ 
  trigger = null,
  placement = 'bottom-end'
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { themeMode, resolvedMode, setMode, isDark } = useClearFileTheme();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeSelect = (mode) => {
    setMode(mode);
    handleClose();
  };

  const getStatusChip = (mode) => {
    if (mode === themeMode) {
      return (
        <Chip
          label="Active"
          size="small"
          color="primary"
          sx={{ ml: 1 }}
        />
      );
    }
    return null;
  };

  const defaultTrigger = (
    <IconButton
      onClick={handleClick}
      aria-label="Select theme"
      color="inherit"
    >
      <MoreVert />
    </IconButton>
  );

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, { onClick: handleClick })
      ) : (
        defaultTrigger
      )}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="textSecondary">
            Theme Settings
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Current: {isDark ? 'Dark' : 'Light'} Mode
          </Typography>
        </Box>
        
        <Divider />
        
        {Object.values(THEME_MODES).map((mode) => (
          <MenuItem
            key={mode}
            onClick={() => handleModeSelect(mode)}
            selected={mode === themeMode}
          >
            <ListItemIcon>
              {mode === THEME_MODES.LIGHT && <LightMode fontSize="small" />}
              {mode === THEME_MODES.DARK && <DarkMode fontSize="small" />}
              {mode === THEME_MODES.SYSTEM && <Settings fontSize="small" />}
              {mode === THEME_MODES.AUTO && <Schedule fontSize="small" />}
            </ListItemIcon>
            <ListItemText>
              {THEME_MODE_LABELS[mode]}
            </ListItemText>
            {getStatusChip(mode)}
          </MenuItem>
        ))}
        
        <Divider />
        
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="textSecondary">
            Resolved Mode: {resolvedMode}
          </Typography>
        </Box>
      </Menu>
    </>
  );
};

/**
 * 프리미엄 테마 스위처 (모든 기능 포함)
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.variant - 표시 방식 ('toggle' | 'button' | 'selector')
 * @param {string} props.size - 크기
 * @param {string} props.color - 색상
 * @param {boolean} props.showLabel - 라벨 표시 여부
 * @param {Object} props.sx - 추가 스타일
 */
export const ThemeSwitcher = ({ 
  variant = 'button',
  size = 'medium',
  color = 'inherit',
  showLabel = false,
  sx = {}
}) => {
  const { themeMode, isDark } = useClearFileTheme();

  const renderContent = () => {
    switch (variant) {
      case 'toggle':
        return (
          <DarkModeToggle 
            size={size} 
            color={color} 
            sx={sx}
          />
        );
      
      case 'selector':
        return (
          <ThemeSelector 
            trigger={
              <IconButton size={size} color={color}>
                <Brightness6 />
              </IconButton>
            }
          />
        );
      
      case 'button':
      default:
        return (
          <ThemeToggleButton 
            size={size} 
            color={color} 
            showTooltip={!showLabel}
          />
        );
    }
  };

  if (showLabel) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...sx }}>
        {renderContent()}
        <Typography variant="body2" color="textSecondary">
          {THEME_MODE_LABELS[themeMode]}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={sx}>
      {renderContent()}
    </Box>
  );
};

/**
 * 레거시 지원을 위한 별칭들
 */
export const DarkModeSwitch = DarkModeToggle;
export const ThemeToggle = ThemeToggleButton;
export const ThemeMenu = ThemeSelector;

export default ThemeSwitcher;