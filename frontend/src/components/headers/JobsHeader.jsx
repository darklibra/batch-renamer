import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
  IconButton,
  Tooltip,
  Chip,
  Badge
} from '@mui/material';
import { 
  Refresh,
  FilterList,
  PlayArrow,
  Stop,
  Analytics,
  Assignment,
  Autorenew,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * JobsHeader - Jobs 페이지 전용 헤더
 * Dashboard 스타일과 일관성을 유지하면서 Job 관련 기능 제공
 */
const JobsHeader = ({
  title = "Jobs Management",
  subtitle = "Monitor and manage background jobs and processing tasks",
  jobStats = {
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0
  },
  lastUpdated,
  autoRefresh = false,
  onRefresh,
  onToggleAutoRefresh,
  onFilterToggle,
  quickActions = [],
  showJobStats = true,
  showLastUpdated = true,
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  // Job 상태별 전체 시스템 상태 계산
  const getSystemStatus = () => {
    const { activeJobs, failedJobs, totalJobs } = jobStats;
    
    if (failedJobs > totalJobs * 0.1) return 'error'; // 10% 이상 실패
    if (activeJobs > 0) return 'processing'; // 활성 작업 있음
    if (totalJobs === 0) return 'idle'; // 작업 없음
    return 'completed'; // 완료 상태
  };

  // 시스템 상태별 설정 (Dashboard와 동일한 패턴)
  const getStatusConfig = (status) => {
    switch (status) {
      case 'processing':
        return {
          color: theme.palette.primary.main,
          backgroundColor: `${theme.palette.primary.main}08`,
          label: 'Jobs Processing',
          icon: '⚡'
        };
      case 'completed':
        return {
          color: theme.palette.success.main,
          backgroundColor: `${theme.palette.success.main}08`,
          label: 'Jobs Completed',
          icon: '✅'
        };
      case 'error':
        return {
          color: theme.palette.error.main,
          backgroundColor: `${theme.palette.error.main}08`,
          label: 'Jobs Failed',
          icon: '❌'
        };
      case 'idle':
        return {
          color: theme.palette.info.main,
          backgroundColor: `${theme.palette.info.main}08`,
          label: 'System Idle',
          icon: '⏸️'
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

  const systemStatus = getSystemStatus();
  const statusConfig = getStatusConfig(systemStatus);

  // 시간 포맷팅 (DashboardHeader와 동일)
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

  // Job 통계 칩 생성
  const getJobStatChips = () => {
    const chips = [];
    
    if (jobStats.activeJobs > 0) {
      chips.push(
        <Chip
          key="active"
          label={`${jobStats.activeJobs} Active`}
          size="small"
          color="primary"
          icon={<PlayArrow sx={{ fontSize: '0.8rem' }} />}
        />
      );
    }
    
    if (jobStats.failedJobs > 0) {
      chips.push(
        <Chip
          key="failed"
          label={`${jobStats.failedJobs} Failed`}
          size="small"
          color="error"
          icon={<Stop sx={{ fontSize: '0.8rem' }} />}
        />
      );
    }
    
    if (jobStats.completedJobs > 0) {
      chips.push(
        <Chip
          key="completed"
          label={`${jobStats.completedJobs} Completed`}
          size="small"
          color="success"
        />
      );
    }

    return chips;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.custom?.layout?.sectionSpacing / 8 || 3,
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 0 },
        ...sx
      }}
      {...props}
    >
      {/* 제목 및 상태 정보 (Dashboard와 동일한 구조) */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* 메인 제목 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 0.5 }}>
          <Assignment 
            sx={{ 
              fontSize: '2rem', 
              color: theme.palette.primary.main 
            }} 
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: theme.typography.fontWeightSemiBold || 600,
              color: theme.palette.text.primary
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* 시스템 상태 */}
          <Chip
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{statusConfig.icon}</span>
                {statusConfig.label}
              </Box>
            }
            size="small"
            sx={{
              backgroundColor: statusConfig.backgroundColor,
              color: statusConfig.color,
              fontSize: theme.typography.body2.fontSize
            }}
          />

          {/* Job 통계 칩들 */}
          {showJobStats && getJobStatChips()}

          {/* 마지막 업데이트 시간 */}
          {showLastUpdated && lastUpdated && (
            <Typography variant="caption" color="textSecondary">
              Last updated: {formatLastUpdated(lastUpdated)}
            </Typography>
          )}

          {/* 자동 새로고침 상태 */}
          {autoRefresh && (
            <Chip
              label="Auto-refresh ON"
              size="small"
              color="info"
              icon={<Autorenew sx={{ fontSize: '0.8rem' }} />}
            />
          )}
        </Box>
      </Box>

      {/* 액션 영역 (Dashboard와 동일한 구조) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexDirection: { xs: 'row', md: 'row' },
          width: { xs: '100%', md: 'auto' },
          justifyContent: { xs: 'space-between', md: 'flex-end' }
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
            sx={{
              minWidth: 'auto',
              ...action.sx
            }}
          >
            {action.label}
          </Button>
        ))}

        {/* 시스템 액션 버튼들 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* 필터 토글 */}
          {onFilterToggle && (
            <Tooltip title="Toggle Filters">
              <IconButton
                onClick={onFilterToggle}
                size="medium"
                sx={{
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`
                  }
                }}
              >
                <FilterList />
              </IconButton>
            </Tooltip>
          )}

          {/* 자동 새로고침 토글 */}
          {onToggleAutoRefresh && (
            <Tooltip title={autoRefresh ? "Disable Auto-refresh" : "Enable Auto-refresh"}>
              <IconButton
                onClick={onToggleAutoRefresh}
                size="medium"
                color={autoRefresh ? "primary" : "default"}
                sx={{
                  color: autoRefresh ? theme.palette.primary.main : theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`
                  }
                }}
              >
                <Autorenew />
              </IconButton>
            </Tooltip>
          )}

          {/* 새로고침 */}
          {onRefresh && (
            <Tooltip title="Refresh Jobs">
              <IconButton
                onClick={onRefresh}
                size="medium"
                sx={{
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}08`
                  }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          )}

          {/* 통계 보기 */}
          <Tooltip title="View Analytics">
            <IconButton
              size="medium"
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: `${theme.palette.primary.main}08`
                }
              }}
            >
              <Analytics />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default JobsHeader;