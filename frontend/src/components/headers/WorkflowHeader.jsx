import React from 'react';
import { 
  Box, 
  Typography, 
  Breadcrumbs, 
  Link, 
  Button,
  Chip,
  Alert,
  LinearProgress
} from '@mui/material';
import { 
  NavigateNext, 
  ArrowBack,
  Info,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * WorkflowHeader - 작업 플로우 전용 헤더
 * 단계별 진행 상황과 브레드크럼을 표시하는 워크플로우 헤더
 */
const WorkflowHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  currentStep,
  totalSteps,
  progress,
  status = 'in_progress', // 'pending', 'in_progress', 'completed', 'error'
  statusMessage,
  primaryAction,
  secondaryActions = [],
  onBack,
  showProgress = true,
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  // 상태별 색상 및 아이콘 결정
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          color: theme.palette.success.main,
          backgroundColor: `${theme.palette.success.main}08`,
          icon: <CheckCircle />,
          severity: 'success'
        };
      case 'error':
        return {
          color: theme.palette.error.main,
          backgroundColor: `${theme.palette.error.main}08`,
          icon: <ErrorIcon />,
          severity: 'error'
        };
      case 'in_progress':
        return {
          color: theme.palette.primary.main,
          backgroundColor: `${theme.palette.primary.main}08`,
          icon: <Info />,
          severity: 'info'
        };
      case 'pending':
      default:
        return {
          color: theme.palette.warning.main,
          backgroundColor: `${theme.palette.warning.main}08`,
          icon: <Info />,
          severity: 'warning'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Box
      sx={{
        marginBottom: theme.custom.layout.componentSpacing / 8,
        ...sx
      }}
      {...props}
    >
      {/* 브레드크럼 네비게이션 */}
      {breadcrumbs.length > 0 && (
        <Box sx={{ marginBottom: theme.custom.layout.elementSpacing / 8 }}>
          <Breadcrumbs
            separator={<NavigateNext fontSize="small" />}
            aria-label="workflow breadcrumb"
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isClickable = crumb.onClick && !isLast;

              return isClickable ? (
                <Link
                  key={index}
                  color="inherit"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    crumb.onClick();
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: theme.typography.body2.fontSize,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {crumb.icon && crumb.icon}
                  {crumb.label}
                </Link>
              ) : (
                <Typography
                  key={index}
                  color={isLast ? 'primary' : 'textPrimary'}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: theme.typography.body2.fontSize,
                    fontWeight: isLast ? theme.typography.fontWeightMedium : theme.typography.fontWeightRegular
                  }}
                >
                  {crumb.icon && crumb.icon}
                  {crumb.label}
                </Typography>
              );
            })}
          </Breadcrumbs>
        </Box>
      )}

      {/* 메인 헤더 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
          marginBottom: theme.custom.layout.elementSpacing / 8
        }}
      >
        {/* 제목 및 상태 정보 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* 뒤로가기 버튼 */}
          {onBack && (
            <Button
              variant="text"
              startIcon={<ArrowBack />}
              onClick={onBack}
              sx={{
                marginBottom: 1,
                color: theme.palette.text.secondary,
                padding: '4px 8px',
                fontSize: theme.typography.body2.fontSize
              }}
            >
              Back
            </Button>
          )}

          {/* 제목 */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: theme.typography.fontWeightSemiBold,
              marginBottom: subtitle ? 0.5 : 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {title}
            
            {/* 상태 표시 */}
            <Chip
              icon={statusConfig.icon}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              size="small"
              sx={{
                backgroundColor: statusConfig.backgroundColor,
                color: statusConfig.color,
                borderColor: statusConfig.color,
                '& .MuiChip-icon': {
                  color: statusConfig.color
                }
              }}
            />
          </Typography>

          {/* 부제목 */}
          {subtitle && (
            <Typography
              variant="body1"
              color="textSecondary"
              sx={{
                maxWidth: { xs: '100%', md: '70%' },
                lineHeight: 1.5
              }}
            >
              {subtitle}
            </Typography>
          )}

          {/* 진행 상황 표시 */}
          {showProgress && (currentStep || totalSteps || progress !== undefined) && (
            <Box sx={{ marginTop: 2, maxWidth: { xs: '100%', md: '60%' } }}>
              {/* 단계 정보 */}
              {currentStep && totalSteps && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Step {currentStep} of {totalSteps}
                  </Typography>
                  {progress !== undefined && (
                    <Typography variant="body2" color="textSecondary">
                      {Math.round(progress)}%
                    </Typography>
                  )}
                </Box>
              )}
              
              {/* 진행 바 */}
              {progress !== undefined && (
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 6,
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      borderRadius: theme.shape.borderRadius,
                      backgroundColor: statusConfig.color
                    }
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* 액션 버튼들 */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', md: 'auto' }
          }}
        >
          {/* 보조 액션들 */}
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outlined'}
              color={action.color || 'primary'}
              onClick={action.onClick}
              disabled={action.disabled}
              startIcon={action.icon}
              size={action.size || 'medium'}
              sx={{
                minWidth: { xs: '100%', sm: 'auto' },
                ...action.sx
              }}
            >
              {action.label}
            </Button>
          ))}

          {/* 주요 액션 */}
          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'contained'}
              color={primaryAction.color || 'primary'}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              startIcon={primaryAction.icon}
              size={primaryAction.size || 'medium'}
              sx={{
                minWidth: { xs: '100%', sm: 'auto' },
                ...primaryAction.sx
              }}
            >
              {primaryAction.label}
            </Button>
          )}
        </Box>
      </Box>

      {/* 상태 메시지 */}
      {statusMessage && (
        <Alert
          severity={statusConfig.severity}
          sx={{
            marginTop: 1,
            '& .MuiAlert-message': {
              fontSize: theme.typography.body2.fontSize
            }
          }}
        >
          {statusMessage}
        </Alert>
      )}
    </Box>
  );
};

export default WorkflowHeader;