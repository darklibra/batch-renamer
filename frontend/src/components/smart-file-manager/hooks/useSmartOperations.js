/**
 * Smart Operations Hook
 * 스마트 파일 작업 관리 훅
 * 
 * 단일 책임 원칙: 스마트 작업 상태 관리만 담당
 * 높은 응집도: 작업 관련 모든 상태와 로직 포함
 * 낮은 결합도: API 서비스만 의존
 */

import { useState, useCallback, useEffect } from 'react';
import { smartFileOperationService } from '../services/smartFileOperationService.js';

/**
 * 스마트 작업 상태 타입
 */
const OPERATION_STATUS = {
  IDLE: 'idle',
  CONFIGURING: 'configuring',
  PREVIEWING: 'previewing',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * 작업 타입
 */
const OPERATION_TYPES = {
  COPY: 'copy',
  MOVE: 'move'
};

/**
 * 스마트 작업 관리 훅
 * 
 * @param {Object} options 설정 옵션
 * @returns {Object} 작업 상태와 메서드들
 */
export const useSmartOperations = (options = {}) => {
  // 작업 상태 관리
  const [operationStatus, setOperationStatus] = useState(OPERATION_STATUS.IDLE);
  const [currentOperation, setCurrentOperation] = useState(null);
  const [operationHistory, setOperationHistory] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // 작업 설정
  const [operationConfig, setOperationConfig] = useState({
    type: OPERATION_TYPES.COPY,
    targetDirectory: '',
    filenameTemplate: '{name}.{extension}',
    patternId: null,
    conflictResolution: 'skip',
    createBackup: false
  });

  // 미리보기 결과
  const [previewResults, setPreviewResults] = useState([]);

  /**
   * 작업 설정 업데이트
   */
  const updateOperationConfig = useCallback((updates) => {
    setOperationConfig(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  /**
   * 작업 미리보기
   */
  const previewOperation = useCallback(async (fileIds) => {
    if (!fileIds || fileIds.length === 0) {
      setError('선택된 파일이 없습니다.');
      return false;
    }

    try {
      setOperationStatus(OPERATION_STATUS.PREVIEWING);
      setError(null);
      setProgress(0);

      const previewData = {
        file_ids: fileIds,
        filename_template: operationConfig.filenameTemplate,
        pattern_id: operationConfig.patternId
      };

      const results = await smartFileOperationService.previewOperation(previewData);
      
      setPreviewResults(results);
      setOperationStatus(OPERATION_STATUS.CONFIGURING);
      
      return true;

    } catch (err) {
      console.error('Preview operation failed:', err);
      setError(err.message || '미리보기 실행 중 오류가 발생했습니다.');
      setOperationStatus(OPERATION_STATUS.FAILED);
      return false;
    }
  }, [operationConfig.filenameTemplate, operationConfig.patternId]);

  /**
   * 작업 실행
   */
  const executeOperation = useCallback(async (fileIds) => {
    if (!fileIds || fileIds.length === 0) {
      setError('선택된 파일이 없습니다.');
      return false;
    }

    if (!operationConfig.targetDirectory) {
      setError('대상 디렉토리를 선택해주세요.');
      return false;
    }

    try {
      setOperationStatus(OPERATION_STATUS.EXECUTING);
      setError(null);
      setProgress(0);

      const operationData = {
        file_ids: fileIds,
        target_directory: operationConfig.targetDirectory,
        filename_template: operationConfig.filenameTemplate,
        pattern_id: operationConfig.patternId,
        conflict_resolution: operationConfig.conflictResolution,
        create_backup: operationConfig.createBackup
      };

      let result;
      if (operationConfig.type === OPERATION_TYPES.COPY) {
        result = await smartFileOperationService.startCopyOperation(operationData);
      } else {
        result = await smartFileOperationService.startMoveOperation(operationData);
      }

      setCurrentOperation(result);
      
      // 진행률 모니터링 시작
      if (result.job_id) {
        monitorOperationProgress(result.job_id);
      }

      return true;

    } catch (err) {
      console.error('Execute operation failed:', err);
      setError(err.message || '작업 실행 중 오류가 발생했습니다.');
      setOperationStatus(OPERATION_STATUS.FAILED);
      return false;
    }
  }, [operationConfig]);

  /**
   * 작업 진행률 모니터링
   */
  const monitorOperationProgress = useCallback(async (jobId) => {
    const pollInterval = 1000; // 1초마다 체크
    const maxAttempts = 300; // 최대 5분
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await smartFileOperationService.getOperationStatus(jobId);
        
        setProgress(status.progress || 0);

        if (status.status === 'completed') {
          setOperationStatus(OPERATION_STATUS.COMPLETED);
          setOperationHistory(prev => [...prev, {
            ...currentOperation,
            completedAt: new Date(),
            status: 'completed',
            result: status.result
          }]);
          return;
        }

        if (status.status === 'failed') {
          setError(status.error_message || '작업이 실패했습니다.');
          setOperationStatus(OPERATION_STATUS.FAILED);
          return;
        }

        // 진행 중이면 계속 모니터링
        if (status.status === 'running' && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, pollInterval);
        } else if (attempts >= maxAttempts) {
          setError('작업 모니터링 시간이 초과되었습니다.');
          setOperationStatus(OPERATION_STATUS.FAILED);
        }

      } catch (err) {
        console.error('Progress monitoring failed:', err);
        setError('작업 상태 확인 중 오류가 발생했습니다.');
        setOperationStatus(OPERATION_STATUS.FAILED);
      }
    };

    poll();
  }, [currentOperation]);

  /**
   * 작업 취소
   */
  const cancelOperation = useCallback(async () => {
    if (currentOperation && currentOperation.job_id) {
      try {
        await smartFileOperationService.cancelOperation(currentOperation.job_id);
        setOperationStatus(OPERATION_STATUS.IDLE);
        setCurrentOperation(null);
        setProgress(0);
      } catch (err) {
        console.error('Cancel operation failed:', err);
        setError('작업 취소 중 오류가 발생했습니다.');
      }
    }
  }, [currentOperation]);

  /**
   * 작업 초기화
   */
  const resetOperation = useCallback(() => {
    setOperationStatus(OPERATION_STATUS.IDLE);
    setCurrentOperation(null);
    setError(null);
    setProgress(0);
    setPreviewResults([]);
  }, []);

  /**
   * 설정 유효성 검증
   */
  const validateConfiguration = useCallback(() => {
    const errors = [];

    if (!operationConfig.targetDirectory) {
      errors.push('대상 디렉토리를 선택해주세요.');
    }

    if (!operationConfig.filenameTemplate) {
      errors.push('파일명 템플릿을 입력해주세요.');
    }

    // 템플릿 구문 검증
    if (operationConfig.filenameTemplate) {
      const templatePattern = /\{[^}]+\}/g;
      const matches = operationConfig.filenameTemplate.match(templatePattern);
      if (!matches) {
        errors.push('파일명 템플릿에는 최소 하나의 변수가 필요합니다. 예: {name}.{extension}');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [operationConfig]);

  // 상태 변화 로깅 (개발 모드)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('SmartOperations State:', {
        status: operationStatus,
        config: operationConfig,
        hasPreview: previewResults.length > 0,
        progress,
        error: error ? error.substring(0, 100) : null
      });
    }
  }, [operationStatus, operationConfig, previewResults.length, progress, error]);

  return {
    // 상태
    operationStatus,
    currentOperation,
    operationHistory,
    error,
    progress,
    operationConfig,
    previewResults,

    // 액션
    updateOperationConfig,
    previewOperation,
    executeOperation,
    cancelOperation,
    resetOperation,
    validateConfiguration,

    // 상수
    OPERATION_STATUS,
    OPERATION_TYPES,

    // 편의 메서드
    isIdle: operationStatus === OPERATION_STATUS.IDLE,
    isConfiguring: operationStatus === OPERATION_STATUS.CONFIGURING,
    isPreviewing: operationStatus === OPERATION_STATUS.PREVIEWING,
    isExecuting: operationStatus === OPERATION_STATUS.EXECUTING,
    isCompleted: operationStatus === OPERATION_STATUS.COMPLETED,
    isFailed: operationStatus === OPERATION_STATUS.FAILED,
    canExecute: operationStatus === OPERATION_STATUS.CONFIGURING && validateConfiguration().isValid,
    canCancel: operationStatus === OPERATION_STATUS.EXECUTING
  };
};