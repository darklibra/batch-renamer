import React from 'react';
import { 
  Box, 
  Skeleton, 
  Card, 
  CardContent, 
  Grid, 
  Stack,
  Typography 
} from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Skeleton loader components for smooth loading transitions
 * Maintains layout dimensions and provides visual continuity
 */

// Generic skeleton card for dashboard stats
export const SkeletonStatCard = ({ 
  width = '100%', 
  height = 120,
  animate = true 
}) => (
  <Card sx={{ width, height, position: 'relative' }}>
    <CardContent>
      <Stack spacing={1}>
        <Skeleton 
          variant="circular" 
          width={40} 
          height={40} 
          animation={animate ? 'wave' : false}
        />
        <Skeleton 
          variant="text" 
          sx={{ fontSize: '2rem' }} 
          width="60%"
          animation={animate ? 'wave' : false}
        />
        <Skeleton 
          variant="text" 
          sx={{ fontSize: '0.875rem' }} 
          width="80%"
          animation={animate ? 'wave' : false}
        />
      </Stack>
    </CardContent>
  </Card>
);

// Table row skeleton for job lists
export const SkeletonTableRow = ({ columns = 5, animate = true }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', py: 2, px: 2 }}>
    {Array.from({ length: columns }, (_, index) => (
      <Box key={index} sx={{ flex: 1, mr: index < columns - 1 ? 2 : 0 }}>
        <Skeleton 
          variant="text" 
          height={20}
          animation={animate ? 'wave' : false}
        />
      </Box>
    ))}
  </Box>
);

// Job progress skeleton
export const SkeletonJobProgress = ({ animate = true }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Stack spacing={2}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton 
            variant="text" 
            sx={{ fontSize: '1.25rem' }} 
            width="40%"
            animation={animate ? 'wave' : false}
          />
          <Skeleton 
            variant="circular" 
            width={24} 
            height={24}
            animation={animate ? 'wave' : false}
          />
        </Box>
        
        {/* Progress bar */}
        <Skeleton 
          variant="rectangular" 
          height={8} 
          sx={{ borderRadius: 1 }}
          animation={animate ? 'wave' : false}
        />
        
        {/* Details */}
        <Stack direction="row" spacing={2}>
          <Skeleton 
            variant="text" 
            width="25%"
            animation={animate ? 'wave' : false}
          />
          <Skeleton 
            variant="text" 
            width="30%"
            animation={animate ? 'wave' : false}
          />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

// File list item skeleton
export const SkeletonFileItem = ({ animate = true }) => (
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    py: 1.5, 
    px: 2,
    borderBottom: '1px solid',
    borderColor: 'divider'
  }}>
    <Skeleton 
      variant="circular" 
      width={24} 
      height={24} 
      sx={{ mr: 2 }}
      animation={animate ? 'wave' : false}
    />
    <Box sx={{ flex: 1, mr: 2 }}>
      <Skeleton 
        variant="text" 
        width="70%" 
        sx={{ mb: 0.5 }}
        animation={animate ? 'wave' : false}
      />
      <Skeleton 
        variant="text" 
        width="40%" 
        sx={{ fontSize: '0.875rem' }}
        animation={animate ? 'wave' : false}
      />
    </Box>
    <Skeleton 
      variant="rectangular" 
      width={60} 
      height={20} 
      sx={{ borderRadius: 0.5 }}
      animation={animate ? 'wave' : false}
    />
  </Box>
);

// Pattern manager skeleton
export const SkeletonPattern = ({ animate = true }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Stack spacing={2}>
        {/* Header with switch */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Skeleton 
              variant="text" 
              sx={{ fontSize: '1.25rem' }} 
              width={200}
              animation={animate ? 'wave' : false}
            />
            <Skeleton 
              variant="text" 
              width={150} 
              sx={{ fontSize: '0.875rem' }}
              animation={animate ? 'wave' : false}
            />
          </Box>
          <Skeleton 
            variant="rectangular" 
            width={60} 
            height={24} 
            sx={{ borderRadius: 3 }}
            animation={animate ? 'wave' : false}
          />
        </Box>
        
        {/* Pattern details */}
        <Box sx={{ 
          bgcolor: alpha('#000', 0.03), 
          p: 1, 
          borderRadius: 1,
          fontFamily: 'monospace'
        }}>
          <Skeleton 
            variant="text" 
            width="90%"
            animation={animate ? 'wave' : false}
          />
          <Skeleton 
            variant="text" 
            width="70%"
            animation={animate ? 'wave' : false}
          />
        </Box>
        
        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton 
            variant="rectangular" 
            width={80} 
            height={32} 
            sx={{ borderRadius: 1 }}
            animation={animate ? 'wave' : false}
          />
          <Skeleton 
            variant="rectangular" 
            width={60} 
            height={32} 
            sx={{ borderRadius: 1 }}
            animation={animate ? 'wave' : false}
          />
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

/**
 * Smooth transition wrapper for content changes
 * Provides fade transition between loading and content states
 */
export const SmoothTransition = ({ 
  children, 
  loading = false, 
  skeleton = null,
  transitionDuration = 300,
  minHeight = null 
}) => {
  return (
    <Box sx={{ 
      position: 'relative',
      minHeight,
      transition: `opacity ${transitionDuration}ms ease-in-out`,
      opacity: loading ? 0.7 : 1
    }}>
      {loading && skeleton ? (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0,
          zIndex: 1,
          bgcolor: 'background.paper'
        }}>
          {skeleton}
        </Box>
      ) : null}
      
      <Box sx={{ 
        opacity: loading ? 0.3 : 1,
        transition: `opacity ${transitionDuration}ms ease-in-out`,
        pointerEvents: loading ? 'none' : 'auto'
      }}>
        {children}
      </Box>
    </Box>
  );
};

/**
 * Grid skeleton for dashboard layout
 */
export const SkeletonDashboardGrid = ({ animate = true }) => (
  <Grid container spacing={3}>
    {Array.from({ length: 4 }, (_, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <SkeletonStatCard animate={animate} />
      </Grid>
    ))}
    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Skeleton 
            variant="text" 
            sx={{ fontSize: '1.5rem' }} 
            width="30%" 
            sx={{ mb: 2 }}
            animation={animate ? 'wave' : false}
          />
          <Stack spacing={1}>
            {Array.from({ length: 3 }, (_, index) => (
              <SkeletonFileItem key={index} animate={animate} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

export default {
  SkeletonStatCard,
  SkeletonTableRow,
  SkeletonJobProgress,
  SkeletonFileItem,
  SkeletonPattern,
  SmoothTransition,
  SkeletonDashboardGrid
};