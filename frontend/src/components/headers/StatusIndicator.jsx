import React from 'react';
import { 
  Box, 
  Chip, 
  Tooltip, 
  Typography 
} from '@mui/material';
import { 
  CheckCircle,
  Error,
  Warning,
  Info,
  RadioButtonUnchecked,
  Refresh
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * StatusIndicator - 상태 표시 컴포넌트
 * 다양한 상태를 시각적으로 표시하는 범용 컴포넌트
 */
const StatusIndicator = ({
  status = 'unknown',
  label,
  size = 'medium',
  variant = 'chip', // 'chip', 'dot', 'icon', 'text'
  showIcon = true,
  showLabel = true,
  tooltip,
  animate = false,
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  // 상태별 설정
  const getStatusConfig = (status) => {
    const configs = {
      success: {
        color: theme.palette.success.main,
        backgroundColor: `${theme.palette.success.main}08`,
        borderColor: theme.palette.success.main,
        icon: CheckCircle,
        label: 'Success'
      },
      error: {
        color: theme.palette.error.main,
        backgroundColor: `${theme.palette.error.main}08`,
        borderColor: theme.palette.error.main,
        icon: Error,
        label: 'Error'
      },
      warning: {
        color: theme.palette.warning.main,
        backgroundColor: `${theme.palette.warning.main}08`,
        borderColor: theme.palette.warning.main,
        icon: Warning,
        label: 'Warning'
      },
      info: {
        color: theme.palette.info.main,
        backgroundColor: `${theme.palette.info.main}08`,
        borderColor: theme.palette.info.main,
        icon: Info,
        label: 'Info'
      },
      pending: {
        color: theme.palette.grey[600],
        backgroundColor: `${theme.palette.grey[600]}08`,
        borderColor: theme.palette.grey[600],
        icon: RadioButtonUnchecked,
        label: 'Pending'
      },
      processing: {
        color: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}08`,
        borderColor: theme.palette.primary.main,
        icon: Refresh,
        label: 'Processing'
      },
      unknown: {
        color: theme.palette.grey[500],
        backgroundColor: `${theme.palette.grey[500]}08`,
        borderColor: theme.palette.grey[500],
        icon: RadioButtonUnchecked,
        label: 'Unknown'
      }
    };

    return configs[status] || configs.unknown;
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;
  const displayLabel = label || config.label;

  // 크기별 설정
  const getSizeConfig = (size) => {
    const sizes = {
      small: {
        iconSize: 16,
        fontSize: theme.typography.caption.fontSize,
        padding: '2px 6px',
        dotSize: 8
      },
      medium: {
        iconSize: 20,
        fontSize: theme.typography.body2.fontSize,
        padding: '4px 8px',
        dotSize: 10
      },
      large: {
        iconSize: 24,
        fontSize: theme.typography.body1.fontSize,
        padding: '6px 12px',
        dotSize: 12
      }
    };

    return sizes[size] || sizes.medium;
  };

  const sizeConfig = getSizeConfig(size);

  // 애니메이션 스타일
  const animationStyles = animate ? {
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
        opacity: 1,
      },
      '50%': {
        transform: 'scale(1.05)',
        opacity: 0.8,
      },
      '100%': {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
    animation: status === 'processing' ? 'pulse 1.5s ease-in-out infinite' : 'none'
  } : {};

  // 렌더링 함수들
  const renderChip = () => (
    <Chip
      icon={showIcon ? <IconComponent sx={{ fontSize: sizeConfig.iconSize }} /> : undefined}
      label={showLabel ? displayLabel : ''}
      size={size === 'large' ? 'medium' : 'small'}
      sx={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        borderColor: config.borderColor,
        border: `1px solid ${config.borderColor}`,
        fontSize: sizeConfig.fontSize,
        '& .MuiChip-icon': {
          color: config.color
        },
        ...animationStyles,
        ...sx
      }}
      {...props}
    />
  );

  const renderDot = () => (
    <Box
      sx={{
        width: sizeConfig.dotSize,
        height: sizeConfig.dotSize,
        borderRadius: '50%',
        backgroundColor: config.color,
        display: 'inline-block',
        ...animationStyles,
        ...sx
      }}
      {...props}
    />
  );

  const renderIcon = () => (
    <IconComponent
      sx={{
        fontSize: sizeConfig.iconSize,
        color: config.color,
        ...animationStyles,
        ...sx
      }}
      {...props}
    />
  );

  const renderText = () => (
    <Typography
      variant={size === 'small' ? 'caption' : 'body2'}
      sx={{
        color: config.color,
        fontWeight: theme.typography.fontWeightMedium,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        ...sx
      }}
      {...props}
    >
      {showIcon && (
        <IconComponent 
          sx={{ 
            fontSize: sizeConfig.iconSize,
            ...animationStyles
          }} 
        />
      )}
      {showLabel && displayLabel}
    </Typography>
  );

  // 메인 렌더링
  const renderIndicator = () => {
    switch (variant) {
      case 'dot': return renderDot();
      case 'icon': return renderIcon();
      case 'text': return renderText();
      case 'chip':
      default: return renderChip();
    }
  };

  const indicator = renderIndicator();

  // 툴팁이 있는 경우 감싸기
  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
          {indicator}
        </Box>
      </Tooltip>
    );
  }

  return indicator;
};

/**
 * StatusGroup - 여러 상태를 그룹으로 표시
 */
export const StatusGroup = ({
  statuses = [],
  orientation = 'horizontal',
  spacing = 1,
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
        gap: theme.spacing(spacing),
        alignItems: 'center',
        ...sx
      }}
      {...props}
    >
      {statuses.map((statusProps, index) => (
        <StatusIndicator
          key={index}
          {...statusProps}
        />
      ))}
    </Box>
  );
};

export default StatusIndicator;