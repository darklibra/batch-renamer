import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
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
 * ResponsiveGrid - 완전 반응형 그리드 (Enhanced with Width Consistency)
 * 화면 크기에 따라 자동으로 컬럼 수가 조정되는 그리드
 * Enhanced with CSS Grid for perfect width consistency
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
  mode = 'flex', // 'flex' | 'css-grid'
  minItemWidth = 250, // Minimum width for CSS Grid mode
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  // Enhanced CSS Grid Mode for Perfect Width Consistency
  if (mode === 'css-grid') {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: `repeat(${breakpoints.xs}, 1fr)`,
            sm: `repeat(${breakpoints.sm}, 1fr)`,
            md: `repeat(${breakpoints.md}, 1fr)`,
            lg: `repeat(${breakpoints.lg}, 1fr)`,
            xl: `repeat(${breakpoints.xl}, 1fr)`,
          },
          gap: theme.spacing(spacing),
          // Ensure consistent item widths
          '& > *': {
            minWidth: 0, // Prevents overflow
            width: '100%', // Forces consistent widths
          },
          ...sx
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }

  // Enhanced Flex Mode with Better Width Consistency
  return (
    <Grid
      container
      spacing={spacing}
      sx={{
        // Enhanced width consistency
        '& .MuiGrid-item': {
          display: 'flex',
          '& > *': {
            flex: 1,
            width: '100%',
          }
        },
        ...sx
      }}
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

/**
 * UniformGrid - Perfectly Uniform Width Grid
 * Ensures all items have exactly the same width regardless of content
 * Perfect for dashboard cards and metric displays
 */
export const UniformGrid = ({
  children,
  columns = { xs: 1, sm: 2, md: 4, lg: 4 },
  spacing = 3,
  minHeight = 120,
  aspectRatio = null, // e.g., '16/9', '1/1', null for auto height
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const childArray = React.Children.toArray(children);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs}, 1fr)`,
          sm: `repeat(${columns.sm}, 1fr)`,
          md: `repeat(${columns.md}, 1fr)`,
          lg: `repeat(${columns.lg}, 1fr)`,
          xl: `repeat(${columns.xl || columns.lg}, 1fr)`,
        },
        gap: theme.spacing(spacing),
        // Enforce uniform sizing
        '& > *': {
          minHeight: minHeight,
          width: '100%',
          ...(aspectRatio && {
            aspectRatio: aspectRatio,
            height: 'auto'
          }),
          // Ensure cards fill the grid item completely
          display: 'flex',
          flexDirection: 'column',
          '& .MuiCard-root': {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            '& .MuiCardContent-root:last-child': {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }
          }
        },
        ...sx
      }}
      {...props}
    >
      {childArray.map((child, index) => (
        <Box key={index}>
          {child}
        </Box>
      ))}
    </Box>
  );
};

/**
 * TwoColumnLayout - Prevents Width Inconsistency Issues
 * Standard 2fr-1fr layout pattern for consistent width distribution
 * Prevents the "70% content, 30% empty space" problem seen in File Scanner
 */
export const TwoColumnLayout = ({
  leftColumn,
  rightColumn,
  leftTitle = null,
  rightTitle = null,
  spacing = 3,
  ratio = { left: 2, right: 1 }, // Default 2:1 ratio
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { 
          xs: '1fr', 
          md: `${ratio.left}fr ${ratio.right}fr` 
        },
        gap: theme.spacing(spacing),
        ...sx
      }}
      {...props}
    >
      {/* Left Column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(spacing) }}>
        {leftTitle && (
          <Typography variant="h6" gutterBottom>
            {leftTitle}
          </Typography>
        )}
        {leftColumn}
      </Box>

      {/* Right Column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(spacing) }}>
        {rightTitle && (
          <Typography variant="h6" gutterBottom>
            {rightTitle}
          </Typography>
        )}
        {rightColumn}
      </Box>
    </Box>
  );
};

/**
 * BalancedLayout - Multi-Column Balanced Layout System
 * Ensures consistent width distribution across multiple columns
 * Prevents width imbalance issues by enforcing uniform grid patterns
 */
export const BalancedLayout = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  spacing = 3,
  minItemHeight = 'auto',
  uniformHeight = false,
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const childArray = React.Children.toArray(children);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs}, 1fr)`,
          sm: `repeat(${columns.sm}, 1fr)`,
          md: `repeat(${columns.md}, 1fr)`,
          lg: `repeat(${columns.lg}, 1fr)`,
        },
        gap: theme.spacing(spacing),
        // Enforce uniform heights if requested
        ...(uniformHeight && {
          '& > *': {
            minHeight: minItemHeight,
            display: 'flex',
            flexDirection: 'column',
            '& .MuiCard-root': {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              '& .MuiCardContent-root:last-child': {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }
            }
          }
        }),
        ...sx
      }}
      {...props}
    >
      {childArray.map((child, index) => (
        <Box key={index}>
          {child}
        </Box>
      ))}
    </Box>
  );
};

export default ContentGrid;