import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  LinearProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Fade,
  Collapse,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Popover,
  AppBar,
  Badge
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Stop,
  Refresh,
  Delete,
  FilePresent,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Info,
  Pause,
  Settings,
  Speed
} from '@mui/icons-material';

import { PageHeader } from '../components/common';
import { PageContainer, PageContent } from '../components/layout/index.js';
import { BackButton } from '../components/common/ActionButtons';
import smartOperationsApi, { 
  getStatusColor, 
  getOperationTypeIcon,
  formatDuration,
  OPERATION_STATUS,
  FILE_STATUS
} from '../services/smartOperationsApi';

/**
 * 🎨 Smart Operations Detail 페이지 - 깜빡임 완전 제거 최적화
 * 
 * 핵심 UX/UI 개선사항:
 * 1. 🔄 Stale-While-Revalidate 패턴: 이전 데이터를 보존하며 백그라운드 업데이트
 * 2. 🎯 원자적 상태 업데이트: 모든 데이터를 한 번에 업데이트하여 중간 상태 제거
 * 3. 🚀 스켈레톤 로딩: 초기 로딩에만 스켈레톤, 이후에는 부드러운 전환
 * 4. 💫 부드러운 전환: Fade, Collapse 애니메이션으로 자연스러운 UI 변화
 * 5. ⚡ 최적화된 렌더링: 불필요한 리렌더링 방지
 */

const SmartOperationDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 🎯 깜빡임 방지를 위한 이중 버퍼링 상태 관리
  const [dataState, setDataState] = useState({
    // 현재 표시 중인 데이터 (UI에서 보이는 것)
    current: {
      operation: null,
      operationFiles: [],
      totalFiles: 0, // 전체 파일 수 (페이징용)
      filteredFiles: 0, // 필터된 파일 수
    },
    // 이전 데이터 (깜빡임 방지용 백업)
    previous: {
      operation: null,
      operationFiles: [],
      totalFiles: 0,
      filteredFiles: 0,
    },
    // 메타 상태
    meta: {
      isInitialized: false,
      isRefreshing: false,
      hasError: false,
      errorMessage: null,
      lastUpdated: null
    }
  });
  
  // UI 인터랙션 상태
  const [uiState, setUiState] = useState({
    deleteDialogOpen: false,
    filesPage: 0,
    filesLimit: 25, // 페이지당 25개로 조정
    statusFilter: '',
    autoRefreshActive: false,
    refreshSettingsOpen: false
  });
  
  // 🎯 사용자 설정 가능한 자동 새로고침 설정
  const [refreshSettings, setRefreshSettings] = useState({
    interval: 10000, // 기본 10초 (권장)
    enabled: true,
    userDisabledForCompleted: false // 사용자가 완료된 작업에 대해 비활성화했는지 추적
  });
  
  // 🎯 실용적이고 서버 부하를 고려한 갱신 주기 옵션
  const REFRESH_INTERVALS = [
    { value: 5000, label: '5초 (빠름)', description: '빠른 업데이트', recommended: true },
    { value: 10000, label: '10초 (권장)', description: '최적 균형', recommended: true, default: true },
    { value: 30000, label: '30초', description: '적당한 간격', recommended: true },
    { value: 60000, label: '1분', description: '장시간 작업용', recommended: true },
    { value: 300000, label: '5분 (느림)', description: '서버 부하 최소화' },
    { value: 0, label: '수동만', description: '자동 새로고침 비활성화' }
  ];
  
  // 🚀 로딩 상태를 세밀하게 관리 - 부분적 로딩 표시
  const [loadingState, setLoadingState] = useState({
    initialLoad: true,        // 첫 로드에만 스켈레톤 표시
    backgroundRefresh: false, // 백그라운드 새로고침 (UI 유지)
    actionInProgress: false   // 사용자 액션 (버튼 비활성화)
  });

  // 🔄 자동 새로고침 관리
  const autoRefreshRef = useRef(null);

  // 📊 현재 표시할 데이터 결정 (깜빡임 방지 핵심 로직)
  const displayData = useMemo(() => {
    // 현재 데이터가 있으면 사용, 없으면 이전 데이터 사용
    const operation = dataState.current.operation || dataState.previous.operation;
    const operationFiles = dataState.current.operationFiles.length > 0 
      ? dataState.current.operationFiles 
      : dataState.previous.operationFiles;
    const totalFiles = dataState.current.totalFiles || dataState.previous.totalFiles;
    const filteredFiles = dataState.current.filteredFiles || dataState.previous.filteredFiles;
    
    return { operation, operationFiles, totalFiles, filteredFiles };
  }, [dataState]);

  // 🎯 원자적 데이터 업데이트 함수 (깜빡임 방지 핵심)
  const updateDataAtomic = useCallback((newOperation, newFiles, totalFiles = 0, filteredFiles = 0) => {
    setDataState(prevState => {
      const newState = {
        current: {
          operation: newOperation,
          operationFiles: newFiles || [],
          totalFiles,
          filteredFiles
        },
        previous: {
          // 이전 데이터를 백업으로 보존
          operation: prevState.current.operation || newOperation,
          operationFiles: prevState.current.operationFiles.length > 0 
            ? prevState.current.operationFiles 
            : newFiles || [],
          totalFiles: prevState.current.totalFiles || totalFiles,
          filteredFiles: prevState.current.filteredFiles || filteredFiles
        },
        meta: {
          ...prevState.meta,
          hasError: false,
          errorMessage: null,
          lastUpdated: new Date().toISOString()
        }
      };
      
      return newState;
    });
  }, []);

  // 🚀 통합 초기화 함수 - 모든 데이터를 한 번에 로드
  const initializeData = useCallback(async () => {
    try {
      setLoadingState(prev => ({ ...prev, initialLoad: true }));
      
      // 🔄 병렬로 모든 데이터 로드
      const [operationResponse, filesResponse] = await Promise.all([
        smartOperationsApi.getOperationById(id),
        smartOperationsApi.getOperationFiles(id, {
          skip: uiState.filesPage * uiState.filesLimit,
          limit: uiState.filesLimit,
          status_filter: uiState.statusFilter
        })
      ]);

      // 🎯 원자적 업데이트로 깜빡임 방지 (페이징 정보 포함)
      updateDataAtomic(
        operationResponse.operation, 
        filesResponse.files || [],
        filesResponse.total_files || 0,
        filesResponse.filtered_files || 0
      );
      
      setDataState(prevState => ({
        ...prevState,
        meta: {
          ...prevState.meta,
          isInitialized: true,
          hasError: false,
          errorMessage: null
        }
      }));

    } catch (err) {
      console.error('🚨 Failed to initialize data:', err);
      setDataState(prevState => ({
        ...prevState,
        meta: {
          ...prevState.meta,
          isInitialized: true,
          hasError: true,
          errorMessage: 'Failed to load operation details'
        }
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, initialLoad: false }));
    }
  }, [id, uiState.filesLimit, uiState.statusFilter, updateDataAtomic]);

  // 🔄 부드러운 백그라운드 새로고침 (UI 유지하며 데이터 갱신)
  const refreshDataSmoothly = useCallback(async () => {
    // 이미 새로고침 중이면 건너뛰기
    if (dataState.meta.isRefreshing) return;
    
    try {
      setDataState(prevState => ({
        ...prevState,
        meta: { ...prevState.meta, isRefreshing: true }
      }));
      
      setLoadingState(prev => ({ ...prev, backgroundRefresh: true }));

      // 🚀 백그라운드에서 새 데이터 로드 (UI는 그대로 유지)
      const [operationResponse, filesResponse] = await Promise.all([
        smartOperationsApi.getOperationById(id),
        smartOperationsApi.getOperationFiles(id, {
          skip: uiState.filesPage * uiState.filesLimit,
          limit: uiState.filesLimit,
          status_filter: uiState.statusFilter
        })
      ]);

      // 🎯 새 데이터로 원자적 업데이트 (페이징 정보 포함)
      updateDataAtomic(
        operationResponse.operation, 
        filesResponse.files || [],
        filesResponse.total_files || 0,
        filesResponse.filtered_files || 0
      );

    } catch (err) {
      console.error('🚨 Background refresh failed:', err);
      // 에러 시에도 기존 데이터는 유지 (깜빡임 방지)
      setDataState(prevState => ({
        ...prevState,
        meta: {
          ...prevState.meta,
          hasError: true,
          errorMessage: 'Failed to refresh data'
        }
      }));
    } finally {
      setDataState(prevState => ({
        ...prevState,
        meta: { ...prevState.meta, isRefreshing: false }
      }));
      setLoadingState(prev => ({ ...prev, backgroundRefresh: false }));
    }
  }, [id, uiState, dataState.meta.isRefreshing, updateDataAtomic]);

  // 🔄 자동 새로고침 설정 (사용자 설정 반영)
  useEffect(() => {
    const { operation } = displayData;
    
    // 작업이 완료되거나 실패한 경우 자동으로 비활성화 (사용자가 수정하기 전까지)
    if (operation?.status === OPERATION_STATUS.COMPLETED || operation?.status === OPERATION_STATUS.FAILED) {
      if (!refreshSettings.userDisabledForCompleted) {
        setRefreshSettings(prev => ({ 
          ...prev, 
          userDisabledForCompleted: true 
        }));
      }
    }
    
    // 자동 새로고침 활성화 조건:
    // 1. 실행 중인 작업 또는 PENDING 상태
    // 2. 사용자가 자동 새로고침을 활성화
    // 3. 새로고침 주기가 설정됨
    // 4. 완료된 작업의 경우 사용자가 명시적으로 재활성화한 경우만
    const shouldAutoRefresh = 
      refreshSettings.enabled && 
      refreshSettings.interval > 0 &&
      (
        (operation?.status === OPERATION_STATUS.RUNNING || operation?.status === OPERATION_STATUS.PENDING) ||
        (
          (operation?.status === OPERATION_STATUS.COMPLETED || operation?.status === OPERATION_STATUS.FAILED) &&
          !refreshSettings.userDisabledForCompleted
        )
      );
    
    // 🎯 기존 타이머가 있으면 먼저 정리
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    if (shouldAutoRefresh) {
      // 🎯 타이머 시작 후 UI 상태 업데이트
      autoRefreshRef.current = setInterval(() => {
        refreshDataSmoothly();
      }, refreshSettings.interval);
      
      setUiState(prev => ({ ...prev, autoRefreshActive: true }));
    } else {
      setUiState(prev => ({ ...prev, autoRefreshActive: false }));
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [displayData.operation?.status, refreshSettings, refreshDataSmoothly]);

  // 🚀 초기 데이터 로드
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // 🔄 필터 변경 시 데이터 새로고침
  useEffect(() => {
    if (dataState.meta.isInitialized) {
      refreshDataSmoothly();
    }
  }, [uiState.statusFilter, uiState.filesPage, dataState.meta.isInitialized, refreshDataSmoothly]);

  // 🎯 수동 새로고침 핸들러 - 데이터 갱신만 수행
  const handleManualRefresh = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, backgroundRefresh: true }));
    
    // 데이터 갱신만 수행 (자동 새로고침 토글 기능 제거)
    await refreshDataSmoothly();
  }, [refreshDataSmoothly]);

  const handleStatusFilter = (newFilter) => {
    setUiState(prev => ({ 
      ...prev, 
      statusFilter: newFilter,
      filesPage: 0 // 필터 변경 시 첫 페이지로 리셋
    }));
  };

  // 🎯 페이지 변경 핸들러
  const handlePageChange = (event, newPage) => {
    setUiState(prev => ({ ...prev, filesPage: newPage }));
  };

  // 🎯 페이지 크기 변경 핸들러
  const handleRowsPerPageChange = (event) => {
    setUiState(prev => ({ 
      ...prev, 
      filesLimit: parseInt(event.target.value, 10),
      filesPage: 0 // 페이지 크기 변경 시 첫 페이지로 리셋
    }));
  };

  // 🎯 작업 시작 핸들러
  const handleStartOperation = useCallback(async () => {
    try {
      setLoadingState(prev => ({ ...prev, actionInProgress: true }));
      await smartOperationsApi.startOperation(id);
      await refreshDataSmoothly();
    } catch (err) {
      console.error('🚨 Failed to start operation:', err);
      setDataState(prevState => ({
        ...prevState,
        meta: {
          ...prevState.meta,
          hasError: true,
          errorMessage: 'Failed to start operation'
        }
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, actionInProgress: false }));
    }
  }, [id, refreshDataSmoothly]);

  // 🎯 작업 삭제 핸들러
  const handleDeleteOperation = useCallback(async () => {
    try {
      setLoadingState(prev => ({ ...prev, actionInProgress: true }));
      await smartOperationsApi.deleteOperation(id);
      navigate('/smart-operations', { 
        state: { message: 'Operation deleted successfully' } 
      });
    } catch (err) {
      console.error('🚨 Failed to delete operation:', err);
      setDataState(prevState => ({
        ...prevState,
        meta: {
          ...prevState.meta,
          hasError: true,
          errorMessage: 'Failed to delete operation'
        }
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, actionInProgress: false }));
      setUiState(prev => ({ ...prev, deleteDialogOpen: false }));
    }
  }, [id, navigate]);

  // 🎨 상태별 아이콘 컴포넌트
  const getStatusIcon = (status) => {
    const iconProps = { fontSize: 'small' };
    switch (status) {
      case OPERATION_STATUS.PENDING:
        return <Schedule color="action" {...iconProps} />;
      case OPERATION_STATUS.RUNNING:
        return <CircularProgress size={20} color="primary" />;
      case OPERATION_STATUS.COMPLETED:
        return <CheckCircle color="success" {...iconProps} />;
      case OPERATION_STATUS.FAILED:
        return <Error color="error" {...iconProps} />;
      case OPERATION_STATUS.CANCELLED:
        return <Warning color="warning" {...iconProps} />;
      default:
        return <Info color="action" {...iconProps} />;
    }
  };

  // 🎨 파일 상태별 아이콘
  const getFileStatusIcon = (status) => {
    switch (status) {
      case FILE_STATUS.PENDING:
        return <Schedule color="disabled" fontSize="small" />;
      case FILE_STATUS.PROCESSING:
        return <CircularProgress size={16} color="primary" />;
      case FILE_STATUS.COMPLETED:
        return <CheckCircle color="success" fontSize="small" />;
      case FILE_STATUS.FAILED:
        return <Error color="error" fontSize="small" />;
      default:
        return <Info color="action" fontSize="small" />;
    }
  };

  // 🎨 작업 요약 섹션 렌더링
  const renderOperationSummary = () => {
    const { operation } = displayData;
    
    return (
      <Fade in timeout={300}>
        <Card sx={{ 
          mb: 3,
          // 🎨 백그라운드 새로고침 중 미세한 시각적 피드백
          opacity: loadingState.backgroundRefresh ? 0.95 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {operation && getStatusIcon(operation.status)}
              <Typography variant="h5" sx={{ flexGrow: 1 }}>
                {operation?.name || 'Loading...'}
              </Typography>
              
              {operation && (
                <Chip
                  label={operation.status}
                  color={getStatusColor(operation.status)}
                  sx={{ 
                    textTransform: 'uppercase', 
                    fontWeight: 'bold',
                    // 🎯 RUNNING 상태일 때 새로고침 중이면 미세한 시각적 피드백
                    ...(operation.status === 'RUNNING' && dataState.meta.isRefreshing && {
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.8 },
                        '100%': { opacity: 1 }
                      }
                    })
                  }}
                />
              )}
              
              {/* 🎯 제거: RUNNING 라벨과 중복되는 업데이트중 라벨 삭제 */}
            </Box>

            {operation && (
              <>
                <Grid container spacing={3} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Operation Type
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box component="span" className="material-icons" sx={{ fontSize: 20 }}>
                        {getOperationTypeIcon(operation.operation_type)}
                      </Box>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                        {operation.operation_type}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Source Pattern
                    </Typography>
                    <Typography variant="body1">
                      {operation.source_pattern_name}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Total Files
                    </Typography>
                    <Typography variant="body1">
                      {operation.source_file_count}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {new Date(operation.created_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>

                {/* 🎯 진행 상황 표시 (실행 중인 경우) */}
                {operation.status === OPERATION_STATUS.RUNNING && (
                  <Collapse in timeout={300}>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 1 
                      }}>
                        <Typography variant="subtitle2">
                          Progress: {operation.progress_percentage || 0}%
                        </Typography>
                      </Box>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={operation.progress_percentage || 0}
                        sx={{ 
                          height: 8, 
                          borderRadius: 4, 
                          mb: 2,
                          // 🎨 부드러운 진행바 애니메이션
                          '& .MuiLinearProgress-bar': {
                            transition: 'transform 0.5s ease-in-out'
                          }
                        }}
                      />
                      
                      <Grid container spacing={2}>
                        <Grid item>
                          <Typography variant="body2">
                            Processed: {operation.processed_files || 0}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Typography variant="body2" color="success.main">
                            Successful: {operation.successful_files || 0}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Typography variant="body2" color="error.main">
                            Failed: {operation.failed_files || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                )}

                {operation.completed_at && (
                  <Fade in timeout={500}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Duration: {formatDuration(operation.duration_seconds)}
                      </Typography>
                    </Box>
                  </Fade>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Fade>
    );
  };

  // 🎨 설정 세부사항 섹션 렌더링
  const renderConfigurationDetails = () => {
    const { operation } = displayData;
    if (!operation) return null;

    return (
      <Fade in timeout={400}>
        <Card sx={{ 
          mb: 3,
          opacity: loadingState.backgroundRefresh ? 0.95 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Configuration
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Target Directory
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    bgcolor: 'grey.100', 
                    p: 1, 
                    borderRadius: 1,
                    wordBreak: 'break-all'
                  }}
                >
                  {operation.target_directory}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Target Template
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    bgcolor: 'grey.100', 
                    p: 1, 
                    borderRadius: 1 
                  }}
                >
                  {operation.target_template}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Fade>
    );
  };

  // 🎨 파일 목록 섹션 렌더링
  const renderFilesList = () => {
    const { operationFiles, filteredFiles } = displayData;

    return (
      <Card sx={{ 
        opacity: loadingState.backgroundRefresh ? 0.95 : 1,
        transition: 'opacity 0.3s ease-in-out'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
              <Typography variant="h6">
                Operation Files ({filteredFiles || 0})
              </Typography>
              
              {/* 🎯 미니 업데이트 인디케이터 (타이틀 옆에 고정) */}
              {loadingState.backgroundRefresh && (
                <Fade in timeout={200}>
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      right: -40,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Tooltip title="파일 목록 업데이트 중">
                      <CircularProgress size={16} color="primary" />
                    </Tooltip>
                  </Box>
                </Fade>
              )}
            </Box>
          </Box>

          {/* 🎯 상태 필터 콤보박스 및 갱신 설정 */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* 상태 필터 콤보박스 */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={uiState.statusFilter}
                label="Filter by Status"
                onChange={(e) => handleStatusFilter(e.target.value)}
                sx={{
                  opacity: loadingState.backgroundRefresh ? 0.8 : 1,
                  transition: 'opacity 0.2s ease-in-out'
                }}
              >
                <MenuItem value="">
                  <Typography>All</Typography>
                </MenuItem>
                {[FILE_STATUS.PENDING, FILE_STATUS.PROCESSING, FILE_STATUS.COMPLETED, FILE_STATUS.FAILED].map((status) => (
                  <MenuItem key={status} value={status}>
                    <Typography sx={{ textTransform: 'capitalize' }}>{status}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 갱신 주기 표시 및 설정 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* 🎯 실제 자동 새로고침 활성 상태에 따른 표시 개선 */}
                {(() => {
                  const isReallyActive = uiState.autoRefreshActive && autoRefreshRef.current !== null;
                  return isReallyActive ? (
                    <Badge color="success" variant="dot" sx={{ '& .MuiBadge-badge': { animation: 'pulse 2s infinite' } }}>
                      <Speed fontSize="small" color="primary" />
                    </Badge>
                  ) : (
                    <Speed fontSize="small" color="disabled" />
                  );
                })()}
                <Typography 
                  variant="body2" 
                  color={(() => {
                    const isReallyActive = uiState.autoRefreshActive && autoRefreshRef.current !== null;
                    return isReallyActive ? "primary" : "text.secondary";
                  })()}
                >
                  자동 갱신: {(() => {
                    const isReallyActive = uiState.autoRefreshActive && autoRefreshRef.current !== null;
                    return isReallyActive
                      ? (refreshSettings.interval >= 60000 
                          ? `${refreshSettings.interval / 60000}분마다` 
                          : `${refreshSettings.interval / 1000}초마다`)
                      : "비활성";
                  })()}
                </Typography>
              </Box>
              <Tooltip title="갱신 설정">
                <IconButton
                  size="small"
                  onClick={() => setUiState(prev => ({ ...prev, refreshSettingsOpen: true }))}
                  color="primary"
                >
                  <Settings />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* 🎨 파일 테이블 */}
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Source File</TableCell>
                  <TableCell>Target File</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* 🎯 이미 페이징된 결과 표시 (API에서 skip/limit 적용됨) */}
                {operationFiles.map((file, index) => (
                  <TableRow key={file.id || index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFileStatusIcon(file.status)}
                        <Chip
                          label={file.status}
                          color={getStatusColor(file.status)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilePresent fontSize="small" />
                        <Typography variant="body2">
                          {file.source_filename || file.filename}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                      >
                        {file.target_filename || file.target_path || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {file.status === FILE_STATUS.PROCESSING && (
                        <CircularProgress size={16} />
                      )}
                      {file.status === FILE_STATUS.COMPLETED && (
                        <CheckCircle color="success" fontSize="small" />
                      )}
                      {file.status === FILE_STATUS.FAILED && (
                        <Error color="error" fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {file.error_message && (
                        <Tooltip title={file.error_message}>
                          <Typography 
                            variant="caption" 
                            color="error"
                            sx={{ 
                              maxWidth: 200, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis' 
                            }}
                          >
                            {file.error_message}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {operationFiles.length === 0 && dataState.meta.isInitialized && (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
              No files found for this operation
            </Typography>
          )}

          {/* 🎯 페이지네이션 */}
          {filteredFiles > 0 && (
            <TablePagination
              component="div"
              count={filteredFiles}
              page={uiState.filesPage}
              onPageChange={handlePageChange}
              rowsPerPage={uiState.filesLimit}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="페이지당 행 수:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `${to} 이상`}`}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                mt: 2
              }}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  // 🎯 초기 로딩 중인 경우 스켈레톤 표시
  if (loadingState.initialLoad) {
    return (
      <PageContainer>
        <PageContent>
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="rectangular" height={60} />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="rectangular" height={200} />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="rectangular" height={150} />
          </Box>
          <Skeleton variant="rectangular" height={300} />
        </PageContent>
      </PageContainer>
    );
  }

  // 🚨 에러 상태 처리
  if (dataState.meta.hasError && !displayData.operation) {
    return (
      <PageContainer>
        <PageContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            {dataState.meta.errorMessage}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => navigate('/smart-operations')}
            startIcon={<ArrowBack />}
          >
            Back to Operations
          </Button>
        </PageContent>
      </PageContainer>
    );
  }

  const { operation } = displayData;
  const canStart = operation?.status === OPERATION_STATUS.PENDING;
  const canDelete = operation?.status === OPERATION_STATUS.PENDING;

  return (
    <PageContainer>
      <PageHeader
        title="Smart Operation Details"
        subtitle={operation ? `Operation: ${operation.name}` : 'Loading...'}
        primaryAction={{
          label: "Back to Operations", 
          onClick: () => navigate('/smart-operations'),
          icon: <ArrowBack />,
          variant: 'outlined'
        }}
        secondaryActions={[
          {
            icon: <Refresh />,
            onClick: handleManualRefresh,
            // 🎯 새로운 정책: 자동 새로고침 활성화 시 수동 버튼 비활성화
            disabled: (() => {
              const isAutoActive = uiState.autoRefreshActive && refreshSettings.enabled;
              return loadingState.backgroundRefresh || 
                     loadingState.actionInProgress || 
                     isAutoActive; // 자동 새로고침 활성 시 수동 버튼 비활성화
            })(),
            // 🎯 자동 새로고침 상태에 따른 색상 변경
            color: (() => {
              const isAutoActive = uiState.autoRefreshActive && refreshSettings.enabled;
              return isAutoActive ? "disabled" : "default";
            })(),
            tooltip: (() => {
              const isAutoActive = uiState.autoRefreshActive && refreshSettings.enabled;
              
              if (loadingState.backgroundRefresh) {
                return "새로고침 중...";
              }
              
              if (isAutoActive) {
                return "자동 새로고침이 활성화되어 있습니다";
              }
              
              return "수동으로 데이터를 새로고침합니다";
            })()
          },
          ...(canStart ? [{
            icon: <PlayArrow />,
            onClick: handleStartOperation,
            disabled: loadingState.actionInProgress,
            tooltip: "Start Operation",
            color: "primary"
          }] : []),
          ...(canDelete ? [{
            icon: <Delete />,
            onClick: () => setUiState(prev => ({ ...prev, deleteDialogOpen: true })),
            disabled: loadingState.actionInProgress,
            tooltip: "Delete Operation",
            color: "error"
          }] : [])
        ].filter(Boolean)} // 🎯 빈 액션 필터링 추가
      />

      <PageContent>
        {/* 🚨 에러 알림 */}
        {dataState.meta.hasError && (
          <Fade in>
            <Alert 
              severity="error" 
              sx={{ mb: 3 }} 
              onClose={() => setDataState(prev => ({
                ...prev,
                meta: { ...prev.meta, hasError: false, errorMessage: null }
              }))}
            >
              {dataState.meta.errorMessage}
            </Alert>
          </Fade>
        )}

        {/* 🎨 메인 콘텐츠 */}
        {renderOperationSummary()}
        {renderConfigurationDetails()}
        {renderFilesList()}

        {/* 🎯 새로고침 설정 다이얼로그 */}
        <Dialog 
          open={uiState.refreshSettingsOpen}
          onClose={() => setUiState(prev => ({ ...prev, refreshSettingsOpen: false }))}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings color="primary" />
            자동 새로고침 설정
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={refreshSettings.enabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // 활성화하는 경우: enabled를 true로 설정하고 비활성화 플래그 리셋
                        setRefreshSettings(prev => ({ 
                          ...prev, 
                          enabled: true,
                          userDisabledForCompleted: false
                        }));
                        // 🎯 즉시 자동 새로고침 상태를 활성화로 설정
                        setUiState(prev => ({ ...prev, autoRefreshActive: true }));
                      } else {
                        // 비활성화하는 경우: enabled를 false로 설정
                        setRefreshSettings(prev => ({ 
                          ...prev, 
                          enabled: false
                        }));
                        // 🎯 즉시 자동 새로고침 상태를 비활성화로 설정
                        setUiState(prev => ({ ...prev, autoRefreshActive: false }));
                      }
                    }}
                    color="primary"
                  />
                }
                label="자동 새로고침 활성화"
                sx={{ mb: 2 }}
              />
              
              {/* 현재 상태 설명 */}
              {refreshSettings.enabled && !uiState.autoRefreshActive && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
                  <Typography variant="body2" color="warning.dark" sx={{ fontWeight: 500 }}>
                    ⚠️ 현재 상태: 작업이 완료되어 자동 갱신이 일시 중단되었습니다
                  </Typography>
                  <Typography variant="caption" color="warning.dark">
                    위의 스위치를 껐다 켜면 다시 활성화됩니다
                  </Typography>
                </Box>
              )}
              
              {refreshSettings.enabled && (
                <FormControl fullWidth>
                  <InputLabel>새로고침 주기</InputLabel>
                  <Select
                    value={refreshSettings.interval}
                    label="새로고침 주기"
                    onChange={(e) => {
                      const newInterval = e.target.value;
                      setRefreshSettings(prev => ({ 
                        ...prev, 
                        interval: newInterval,
                        userDisabledForCompleted: false // 사용자가 수동으로 변경하면 비활성화 플래그 리셋
                      }));
                      
                      // 🎯 주기 변경 시 자동 새로고침 상태 즉시 반영
                      if (refreshSettings.enabled && newInterval > 0) {
                        setUiState(prev => ({ ...prev, autoRefreshActive: true }));
                      } else if (newInterval === 0) {
                        setUiState(prev => ({ ...prev, autoRefreshActive: false }));
                      }
                    }}
                  >
                    {REFRESH_INTERVALS.map(option => (
                      <MenuItem 
                        key={option.value} 
                        value={option.value}
                        sx={{ 
                          minHeight: 'auto',
                          py: 1.5,
                          '& .MuiChip-root': {
                            pointerEvents: 'none' // 🎯 Chip 클릭 간섭 방지
                          }
                        }}
                      >
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            width: '100%',
                            pointerEvents: 'none' // 🎯 Box 클릭 간섭 방지
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: option.default ? 'bold' : 'normal',
                                pointerEvents: 'none' // 🎯 Typography 클릭 간섭 방지
                              }}
                            >
                              {option.label}
                            </Typography>
                            {option.recommended && (
                              <Chip 
                                size="small" 
                                label="추천" 
                                color="success" 
                                variant="outlined" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.7rem',
                                  pointerEvents: 'none' // 🎯 Chip 클릭 간섭 방지
                                }} 
                              />
                            )}
                            {option.default && (
                              <Chip 
                                size="small" 
                                label="기본" 
                                color="primary" 
                                variant="filled" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.7rem',
                                  pointerEvents: 'none' // 🎯 Chip 클릭 간섭 방지
                                }} 
                              />
                            )}
                          </Box>
                          <Typography 
                            variant="caption" 
                            color="textSecondary" 
                            sx={{ 
                              fontSize: '0.75rem',
                              opacity: 0.8,
                              pointerEvents: 'none' // 🎯 Typography 클릭 간섭 방지
                            }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  💡 <strong>사용 가이드:</strong>
                </Typography>
                <Typography variant="caption" color="textSecondary" component="div">
                  • <strong>10초</strong>: 대부분의 상황에 최적 (기본값)<br/>
                  • <strong>5초</strong>: 빠른 진행 상황 추적이 필요한 경우<br/>
                  • <strong>1분</strong>: 장시간 실행되는 대용량 작업<br/>
                  • <strong>수동만</strong>: 필요시만 새로고침 버튼 클릭<br/>
                  • <strong>자동 비활성화</strong>: 완료/실패된 작업은 자동으로 갱신 중단<br/>
                  • 설정 변경 시 자동으로 다시 활성화됩니다
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setUiState(prev => ({ ...prev, refreshSettingsOpen: false }));
              // 🎯 다이얼로그 닫을 때 설정이 반영되도록 useEffect 트리거
              // refreshSettings 변경으로 useEffect가 다시 실행됩니다
            }}>
              닫기
            </Button>
          </DialogActions>
        </Dialog>

        {/* 🗑️ 삭제 확인 다이얼로그 */}
        <Dialog 
          open={uiState.deleteDialogOpen} 
          onClose={() => setUiState(prev => ({ ...prev, deleteDialogOpen: false }))}
        >
          <DialogTitle>Delete Operation</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this operation? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setUiState(prev => ({ ...prev, deleteDialogOpen: false }))}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteOperation} 
              color="error" 
              variant="contained"
              disabled={loadingState.actionInProgress}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </PageContent>
    </PageContainer>
  );
};

export default SmartOperationDetailsPage;