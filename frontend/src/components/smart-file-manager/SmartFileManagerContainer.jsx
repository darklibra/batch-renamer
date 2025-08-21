/**
 * Smart File Manager Container
 * 스마트 파일 매니저 컨테이너 컴포넌트
 * 
 * 단일 책임 원칙: 상태 관리와 컴포넌트 조합만 담당
 * Facade 패턴: 복잡한 하위 컴포넌트들을 단순한 인터페이스로 래핑
 * 확장 가능성: 새로운 패널이나 기능 쉽게 추가 가능
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Alert,
  Snackbar,
  Backdrop,
  CircularProgress,
  Typography
} from '@mui/material';

// 모듈화된 훅과 컴포넌트들
import { useSmartOperations } from './hooks/useSmartOperations.js';
import { useFileSelection } from '../../../shared/hooks/useFileSelection.js';
import { useTemplateValidation } from '../../../shared/hooks/useTemplateValidation.js';

// 패널 컴포넌트들
import FileSelectionPanel from './components/FileSelectionPanel.jsx';
import OperationConfigPanel from './components/OperationConfigPanel.jsx';
import PreviewPanel from './components/PreviewPanel.jsx';
import ProgressPanel from './components/ProgressPanel.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';

/**
 * 스마트 파일 매니저 컨테이너
 * 
 * 모든 하위 컴포넌트들을 조합하고 상태를 관리하는 최상위 컴포넌트
 */
