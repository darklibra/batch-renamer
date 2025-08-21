"""
Pattern Cache Manager
패턴 캐싱 전용 서비스

단일 책임 원칙: 패턴 관련 캐싱만 담당
"""

import time
import logging
from typing import Optional, Dict, Any
from threading import RLock

from app.domain.pattern.interfaces.pattern_extractor_interface import (
    PatternCacheInterface, 
    ExtractionResult, 
    PatternMatchResult
)

logger = logging.getLogger(__name__)


class PatternCacheManager(PatternCacheInterface):
    """
    패턴 캐시 관리자
    
    책임:
    - 추출 결과 캐싱
    - 매칭 결과 캐싱
    - 캐시 무효화 관리
    - 메모리 효율적 캐싱
    """

    def __init__(self, max_cache_size: int = 1000, ttl_seconds: int = 3600):
        """
        초기화
        
        Args:
            max_cache_size: 최대 캐시 크기
            ttl_seconds: 캐시 TTL (초)
        """
        self.max_cache_size = max_cache_size
        self.ttl_seconds = ttl_seconds
        
        # 캐시 저장소 - LRU 방식으로 구현
        self._extraction_cache: Dict[str, tuple] = {}  # (result, timestamp)
        self._match_cache: Dict[str, tuple] = {}       # (result, timestamp)
        
        # 접근 순서 추적 (LRU 구현용)
        self._extraction_access_order: Dict[str, float] = {}
        self._match_access_order: Dict[str, float] = {}
        
        # 스레드 안전성을 위한 락
        self._lock = RLock()
        
        # 통계
        self._stats = {
            'extraction_hits': 0,
            'extraction_misses': 0,
            'match_hits': 0,
            'match_misses': 0,
            'evictions': 0
        }
        
        logger.info(f"PatternCacheManager initialized with max_size={max_cache_size}, ttl={ttl_seconds}s")

    def get_cached_extraction(self, filename: str, pattern_id: int) -> Optional[ExtractionResult]:
        """캐시된 추출 결과 조회"""
        cache_key = f"extract_{filename}_{pattern_id}"
        
        with self._lock:
            if cache_key in self._extraction_cache:
                result, timestamp = self._extraction_cache[cache_key]
                
                # TTL 확인
                if time.time() - timestamp > self.ttl_seconds:
                    del self._extraction_cache[cache_key]
                    del self._extraction_access_order[cache_key]
                    self._stats['extraction_misses'] += 1
                    return None
                
                # 접근 시간 업데이트 (LRU)
                self._extraction_access_order[cache_key] = time.time()
                self._stats['extraction_hits'] += 1
                
                logger.debug(f"Cache hit for extraction: {cache_key}")
                return result
            
            self._stats['extraction_misses'] += 1
            return None

    def set_cached_extraction(self, filename: str, pattern_id: int, result: ExtractionResult) -> None:
        """추출 결과 캐시 저장"""
        cache_key = f"extract_{filename}_{pattern_id}"
        current_time = time.time()
        
        with self._lock:
            # 캐시 크기 확인 및 정리
            if len(self._extraction_cache) >= self.max_cache_size:
                self._evict_lru_extraction()
            
            # 캐시 저장
            self._extraction_cache[cache_key] = (result, current_time)
            self._extraction_access_order[cache_key] = current_time
            
            logger.debug(f"Cached extraction result: {cache_key}")

    def get_cached_pattern_match(self, filename: str) -> Optional[PatternMatchResult]:
        """캐시된 패턴 매칭 결과 조회"""
        cache_key = f"match_{filename}"
        
        with self._lock:
            if cache_key in self._match_cache:
                result, timestamp = self._match_cache[cache_key]
                
                # TTL 확인
                if time.time() - timestamp > self.ttl_seconds:
                    del self._match_cache[cache_key]
                    del self._match_access_order[cache_key]
                    self._stats['match_misses'] += 1
                    return None
                
                # 접근 시간 업데이트 (LRU)
                self._match_access_order[cache_key] = time.time()
                self._stats['match_hits'] += 1
                
                logger.debug(f"Cache hit for pattern match: {cache_key}")
                return result
            
            self._stats['match_misses'] += 1
            return None

    def set_cached_pattern_match(self, filename: str, result: PatternMatchResult) -> None:
        """패턴 매칭 결과 캐시 저장"""
        cache_key = f"match_{filename}"
        current_time = time.time()
        
        with self._lock:
            # 캐시 크기 확인 및 정리
            if len(self._match_cache) >= self.max_cache_size:
                self._evict_lru_match()
            
            # 캐시 저장
            self._match_cache[cache_key] = (result, current_time)
            self._match_access_order[cache_key] = current_time
            
            logger.debug(f"Cached pattern match result: {cache_key}")

    def invalidate_pattern_cache(self, pattern_id: int) -> None:
        """특정 패턴 관련 캐시 무효화"""
        with self._lock:
            # 해당 패턴 관련 추출 캐시 제거
            keys_to_remove = [
                key for key in self._extraction_cache.keys() 
                if key.endswith(f"_{pattern_id}")
            ]
            
            for key in keys_to_remove:
                del self._extraction_cache[key]
                del self._extraction_access_order[key]
            
            logger.info(f"Invalidated {len(keys_to_remove)} cache entries for pattern {pattern_id}")

    def clear_all_cache(self) -> None:
        """모든 캐시 삭제"""
        with self._lock:
            extraction_count = len(self._extraction_cache)
            match_count = len(self._match_cache)
            
            self._extraction_cache.clear()
            self._extraction_access_order.clear()
            self._match_cache.clear()
            self._match_access_order.clear()
            
            logger.info(f"Cleared all cache: {extraction_count} extraction entries, {match_count} match entries")

    def _evict_lru_extraction(self) -> None:
        """LRU 정책으로 추출 캐시 제거"""
        if not self._extraction_access_order:
            return
        
        # 가장 오래된 항목 찾기
        lru_key = min(self._extraction_access_order, key=self._extraction_access_order.get)
        
        # 제거
        del self._extraction_cache[lru_key]
        del self._extraction_access_order[lru_key]
        
        self._stats['evictions'] += 1
        logger.debug(f"Evicted LRU extraction cache entry: {lru_key}")

    def _evict_lru_match(self) -> None:
        """LRU 정책으로 매치 캐시 제거"""
        if not self._match_access_order:
            return
        
        # 가장 오래된 항목 찾기
        lru_key = min(self._match_access_order, key=self._match_access_order.get)
        
        # 제거
        del self._match_cache[lru_key]
        del self._match_access_order[lru_key]
        
        self._stats['evictions'] += 1
        logger.debug(f"Evicted LRU match cache entry: {lru_key}")

    def get_cache_stats(self) -> Dict[str, Any]:
        """캐시 통계 반환"""
        with self._lock:
            total_extraction_requests = self._stats['extraction_hits'] + self._stats['extraction_misses']
            total_match_requests = self._stats['match_hits'] + self._stats['match_misses']
            
            return {
                'extraction_cache_size': len(self._extraction_cache),
                'match_cache_size': len(self._match_cache),
                'extraction_hit_rate': (
                    self._stats['extraction_hits'] / max(total_extraction_requests, 1) * 100
                ),
                'match_hit_rate': (
                    self._stats['match_hits'] / max(total_match_requests, 1) * 100
                ),
                'total_evictions': self._stats['evictions'],
                'max_cache_size': self.max_cache_size,
                'ttl_seconds': self.ttl_seconds
            }

    def reset_stats(self) -> None:
        """통계 초기화"""
        with self._lock:
            self._stats = {
                'extraction_hits': 0,
                'extraction_misses': 0,
                'match_hits': 0,
                'match_misses': 0,
                'evictions': 0
            }

    def cleanup_expired_entries(self) -> int:
        """만료된 캐시 엔트리 정리"""
        current_time = time.time()
        cleanup_count = 0
        
        with self._lock:
            # 추출 캐시 정리
            expired_extraction_keys = [
                key for key, (_, timestamp) in self._extraction_cache.items()
                if current_time - timestamp > self.ttl_seconds
            ]
            
            for key in expired_extraction_keys:
                del self._extraction_cache[key]
                del self._extraction_access_order[key]
                cleanup_count += 1
            
            # 매치 캐시 정리
            expired_match_keys = [
                key for key, (_, timestamp) in self._match_cache.items()
                if current_time - timestamp > self.ttl_seconds
            ]
            
            for key in expired_match_keys:
                del self._match_cache[key]
                del self._match_access_order[key]
                cleanup_count += 1
        
        if cleanup_count > 0:
            logger.info(f"Cleaned up {cleanup_count} expired cache entries")
        
        return cleanup_count