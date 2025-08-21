import React from 'react';
import { Divider as MuiDivider, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Divider - 확장된 구분선 컴포넌트
 * 다양한 스타일과 간격 옵션을 제공하는 구분선
 */
const Divider = ({
  variant = 'fullWidth',
  orientation = 'horizontal',
  spacing = 'component',
  color = 'divider',
  thickness = 1,
  style = 'solid',
  sx = {},
  children,
  ...props
}) => {
  const theme = useTheme();
  
  // 간격 계산
  const getSpacing = () => {
    if (typeof spacing === 'number') return spacing;
    
    switch (spacing) {
      case 'page': return theme.custom.layout.pageSpacing;
      case 'section': return theme.custom.layout.sectionSpacing;
      case 'component': return theme.custom.layout.componentSpacing;
      case 'element': return theme.custom.layout.elementSpacing;
      case 'none': return 0;
      default: return theme.custom.layout.componentSpacing;
    }
  };

  // 색상 결정
  const getColor = () => {
    switch (color) {
      case 'primary': return theme.palette.primary.main;
      case 'secondary': return theme.palette.secondary.main;
      case 'divider': return theme.palette.divider;
      case 'text': return theme.palette.text.secondary;
      default: return color;
    }
  };

  // 선 스타일 결정
  const getBorderStyle = () => {
    switch (style) {
      case 'dashed': return 'dashed';
      case 'dotted': return 'dotted';
      case 'solid':
      default: return 'solid';
    }
  };

  const marginValue = getSpacing();
  const dividerColor = getColor();
  const borderStyle = getBorderStyle();

  const dividerStyles = {
    borderColor: dividerColor,
    borderStyle: borderStyle,
    ...(orientation === 'horizontal' 
      ? {
          borderBottomWidth: thickness,
          marginTop: marginValue,
          marginBottom: marginValue,
        }
      : {
          borderRightWidth: thickness,
          marginLeft: marginValue,
          marginRight: marginValue,
        }),
    ...sx
  };

  return (
    <MuiDivider
      variant={variant}
      orientation={orientation}
      sx={dividerStyles}
      {...props}
    >
      {children}
    </MuiDivider>
  );
};

/**
 * SectionDivider - 섹션 구분용 특화 구분선
 * 페이지의 주요 섹션을 구분하는데 사용
 */
export const SectionDivider = ({
  label,
  spacing = 'section',
  color = 'divider',
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  if (label) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          margin: `${theme.custom.layout.sectionSpacing}px 0`,
          ...sx
        }}
        {...props}
      >
        <Divider 
          spacing="none" 
          color={color}
          sx={{ flex: 1, marginRight: 2 }} 
        />
        <Box
          component="span"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: theme.typography.body2.fontSize,
            fontWeight: theme.typography.fontWeightMedium,
            padding: '0 16px',
            backgroundColor: theme.palette.background.default,
            borderRadius: theme.shape.borderRadius,
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Box>
        <Divider 
          spacing="none" 
          color={color}
          sx={{ flex: 1, marginLeft: 2 }} 
        />
      </Box>
    );
  }

  return (
    <Divider 
      spacing={spacing} 
      color={color} 
      sx={sx} 
      {...props} 
    />
  );
};

/**
 * CardDivider - 카드 내부 구분선
 * 카드 컴포넌트 내부의 섹션을 구분하는데 사용
 */
export const CardDivider = ({
  spacing = 'component',
  color = 'divider',
  sx = {},
  ...props
}) => {
  return (
    <Divider
      spacing={spacing}
      color={color}
      thickness={1}
      sx={{
        marginLeft: -2,
        marginRight: -2,
        ...sx
      }}
      {...props}
    />
  );
};

/**
 * VerticalDivider - 세로 구분선
 * 가로 배치된 요소들을 구분하는데 사용
 */
export const VerticalDivider = ({
  height = 'auto',
  spacing = 'component',
  color = 'divider',
  sx = {},
  ...props
}) => {
  return (
    <Divider
      orientation="vertical"
      spacing={spacing}
      color={color}
      sx={{
        height: height,
        alignSelf: 'stretch',
        ...sx
      }}
      {...props}
    />
  );
};

export default Divider;