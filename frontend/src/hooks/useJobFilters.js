import { useState, useMemo, useCallback } from 'react';

/**
 * useJobFilters - Job 필터링 상태와 로직을 관리하는 커스텀 훅
 * 필터 상태, 적용된 필터, 변경 감지 등을 포함한 완전한 필터 관리
 */
const useJobFilters = (initialFilters = {}) => {
    // 기본 필터 상태
    const defaultFilters = {
        status: '',
        type: '',
        ...initialFilters
    };

    // 현재 필터 상태 (사용자가 입력하고 있는 값)
    const [filters, setFilters] = useState(defaultFilters);
    
    // 적용된 필터 상태 (실제로 API에 전달되는 값)
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

    // 변경사항이 있는지 확인
    const hasChanges = useMemo(() => {
        return Object.keys(filters).some(key => filters[key] !== appliedFilters[key]);
    }, [filters, appliedFilters]);

    // 활성 필터 개수 계산
    const activeFilterCount = useMemo(() => {
        return Object.values(appliedFilters).filter(value => value && value !== '').length;
    }, [appliedFilters]);

    // 필터가 적용되었는지 확인
    const hasActiveFilters = useMemo(() => {
        return activeFilterCount > 0;
    }, [activeFilterCount]);

    // 개별 필터 업데이트 함수들
    const updateFilter = useCallback((key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const setStatus = useCallback((status) => {
        updateFilter('status', status);
    }, [updateFilter]);

    const setType = useCallback((type) => {
        updateFilter('type', type);
    }, [updateFilter]);

    // 필터 적용
    const applyFilters = useCallback(() => {
        setAppliedFilters({ ...filters });
    }, [filters]);

    // 필터 초기화
    const clearFilters = useCallback(() => {
        const clearedFilters = { ...defaultFilters };
        setFilters(clearedFilters);
        setAppliedFilters(clearedFilters);
    }, [defaultFilters]);

    // 필터 리셋 (변경사항만 되돌리기)
    const resetFilters = useCallback(() => {
        setFilters({ ...appliedFilters });
    }, [appliedFilters]);

    // 특정 필터만 제거
    const removeFilter = useCallback((key) => {
        const newFilters = { ...filters };
        newFilters[key] = defaultFilters[key];
        setFilters(newFilters);
        
        // 즉시 적용된 필터에서도 제거
        const newAppliedFilters = { ...appliedFilters };
        newAppliedFilters[key] = defaultFilters[key];
        setAppliedFilters(newAppliedFilters);
    }, [filters, appliedFilters, defaultFilters]);

    // 필터 상태를 API 파라미터로 변환
    const getApiParams = useCallback(() => {
        const params = {};
        
        if (appliedFilters.status) {
            params.status = appliedFilters.status;
        }
        
        if (appliedFilters.type) {
            params.job_type = appliedFilters.type;
        }
        
        return params;
    }, [appliedFilters]);

    // Jobs 배열을 필터링하는 함수
    const filterJobs = useCallback((jobs) => {
        if (!hasActiveFilters) {
            return jobs;
        }

        return jobs.filter(job => {
            // Status 필터
            if (appliedFilters.status && job.status !== appliedFilters.status) {
                return false;
            }

            // Type 필터
            if (appliedFilters.type && job.job_type !== appliedFilters.type) {
                return false;
            }

            return true;
        });
    }, [appliedFilters, hasActiveFilters]);

    // 필터 요약 정보 생성
    const getFilterSummary = useCallback(() => {
        const summary = [];
        
        if (appliedFilters.status) {
            const statusLabels = {
                started: 'Started',
                processing: 'Processing', 
                completed: 'Completed',
                error: 'Error',
                cancelled: 'Cancelled'
            };
            summary.push(`Status: ${statusLabels[appliedFilters.status] || appliedFilters.status}`);
        }
        
        if (appliedFilters.type) {
            const typeLabels = {
                batch_extract: 'Batch Extract',
                reapply_pattern: 'Reapply Pattern',
                test_pattern: 'Test Pattern',
                indexing_directory_scan: 'Directory Scan'
            };
            summary.push(`Type: ${typeLabels[appliedFilters.type] || appliedFilters.type}`);
        }
        
        return summary;
    }, [appliedFilters]);

    return {
        // 상태
        filters,
        appliedFilters,
        hasChanges,
        activeFilterCount,
        hasActiveFilters,
        
        // 개별 필터 접근자
        status: filters.status,
        type: filters.type,
        
        // 업데이트 함수들
        setFilters,
        updateFilter,
        setStatus,
        setType,
        
        // 액션 함수들
        applyFilters,
        clearFilters,
        resetFilters,
        removeFilter,
        
        // 유틸리티 함수들
        getApiParams,
        filterJobs,
        getFilterSummary
    };
};

export default useJobFilters;