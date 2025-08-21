import React from 'react';
import { Grid, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * ContentGrid - 표준 그리드 시스템
 * 일관된 간격과 반응형 레이아웃을 제공하는 그리드 컴포넌트
 */
const ContentGrid = ({
  children,
  spacing = 3,
  columns = 12,
  sx = {},
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  ...props
}) => {
  return (
    <Grid
      container
      spacing={spacing}
      sx={{
        alignItems,
        justifyContent,
        ...sx
      }}
      {...props}
    >
      {children}
    </Grid>
  );
};

/**
 * ContentGridItem - 그리드 아이템 래퍼
 * 표준 그리드 아이템 설정을 제공
 */
export const ContentGridItem = ({
  children,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  sx = {},
  ...props
}) => {
  return (
    <Grid
      item
      xs={xs}
      sm={sm}
      md={md}
      lg={lg}
      xl={xl}
      sx={sx}
      {...props}
    >
      {children}
    </Grid>
  );
};

/**
 * CardGrid - 카드 레이아웃 전용 그리드
 * 카드 형태의 콘텐츠 배치에 최적화된 그리드
 */
export const CardGrid = ({
  children,
  spacing = 3,
  minCardWidth = 300,
  maxCardWidth = 400,
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
        gap: theme.spacing(spacing),
        maxWidth: '100%',
        '& > *': {
          maxWidth: maxCardWidth
        },
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * ListGrid - 리스트 형태 그리드
 * 리스트 아이템들을 표시하는데 최적화된 그리드
 */
export const ListGrid = ({
  children,
  spacing = 2,
  itemHeight = 'auto',
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(spacing),
        '& > *': {
          minHeight: itemHeight === 'auto' ? 'auto' : itemHeight
        },
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * ResponsiveGrid - 완전 반응형 그리드
 * 화면 크기에 따라 자동으로 컬럼 수가 조정되는 그리드
 */
export const ResponsiveGrid = ({
  children,
  spacing = 3,
  breakpoints = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 4
  },
  sx = {},
  ...props
}) => {
  return (
    <Grid
      container
      spacing={spacing}
      sx={sx}
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <Grid
          item
          key={index}
          xs={12 / breakpoints.xs}
          sm={12 / breakpoints.sm}
          md={12 / breakpoints.md}
          lg={12 / breakpoints.lg}
          xl={12 / breakpoints.xl}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

/**
 * FlexGrid - Flexbox 기반 그리드
 * 유연한 레이아웃이 필요한 경우 사용
 */
export const FlexGrid = ({
  children,
  direction = 'row',
  wrap = 'wrap',
  spacing = 2,
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: wrap,
        alignItems,
        justifyContent,
        gap: theme.spacing(spacing),
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * SidebarGrid - 사이드바가 있는 그리드 레이아웃
 * 메인 콘텐츠와 사이드바를 배치하는 그리드
 */
export const SidebarGrid = ({
  children,
  sidebar,
  sidebarPosition = 'right',
  sidebarWidth = { xs: 12, md: 4 },
  contentWidth = { xs: 12, md: 8 },
  spacing = 3,
  sx = {},
  ...props
}) => {
  const mainContent = children;
  const sidebarContent = sidebar;

  return (
    <Grid container spacing={spacing} sx={sx} {...props}>
      {sidebarPosition === 'left' && sidebarContent && (
        <Grid item {...sidebarWidth}>
          {sidebarContent}
        </Grid>
      )}
      
      <Grid item {...contentWidth}>
        {mainContent}
      </Grid>
      
      {sidebarPosition === 'right' && sidebarContent && (
        <Grid item {...sidebarWidth}>
          {sidebarContent}
        </Grid>
      )}
    </Grid>
  );
};

export default ContentGrid;