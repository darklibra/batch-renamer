import re
import time
import signal
import threading
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of security validation"""
    is_valid: bool
    message: str
    risk_score: float = 0.0  # 0.0 = safe, 1.0 = high risk
    details: Optional[Dict[str, Any]] = None


@dataclass
class SecurityResult:
    """Result of path security validation"""
    is_secure: bool
    message: str
    risk_level: str = "low"  # low, medium, high, critical
    details: Optional[Dict[str, Any]] = None


class TimeoutException(Exception):
    """Exception raised when pattern execution times out"""
    pass


class PatternSecurityValidator:
    """
    Comprehensive security validator for regex patterns to prevent ReDoS attacks
    and other security issues
    """
    
    # Maximum allowed pattern length
    MAX_PATTERN_LENGTH = 500
    
    # Timeout for pattern testing (in seconds)
    PATTERN_TEST_TIMEOUT = 5.0
    
    # Dangerous regex constructs that can cause ReDoS
    DANGEROUS_CONSTRUCTS = [
        # Nested quantifiers
        (r'\*\+', 'Nested quantifiers (*+) can cause exponential backtracking'),
        (r'\+\*', 'Nested quantifiers (+*) can cause exponential backtracking'),
        (r'\*\*', 'Nested quantifiers (**) can cause exponential backtracking'),
        (r'\+\+', 'Nested quantifiers (++) can cause exponential backtracking'),
        
        # Open-ended quantifiers
        (r'\{[0-9]+,\}', 'Open-ended quantifiers {n,} can be dangerous with large inputs'),
        (r'\{,[0-9]+\}', 'Reverse range quantifiers {,n} are potentially dangerous'),
        
        # Catastrophic backtracking patterns
        (r'\(.*\)\*.*\(.*\)\*', 'Multiple alternations with quantifiers can cause backtracking'),
        (r'\(.*\|.*\)\*', 'Alternation with quantifiers can cause exponential time'),
        
        # Nested groups with quantifiers
        (r'\(\(.*\).*\)\+', 'Nested groups with quantifiers can cause performance issues'),
        (r'\(\(.*\)\*.*\)\*', 'Double nested quantified groups are dangerous'),
        
        # Complex lookarounds
        (r'\(\?\=.*\(\?\=.*\)', 'Nested positive lookaheads can be expensive'),
        (r'\(\?\!.*\(\?\!.*\)', 'Nested negative lookaheads can be expensive'),
        
        # Very broad character classes
        (r'\.{10,}', 'Long sequences of . (dot) can be inefficient'),
        (r'\.\*\.\*\.\*', 'Multiple .* patterns can cause exponential backtracking'),
        
        # Comments that might hide complexity
        (r'\(\?\#.*\)', 'Comments in regex can hide dangerous constructs'),
        
        # Recursive patterns (not supported in Python but can cause errors)
        (r'\(\?\?.*\)', 'Non-standard regex extensions can cause errors'),
        (r'\(\?\&.*\)', 'Subroutine calls are not supported in Python'),
    ]
    
    # Test strings to validate pattern performance
    TEST_STRINGS = [
        # Simple cases
        'test.txt',
        'document.pdf',
        'image_001.jpg',
        'data_2023_01_15.csv',
        
        # Complex cases that might trigger ReDoS
        'a' * 1000 + 'b',  # Long string
        'x' * 100,          # Repetitive string
        '(' * 50 + ')' * 50,  # Nested structures
        'abc' * 200,        # Repetitive pattern
        '1234567890' * 50,  # Long numeric string
        
        # Edge cases
        '',                 # Empty string
        ' ' * 100,          # Whitespace only
        '\n' * 50,          # Newlines
        '...' * 100,        # Special characters
        'файл.txt',         # Unicode
        'file with spaces and special chars!@#$%.txt',
    ]
    
    def __init__(self):
        self.validation_cache: Dict[str, ValidationResult] = {}
        self._lock = threading.Lock()
    
    def validate_pattern_security(self, pattern: str, pattern_id: Optional[int] = None) -> ValidationResult:
        """
        Comprehensive security validation of regex pattern
        
        Args:
            pattern: Regular expression pattern to validate
            pattern_id: Optional pattern ID for logging
            
        Returns:
            ValidationResult with security assessment
        """
        # Check cache first
        cache_key = f"{pattern_id or 'unknown'}:{hash(pattern)}"
        with self._lock:
            if cache_key in self.validation_cache:
                logger.debug(f"Using cached validation result for pattern {pattern_id}")
                return self.validation_cache[cache_key]
        
        logger.info(f"Validating pattern security: {pattern_id or 'unknown'}")
        
        # Basic validation
        if not pattern:
            result = ValidationResult(False, "Pattern cannot be empty", 1.0)
            self._cache_result(cache_key, result)
            return result
        
        # Length check
        if len(pattern) > self.MAX_PATTERN_LENGTH:
            result = ValidationResult(
                False, 
                f"Pattern too long: {len(pattern)} > {self.MAX_PATTERN_LENGTH} characters",
                0.9,
                {'actual_length': len(pattern), 'max_length': self.MAX_PATTERN_LENGTH}
            )
            self._cache_result(cache_key, result)
            return result
        
        # Check for dangerous constructs
        dangerous_result = self._check_dangerous_constructs(pattern)
        if not dangerous_result.is_valid:
            self._cache_result(cache_key, dangerous_result)
            return dangerous_result
        
        # Calculate complexity score
        complexity_score = self._calculate_complexity_score(pattern)
        if complexity_score > 0.8:
            result = ValidationResult(
                False,
                f"Pattern too complex (score: {complexity_score:.2f}), ReDoS risk",
                complexity_score,
                {'complexity_score': complexity_score, 'max_allowed': 0.8}
            )
            self._cache_result(cache_key, result)
            return result
        
        # Test compilation
        try:
            compiled_pattern = re.compile(pattern)
        except re.error as e:
            result = ValidationResult(
                False,
                f"Invalid regex syntax: {str(e)}",
                0.5,
                {'regex_error': str(e)}
            )
            self._cache_result(cache_key, result)
            return result
        
        # Performance testing
        performance_result = self._test_pattern_performance(compiled_pattern, pattern)
        if not performance_result.is_valid:
            self._cache_result(cache_key, performance_result)
            return performance_result
        
        # All checks passed
        result = ValidationResult(
            True,
            "Pattern is secure",
            complexity_score,
            {
                'complexity_score': complexity_score,
                'performance_test_passed': True,
                'dangerous_constructs_found': 0
            }
        )
        
        self._cache_result(cache_key, result)
        logger.info(f"Pattern {pattern_id or 'unknown'} validated successfully (complexity: {complexity_score:.2f})")
        
        return result
    
    def _check_dangerous_constructs(self, pattern: str) -> ValidationResult:
        """Check for known dangerous regex constructs"""
        found_constructs = []
        max_risk_score = 0.0
        
        for construct_pattern, description in self.DANGEROUS_CONSTRUCTS:
            if re.search(construct_pattern, pattern):
                found_constructs.append({
                    'construct': construct_pattern,
                    'description': description,
                    'risk_score': 0.9
                })
                max_risk_score = max(max_risk_score, 0.9)
        
        if found_constructs:
            return ValidationResult(
                False,
                f"Found {len(found_constructs)} dangerous construct(s)",
                max_risk_score,
                {'dangerous_constructs': found_constructs}
            )
        
        return ValidationResult(True, "No dangerous constructs found", 0.0)
    
    def _calculate_complexity_score(self, pattern: str) -> float:
        """
        Calculate pattern complexity score (0.0-1.0)
        Higher scores indicate higher risk of ReDoS
        """
        factors = {
            # Length factor (20% weight)
            'length': min(len(pattern) / self.MAX_PATTERN_LENGTH, 1.0) * 0.2,
            
            # Quantifier count (15% weight each)
            'star_quantifiers': min(pattern.count('*') * 0.05, 0.15),
            'plus_quantifiers': min(pattern.count('+') * 0.05, 0.15),
            'question_quantifiers': min(pattern.count('?') * 0.03, 0.1),
            
            # Alternation (15% weight)
            'alternation': min(pattern.count('|') * 0.05, 0.15),
            
            # Groups (10% weight)
            'groups': min(pattern.count('(') * 0.02, 0.1),
            
            # Backreferences (20% weight - very dangerous)
            'backreferences': min(len(re.findall(r'\\[1-9]', pattern)) * 0.1, 0.2),
            
            # Lookarounds (25% weight - can be expensive)
            'positive_lookahead': min(len(re.findall(r'\(\?\=', pattern)) * 0.1, 0.15),
            'negative_lookahead': min(len(re.findall(r'\(\?\!', pattern)) * 0.1, 0.1),
            'positive_lookbehind': min(len(re.findall(r'\(\?\<\=', pattern)) * 0.1, 0.15),
            'negative_lookbehind': min(len(re.findall(r'\(\?\<\!', pattern)) * 0.1, 0.1),
            
            # Dot-star patterns (high risk)
            'dot_star': min(pattern.count('.*') * 0.1, 0.2),
            
            # Character classes
            'char_classes': min(pattern.count('[') * 0.02, 0.08),
        }
        
        total_score = sum(factors.values())
        
        # Apply penalties for specific dangerous combinations
        if '.*' in pattern and ('*' in pattern or '+' in pattern):
            total_score += 0.1  # Mixed quantifiers with dot-star
        
        if pattern.count('(') > 5 and ('*' in pattern or '+' in pattern):
            total_score += 0.1  # Many groups with quantifiers
        
        return min(total_score, 1.0)
    
    def _test_pattern_performance(self, compiled_pattern: re.Pattern, pattern_text: str) -> ValidationResult:
        """
        Test pattern performance against various inputs to detect ReDoS
        """
        max_test_time = 0.0
        failed_tests = []
        
        for test_string in self.TEST_STRINGS:
            try:
                # Test with timeout
                start_time = time.perf_counter()
                result = self._test_with_timeout(compiled_pattern, test_string)
                execution_time = (time.perf_counter() - start_time) * 1000  # ms
                
                max_test_time = max(max_test_time, execution_time)
                
                # If any test takes longer than 100ms, it's suspicious
                if execution_time > 100:
                    failed_tests.append({
                        'test_string': test_string[:50] + '...' if len(test_string) > 50 else test_string,
                        'execution_time_ms': round(execution_time, 2),
                        'result': 'timeout' if result is None else 'slow'
                    })
                
            except TimeoutException:
                failed_tests.append({
                    'test_string': test_string[:50] + '...' if len(test_string) > 50 else test_string,
                    'execution_time_ms': self.PATTERN_TEST_TIMEOUT * 1000,
                    'result': 'timeout'
                })
                max_test_time = self.PATTERN_TEST_TIMEOUT * 1000
            except Exception as e:
                # Other errors during testing
                logger.warning(f"Pattern test error: {str(e)}")
                continue
        
        # Determine if pattern is safe based on test results
        if failed_tests:
            risk_score = min(len(failed_tests) / len(self.TEST_STRINGS) + 0.5, 1.0)
            return ValidationResult(
                False,
                f"Pattern failed {len(failed_tests)} performance tests",
                risk_score,
                {
                    'failed_tests': failed_tests,
                    'max_execution_time_ms': round(max_test_time, 2),
                    'total_tests': len(self.TEST_STRINGS)
                }
            )
        
        return ValidationResult(
            True,
            "Pattern performance tests passed",
            0.0,
            {'max_execution_time_ms': round(max_test_time, 2)}
        )
    
    def _test_with_timeout(self, pattern: re.Pattern, test_string: str) -> Optional[bool]:
        """Test pattern with timeout to prevent hanging"""
        result = [None]  # Use list to allow modification in nested function
        exception = [None]
        
        def test_function():
            try:
                result[0] = bool(pattern.search(test_string))
            except Exception as e:
                exception[0] = e
        
        thread = threading.Thread(target=test_function, daemon=True)
        thread.start()
        thread.join(timeout=self.PATTERN_TEST_TIMEOUT)
        
        if thread.is_alive():
            # Thread is still running - timeout occurred
            raise TimeoutException(f"Pattern test timed out after {self.PATTERN_TEST_TIMEOUT}s")
        
        if exception[0]:
            raise exception[0]
        
        return result[0]
    
    def _cache_result(self, cache_key: str, result: ValidationResult):
        """Cache validation result"""
        with self._lock:
            # Limit cache size
            if len(self.validation_cache) > 1000:
                # Remove oldest entries (simple FIFO)
                oldest_keys = list(self.validation_cache.keys())[:100]
                for key in oldest_keys:
                    del self.validation_cache[key]
            
            self.validation_cache[cache_key] = result
    
    def clear_cache(self):
        """Clear validation cache"""
        with self._lock:
            self.validation_cache.clear()
            logger.info("Pattern security validation cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            return {
                'cache_size': len(self.validation_cache),
                'cache_hit_potential': len(self.validation_cache) > 0
            }


class PathSecurityManager:
    """Enhanced security manager for file system path validation"""
    
    # Default allowed base paths (can be configured)
    DEFAULT_ALLOWED_PATHS = [
        "/home", "/Users", "/opt/data", "/tmp", "/var/tmp"
    ]
    
    # System paths that should never be accessible
    SYSTEM_BLOCKED_PATHS = [
        "/etc", "/sys", "/proc", "/dev", "/root",
        "/bin", "/sbin", "/usr/bin", "/usr/sbin",
        "/boot", "/var/log", "/var/run"
    ]
    
    # Sensitive file patterns
    SENSITIVE_PATTERNS = [
        r'.*\.key$',           # Private keys
        r'.*\.pem$',           # Certificates
        r'.*\.p12$',           # PKCS12 files
        r'.*passwd.*',         # Password files
        r'.*shadow.*',         # Shadow files
        r'.*\.env$',           # Environment files
        r'.*config.*\.ini$',   # Config files
        r'.*\.secret$',        # Secret files
    ]
    
    def __init__(self, allowed_paths: Optional[List[str]] = None):
        self.allowed_paths = allowed_paths or self.DEFAULT_ALLOWED_PATHS
        self.blocked_paths = self.SYSTEM_BLOCKED_PATHS.copy()
        
        # Compile sensitive patterns for efficiency
        self.compiled_sensitive_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in self.SENSITIVE_PATTERNS
        ]
        
        logger.info(f"Path security manager initialized with {len(self.allowed_paths)} allowed paths")
    
    def validate_scan_path(self, path: str, check_permissions: bool = True) -> SecurityResult:
        """
        Comprehensive path security validation
        
        Args:
            path: Directory path to validate
            check_permissions: Whether to check file system permissions
            
        Returns:
            SecurityResult with security assessment
        """
        try:
            # Basic path validation
            if not path or not isinstance(path, str):
                return SecurityResult(
                    False,
                    "Invalid path: path must be a non-empty string",
                    "high"
                )
            
            # Resolve path to prevent traversal attacks
            try:
                resolved_path = Path(path).resolve()
            except (OSError, ValueError) as e:
                return SecurityResult(
                    False,
                    f"Path resolution failed: {str(e)}",
                    "high",
                    {'error': str(e)}
                )
            
            # Existence check
            if not resolved_path.exists():
                return SecurityResult(
                    False,
                    "Path does not exist",
                    "medium",
                    {'resolved_path': str(resolved_path)}
                )
            
            # Directory check
            if not resolved_path.is_dir():
                return SecurityResult(
                    False,
                    "Path is not a directory",
                    "medium",
                    {'resolved_path': str(resolved_path)}
                )
            
            # Check against blocked paths
            path_str = str(resolved_path)
            for blocked in self.blocked_paths:
                if path_str.startswith(blocked):
                    return SecurityResult(
                        False,
                        f"Access blocked: path starts with {blocked}",
                        "critical",
                        {
                            'resolved_path': path_str,
                            'blocked_path': blocked
                        }
                    )
            
            # Check against allowed paths
            allowed = False
            for allowed_path in self.allowed_paths:
                try:
                    resolved_allowed = Path(allowed_path).resolve()
                    if path_str.startswith(str(resolved_allowed)):
                        allowed = True
                        break
                except (OSError, ValueError):
                    # Skip invalid allowed paths
                    continue
            
            if not allowed:
                return SecurityResult(
                    False,
                    "Path not in allowed directories",
                    "high",
                    {
                        'resolved_path': path_str,
                        'allowed_paths': self.allowed_paths
                    }
                )
            
            # Permission checks
            if check_permissions:
                permission_result = self._check_permissions(resolved_path)
                if not permission_result.is_secure:
                    return permission_result
            
            # Check for sensitive content
            sensitivity_result = self._check_path_sensitivity(resolved_path)
            
            # All checks passed
            return SecurityResult(
                True,
                "Path is secure",
                sensitivity_result.risk_level,
                {
                    'resolved_path': path_str,
                    'sensitivity_check': sensitivity_result.details
                }
            )
            
        except Exception as e:
            logger.error(f"Unexpected error in path validation: {str(e)}")
            return SecurityResult(
                False,
                f"Path validation error: {str(e)}",
                "high",
                {'exception': str(e)}
            )
    
    def _check_permissions(self, path: Path) -> SecurityResult:
        """Check file system permissions"""
        try:
            # Read permission check
            if not os.access(path, os.R_OK):
                return SecurityResult(
                    False,
                    "Insufficient read permissions",
                    "medium",
                    {'path': str(path)}
                )
            
            # Check if we can list directory contents
            try:
                list(path.iterdir())
            except PermissionError:
                return SecurityResult(
                    False,
                    "Cannot list directory contents",
                    "medium",
                    {'path': str(path)}
                )
            
            return SecurityResult(True, "Permissions OK", "low")
            
        except Exception as e:
            return SecurityResult(
                False,
                f"Permission check failed: {str(e)}",
                "medium",
                {'error': str(e)}
            )
    
    def _check_path_sensitivity(self, path: Path) -> SecurityResult:
        """Check if path contains sensitive files"""
        sensitive_files = []
        risk_level = "low"
        
        try:
            # Quick scan for sensitive files (limit to avoid performance issues)
            file_count = 0
            for file_path in path.rglob("*"):
                if file_count > 1000:  # Limit scan scope
                    break
                
                if file_path.is_file():
                    filename = file_path.name
                    
                    # Check against sensitive patterns
                    for pattern in self.compiled_sensitive_patterns:
                        if pattern.search(filename):
                            sensitive_files.append({
                                'file': filename,
                                'path': str(file_path.relative_to(path)),
                                'pattern': pattern.pattern
                            })
                            
                            # Increase risk level based on sensitive file count
                            if len(sensitive_files) > 10:
                                risk_level = "high"
                            elif len(sensitive_files) > 3:
                                risk_level = "medium"
                            
                            break  # Don't need multiple pattern matches per file
                
                file_count += 1
            
            if sensitive_files:
                message = f"Found {len(sensitive_files)} potentially sensitive files"
                if risk_level == "high":
                    message += " (high risk - consider excluding sensitive directories)"
            else:
                message = "No sensitive files detected"
            
            return SecurityResult(
                True,  # Not blocking, just informational
                message,
                risk_level,
                {
                    'sensitive_files_count': len(sensitive_files),
                    'sensitive_files': sensitive_files[:5],  # Limit details
                    'scanned_files': file_count
                }
            )
            
        except Exception as e:
            # Don't fail validation for sensitivity check errors
            logger.warning(f"Sensitivity check error: {str(e)}")
            return SecurityResult(
                True,
                "Sensitivity check skipped due to error",
                "low",
                {'error': str(e)}
            )
    
    def add_allowed_path(self, path: str):
        """Add a path to allowed paths list"""
        if path not in self.allowed_paths:
            self.allowed_paths.append(path)
            logger.info(f"Added allowed path: {path}")
    
    def remove_allowed_path(self, path: str):
        """Remove a path from allowed paths list"""
        if path in self.allowed_paths:
            self.allowed_paths.remove(path)
            logger.info(f"Removed allowed path: {path}")
    
    def add_blocked_path(self, path: str):
        """Add a path to blocked paths list"""
        if path not in self.blocked_paths:
            self.blocked_paths.append(path)
            logger.info(f"Added blocked path: {path}")
    
    def get_configuration(self) -> Dict[str, Any]:
        """Get current security configuration"""
        return {
            'allowed_paths': self.allowed_paths.copy(),
            'blocked_paths': self.blocked_paths.copy(),
            'sensitive_patterns': self.SENSITIVE_PATTERNS.copy()
        }


# Global instances
_global_pattern_validator: Optional[PatternSecurityValidator] = None
_global_path_manager: Optional[PathSecurityManager] = None


def get_pattern_validator() -> PatternSecurityValidator:
    """Get or create global pattern security validator"""
    global _global_pattern_validator
    if _global_pattern_validator is None:
        _global_pattern_validator = PatternSecurityValidator()
    return _global_pattern_validator


def get_path_security_manager() -> PathSecurityManager:
    """Get or create global path security manager"""
    global _global_path_manager
    if _global_path_manager is None:
        _global_path_manager = PathSecurityManager()
    return _global_path_manager