import React from 'react';
import { Box, Container } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * PageContainer - 표준 페이지 컨테이너
 * 모든 페이지의 최상위 레이아웃을 담당하며 일관된 여백과 반응형 디자인을 제공
 */
const PageContainer = ({
  children,
  maxWidth = 'xl',
  disableGutters = false,
  sx = {},
  spacing = 'page',
  background = 'default',
  ...props
}) => {
  const theme = useTheme();
  
  // Spacing 값 계산 (픽셀 값으로 직접 반환)
  const getSpacing = () => {
    switch (spacing) {
      case 'page': return `${theme.custom.layout.pageSpacing}px`;
      case 'section': return `${theme.custom.layout.sectionSpacing}px`;
      case 'component': return `${theme.custom.layout.componentSpacing}px`;
      case 'element': return `${theme.custom.layout.elementSpacing}px`;
      default: return typeof spacing === 'number' ? `${spacing}px` : `${theme.custom.layout.pageSpacing}px`;
    }
  };

  // Background 색상 결정
  const getBackgroundColor = () => {
    switch (background) {
      case 'paper': return theme.palette.background.paper;
      case 'elevated': return theme.palette.background.elevated;
      case 'default': 
      default: return theme.palette.background.default;
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        backgroundColor: getBackgroundColor(),
        paddingTop: getSpacing(),
        paddingBottom: getSpacing(),
        ...sx
      }}
      {...props}
    >
      <Container
        maxWidth={maxWidth}
        disableGutters={disableGutters}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: `${theme.custom.layout.componentSpacing / 8}px`, // Use smaller gap between sections
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

/**
 * PageContent - 페이지 내부 콘텐츠 컨테이너
 * 헤더와 푸터 사이의 메인 콘텐츠 영역
 */
export const PageContent = ({ 
  children, 
  spacing = 'section',
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  
  const getSpacing = () => {
    switch (spacing) {
      case 'section': return theme.custom.layout.sectionSpacing;
      case 'component': return theme.custom.layout.componentSpacing;
      case 'element': return theme.custom.layout.elementSpacing;
      default: return typeof spacing === 'number' ? spacing : theme.custom.layout.sectionSpacing;
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: `${getSpacing() / 8}px`,
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * SectionContainer - 섹션 구분 컨테이너
 * 페이지 내 주요 섹션들을 구분하는 컨테이너
 */
export const SectionContainer = ({
  children,
  title,
  subtitle,
  actions,
  elevation = 0,
  spacing = 'component',
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  
  const getSpacing = () => {
    switch (spacing) {
      case 'component': return theme.custom.layout.componentSpacing;
      case 'element': return theme.custom.layout.elementSpacing;
      default: return typeof spacing === 'number' ? spacing : theme.custom.layout.componentSpacing;
    }
  };

  return (
    <Box
      sx={{
        padding: `${getSpacing()}px`,
        backgroundColor: elevation > 0 ? theme.palette.background.paper : 'transparent',
        borderRadius: elevation > 0 ? theme.shape.borderRadius : 0,
        boxShadow: elevation > 0 ? theme.shadows[elevation] : 'none',
        ...sx
      }}
      {...props}
    >
      {(title || subtitle || actions) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: `${getSpacing()}px`,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: `${theme.custom.layout.elementSpacing / 8}px`, sm: 0 }
          }}
        >
          <Box>
            {title && (
              <Box component="h3" sx={{ margin: 0, ...theme.typography.h5 }}>
                {title}
              </Box>
            )}
            {subtitle && (
              <Box 
                component="p" 
                sx={{ 
                  margin: 0,
                  marginTop: title ? `${theme.custom.layout.elementSpacing / 8}px` : 0,
                  color: theme.palette.text.secondary,
                  ...theme.typography.body2
                }}
              >
                {subtitle}
              </Box>
            )}
          </Box>
          {actions && (
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              {actions}
            </Box>
          )}
        </Box>
      )}
      {children}
    </Box>
  );
};

export default PageContainer;