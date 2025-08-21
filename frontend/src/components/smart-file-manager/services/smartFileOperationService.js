/**
 * Smart File Operation Service
 * 스마트 파일 작업 API 통신 서비스
 * 
 * 단일 책임 원칙: API 통신만 담당
 * 명확한 인터페이스: REST API 엔드포인트 래핑
 * 재사용성: 다양한 컴포넌트에서 사용 가능
 */

import { apiClient } from '../../../shared/services/apiClient.js';

/**
 * API 엔드포인트 상수
 */
const ENDPOINTS = {
  PREVIEW_TEMPLATE: '/api/v1/files/preview-template',
  VALIDATE_TEMPLATE: '/api/v1/files/validate-template',
  SMART_COPY: '/api/v1/files/smart-copy',
  SMART_MOVE: '/api/v1/files/smart-move',
  OPERATION_STATUS: (id) => `/api/v1/files/smart-operations/${id}`,
  OPERATION_CANCEL: (id) => `/api/v1/files/smart-operations/${id}/cancel`
};

/**
 * 스마트 파일 작업 서비스
 */
export class SmartFileOperationService {
  constructor(httpClient = apiClient) {
    this.httpClient = httpClient;
  }

  /**
   * 템플릿 미리보기
   * 
   * @param {Object} previewData 미리보기 데이터
   * @param {number[]} previewData.file_ids 파일 ID 목록
   * @param {string} previewData.filename_template 파일명 템플릿
   * @param {number|null} previewData.pattern_id 패턴 ID (선택적)
   * @returns {Promise<Object[]>} 미리보기 결과 목록
   */
  async previewOperation(previewData) {
    try {
      const response = await this.httpClient.post(ENDPOINTS.PREVIEW_TEMPLATE, previewData);
      
      if (!response.data || !Array.isArray(response.data.results)) {
        throw new Error('Invalid preview response format');
      }

      return response.data.results.map(result => ({
        file_id: result.file_id,
        original_filename: result.original_filename,
        preview_filename: result.preview_filename,
        success: result.success,
        error_message: result.error_message,
        metadata_used: result.metadata_used || {},
        template_variables: result.template_variables || {}
      }));

    } catch (error) {
      console.error('Template preview failed:', error);
      throw this._handleError(error, '템플릿 미리보기');
    }
  }

  /**
   * 템플릿 유효성 검증
   * 
   * @param {Object} validationData 검증 데이터
   * @param {string} validationData.filename_template 파일명 템플릿
   * @param {number|null} validationData.pattern_id 패턴 ID (선택적)
   * @returns {Promise<Object>} 검증 결과
   */
  async validateTemplate(validationData) {
    try {
      const response = await this.httpClient.post(ENDPOINTS.VALIDATE_TEMPLATE, validationData);
      
      return {
        is_valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
        suggested_template: response.data.suggested_template,
        available_variables: response.data.available_variables || []
      };

    } catch (error) {
      console.error('Template validation failed:', error);
      throw this._handleError(error, '템플릿 검증');
    }
  }

  /**
   * 스마트 복사 작업 시작
   * 
   * @param {Object} operationData 작업 데이터
   * @param {number[]} operationData.file_ids 파일 ID 목록
   * @param {string} operationData.target_directory 대상 디렉토리
   * @param {string} operationData.filename_template 파일명 템플릿
   * @param {number|null} operationData.pattern_id 패턴 ID (선택적)
   * @param {string} operationData.conflict_resolution 충돌 해결 방식
   * @param {boolean} operationData.create_backup 백업 생성 여부
   * @returns {Promise<Object>} 작업 정보
   */
  async startCopyOperation(operationData) {
    try {
      const response = await this.httpClient.post(ENDPOINTS.SMART_COPY, operationData);
      
      return {
        job_id: response.data.job_id,
        operation_type: 'copy',
        status: response.data.status,
        file_count: response.data.file_count,
        target_directory: response.data.target_directory,
        started_at: new Date(response.data.started_at),
        estimated_duration: response.data.estimated_duration
      };

    } catch (error) {
      console.error('Smart copy operation failed:', error);
      throw this._handleError(error, '스마트 복사 작업');
    }
  }

  /**
   * 스마트 이동 작업 시작
   * 
   * @param {Object} operationData 작업 데이터
   * @returns {Promise<Object>} 작업 정보
   */
  async startMoveOperation(operationData) {
    try {
      const response = await this.httpClient.post(ENDPOINTS.SMART_MOVE, operationData);
      
      return {
        job_id: response.data.job_id,
        operation_type: 'move',
        status: response.data.status,
        file_count: response.data.file_count,
        target_directory: response.data.target_directory,
        started_at: new Date(response.data.started_at),
        estimated_duration: response.data.estimated_duration
      };

    } catch (error) {
      console.error('Smart move operation failed:', error);
      throw this._handleError(error, '스마트 이동 작업');
    }
  }

