import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Button,
  Tooltip,
  Badge,
  Collapse
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Visibility,
  ExpandMore,
  Schedule,
  Speed,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Timer,
  Refresh
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * ActiveJobCard - 실행 중인 작업 표시 카드
 * 실시간 진행률 업데이트와 컨트롤 기능을 제공
 */
const ActiveJobCard = ({
  job,
  onPause,
  onStop,
  onView,
  onRefresh,
  autoRefresh = true,
  refreshInterval = 2000,
  showDetails = false,
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [localJob, setLocalJob] = useState(job);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // 자동 새로고침 효과
  useEffect(() => {
    if (autoRefresh && onRefresh && ['started', 'processing'].includes(localJob?.status)) {
      const interval = setInterval(() => {
        onRefresh(localJob.id).then((updatedJob) => {
          if (updatedJob) {
            setLocalJob(updatedJob);
            setLastUpdated(new Date());
          }
        });
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, onRefresh, localJob?.id, localJob?.status, refreshInterval]);

  // job 프롭이 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setLocalJob(job);
    setLastUpdated(new Date());
  }, [job]);

  if (!localJob) {
    return null;
  }

  // 상태별 설정 가져오기
  const getStatusConfig = () => {
    switch (localJob.status) {
      case 'started':
        return {
          color: theme.palette.info.main,
          backgroundColor: theme.palette.info.light + '20',
          icon: <Info fontSize="small" />,
          label: 'STARTED',
          animation: 'pulse 2s infinite'
        };
      case 'processing':
        return {
          color: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.light + '20',
          icon: <Schedule fontSize="small" />,
          label: 'PROCESSING',
          animation: 'pulse 2s infinite'
        };
      case 'paused':
        return {
          color: theme.palette.warning.main,
          backgroundColor: theme.palette.warning.light + '20',
          icon: <Pause fontSize="small" />,
          label: 'PAUSED',
          animation: 'none'
        };
      case 'stopping':
        return {
          color: theme.palette.error.main,
          backgroundColor: theme.palette.error.light + '20',
          icon: <Stop fontSize="small" />,
          label: 'STOPPING',
          animation: 'pulse 1s infinite'
        };
      default:
        return {
          color: theme.palette.grey[500],
          backgroundColor: theme.palette.grey[200],
          icon: <Schedule fontSize="small" />,
          label: localJob.status?.toUpperCase() || 'UNKNOWN',
          animation: 'none'
        };
    }
  };

  const statusConfig = getStatusConfig();

  // 진행률 계산
  const getProgress = () => {
    const total = localJob.total_count || 0;
    const processed = localJob.processed_count || 0;
    return total > 0 ? (processed / total * 100) : 0;
  };

  // 성공률 계산
  const getSuccessRate = () => {
    const successful = localJob.successful_extractions || 0;
    const failed = localJob.failed_extractions || 0;
    const total = successful + failed;
    return total > 0 ? (successful / total * 100) : 0;
  };

  // 실행 시간 계산
  const getRuntime = () => {
    if (localJob.started_at) {
      const start = new Date(localJob.started_at);
      const now = new Date();
      const diffSeconds = Math.floor((now - start) / 1000);
      
      if (diffSeconds < 60) return `${diffSeconds}s`;
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ${diffSeconds % 60}s`;
      return `${Math.floor(diffSeconds / 3600)}h ${Math.floor((diffSeconds % 3600) / 60)}m`;
    }
    return 'N/A';
  };

  // 예상 완료 시간 계산
  const getEstimatedCompletion = () => {
    const progress = getProgress();
    if (progress > 0 && localJob.started_at) {
      const start = new Date(localJob.started_at);
      const now = new Date();
      const elapsed = now - start;
      const totalEstimated = (elapsed / progress) * 100;
      const remaining = totalEstimated - elapsed;
      
      if (remaining > 0) {
        const remainingMinutes = Math.ceil(remaining / (1000 * 60));
        if (remainingMinutes < 60) return `~${remainingMinutes}m remaining`;
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;
        return `~${hours}h ${minutes}m remaining`;
      }
    }
    return 'Calculating...';
  };

  const progress = getProgress();
  const successRate = getSuccessRate();
  const isActive = ['started', 'processing'].includes(localJob.status);

  return (
    <Card 
      sx={{ 
        height: '100%',
        border: `2px solid ${statusConfig.color}20`,
        backgroundColor: statusConfig.backgroundColor,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
          borderColor: statusConfig.color + '40'
        },
        ...sx 
      }} 
      {...props}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* 헤더: 작업 ID와 상태 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge
              badgeContent={isActive ? '●' : null}
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  animation: statusConfig.animation,
                  minWidth: 8,
                  height: 8,
                  borderRadius: '50%'
                }
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
              >
                {localJob.id?.substring(0, 8) || 'Unknown'}
              </Typography>
            </Badge>
          </Box>
          
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            size="small"
            sx={{
              color: statusConfig.color,
              backgroundColor: 'white',
              border: `1px solid ${statusConfig.color}`,
              fontWeight: 'bold',
              animation: isActive ? statusConfig.animation : 'none'
            }}
          />
        </Box>

        {/* 작업 타입 */}
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {localJob.job_type || 'Unknown Job Type'}
        </Typography>

        {/* 진행률 표시 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Progress
            </Typography>
            <Typography variant="body2" color={statusConfig.color} fontWeight="bold">
              {progress.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'white',
              '& .MuiLinearProgress-bar': {
                backgroundColor: statusConfig.color,
                borderRadius: 4
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="textSecondary">
              {localJob.processed_count || 0} / {localJob.total_count || 0} files
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {getEstimatedCompletion()}
            </Typography>
          </Box>
        </Box>

        {/* 메트릭스 그리드 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              {localJob.successful_extractions || 0}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Success
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
            <Typography variant="h6" color="error.main" fontWeight="bold">
              {localJob.failed_extractions || 0}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Failed
            </Typography>
          </Box>
        </Box>

        {/* 확장 가능한 상세 정보 */}
        {showDetails && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                Job Details
              </Typography>
              <IconButton size="small" sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <ExpandMore />
              </IconButton>
            </Box>
            
            <Collapse in={expanded}>
              <Box sx={{ mt: 1, p: 1, bgcolor: 'white', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                  Started: {localJob.started_at ? new Date(localJob.started_at).toLocaleString() : 'N/A'}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                  Runtime: {getRuntime()}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                  Success Rate: {successRate.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                  Stage: {localJob.stage || 'N/A'}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                  Last Updated: {lastUpdated.toLocaleTimeString()}
                </Typography>
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>

      {/* 액션 버튼들 */}
      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* 일시정지/재개 */}
          {onPause && isActive && (
            <Tooltip title="Pause Job">
              <IconButton size="small" onClick={() => onPause(localJob.id)} color="warning">
                <Pause fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {/* 정지 */}
          {onStop && isActive && (
            <Tooltip title="Stop Job">
              <IconButton size="small" onClick={() => onStop(localJob.id)} color="error">
                <Stop fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* 새로고침 */}
          {onRefresh && (
            <Tooltip title="Refresh">
              <IconButton 
                size="small" 
                onClick={() => onRefresh(localJob.id)}
                sx={{ 
                  animation: isActive ? 'spin 2s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* 상세보기 */}
        {onView && (
          <Button
            size="small"
            startIcon={<Visibility fontSize="small" />}
            onClick={() => onView(localJob.id)}
            sx={{ color: statusConfig.color }}
          >
            View Details
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default ActiveJobCard;