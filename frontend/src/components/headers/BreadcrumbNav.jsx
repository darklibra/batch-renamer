import React from 'react';
import { 
  Breadcrumbs, 
  Link, 
  Typography, 
  Box 
} from '@mui/material';
import { 
  NavigateNext,
  Home
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * BreadcrumbNav - 재사용 가능한 브레드크럼 네비게이션
 * 계층형 네비게이션을 표시하는 컴포넌트
 */
const BreadcrumbNav = ({
  items = [],
  separator = <NavigateNext fontSize="small" />,
  showHome = true,
  homeLabel = "Home",
  homeIcon = <Home fontSize="small" />,
  onHome,
  maxItems = 8,
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  // 홈 아이템 생성
  const homeItem = showHome ? {
    label: homeLabel,
    icon: homeIcon,
    onClick: onHome,
    isHome: true
  } : null;

  // 전체 아이템 배열 구성
  const allItems = homeItem ? [homeItem, ...items] : items;

  // 마지막 아이템이 현재 페이지
  const renderBreadcrumbItem = (item, index, isLast) => {
    const isClickable = item.onClick && !isLast;
    const itemContent = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {item.icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 'inherit'
            }}
          >
            {item.icon}
          </Box>
        )}
        <span>{item.label}</span>
      </Box>
    );

    if (isClickable) {
      return (
        <Link
          key={index}
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            item.onClick();
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            fontSize: theme.typography.body2.fontSize,
            '&:hover': {
              textDecoration: 'underline'
            },
            ...(item.isHome && {
              fontWeight: theme.typography.fontWeightMedium
            })
          }}
        >
          {itemContent}
        </Link>
      );
    }

    return (
      <Typography
        key={index}
        color={isLast ? 'primary' : 'textPrimary'}
        sx={{
          display: 'flex',
          alignItems: 'center',
          fontSize: theme.typography.body2.fontSize,
          fontWeight: isLast 
            ? theme.typography.fontWeightMedium 
            : theme.typography.fontWeightRegular
        }}
      >
        {itemContent}
      </Typography>
    );
  };

  return (
    <Breadcrumbs
      separator={separator}
      maxItems={maxItems}
      aria-label="breadcrumb navigation"
      sx={{
        '& .MuiBreadcrumbs-separator': {
          color: theme.palette.text.secondary,
          fontSize: theme.typography.body2.fontSize
        },
        '& .MuiBreadcrumbs-ol': {
          alignItems: 'center'
        },
        ...sx
      }}
      {...props}
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        return renderBreadcrumbItem(item, index, isLast);
      })}
    </Breadcrumbs>
  );
};

/**
 * SimpleBreadcrumb - 간단한 텍스트 기반 브레드크럼
 * 복잡한 네비게이션이 필요하지 않은 경우 사용
 */
export const SimpleBreadcrumb = ({
  items = [],
  separator = " / ",
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  return (
    <Typography
      variant="body2"
      color="textSecondary"
      sx={{
        fontFamily: theme.typography.fontFamily,
        ...sx
      }}
      {...props}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span style={{ margin: '0 4px', color: theme.palette.text.disabled }}>
              {separator}
            </span>
          )}
          <span
            style={{
              color: index === items.length - 1 
                ? theme.palette.primary.main 
                : theme.palette.text.secondary,
              fontWeight: index === items.length - 1 
                ? theme.typography.fontWeightMedium 
                : theme.typography.fontWeightRegular
            }}
          >
            {item}
          </span>
        </React.Fragment>
      ))}
    </Typography>
  );
};

export default BreadcrumbNav;