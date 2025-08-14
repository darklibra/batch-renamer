import re
import time
import hashlib
from typing import Dict, Optional, Tuple, Any
from collections import OrderedDict
from datetime import datetime, timedelta
import threading
import logging

logger = logging.getLogger(__name__)


class PatternCacheStats:
    """Statistics for pattern cache performance"""
    
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.compilation_time_saved = 0.0  # in milliseconds
        self.start_time = datetime.utcnow()
    
    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0
    
    @property
    def total_requests(self) -> int:
        """Total cache requests"""
        return self.hits + self.misses
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert stats to dictionary"""
        uptime = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            'hits': self.hits,
            'misses': self.misses,
            'evictions': self.evictions,
            'hit_rate_percent': round(self.hit_rate, 2),
            'total_requests': self.total_requests,
            'compilation_time_saved_ms': round(self.compilation_time_saved, 2),
            'uptime_seconds': round(uptime, 2),
            'requests_per_second': round(self.total_requests / uptime, 2) if uptime > 0 else 0.0
        }


class CompiledPattern:
    """Wrapper for compiled regex pattern with metadata"""
    
    def __init__(self, pattern: re.Pattern, pattern_id: int, regex_text: str):
        self.pattern = pattern
        self.pattern_id = pattern_id
        self.regex_text = regex_text
        self.created_at = datetime.utcnow()
        self.last_used = datetime.utcnow()
        self.usage_count = 0
        self.compilation_time_ms = 0.0
    
    def use(self) -> re.Pattern:
        """Mark pattern as used and return compiled regex"""
        self.last_used = datetime.utcnow()
        self.usage_count += 1
        return self.pattern
    
    @property
    def age_seconds(self) -> float:
        """Age of the cached pattern in seconds"""
        return (datetime.utcnow() - self.created_at).total_seconds()
    
    @property
    def idle_seconds(self) -> float:
        """Time since last use in seconds"""
        return (datetime.utcnow() - self.last_used).total_seconds()


class PatternCache:
    """High-performance compiled regex pattern caching system with LRU eviction"""
    
    def __init__(self, max_size: int = 1000, max_age_minutes: int = 60):
        self._cache: OrderedDict[str, CompiledPattern] = OrderedDict()
        self._max_size = max_size
        self._max_age = timedelta(minutes=max_age_minutes)
        self._stats = PatternCacheStats()
        self._lock = threading.RLock()
        
        # Performance tracking
        self._compile_times: Dict[str, float] = {}
        
        logger.info(f"Pattern cache initialized: max_size={max_size}, max_age={max_age_minutes}min")
    
    def get_compiled_pattern(self, pattern_id: int, regex_text: str) -> re.Pattern:
        """
        Get compiled regex pattern with caching
        
        Args:
            pattern_id: Unique pattern identifier
            regex_text: Regular expression string
            
        Returns:
            Compiled regex pattern
            
        Raises:
            re.error: If regex compilation fails
        """
        cache_key = self._generate_cache_key(pattern_id, regex_text)
        
        with self._lock:
            # Check cache hit
            if cache_key in self._cache:
                cached_pattern = self._cache[cache_key]
                
                # Check if pattern is still fresh
                if cached_pattern.age_seconds < self._max_age.total_seconds():
                    # Move to end (LRU)
                    self._cache.move_to_end(cache_key)
                    
                    # Update stats
                    self._stats.hits += 1
                    if cache_key in self._compile_times:
                        self._stats.compilation_time_saved += self._compile_times[cache_key]
                    
                    logger.debug(f"Cache hit for pattern {pattern_id}: {cache_key[:16]}...")
                    return cached_pattern.use()
                else:
                    # Pattern expired, remove it
                    del self._cache[cache_key]
                    if cache_key in self._compile_times:
                        del self._compile_times[cache_key]
                    logger.debug(f"Pattern expired and removed: {pattern_id}")
        
        # Cache miss - compile pattern
        start_time = time.perf_counter()
        
        try:
            compiled_pattern = re.compile(regex_text)
            compilation_time_ms = (time.perf_counter() - start_time) * 1000
            
            logger.debug(f"Pattern compiled in {compilation_time_ms:.2f}ms: {pattern_id}")
            
        except re.error as e:
            logger.error(f"Regex compilation failed for pattern {pattern_id}: {str(e)}")
            raise re.error(f"Invalid regex pattern: {str(e)}")
        
        # Store in cache
        with self._lock:
            # Evict old entries if cache is full
            while len(self._cache) >= self._max_size:
                self._evict_least_recently_used()
            
            # Create cached pattern wrapper
            cached_pattern = CompiledPattern(compiled_pattern, pattern_id, regex_text)
            cached_pattern.compilation_time_ms = compilation_time_ms
            
            # Store in cache
            self._cache[cache_key] = cached_pattern
            self._compile_times[cache_key] = compilation_time_ms
            
            # Update stats
            self._stats.misses += 1
            
            logger.debug(f"Pattern cached: {pattern_id}, cache size: {len(self._cache)}")
        
        return cached_pattern.use()
    
    def _generate_cache_key(self, pattern_id: int, regex_text: str) -> str:
        """Generate unique cache key for pattern"""
        # Use pattern ID and regex hash for efficient lookup
        regex_hash = hashlib.md5(regex_text.encode('utf-8')).hexdigest()[:16]
        return f"{pattern_id}:{regex_hash}"
    
    def _evict_least_recently_used(self):
        """Evict the least recently used pattern from cache"""
        if not self._cache:
            return
        
        # Remove oldest item (first in OrderedDict)
        cache_key, evicted_pattern = self._cache.popitem(last=False)
        
        # Clean up compile times
        if cache_key in self._compile_times:
            del self._compile_times[cache_key]
        
        # Update stats
        self._stats.evictions += 1
        
        logger.debug(
            f"Evicted pattern {evicted_pattern.pattern_id} "
            f"(age: {evicted_pattern.age_seconds:.1f}s, "
            f"uses: {evicted_pattern.usage_count})"
        )
    
    def cleanup_expired_patterns(self):
        """Remove expired patterns from cache"""
        current_time = datetime.utcnow()
        expired_keys = []
        
        with self._lock:
            for cache_key, cached_pattern in self._cache.items():
                if (current_time - cached_pattern.created_at) > self._max_age:
                    expired_keys.append(cache_key)
        
        # Remove expired patterns
        for cache_key in expired_keys:
            with self._lock:
                if cache_key in self._cache:
                    evicted_pattern = self._cache.pop(cache_key)
                    if cache_key in self._compile_times:
                        del self._compile_times[cache_key]
                    
                    logger.debug(f"Expired pattern removed: {evicted_pattern.pattern_id}")
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired patterns")
    
    def invalidate_pattern(self, pattern_id: int):
        """Remove all cached entries for a specific pattern ID"""
        keys_to_remove = []
        
        with self._lock:
            for cache_key, cached_pattern in self._cache.items():
                if cached_pattern.pattern_id == pattern_id:
                    keys_to_remove.append(cache_key)
        
        # Remove matching patterns
        for cache_key in keys_to_remove:
            with self._lock:
                if cache_key in self._cache:
                    self._cache.pop(cache_key)
                if cache_key in self._compile_times:
                    del self._compile_times[cache_key]
        
        if keys_to_remove:
            logger.info(f"Invalidated {len(keys_to_remove)} cached patterns for pattern {pattern_id}")
    
    def clear_cache(self):
        """Clear all cached patterns"""
        with self._lock:
            cache_size = len(self._cache)
            self._cache.clear()
            self._compile_times.clear()
            
            logger.info(f"Cache cleared: {cache_size} patterns removed")
    
    def get_cache_info(self) -> Dict[str, Any]:
        """Get comprehensive cache information"""
        with self._lock:
            current_patterns = []
            
            for cache_key, cached_pattern in self._cache.items():
                current_patterns.append({
                    'pattern_id': cached_pattern.pattern_id,
                    'cache_key': cache_key[:20] + '...' if len(cache_key) > 20 else cache_key,
                    'usage_count': cached_pattern.usage_count,
                    'age_seconds': round(cached_pattern.age_seconds, 2),
                    'idle_seconds': round(cached_pattern.idle_seconds, 2),
                    'compilation_time_ms': round(cached_pattern.compilation_time_ms, 2)
                })
            
            return {
                'stats': self._stats.to_dict(),
                'cache_config': {
                    'max_size': self._max_size,
                    'max_age_minutes': self._max_age.total_seconds() / 60,
                    'current_size': len(self._cache),
                    'memory_usage_estimate_kb': len(self._cache) * 2  # Rough estimate
                },
                'patterns': sorted(current_patterns, key=lambda x: x['usage_count'], reverse=True)[:10]  # Top 10 by usage
            }
    
    def get_pattern_stats(self, pattern_id: int) -> Optional[Dict[str, Any]]:
        """Get statistics for a specific pattern"""
        with self._lock:
            matching_patterns = [
                cp for cp in self._cache.values() 
                if cp.pattern_id == pattern_id
            ]
            
            if not matching_patterns:
                return None
            
            # Aggregate stats for this pattern ID
            total_uses = sum(cp.usage_count for cp in matching_patterns)
            avg_compilation_time = sum(cp.compilation_time_ms for cp in matching_patterns) / len(matching_patterns)
            
            return {
                'pattern_id': pattern_id,
                'cached_variants': len(matching_patterns),
                'total_usage_count': total_uses,
                'average_compilation_time_ms': round(avg_compilation_time, 2),
                'oldest_cache_age_seconds': round(max(cp.age_seconds for cp in matching_patterns), 2),
                'most_recent_use_seconds_ago': round(min(cp.idle_seconds for cp in matching_patterns), 2)
            }


# Global cache instance
_global_pattern_cache: Optional[PatternCache] = None


def get_pattern_cache() -> PatternCache:
    """Get or create global pattern cache instance"""
    global _global_pattern_cache
    
    if _global_pattern_cache is None:
        _global_pattern_cache = PatternCache(max_size=1000, max_age_minutes=60)
    
    return _global_pattern_cache


def reset_pattern_cache():
    """Reset global pattern cache (mainly for testing)"""
    global _global_pattern_cache
    _global_pattern_cache = None