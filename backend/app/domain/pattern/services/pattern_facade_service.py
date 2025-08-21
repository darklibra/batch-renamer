"""
Pattern Facade Service
패턴 도메인의 복잡성을 숨기고 간단한 인터페이스 제공

Facade 패턴: 복잡한 서브시스템을 단순한 인터페이스로 래핑
단일 책임 원칙: 패턴 도메인 오케스트레이션만 담당
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.models.file_models import IndexedFile, ExtractionPattern
from app.domain.pattern.interfaces.pattern_extractor_interface import (
    PatternExtractorInterface,
    PatternMatcherInterface,
    PatternCacheInterface,
    ExtractionResult,
    PatternMatchResult
)
from app.domain.pattern.interfaces.pattern_validator_interface import PatternValidatorInterface

logger = logging.getLogger(__name__)


class PatternFacadeService:
    """
    패턴 파사드 서비스
    
    책임:
    - 패턴 도메인 서비스들의 오케스트레이션
    - 기존 서비스와의 호환성 유지
    - 복잡한 패턴 작업의 단순화
    """

    def __init__(self,
                 pattern_extractor: PatternExtractorInterface,
                 pattern_matcher: PatternMatcherInterface,
                 pattern_cache: PatternCacheInterface,
                 pattern_validator: PatternValidatorInterface):
        """
        의존성 주입을 통한 초기화
        
        Args:
            pattern_extractor: 패턴 추출 서비스
            pattern_matcher: 패턴 매칭 서비스
            pattern_cache: 패턴 캐시 서비스
            pattern_validator: 패턴 검증 서비스
        """
        self._extractor = pattern_extractor
        self._matcher = pattern_matcher
        self._cache = pattern_cache
        self._validator = pattern_validator
        
        logger.info("PatternFacadeService initialized with all domain services")

    def extract_metadata_from_filename(self, 
                                     filename: str, 
                                     patterns: List[ExtractionPattern]) -> Dict[str, Any]:
        """
        파일명에서 메타데이터 추출 (기존 API 호환성 유지)
        
        Args:
            filename: 대상 파일명
            patterns: 사용 가능한 패턴 목록
            
        Returns:
            Dict[str, Any]: 추출 결과 (기존 형식 유지)
        """
        try:
            # 1. 최적 패턴 찾기
            best_match = self._matcher.find_best_pattern(filename, patterns)
            
            if not best_match or best_match.confidence_score < 0.5:
                return {
                    'success': False,
                    'extracted_data': {},
                    'pattern_id': None,
                    'extraction_score': 0.0,
                    'error_message': 'No suitable pattern found'
                }

            # 2. 선택된 패턴으로 메타데이터 추출
            selected_pattern = next(
                (p for p in patterns if p.id == best_match.pattern_id), 
                None
            )
            
            if not selected_pattern:
                return {
                    'success': False,
                    'extracted_data': {},
                    'pattern_id': best_match.pattern_id,
                    'extraction_score': 0.0,
                    'error_message': 'Pattern not found'
                }

            # 3. 실제 추출 수행
            extraction_result = self._extractor.extract_metadata(filename, selected_pattern)
            
            # 4. 기존 API 형식으로 변환
            return {
                'success': extraction_result.success,
                'extracted_data': extraction_result.extracted_data,
                'pattern_id': extraction_result.pattern_id,
                'extraction_score': extraction_result.extraction_score,
                'error_message': extraction_result.error_message,
                'processing_time_ms': extraction_result.processing_time_ms,
                'match_quality': best_match.match_quality,
                'confidence_score': best_match.confidence_score
            }
            
        except Exception as e:
            logger.error(f"Metadata extraction failed for {filename}: {e}")
            return {
                'success': False,
                'extracted_data': {},
                'pattern_id': None,
                'extraction_score': 0.0,
                'error_message': f'Extraction failed: {str(e)}'
            }

    def extract_with_specific_pattern(self, 
                                    filename: str, 
                                    pattern: ExtractionPattern) -> Dict[str, Any]:
        """
        특정 패턴으로 메타데이터 추출
        
        Args:
            filename: 대상 파일명
            pattern: 사용할 패턴
            
        Returns:
            Dict[str, Any]: 추출 결과
        """
        try:
            extraction_result = self._extractor.extract_metadata(filename, pattern)
            
            return {
                'success': extraction_result.success,
                'extracted_data': extraction_result.extracted_data,
                'pattern_id': extraction_result.pattern_id,
                'extraction_score': extraction_result.extraction_score,
                'error_message': extraction_result.error_message,
                'processing_time_ms': extraction_result.processing_time_ms
            }
            
        except Exception as e:
            logger.error(f"Specific pattern extraction failed for {filename}: {e}")
            return {
                'success': False,
                'extracted_data': {},
                'pattern_id': pattern.id,
                'extraction_score': 0.0,
                'error_message': f'Extraction failed: {str(e)}'
            }

    def batch_extract_metadata(self, 
                             filenames: List[str], 
                             patterns: List[ExtractionPattern]) -> Dict[str, Dict[str, Any]]:
        """
        배치 메타데이터 추출
        
        Args:
            filenames: 대상 파일명 목록
            patterns: 사용 가능한 패턴 목록
            
        Returns:
            Dict[str, Dict[str, Any]]: 파일명별 추출 결과
        """
        results = {}
        
        if not filenames or not patterns:
            return results
        
        try:
            # 1. 배치 패턴 매칭
            match_results = self._matcher.batch_match_patterns(filenames, patterns)
            
            # 2. 각 파일에 대해 추출 수행
            for filename in filenames:
                match_result = match_results.get(filename)
                
                if not match_result or match_result.confidence_score < 0.5:
                    results[filename] = {
                        'success': False,
                        'extracted_data': {},
                        'pattern_id': None,
                        'extraction_score': 0.0,
                        'error_message': 'No suitable pattern found'
                    }
                    continue
                
                # 해당 패턴 찾기
                selected_pattern = next(
                    (p for p in patterns if p.id == match_result.pattern_id), 
                    None
                )
                
                if selected_pattern:
                    extraction_result = self._extractor.extract_metadata(filename, selected_pattern)
                    results[filename] = {
                        'success': extraction_result.success,
                        'extracted_data': extraction_result.extracted_data,
                        'pattern_id': extraction_result.pattern_id,
                        'extraction_score': extraction_result.extraction_score,
                        'error_message': extraction_result.error_message,
                        'match_quality': match_result.match_quality,
                        'confidence_score': match_result.confidence_score
                    }
                else:
                    results[filename] = {
                        'success': False,
                        'extracted_data': {},
                        'pattern_id': match_result.pattern_id,
                        'extraction_score': 0.0,
                        'error_message': 'Pattern not found'
                    }
            
            logger.info(f"Batch extraction completed for {len(filenames)} files")
            
        except Exception as e:
            logger.error(f"Batch extraction failed: {e}")
            # 에러 발생 시 모든 파일에 대해 실패 응답
            for filename in filenames:
                results[filename] = {
                    'success': False,
                    'extracted_data': {},
                    'pattern_id': None,
                    'extraction_score': 0.0,
                    'error_message': f'Batch extraction failed: {str(e)}'
                }
        
        return results

    def validate_and_test_pattern(self, pattern_text: str, test_filenames: List[str] = None) -> Dict[str, Any]:
        """
        패턴 검증 및 테스트
        
        Args:
            pattern_text: 검증할 정규표현식 패턴
            test_filenames: 테스트용 파일명 목록 (선택적)
            
        Returns:
            Dict[str, Any]: 검증 및 테스트 결과
        """
        try:
            # 1. 기본 검증
            syntax_result = self._validator.validate_regex_syntax(pattern_text)
            security_result = self._validator.validate_security(pattern_text)
            complexity_result = self._validator.analyze_complexity(pattern_text)
            
            validation_result = {
                'is_valid': syntax_result.is_valid and security_result.is_valid,
                'syntax_valid': syntax_result.is_valid,
                'security_valid': security_result.is_valid,
                'security_risk': security_result.security_risk.value if hasattr(security_result, 'security_risk') else 'none',
                'complexity_score': complexity_result.complexity_score,
                'performance_estimate': complexity_result.estimated_performance,
                'errors': syntax_result.error_messages + security_result.error_messages,
                'warnings': syntax_result.warnings + security_result.warnings if hasattr(syntax_result, 'warnings') else [],
                'dangerous_constructs': complexity_result.dangerous_constructs,
                'optimization_suggestions': complexity_result.optimization_suggestions
            }
            
            # 2. 테스트 파일명이 있는 경우 실제 테스트 수행
            if test_filenames and validation_result['is_valid']:
                import re
                try:
                    compiled_pattern = re.compile(pattern_text, re.IGNORECASE)
                    test_results = []
                    
                    for filename in test_filenames[:10]:  # 최대 10개까지만 테스트
                        match = compiled_pattern.search(filename)
                        test_results.append({
                            'filename': filename,
                            'matches': match is not None,
                            'groups': match.groups() if match else [],
                            'matched_text': match.group(0) if match else None
                        })
                    
                    validation_result['test_results'] = test_results
                    validation_result['match_rate'] = sum(1 for r in test_results if r['matches']) / len(test_results)
                    
                except re.error as e:
                    validation_result['test_error'] = str(e)
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Pattern validation failed: {e}")
            return {
                'is_valid': False,
                'errors': [f'Validation error: {str(e)}'],
                'warnings': [],
                'test_error': str(e)
            }

    def get_cache_statistics(self) -> Dict[str, Any]:
        """캐시 통계 반환"""
        try:
            cache_stats = self._cache.get_cache_stats()
            extractor_stats = self._extractor.get_performance_stats()
            matcher_stats = self._matcher.get_performance_metrics()
            
            return {
                'cache': cache_stats,
                'extractor_performance': extractor_stats,
                'matcher_performance': matcher_stats,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get cache statistics: {e}")
            return {'error': str(e)}

    def clear_pattern_cache(self, pattern_id: int = None) -> Dict[str, Any]:
        """패턴 캐시 클리어"""
        try:
            if pattern_id:
                self._cache.invalidate_pattern_cache(pattern_id)
                message = f"Cache cleared for pattern {pattern_id}"
            else:
                self._cache.clear_all_cache()
                message = "All pattern cache cleared"
            
            logger.info(message)
            return {'success': True, 'message': message}
            
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            return {'success': False, 'error': str(e)}

    def cleanup_expired_cache(self) -> Dict[str, Any]:
        """만료된 캐시 정리"""
        try:
            cleaned_count = self._cache.cleanup_expired_entries()
            message = f"Cleaned up {cleaned_count} expired cache entries"
            
            logger.info(message)
            return {'success': True, 'message': message, 'cleaned_count': cleaned_count}
            
        except Exception as e:
            logger.error(f"Failed to cleanup cache: {e}")
            return {'success': False, 'error': str(e)}