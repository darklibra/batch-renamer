import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  Chip,
  IconButton,
  Button,
  Tooltip,
  Collapse,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Cancel,
  Warning,
  Visibility,
  Replay,
  Download,
  ExpandMore,
  Schedule,
  Speed,
  Assignment,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * CompletedJobCard - 완료된 작업 표시 카드
 * 작업 결과 요약과 재실행/상세보기 기능 제공
 */
const CompletedJobCard = ({
  job,
  onViewDetails,
  onRerun,
  onExport,
  showMetrics = true,
  showActions = true,
  compact = false,
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!job) {
    return null;
  }

  // 상태별 설정 가져오기
  const getStatusConfig = () => {
    switch (job.status) {
      case 'completed':
        return {
          color: theme.palette.success.main,
          backgroundColor: theme.palette.success.light + '15',
          borderColor: theme.palette.success.main + '30',
          icon: <CheckCircle fontSize="small" />,
          label: 'COMPLETED',
          textColor: theme.palette.success.dark
        };
      case 'error':
      case 'failed':
        return {
          color: theme.palette.error.main,
          backgroundColor: theme.palette.error.light + '15',
          borderColor: theme.palette.error.main + '30',
          icon: <ErrorIcon fontSize="small" />,
          label: 'FAILED',
          textColor: theme.palette.error.dark
        };
      case 'cancelled':
        return {
          color: theme.palette.warning.main,
          backgroundColor: theme.palette.warning.light + '15',
          borderColor: theme.palette.warning.main + '30',
          icon: <Cancel fontSize="small" />,
          label: 'CANCELLED',
          textColor: theme.palette.warning.dark
        };
      case 'timeout':
        return {
          color: theme.palette.orange?.main || theme.palette.warning.main,
          backgroundColor: (theme.palette.orange?.light || theme.palette.warning.light) + '15',
          borderColor: (theme.palette.orange?.main || theme.palette.warning.main) + '30',
          icon: <Schedule fontSize="small" />,
          label: 'TIMEOUT',
          textColor: theme.palette.orange?.dark || theme.palette.warning.dark
        };
      default:
        return {
          color: theme.palette.grey[500],
          backgroundColor: theme.palette.grey[100],
          borderColor: theme.palette.grey[300],
          icon: <Assignment fontSize="small" />,
          label: job.status?.toUpperCase() || 'UNKNOWN',
          textColor: theme.palette.grey[700]
        };
    }
  };

  const statusConfig = getStatusConfig();

  // 성공률 계산
  const getSuccessRate = () => {
    const successful = job.successful_extractions || 0;
    const failed = job.failed_extractions || 0;
    const total = successful + failed;
    return total > 0 ? (successful / total * 100) : 0;
  };

  // 실행 시간 계산
  const getDuration = () => {
    if (job.completed_at && job.started_at) {
      const duration = new Date(job.completed_at) - new Date(job.started_at);
      const seconds = Math.floor(duration / 1000);
      
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
    return 'N/A';
  };

  // 처리 속도 계산 (files/second)
  const getProcessingSpeed = () => {
    if (job.completed_at && job.started_at && job.processed_count) {
      const duration = (new Date(job.completed_at) - new Date(job.started_at)) / 1000;
      const speed = job.processed_count / duration;
      
      if (speed < 1) return `${speed.toFixed(2)} files/s`;
      return `${Math.round(speed)} files/s`;
    }
    return 'N/A';
  };

  // 성과 등급 결정
  const getPerformanceGrade = () => {
    const successRate = getSuccessRate();
    if (successRate >= 95) return { grade: 'A+', color: theme.palette.success.main, icon: <TrendingUp /> };
    if (successRate >= 90) return { grade: 'A', color: theme.palette.success.main, icon: <TrendingUp /> };
    if (successRate >= 80) return { grade: 'B+', color: theme.palette.info.main, icon: <TrendingUp /> };
    if (successRate >= 70) return { grade: 'B', color: theme.palette.warning.main, icon: <TrendingDown /> };
    return { grade: 'C', color: theme.palette.error.main, icon: <TrendingDown /> };
  };

  const successRate = getSuccessRate();
  const duration = getDuration();
  const processingSpeed = getProcessingSpeed();
  const performance = getPerformanceGrade();

  return (
    <Card 
      sx={{ 
        height: compact ? 'auto' : '100%',
        backgroundColor: statusConfig.backgroundColor,
        border: `1px solid ${statusConfig.borderColor}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[4],
          borderColor: statusConfig.color + '60'
        },
        ...sx 
      }} 
      {...props}
    >
      <CardContent sx={{ pb: showActions ? 1 : 2 }}>
        {/* 헤더: 작업 ID와 상태 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: compact ? 1 : 2 }}>
          <Typography 
            variant={compact ? "body2" : "h6"} 
            sx={{ 
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: statusConfig.textColor
            }}
          >
            {job.id?.substring(0, 8) || 'Unknown'}
          </Typography>
          
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            size="small"
            sx={{
              color: statusConfig.color,
              backgroundColor: 'white',
              border: `1px solid ${statusConfig.color}`,
              fontWeight: 'bold'
            }}
          />
        </Box>

        {/* 작업 정보 */}
        <Box sx={{ mb: compact ? 1 : 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
            {job.job_type || 'Unknown Job Type'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Completed: {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'}
          </Typography>
        </Box>

        {/* 메트릭스 */}
        {showMetrics && !compact && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'white', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" color={statusConfig.color} fontWeight="bold">
                {successRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Success Rate
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'white', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" color="primary.main" fontWeight="bold">
                {job.processed_count || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Files Processed
              </Typography>
            </Box>
          </Box>
        )}

        {/* 컴팩트 모드 메트릭스 */}
        {compact && (
          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Success: <span style={{ color: statusConfig.color, fontWeight: 'bold' }}>{successRate.toFixed(1)}%</span>
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Files: <span style={{ fontWeight: 'bold' }}>{job.processed_count || 0}</span>
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Duration: <span style={{ fontWeight: 'bold' }}>{duration}</span>
            </Typography>
          </Box>
        )}

        {/* 성과 등급 */}
        {!compact && job.status === 'completed' && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, bgcolor: 'white', borderRadius: 1, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: performance.color }}>
              {performance.icon}
              <Typography variant="h6" fontWeight="bold">
                Grade {performance.grade}
              </Typography>
            </Box>
          </Box>
        )}

        {/* 확장 가능한 상세 정보 */}
        {!compact && (
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
              <Divider sx={{ my: 1 }} />
              <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Started</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Duration</Typography>
                    <Typography variant="body2" fontWeight="medium">{duration}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Processing Speed</Typography>
                    <Typography variant="body2" fontWeight="medium">{processingSpeed}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Files/Errors</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {job.successful_extractions || 0}/{job.failed_extractions || 0}
                    </Typography>
                  </Box>
                </Box>
                
                {/* 오류 메시지 */}
                {job.error_message && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: theme.palette.error.light + '20', borderRadius: 1, border: `1px solid ${theme.palette.error.main}30` }}>
                    <Typography variant="caption" color="error.main" fontWeight="bold">Error:</Typography>
                    <Typography variant="body2" color="error.dark">
                      {job.error_message}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>

      {/* 액션 버튼들 */}
      {showActions && (
        <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* 재실행 */}
            {onRerun && job.status !== 'completed' && (
              <Tooltip title="Rerun Job">
                <IconButton size="small" onClick={() => onRerun(job)} color="primary">
                  <Replay fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {/* 결과 내보내기 */}
            {onExport && job.status === 'completed' && (
              <Tooltip title="Export Results">
                <IconButton size="small" onClick={() => onExport(job)} color="secondary">
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* 상세보기 */}
          {onViewDetails && (
            <Button
              size="small"
              startIcon={<Visibility fontSize="small" />}
              onClick={() => onViewDetails(job)}
              sx={{ color: statusConfig.color }}
            >
              {compact ? 'View' : 'View Details'}
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

export default CompletedJobCard;