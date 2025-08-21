"""
File Validator Service - Security and validation for file operations

This service provides comprehensive validation for file system operations,
including path security, filename sanitization, and permission checks.
"""

import os
import re
import string
from pathlib import Path
from typing import Dict, Any, List, Set
import logging

from app.domain.file.interfaces import FileValidatorInterface

logger = logging.getLogger(__name__)


class FileValidatorService(FileValidatorInterface):
    """
    Provides comprehensive file system validation and security checks
    
    Handles:
    - Path security validation (directory traversal prevention)
    - Filename sanitization for safe file system operations
    - File permission checking
    - Security scoring based on multiple factors
    """

    def __init__(self, allowed_base_paths: List[str] = None):
        """
        Initialize file validator with security configuration
        
        Args:
            allowed_base_paths: List of allowed base paths for file operations
        """
        self._allowed_base_paths = allowed_base_paths or []
        
        # Security patterns for validation
        self._dangerous_patterns = [
            r'\.\.[\\/]',  # Directory traversal
            r'[\\/]\.\.[\\/]',  # Directory traversal in middle
            r'^\.\.[\\/]',  # Directory traversal at start
            r'[\\/]\.',  # Hidden file patterns
            r'[<>:"|?*]',  # Invalid filename characters (Windows)
            r'[\x00-\x1f]',  # Control characters
            r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)',  # Windows reserved names
        ]
        
        # Safe filename characters
        self._safe_chars = set(string.ascii_letters + string.digits + '-_. ')
        
        # System directories to avoid
        self._system_directories = {
            '/etc', '/bin', '/sbin', '/usr/bin', '/usr/sbin',
            '/boot', '/dev', '/proc', '/sys', '/var/log',
            'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
            'C:\\System Volume Information'
        }
        
        logger.info(f"FileValidatorService initialized with {len(self._allowed_base_paths)} allowed base paths")

    def validate_file_path(self, file_path: str) -> Dict[str, Any]:
        """
        Comprehensive file path validation with security assessment
        """
        try:
            normalized_path = os.path.normpath(file_path)
            absolute_path = os.path.abspath(normalized_path)
            path_obj = Path(absolute_path)
            
            # Initialize validation result
            result = {
                'is_secure': True,
                'message': 'Path validation successful',
                'security_score': 1.0,
                'warnings': [],
                'normalized_path': normalized_path,
                'absolute_path': absolute_path
            }
            
            # Check for dangerous patterns
            security_issues = self._check_security_patterns(file_path, normalized_path)
            if security_issues:
                result['is_secure'] = False
                result['message'] = f"Security validation failed: {'; '.join(security_issues)}"
                result['security_score'] = 0.0
                result['warnings'].extend(security_issues)
                return result
            
            # Check allowed base paths
            if self._allowed_base_paths:
                if not self._is_within_allowed_paths(absolute_path):
                    result['is_secure'] = False
                    result['message'] = 'Path is outside allowed directories'
                    result['security_score'] = 0.0
                    result['warnings'].append('Path outside allowed directories')
                    return result
            
            # Check for system directories
            if self._is_system_directory(absolute_path):
                result['is_secure'] = False
                result['message'] = 'Access to system directories is not allowed'
                result['security_score'] = 0.2
                result['warnings'].append('System directory access attempted')
                return result
            
            # Calculate security score based on various factors
            security_score = self._calculate_security_score(file_path, path_obj)
            result['security_score'] = security_score
            
            # Add warnings for lower security scores
            if security_score < 0.8:
                result['warnings'].append('Path has moderate security concerns')
            if security_score < 0.5:
                result['warnings'].append('Path has significant security concerns')
            
            return result
            
        except Exception as e:
            logger.error(f"Path validation error for {file_path}: {str(e)}")
            return {
                'is_secure': False,
                'message': f'Validation error: {str(e)}',
                'security_score': 0.0,
                'warnings': ['Validation process failed'],
                'normalized_path': file_path,
                'absolute_path': file_path
            }

    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to ensure it's safe for file system operations
        """
        if not filename:
            return 'unnamed_file'
        
        # Remove or replace dangerous characters
        sanitized = ''.join(char if char in self._safe_chars else '_' for char in filename)
        
        # Handle reserved names (Windows)
        reserved_pattern = r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)'
        if re.match(reserved_pattern, sanitized, re.IGNORECASE):
            sanitized = f"safe_{sanitized}"
        
        # Ensure reasonable length
        if len(sanitized) > 255:
            name, ext = os.path.splitext(sanitized)
            sanitized = name[:250] + ext
        
        # Ensure it's not empty after sanitization
        if not sanitized or sanitized.isspace():
            sanitized = 'sanitized_filename'
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        return sanitized

    def check_file_permissions(self, file_path: str) -> Dict[str, bool]:
        """
        Check file system permissions for a given path
        """
        try:
            path_obj = Path(file_path)
            
            permissions = {
                'exists': path_obj.exists(),
                'is_file': False,
                'is_directory': False,
                'readable': False,
                'writable': False,
                'executable': False
            }
            
            if path_obj.exists():
                permissions['is_file'] = path_obj.is_file()
                permissions['is_directory'] = path_obj.is_dir()
                
                # Check permissions
                try:
                    permissions['readable'] = os.access(file_path, os.R_OK)
                    permissions['writable'] = os.access(file_path, os.W_OK)
                    permissions['executable'] = os.access(file_path, os.X_OK)
                except Exception as e:
                    logger.warning(f"Permission check failed for {file_path}: {str(e)}")
            
            return permissions
            
        except Exception as e:
            logger.error(f"Failed to check permissions for {file_path}: {str(e)}")
            return {
                'exists': False,
                'is_file': False,
                'is_directory': False,
                'readable': False,
                'writable': False,
                'executable': False,
                'error': str(e)
            }

    def _check_security_patterns(self, original_path: str, normalized_path: str) -> List[str]:
        """
        Check for dangerous patterns in file paths
        """
        issues = []
        
        for pattern in self._dangerous_patterns:
            if re.search(pattern, original_path) or re.search(pattern, normalized_path):
                issues.append(f"Dangerous pattern detected: {pattern}")
        
        return issues

    def _is_within_allowed_paths(self, absolute_path: str) -> bool:
        """
        Check if path is within allowed base paths
        """
        if not self._allowed_base_paths:
            return True
        
        for allowed_path in self._allowed_base_paths:
            allowed_absolute = os.path.abspath(allowed_path)
            try:
                # Check if path is under allowed directory
                Path(absolute_path).relative_to(Path(allowed_absolute))
                return True
            except ValueError:
                continue
        
        return False

    def _is_system_directory(self, absolute_path: str) -> bool:
        """
        Check if path is a system directory that should be avoided
        """
        for system_dir in self._system_directories:
            if absolute_path.startswith(system_dir):
                return True
        return False

    def _calculate_security_score(self, file_path: str, path_obj: Path) -> float:
        """
        Calculate security score based on multiple factors
        
        Score factors:
        - Path depth (deeper paths = lower score)
        - Special characters in path
        - Hidden files/directories
        - File extension safety
        """
        score = 1.0
        
        # Path depth factor (max reasonable depth: 10)
        try:
            depth = len(path_obj.parts)
            if depth > 10:
                score -= 0.1
            elif depth > 15:
                score -= 0.2
        except Exception:
            pass
        
        # Special characters factor
        special_char_count = sum(1 for char in file_path if char not in self._safe_chars and char not in '/\\')
        if special_char_count > 0:
            score -= min(0.3, special_char_count * 0.05)
        
        # Hidden files factor
        if any(part.startswith('.') for part in path_obj.parts):
            score -= 0.1
        
        # Path length factor
        if len(file_path) > 500:
            score -= 0.1
        
        # Ensure score is within bounds
        return max(0.0, min(1.0, score))