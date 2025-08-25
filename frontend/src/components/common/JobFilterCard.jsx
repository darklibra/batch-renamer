import React, { useState } from 'react';
import {
    Card,
    CardHeader,
    CardContent,
    CardActions,
    Grid,
    TextField,
    MenuItem,
    Button,
    Chip,
    Box,
    Collapse,
    IconButton,
    Tooltip,
    Divider
} from '@mui/material';
import {
    FilterList,
    Clear,
    Check,
    ExpandMore,
    ExpandLess,
    Tune
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * JobFilterCard - 통합된 Job 필터링 컴포넌트
 * 모든 필터링 옵션을 하나의 카드로 그룹화하여 사용자 경험 개선
 */
const JobFilterCard = ({
    filterStatus = '',
    filterType = '',
    onStatusChange,
    onTypeChange,
    onClearFilters,
    onApplyFilters,
    hasChanges = false,
    startExpanded = false,
    compact = false,
    sx = {},
    ...props
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(startExpanded);

    // 활성 필터 개수 계산
    const activeFilterCount = [filterStatus, filterType].filter(Boolean).length;

    // 필터 상태 옵션
    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'started', label: 'Started' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'error', label: 'Error' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    // Job 타입 옵션
    const typeOptions = [
        { value: '', label: 'All Types' },
        { value: 'batch_extract', label: 'Batch Extract' },
        { value: 'reapply_pattern', label: 'Reapply Pattern' },
        { value: 'test_pattern', label: 'Test Pattern' },
        { value: 'indexing_directory_scan', label: 'Directory Scan' }
    ];

    return (
        <Card 
            sx={{ 
                mb: 2,
                border: activeFilterCount > 0 ? `2px solid ${theme.palette.primary.main}` : undefined,
                ...sx 
            }}
            {...props}
        >
            <CardHeader
                avatar={<FilterList color="primary" />}
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Filter Jobs
                        {compact && activeFilterCount > 0 && (
                            <Chip 
                                size="small" 
                                label={activeFilterCount} 
                                color="primary" 
                            />
                        )}
                    </Box>
                }
                subheader={!compact ? (
                    activeFilterCount > 0 ? 
                    `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : 
                    'No filters applied'
                ) : undefined}
                action={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!compact && (
                            <Chip
                                label={activeFilterCount > 0 ? `${activeFilterCount} active` : 'No filters'}
                                size="small"
                                color={activeFilterCount > 0 ? "primary" : "default"}
                                variant={activeFilterCount > 0 ? "filled" : "outlined"}
                                icon={activeFilterCount > 0 ? <Check /> : undefined}
                            />
                        )}
                        <Tooltip title={expanded ? "Collapse filters" : "Expand filters"}>
                            <IconButton 
                                onClick={() => setExpanded(!expanded)}
                                size="small"
                                aria-label={expanded ? "Collapse filters" : "Expand filters"}
                                sx={{
                                    transition: 'transform 0.2s',
                                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}
                            >
                                <ExpandMore />
                            </IconButton>
                        </Tooltip>
                    </Box>
                }
                sx={{
                    pb: expanded ? 1 : 0,
                    cursor: compact ? 'pointer' : 'default',
                    '& .MuiCardHeader-title': {
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        fontWeight: 600
                    },
                    '& .MuiCardHeader-subheader': {
                        fontSize: { xs: '0.8rem', md: '0.875rem' }
                    }
                }}
                onClick={compact ? () => setExpanded(!expanded) : undefined}
            />
            
            <Collapse in={expanded}>
                <CardContent sx={{ pt: 0 }}>
                    <Grid container spacing={{ xs: 1, md: 2 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                select
                                fullWidth
                                label="Status"
                                value={filterStatus}
                                onChange={onStatusChange}
                                size="small"
                                variant="outlined"
                                helperText={!compact ? "Filter jobs by their current status" : undefined}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        fontSize: { xs: '0.875rem', md: '1rem' }
                                    },
                                    '& .MuiFormLabel-root': {
                                        fontSize: { xs: '0.875rem', md: '1rem' }
                                    }
                                }}
                            >
                                {statusOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <TextField
                                select
                                fullWidth
                                label="Job Type"
                                value={filterType}
                                onChange={onTypeChange}
                                size="small"
                                variant="outlined"
                                helperText={!compact ? "Filter jobs by their operation type" : undefined}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        fontSize: { xs: '0.875rem', md: '1rem' }
                                    },
                                    '& .MuiFormLabel-root': {
                                        fontSize: { xs: '0.875rem', md: '1rem' }
                                    }
                                }}
                            >
                                {typeOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                    {/* 활성 필터 표시 */}
                    {activeFilterCount > 0 && !compact && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {filterStatus && (
                                    <Chip
                                        label={`Status: ${statusOptions.find(opt => opt.value === filterStatus)?.label}`}
                                        size="small"
                                        onDelete={() => onStatusChange({ target: { value: '' } })}
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                                {filterType && (
                                    <Chip
                                        label={`Type: ${typeOptions.find(opt => opt.value === filterType)?.label}`}
                                        size="small"
                                        onDelete={() => onTypeChange({ target: { value: '' } })}
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Collapse>

            {/* 컴팩트 모드에서의 활성 필터 미리보기 */}
            {compact && activeFilterCount > 0 && !expanded && (
                <Box sx={{ px: 2, pb: 1 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {filterStatus && (
                            <Chip
                                label={statusOptions.find(opt => opt.value === filterStatus)?.label}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                        {filterType && (
                            <Chip
                                label={typeOptions.find(opt => opt.value === filterType)?.label}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Box>
            )}
            
            <Collapse in={expanded}>
                <CardActions sx={{ 
                    justifyContent: 'space-between',
                    px: 2,
                    pb: 2,
                    pt: 1
                }}>
                    <Button
                        onClick={onClearFilters}
                        disabled={activeFilterCount === 0}
                        startIcon={<Clear />}
                        color="secondary"
                        size="small"
                        sx={{
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            minWidth: { xs: 'auto', md: '64px' }
                        }}
                    >
                        <span style={{ display: { xs: 'none', sm: 'inline' } }}>Clear Filters</span>
                        <span style={{ display: { xs: 'inline', sm: 'none' } }}>Clear</span>
                    </Button>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            onClick={onApplyFilters}
                            disabled={!hasChanges}
                            startIcon={<Check />}
                            size="small"
                            sx={{
                                fontSize: { xs: '0.75rem', md: '0.875rem' },
                                minWidth: { xs: 'auto', md: '64px' }
                            }}
                        >
                            <span style={{ display: { xs: 'none', sm: 'inline' } }}>Apply Filters</span>
                            <span style={{ display: { xs: 'inline', sm: 'none' } }}>Apply</span>
                        </Button>
                    </Box>
                </CardActions>
            </Collapse>
        </Card>
    );
};

export default JobFilterCard;