import React from 'react';
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
    Box
} from '@mui/material';
import {
    FilterList,
    Clear,
    Check
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
    sx = {},
    ...props
}) => {
    const theme = useTheme();

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
                title="Filter Jobs"
                subheader={activeFilterCount > 0 ? 
                    `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : 
                    'No filters applied'
                }
                action={
                    <Chip
                        label={activeFilterCount > 0 ? `${activeFilterCount} active` : 'No filters'}
                        size="small"
                        color={activeFilterCount > 0 ? "primary" : "default"}
                        variant={activeFilterCount > 0 ? "filled" : "outlined"}
                        icon={activeFilterCount > 0 ? <Check /> : undefined}
                    />
                }
                sx={{
                    pb: 1,
                    '& .MuiCardHeader-title': {
                        fontSize: '1.1rem',
                        fontWeight: 600
                    },
                    '& .MuiCardHeader-subheader': {
                        fontSize: '0.875rem'
                    }
                }}
            />
            
            <CardContent sx={{ pt: 0 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={filterStatus}
                            onChange={onStatusChange}
                            size="small"
                            variant="outlined"
                            helperText="Filter jobs by their current status"
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
                            helperText="Filter jobs by their operation type"
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
                {activeFilterCount > 0 && (
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
            
            <CardActions sx={{ 
                justifyContent: 'space-between',
                px: 2,
                pb: 2
            }}>
                <Button
                    onClick={onClearFilters}
                    disabled={activeFilterCount === 0}
                    startIcon={<Clear />}
                    color="secondary"
                    size="small"
                >
                    Clear Filters
                </Button>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={onApplyFilters}
                        disabled={!hasChanges}
                        startIcon={<Check />}
                        size="small"
                    >
                        Apply Filters
                    </Button>
                </Box>
            </CardActions>
        </Card>
    );
};

export default JobFilterCard;