import React from 'react';
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    Divider,
    Chip,
    Tooltip
} from '@mui/material';
import {
    Refresh,
    Add,
    GetApp,
    Settings,
    Autorenew
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * JobActionBar - 페이지 레벨 액션과 정보를 표시하는 컴포넌트
 * 새로고침, 새 작업 생성, 통계 정보 등을 포함
 */
const JobActionBar = ({
    onRefresh,
    onNewJob,
    onExport,
    onSettings,
    totalJobs = 0,
    filteredJobs = 0,
    loading = false,
    autoRefresh = false,
    onToggleAutoRefresh,
    lastUpdated = null,
    sx = {},
    ...props
}) => {
    const theme = useTheme();

    // 마지막 업데이트 시간 포맷팅
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

    // 필터링 여부 확인
    const isFiltered = filteredJobs !== totalJobs;

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                mb: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 2, md: 0 },
                ...sx
            }}
            {...props}
        >
            {/* 왼쪽: 액션 버튼들 */}
            <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', md: 'flex-start' }
            }}>
                <Button
                    startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                    onClick={onRefresh}
                    disabled={loading}
                    size="small"
                    variant="outlined"
                >
                    Refresh
                </Button>

                {onNewJob && (
                    <Button
                        startIcon={<Add />}
                        variant="contained"
                        onClick={onNewJob}
                        size="small"
                        color="primary"
                    >
                        New Job
                    </Button>
                )}

                {onExport && (
                    <Button
                        startIcon={<GetApp />}
                        variant="outlined"
                        onClick={onExport}
                        size="small"
                        color="secondary"
                    >
                        Export
                    </Button>
                )}

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* 자동 새로고침 토글 */}
                {onToggleAutoRefresh && (
                    <Tooltip title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}>
                        <Button
                            startIcon={<Autorenew />}
                            onClick={onToggleAutoRefresh}
                            size="small"
                            variant={autoRefresh ? "contained" : "outlined"}
                            color={autoRefresh ? "info" : "default"}
                        >
                            Auto
                        </Button>
                    </Tooltip>
                )}

                {onSettings && (
                    <Tooltip title="Settings">
                        <Button
                            startIcon={<Settings />}
                            onClick={onSettings}
                            size="small"
                            variant="outlined"
                            color="default"
                        >
                            Settings
                        </Button>
                    </Tooltip>
                )}
            </Box>

            {/* 오른쪽: 정보 표시 */}
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', md: 'right' }
            }}>
                {/* 자동 새로고침 상태 */}
                {autoRefresh && (
                    <Chip
                        label="Auto-refresh ON"
                        size="small"
                        color="info"
                        icon={<Autorenew sx={{ fontSize: '0.8rem' }} />}
                    />
                )}

                {/* 마지막 업데이트 시간 */}
                {lastUpdated && (
                    <Typography variant="caption" color="textSecondary">
                        Updated: {formatLastUpdated(lastUpdated)}
                    </Typography>
                )}

                {/* Job 개수 정보 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isFiltered ? (
                        <>
                            <Typography variant="body2" fontWeight="medium">
                                {filteredJobs} of {totalJobs} jobs
                            </Typography>
                            <Chip
                                label="Filtered"
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </>
                    ) : (
                        <Typography variant="body2" fontWeight="medium" color="primary">
                            {totalJobs} jobs
                        </Typography>
                    )}

                    {loading && (
                        <CircularProgress size={16} sx={{ ml: 1 }} />
                    )}
                </Box>

                {/* 상태별 요약 */}
                {totalJobs > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Typography variant="caption" color="textSecondary">
                            Status: 
                        </Typography>
                        <Typography variant="caption" color="primary">
                            Active
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            |
                        </Typography>
                        <Typography variant="caption" color="success.main">
                            Completed
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            |
                        </Typography>
                        <Typography variant="caption" color="error.main">
                            Failed
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default JobActionBar;