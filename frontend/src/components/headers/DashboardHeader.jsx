import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Badge
} from '@mui/material';
import { 
  Refresh,
  Settings,
  Notifications,
  Help,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * DashboardHeader - 대시보드 전용 헤더
 * 시스템 상태, 알림, 빠른 액션을 표시하는 대시보드 헤더
 */
const DashboardHeader = ({
  title = "Dashboard",
  subtitle,
  systemStatus = 'healthy', // 'healthy', 'warning', 'error', 'maintenance'
  lastUpdated,
  notifications = 0,
  quickActions = [],
  onRefresh,
  onSettings,
  onNotifications,
  onHelp,
  showSystemStatus = true,
  showLastUpdated = true,
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  // 시스템 상태별 설정
  const getStatusConfig = () => {
    switch (systemStatus) {
      case 'healthy':
        return {
          color: theme.palette.success.main,
          backgroundColor: `${theme.palette.success.main}08`,
          label: 'System Healthy',
          icon: '●'
        };
      case 'warning':
        return {
          color: theme.palette.warning.main,
          backgroundColor: `${theme.palette.warning.main}08`,
          label: 'System Warning',
          icon: '⚠'
        };
      case 'error':
        return {
          color: theme.palette.error.main,
          backgroundColor: `${theme.palette.error.main}08`,
          label: 'System Error',
          icon: '●'
        };
      case 'maintenance':
        return {
          color: theme.palette.info.main,
          backgroundColor: `${theme.palette.info.main}08`,
          label: 'Maintenance Mode',
          icon: '🔧'
        };
      default:
        return {
          color: theme.palette.grey[500],
          backgroundColor: `${theme.palette.grey[500]}08`,
          label: 'Unknown Status',
          icon: '●'
        };
    }
  };

  const statusConfig = getStatusConfig();

  // 시간 포맷팅
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return null;
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.custom.layout.sectionSpacing / 8,
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 0 },
        ...sx
      }}
      {...props}
    >
      {/* 제목 및 상태 정보 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* 메인 제목 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 0.5 }}>
          <DashboardIcon 
            sx={{ 
              fontSize: { xs: '1.5rem', md: '2rem' }, 
              color: theme.palette.primary.main 
            }} 
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: theme.typography.fontWeightSemiBold,
              color: theme.palette.text.primary,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              lineHeight: { xs: 1.2, md: 1.167 }
            }}
          >
            {title}
          </Typography>
        </Box>

        {/* 부제목 */}
        {subtitle && (
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{
              marginBottom: 1,
              maxWidth: { xs: '100%', md: '70%' },
              lineHeight: 1.5
            }}
          >
            {subtitle}
          </Typography>
        )}

        {/* 상태 정보 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          gap: { xs: 1, md: 2 }, 
          flexWrap: 'wrap',
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          {/* 시스템 상태 */}
          {showSystemStatus && (
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{statusConfig.icon}</span>
                  <span style={{ display: { xs: 'none', sm: 'inline' } }}>{statusConfig.label}</span>
                  <span style={{ display: { xs: 'inline', sm: 'none' } }}>
                    {statusConfig.label.split(' ')[1] || statusConfig.label}
                  </span>
                </Box>
              }
              size="small"
              sx={{
                backgroundColor: statusConfig.backgroundColor,
                color: statusConfig.color,
                fontSize: { xs: '0.7rem', md: theme.typography.body2.fontSize },
                height: { xs: 24, md: 32 }
              }}
            />
          )}

          {/* 마지막 업데이트 시간 */}
          {showLastUpdated && lastUpdated && (
            <Typography 
              variant="caption" 
              color="textSecondary"
              sx={{
                fontSize: { xs: '0.65rem', md: '0.75rem' },
                display: { xs: 'block', sm: 'inline' },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Last updated: {formatLastUpdated(lastUpdated)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* 액션 영역 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, md: 1 },
          flexDirection: 'row',
          width: { xs: '100%', md: 'auto' },
          justifyContent: { xs: 'space-between', md: 'flex-end' },
          flexWrap: { xs: 'wrap', md: 'nowrap' }
        }}
      >
        {/* 빠른 액션 버튼들 */}
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'outlined'}
            color={action.color || 'primary'}
            size={action.size || 'small'}
            startIcon={action.icon}
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            sx={{
              minWidth: { xs: 'auto', md: '64px' },
              fontSize: { xs: '0.75rem', md: '0.875rem' },
              padding: { xs: '4px 8px', md: '6px 16px' },
              '& .MuiButton-startIcon': {
                marginRight: { xs: 0, md: 1 }
              },
              '& .MuiButton-startIcon > *:first-of-type': {
                fontSize: { xs: '1rem', md: '1.25rem' }
              },
              ...action.sx
            }}
          >
            <span style={{ display: { xs: 'none', md: 'inline' } }}>{action.label}</span>
          </Button>
        ))}

        {/* 시스템 액션 버튼들 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.25, md: 0.5 },
          ml: { xs: 0, md: 1 }
        }}>
          {/* 새로고침 */}
          {onRefresh && (
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={onRefresh}
                size={window.innerWidth < 768 ? "small" : "medium"}
                aria-label="Refresh Data"
                sx={{
                  color: theme.palette.text.secondary,
                  padding: { xs: '4px', md: '8px' },
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: '1.1rem', md: '1.5rem' }
                  }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          )}

          {/* 알림 */}
          {onNotifications && (
            <Tooltip title="Notifications">
              <IconButton
                onClick={onNotifications}
                size={window.innerWidth < 768 ? "small" : "medium"}
                aria-label="Notifications"
                sx={{
                  color: theme.palette.text.secondary,
                  padding: { xs: '4px', md: '8px' },
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: '1.1rem', md: '1.5rem' }
                  }
                }}
              >
                <Badge badgeContent={notifications} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* 도움말 */}
          {onHelp && (
            <Tooltip title="Help">
              <IconButton
                onClick={onHelp}
                size={window.innerWidth < 768 ? "small" : "medium"}
                aria-label="Help"
                sx={{
                  color: theme.palette.text.secondary,
                  padding: { xs: '4px', md: '8px' },
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: '1.1rem', md: '1.5rem' }
                  }
                }}
              >
                <Help />
              </IconButton>
            </Tooltip>
          )}

          {/* 설정 */}
          {onSettings && (
            <Tooltip title="Settings">
              <IconButton
                onClick={onSettings}
                size={window.innerWidth < 768 ? "small" : "medium"}
                aria-label="Settings"
                sx={{
                  color: theme.palette.text.secondary,
                  padding: { xs: '4px', md: '8px' },
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: '1.1rem', md: '1.5rem' }
                  }
                }}
              >
                <Settings />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardHeader;