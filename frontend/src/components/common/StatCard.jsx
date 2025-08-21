import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

/**
 * StatCard - 통계 표시용 카드 컴포넌트
 * Dashboard와 Jobs 페이지에서 공통 사용되는 통계 카드
 */
const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend, // 'up', 'down', 'neutral'
  trendValue,
  trendLabel = 'vs last period',
  showProgress = false,
  progressValue = 0,
  maxValue = 100,
  onClick,
  loading = false,
  error = false,
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'elevation', // 'elevation', 'outlined'
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  // 크기별 설정
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          padding: 1.5,
          iconSize: 'medium',
          titleVariant: 'body2',
          valueVariant: 'h6',
          subtitleVariant: 'caption'
        };
      case 'large':
        return {
          padding: 3,
          iconSize: 'large',
          titleVariant: 'h6',
          valueVariant: 'h3',
          subtitleVariant: 'body2'
        };
      default: // medium
        return {
          padding: 2,
          iconSize: 'medium',
          titleVariant: 'body1',
          valueVariant: 'h4',
          subtitleVariant: 'body2'
        };
    }
  };

  const sizeConfig = getSizeConfig();

  // 색상 테마 가져오기
  const getColorTheme = () => {
    if (error) {
      return {
        main: theme.palette.error.main,
        background: theme.palette.error.light + '20',
        text: theme.palette.error.dark
      };
    }

    const paletteColor = theme.palette[color];
    return {
      main: paletteColor?.main || theme.palette.primary.main,
      background: (paletteColor?.main || theme.palette.primary.main) + '12',
      text: paletteColor?.dark || theme.palette.primary.dark
    };
  };

  const colorTheme = getColorTheme();

  // 트렌드 아이콘 가져오기
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp fontSize="small" color="success" />;
      case 'down':
        return <TrendingDown fontSize="small" color="error" />;
      case 'neutral':
        return <Remove fontSize="small" color="action" />;
      default:
        return null;
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <Card 
        variant={variant}
        sx={{ height: '100%', ...sx }} 
        {...props}
      >
        <CardContent sx={{ p: sizeConfig.padding }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 1, 
                bgcolor: 'grey.200',
                mr: 2,
                animation: 'pulse 1.5s infinite'
              }} 
            />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ height: 20, bgcolor: 'grey.200', borderRadius: 1, mb: 1 }} />
              <Box sx={{ height: 16, bgcolor: 'grey.100', borderRadius: 1, width: '60%' }} />
            </Box>
          </Box>
          <Box sx={{ height: 32, bgcolor: 'grey.200', borderRadius: 1, mb: 1 }} />
          {subtitle && <Box sx={{ height: 16, bgcolor: 'grey.100', borderRadius: 1, width: '80%' }} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      variant={variant}
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        } : {},
        ...sx 
      }} 
      onClick={onClick}
      {...props}
    >
      <CardContent sx={{ p: sizeConfig.padding, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 상단: 아이콘과 제목 */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          {icon && (
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 1, 
                bgcolor: colorTheme.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                color: colorTheme.main
              }}
            >
              {React.cloneElement(icon, { fontSize: sizeConfig.iconSize })}
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant={sizeConfig.titleVariant} 
              color="textSecondary" 
              sx={{ 
                fontWeight: 500,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {title}
            </Typography>
            {/* 트렌드 표시 */}
            {trend && trendValue && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                {getTrendIcon()}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {trendValue} {trendLabel}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* 중간: 값 표시 */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant={sizeConfig.valueVariant} 
            color={colorTheme.text}
            sx={{ 
              fontWeight: 'bold',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {value}
          </Typography>
        </Box>

        {/* 하단: 부제목 및 진행률 */}
        {(subtitle || showProgress) && (
          <Box sx={{ mt: 1 }}>
            {subtitle && (
              <Typography 
                variant={sizeConfig.subtitleVariant} 
                color="textSecondary"
                sx={{ 
                  mb: showProgress ? 1 : 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {subtitle}
              </Typography>
            )}
            {showProgress && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    Progress
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {progressValue}/{maxValue}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(progressValue / maxValue) * 100}
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: colorTheme.background,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: colorTheme.main,
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;