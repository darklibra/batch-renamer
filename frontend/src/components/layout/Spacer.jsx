import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Spacer - 유연한 간격 조정 컴포넌트
 * 다양한 간격 요구사항을 충족하는 범용 스페이서
 */
const Spacer = ({
  size = 'component',
  direction = 'vertical',
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  
  // 크기 계산
  const getSize = () => {
    if (typeof size === 'number') {
      return size;
    }
    
    switch (size) {
      case 'page': return theme.custom.layout.pageSpacing;
      case 'section': return theme.custom.layout.sectionSpacing;
      case 'component': return theme.custom.layout.componentSpacing;
      case 'element': return theme.custom.layout.elementSpacing;
      case 'small': return theme.spacing(1);
      case 'medium': return theme.spacing(2);
      case 'large': return theme.spacing(3);
      case 'xlarge': return theme.spacing(4);
      default: return theme.custom.layout.componentSpacing;
    }
  };

  const spacing = getSize();

  return (
    <Box
      sx={{
        width: direction === 'horizontal' ? spacing : 'auto',
        height: direction === 'vertical' ? spacing : 'auto',
        minWidth: direction === 'horizontal' ? spacing : 'auto',
        minHeight: direction === 'vertical' ? spacing : 'auto',
        flexShrink: 0,
        ...sx
      }}
      {...props}
    />
  );
};

/**
 * FlexSpacer - Flexbox 환경에서 공간을 채우는 스페이서
 * flex-grow를 사용하여 남은 공간을 모두 차지
 */
export const FlexSpacer = ({ sx = {}, ...props }) => {
  return (
    <Box
      sx={{
        flex: 1,
        ...sx
      }}
      {...props}
    />
  );
};

/**
 * ResponsiveSpacer - 반응형 스페이서
 * 화면 크기에 따라 간격이 조정되는 스페이서
 */
export const ResponsiveSpacer = ({
  xs = 'element',
  sm,
  md,
  lg,
  xl,
  direction = 'vertical',
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  
  const getSizeForBreakpoint = (size) => {
    if (typeof size === 'number') return size;
    
    switch (size) {
      case 'page': return theme.custom.layout.pageSpacing;
      case 'section': return theme.custom.layout.sectionSpacing;
      case 'component': return theme.custom.layout.componentSpacing;
      case 'element': return theme.custom.layout.elementSpacing;
      default: return theme.custom.layout.componentSpacing;
    }
  };

  const responsiveStyles = {};
  
  // 각 브레이크포인트별 크기 설정
  const breakpoints = { xs, sm: sm || xs, md: md || sm || xs, lg: lg || md || sm || xs, xl: xl || lg || md || sm || xs };
  
  Object.entries(breakpoints).forEach(([breakpoint, size]) => {
    const spacing = getSizeForBreakpoint(size);
    
    if (breakpoint === 'xs') {
      if (direction === 'horizontal') {
        responsiveStyles.width = spacing;
        responsiveStyles.minWidth = spacing;
      } else {
        responsiveStyles.height = spacing;
        responsiveStyles.minHeight = spacing;
      }
    } else {
      const mediaQuery = `@media (min-width: ${theme.breakpoints.values[breakpoint]}px)`;
      responsiveStyles[mediaQuery] = {
        ...(direction === 'horizontal' 
          ? { width: spacing, minWidth: spacing } 
          : { height: spacing, minHeight: spacing })
      };
    }
  });

  return (
    <Box
      sx={{
        flexShrink: 0,
        ...responsiveStyles,
        ...sx
      }}
      {...props}
    />
  );
};

export default Spacer;