const SmartFileManagerContainer = ({
  // 데이터 Props
  files = [],
  patterns = [],
  defaultConfig = {},
  
  // 설정 Props
  maxFileSelection = 100,
  enableAutoSelect = true,
  enableBackgroundMode = false,
  
  // 이벤트 Props
  onOperationComplete,
  onError,
  
  // 스타일 Props
  sx = {}
}) => {
  // 스마트 작업 훅
  const smartOps = useSmartOperations({
    defaultConfig,
    enableBackgroundMode
  });

  // 파일 선택 훅
  const fileSelection = useFileSelection({
    files,
    patterns,
    maxSelection: maxFileSelection
  });

  // 템플릿 검증 훅
  const templateValidation = useTemplateValidation();

  // 로컬 상태
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  /**
   * 스낵바 표시
   */
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  /**
   * 스낵바 닫기
   */
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  /**
   * 파일 선택 변경 처리
   */
  const handleSelectionChange = useCallback((selectedIds) => {
    fileSelection.setSelectedFileIds(selectedIds);
    
    // 선택이 변경되면 미리보기 초기화
    if (smartOps.operationStatus !== smartOps.OPERATION_STATUS.IDLE) {
      smartOps.resetOperation();
    }
  }, [fileSelection, smartOps]);

  /**
   * 자동 선택 처리
   */
  const handleAutoSelect = useCallback(async () => {
    try {
      const autoSelectedIds = await fileSelection.autoSelectFiles();
      showSnackbar(`${autoSelectedIds.length}개 파일이 자동 선택되었습니다.`, 'success');
    } catch (error) {
      showSnackbar('자동 선택 중 오류가 발생했습니다.', 'error');
      console.error('Auto selection failed:', error);
    }
  }, [fileSelection, showSnackbar]);

  /**
   * 작업 설정 변경 처리
   */
  const handleConfigChange = useCallback((updates) => {
    smartOps.updateOperationConfig(updates);
    
    // 템플릿이 변경된 경우 검증
    if (updates.filenameTemplate) {
      templateValidation.validateTemplate(updates.filenameTemplate, updates.patternId);
    }
  }, [smartOps, templateValidation]);

  /**
   * 미리보기 실행
   */
  const handlePreview = useCallback(async () => {
    if (fileSelection.selectedFileIds.length === 0) {
      showSnackbar('파일을 선택해주세요.', 'warning');
      return;
    }

    const success = await smartOps.previewOperation(fileSelection.selectedFileIds);
    if (success) {
      showSnackbar('미리보기가 생성되었습니다.', 'success');
    } else {
      showSnackbar(smartOps.error || '미리보기 실행에 실패했습니다.', 'error');
    }
  }, [fileSelection.selectedFileIds, smartOps, showSnackbar]);

  /**
   * 작업 실행
   */
  const handleExecute = useCallback(async () => {
    if (fileSelection.selectedFileIds.length === 0) {
      showSnackbar('파일을 선택해주세요.', 'warning');
      return;
    }

    const validation = smartOps.validateConfiguration();
    if (!validation.isValid) {
      showSnackbar(validation.errors[0] || '설정을 확인해주세요.', 'error');
      return;
    }

    const success = await smartOps.executeOperation(fileSelection.selectedFileIds);
    if (success) {
      showSnackbar('작업이 시작되었습니다.', 'success');
    } else {
      showSnackbar(smartOps.error || '작업 실행에 실패했습니다.', 'error');
    }
  }, [fileSelection.selectedFileIds, smartOps, showSnackbar]);

  /**
   * 작업 취소
   */
  const handleCancel = useCallback(async () => {
    await smartOps.cancelOperation();
    showSnackbar('작업이 취소되었습니다.', 'info');
  }, [smartOps, showSnackbar]);

  /**
   * 작업 완료 처리
   */
  useEffect(() => {
    if (smartOps.isCompleted) {
      showSnackbar('작업이 완료되었습니다.', 'success');
      onOperationComplete?.(smartOps.currentOperation);
    }
  }, [smartOps.isCompleted, smartOps.currentOperation, onOperationComplete, showSnackbar]);

  /**
   * 에러 처리
   */
  useEffect(() => {
    if (smartOps.error) {
      onError?.(smartOps.error);
    }
  }, [smartOps.error, onError]);

  /**
   * 키보드 단축키 처리
   */
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ctrl/Cmd + Enter: 미리보기 실행
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (smartOps.isIdle || smartOps.isConfiguring) {
          event.preventDefault();
          handlePreview();
        }
      }
      
      // Escape: 작업 취소 또는 초기화
      if (event.key === 'Escape') {
        if (smartOps.canCancel) {
          handleCancel();
        } else if (!smartOps.isIdle) {
          smartOps.resetOperation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [smartOps, handlePreview, handleCancel]);

  /**
   * 현재 단계에 따른 패널 표시 결정
   */
  const shouldShowPanel = useCallback((panelName) => {
    switch (panelName) {
      case 'selection':
        return true; // 항상 표시
      case 'config':
        return smartOps.isIdle || smartOps.isConfiguring;
      case 'preview':
        return smartOps.isConfiguring && smartOps.previewResults.length > 0;
      case 'progress':
        return smartOps.isExecuting;
      case 'results':
        return smartOps.isCompleted || smartOps.isFailed;
      default:
        return false;
    }
  }, [smartOps]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      
      {/* 메인 콘텐츠 영역 */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          
          {/* 파일 선택 패널 (항상 표시) */}
          <Grid item xs={12} md={4}>
            <FileSelectionPanel
              files={files}
              selectedFileIds={fileSelection.selectedFileIds}
              patterns={patterns}
              onSelectionChange={handleSelectionChange}
              onAutoSelect={enableAutoSelect ? handleAutoSelect : undefined}
              onClearSelection={fileSelection.clearSelection}
              maxSelectionCount={maxFileSelection}
              enableAutoSelect={enableAutoSelect}
              enablePatternFilter={true}
            />
          </Grid>

          {/* 동적 패널 영역 */}
          <Grid item xs={12} md={8}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              
              {/* 작업 설정 패널 */}
              {shouldShowPanel('config') && (
                <OperationConfigPanel
                  config={smartOps.operationConfig}
                  patterns={patterns}
                  onConfigChange={handleConfigChange}
                  onPreview={handlePreview}
                  onExecute={handleExecute}
                  canPreview={fileSelection.selectedFileIds.length > 0}
                  canExecute={smartOps.canExecute}
                  isLoading={smartOps.isPreviewing}
                  templateValidation={templateValidation.validation}
                />
              )}

              {/* 미리보기 패널 */}
              {shouldShowPanel('preview') && (
                <PreviewPanel
                  previewResults={smartOps.previewResults}
                  onExecute={handleExecute}
                  onEdit={() => smartOps.resetOperation()}
                  canExecute={smartOps.canExecute}
                />
              )}

              {/* 진행률 패널 */}
              {shouldShowPanel('progress') && (
                <ProgressPanel
                  progress={smartOps.progress}
                  currentOperation={smartOps.currentOperation}
                  onCancel={handleCancel}
                  canCancel={smartOps.canCancel}
                />
              )}

              {/* 결과 패널 */}
              {shouldShowPanel('results') && (
                <ResultsPanel
                  currentOperation={smartOps.currentOperation}
                  operationHistory={smartOps.operationHistory}
                  onNewOperation={smartOps.resetOperation}
                  error={smartOps.error}
                />
              )}

            </Box>
          </Grid>

        </Grid>
      </Box>

      {/* 백드롭 로딩 */}
      <Backdrop
        open={smartOps.isPreviewing && !enableBackgroundMode}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress color="inherit" />
          <Typography variant="body1">
            미리보기 생성 중...
          </Typography>
        </Box>
      </Backdrop>

      {/* 스낵바 알림 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default SmartFileManagerContainer;