  /**
   * 작업 상태 조회
   * 
   * @param {string} jobId 작업 ID
   * @returns {Promise<Object>} 작업 상태
   */
  async getOperationStatus(jobId) {
    try {
      const response = await this.httpClient.get(ENDPOINTS.OPERATION_STATUS(jobId));
      
      return {
        job_id: response.data.job_id,
        status: response.data.status,
        progress: response.data.progress,
        processed_files: response.data.processed_files || 0,
        total_files: response.data.total_files || 0,
        successful_operations: response.data.successful_operations || 0,
        failed_operations: response.data.failed_operations || 0,
        current_stage: response.data.current_stage,
        error_message: response.data.error_message,
        result: response.data.result,
        started_at: response.data.started_at ? new Date(response.data.started_at) : null,
        completed_at: response.data.completed_at ? new Date(response.data.completed_at) : null,
        processing_details: response.data.processing_details || []
      };

    } catch (error) {
      console.error('Get operation status failed:', error);
      throw this._handleError(error, '작업 상태 조회');
    }
  }

  /**
   * 작업 취소
   * 
   * @param {string} jobId 작업 ID
   * @returns {Promise<Object>} 취소 결과
   */
  async cancelOperation(jobId) {
    try {
      const response = await this.httpClient.post(ENDPOINTS.OPERATION_CANCEL(jobId));
      
      return {
        job_id: response.data.job_id,
        status: response.data.status,
        cancelled_at: new Date(response.data.cancelled_at),
        message: response.data.message
      };

    } catch (error) {
      console.error('Cancel operation failed:', error);
      throw this._handleError(error, '작업 취소');
    }
  }

  /**
   * 배치 작업 상태 조회
   * 
   * @param {string[]} jobIds 작업 ID 목록
   * @returns {Promise<Object[]>} 작업 상태 목록
   */
  async getBatchOperationStatus(jobIds) {
    try {
      // 병렬로 각 작업 상태 조회
      const statusPromises = jobIds.map(jobId => 
        this.getOperationStatus(jobId).catch(error => ({
          job_id: jobId,
          status: 'error',
          error_message: error.message
        }))
      );

      const results = await Promise.all(statusPromises);
      return results;

    } catch (error) {
      console.error('Batch status query failed:', error);
      throw this._handleError(error, '배치 상태 조회');
    }
  }

  /**
   * 작업 히스토리 조회 (향후 구현)
   * 
   * @param {Object} options 조회 옵션
   * @param {number} options.limit 제한 수
   * @param {number} options.offset 오프셋
   * @param {string} options.status 상태 필터
   * @returns {Promise<Object>} 작업 히스토리
   */
  async getOperationHistory(options = {}) {
    // TODO: 백엔드에 히스토리 API 구현 후 연결
    console.warn('Operation history API not yet implemented');
    return {
      operations: [],
      total_count: 0,
      has_more: false
    };
  }

  /**
   * 에러 처리 헬퍼
   * 
   * @private
   * @param {Error} error 원본 에러
   * @param {string} operation 작업명
   * @returns {Error} 처리된 에러
   */
  _handleError(error, operation) {
    // 네트워크 에러
    if (!error.response) {
      return new Error(`${operation} 중 네트워크 오류가 발생했습니다. 연결을 확인해주세요.`);
    }

    // HTTP 상태 에러
    const status = error.response.status;
    const data = error.response.data;

    if (status === 400) {
      const message = data?.message || data?.detail || '잘못된 요청입니다.';
      return new Error(`${operation}: ${message}`);
    }

    if (status === 404) {
      return new Error(`${operation}: 요청한 리소스를 찾을 수 없습니다.`);
    }

    if (status === 500) {
      return new Error(`${operation} 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`);
    }

    // 기본 에러 메시지
    const message = data?.message || data?.detail || error.message || '알 수 없는 오류가 발생했습니다.';
    return new Error(`${operation}: ${message}`);
  }

  /**
   * 요청 인터셉터 설정 (선택적)
   * 
   * @param {Function} requestInterceptor 요청 인터셉터
   * @param {Function} responseInterceptor 응답 인터셉터
   */
  setInterceptors(requestInterceptor, responseInterceptor) {
    if (this.httpClient.interceptors) {
      if (requestInterceptor) {
        this.httpClient.interceptors.request.use(requestInterceptor);
      }
      if (responseInterceptor) {
        this.httpClient.interceptors.response.use(responseInterceptor);
      }
    }
  }

  /**
   * 요청 타임아웃 설정
   * 
   * @param {number} timeout 타임아웃 (밀리초)
   */
  setTimeout(timeout) {
    if (this.httpClient.defaults) {
      this.httpClient.defaults.timeout = timeout;
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const smartFileOperationService = new SmartFileOperationService();