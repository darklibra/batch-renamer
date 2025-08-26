import React from 'react';
import { 
  Box, 
  Fade, 
  Skeleton, 
  Card, 
  CardContent, 
  Grid, 
  Typography,
  LinearProgress
} from '@mui/material';

/**
 * 🎨 부드러운 전환 컴포넌트
 * 
 * 깜빡임 방지를 위한 핵심 컴포넌트들:
 * 1. SmoothTransition: 로딩과 콘텐츠 간 부드러운 전환
 * 2. ContentSkeleton: 스켈레톤 로딩 템플릿들
 * 3. ProgressiveLoader: 점진적 로딩 표시
 */

// 🎯 메인 부드러운 전환 컴포넌트
export const SmoothTransition = ({ 
  children, 
  loading = false, 
  skeleton = null,
  transitionDuration = 300,
  showSkeleton = true,
  minHeight = null
}) => {
  if (loading && showSkeleton && skeleton) {
    return (
      <Fade in timeout={transitionDuration}>
        <Box sx={{ minHeight }}>
          {skeleton}
        </Box>
      </Fade>
    );
  }

  return (
    <Fade in={!loading} timeout={transitionDuration}>
      <Box sx={{ minHeight }}>
        {children}
      </Box>
    </Fade>
  );
};

// 🎨 Smart Operations 상세 페이지용 스켈레톤
export const SmartOperationDetailsSkeleton = () => (
  <Box>
    {/* 작업 요약 스켈레톤 */}
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width="30%" height={32} />
          <Box sx={{ ml: 'auto' }}>
            <Skeleton variant="rounded" width={80} height={24} />
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="text" width="70%" height={20} />
              <Skeleton variant="text" width="90%" height={24} />
            </Grid>
          ))}
        </Grid>
        
        {/* 진행바 스켈레톤 */}
        <Box sx={{ mt: 3 }}>
          <Skeleton variant="text" width="25%" height={20} />
          <Skeleton variant="rounded" width="100%" height={8} sx={{ mt: 1, mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Skeleton variant="text" width={100} />
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width={80} />
          </Box>
        </Box>
      </CardContent>
    </Card>

    {/* 설정 세부사항 스켈레톤 */}
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Skeleton variant="text" width="20%" height={28} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Skeleton variant="text" width="15%" height={20} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 1 }} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="text" width="15%" height={20} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 1 }} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    {/* 파일 목록 스켈레톤 */}
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="text" width="20%" height={28} />
        </Box>
        
        {/* 필터 버튼들 스켈레톤 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" width={60} height={24} />
          ))}
        </Box>

        {/* 테이블 헤더 스켈레톤 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="text" width="18%" height={20} />
          ))}
        </Box>

        {/* 테이블 행들 스켈레톤 */}
        {[1, 2, 3, 4, 5].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="rounded" width={80} height={20} />
            <Skeleton variant="text" width="25%" height={20} />
            <Skeleton variant="text" width="30%" height={20} />
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width="15%" height={20} />
          </Box>
        ))}
      </CardContent>
    </Card>
  </Box>
);

// 🎨 작업 목록용 카드 스켈레톤
export const OperationCardSkeleton = () => (
  <Card sx={{ height: 280 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Skeleton variant="text" width="70%" height={28} />
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={60} height={24} />
      </Box>
      
      <Skeleton variant="text" width="90%" height={20} />
      <Skeleton variant="text" width="70%" height={20} />
      
      <Box sx={{ mt: 2 }}>
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="rounded" width="100%" height={8} sx={{ mt: 1 }} />
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Skeleton variant="text" width="50%" height={16} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
    </CardContent>
  </Card>
);

// 🔄 점진적 로더 (Progressive Loading)
export const ProgressiveLoader = ({ 
  stage = 1, 
  totalStages = 3, 
  message = "Loading...",
  showProgress = true 
}) => {
  const progress = (stage / totalStages) * 100;
  
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
        {message}
      </Typography>
      
      {showProgress && (
        <>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              mb: 2, 
              height: 6, 
              borderRadius: 3,
              '& .MuiLinearProgress-bar': {
                borderRadius: 3
              }
            }} 
          />
          <Typography variant="body2" color="textSecondary">
            Step {stage} of {totalStages}
          </Typography>
        </>
      )}
    </Box>
  );
};

// 🎯 미니 로딩 인디케이터 (인라인 사용)
export const InlineLoader = ({ 
  size = 14, 
  message = "Updating...", 
  color = "primary",
  showMessage = true 
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box 
      sx={{ 
        width: size, 
        height: size, 
        border: `2px solid`,
        borderColor: `${color}.main`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }} 
    />
    {showMessage && (
      <Typography variant="caption" color={color}>
        {message}
      </Typography>
    )}
  </Box>
);

// 🎨 컨테이너 스켈레톤 (전체 페이지용)
export const PageSkeleton = ({ 
  hasHeader = true, 
  hasFilters = false, 
  cardCount = 6 
}) => (
  <Box>
    {hasHeader && (
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={300} height={20} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton variant="rounded" width={120} height={36} />
          <Skeleton variant="rounded" width={40} height={36} />
        </Box>
      </Box>
    )}
    
    {hasFilters && (
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" width={120} height={32} />
        ))}
      </Box>
    )}
    
    <Grid container spacing={3}>
      {Array.from(new Array(cardCount)).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <OperationCardSkeleton />
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default {
  SmoothTransition,
  SmartOperationDetailsSkeleton,
  OperationCardSkeleton,
  ProgressiveLoader,
  InlineLoader,
  PageSkeleton
};