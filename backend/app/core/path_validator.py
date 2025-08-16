import os
import re
from pathlib import Path
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class PathValidator:
    """
    Security validator for file system paths
    """
    
    def __init__(self):
        # Dangerous path patterns
        self.dangerous_patterns = [
            r'\.\./',  # Directory traversal
            r'\.\.\\',  # Directory traversal (Windows)
            r'/\.\.',   # Directory traversal
            r'\\\.\.',  # Directory traversal (Windows)
            r'~/',      # Home directory reference
            r'^\.',     # Hidden files/directories
        ]
        
        # Sensitive system directories
        self.sensitive_dirs = [
            '/etc', '/sys', '/proc', '/dev', '/root', '/boot',
            '/var/log', '/usr/bin', '/usr/sbin', '/sbin', '/bin',
            'C:\\Windows', 'C:\\System32', 'C:\\Program Files'
        ]
        
        # Allowed base directories (can be configured)
        self.allowed_base_dirs = []
    
    def set_allowed_base_directories(self, directories: List[str]):
        """Set allowed base directories for file operations"""
        self.allowed_base_dirs = [Path(d).resolve() for d in directories]
    
    def validate_directory_path(self, directory_path: str) -> bool:
        """
        Validate directory path for security
        
        Args:
            directory_path: Directory path to validate
            
        Returns:
            True if path is safe, False otherwise
        """
        try:
            # Basic checks
            if not directory_path or not isinstance(directory_path, str):
                return False
            
            # Check for dangerous patterns
            for pattern in self.dangerous_patterns:
                if re.search(pattern, directory_path):
                    logger.warning(f"Dangerous path pattern detected: {directory_path}")
                    return False
            
            # Resolve and validate path
            resolved_path = Path(directory_path).resolve()
            
            # Check if path exists
            if not resolved_path.exists():
                # Allow non-existent paths if they're in safe locations
                pass
            
            # Check against sensitive directories
            path_str = str(resolved_path)
            for sensitive in self.sensitive_dirs:
                if path_str.startswith(sensitive):
                    logger.warning(f"Access to sensitive directory blocked: {directory_path}")
                    return False
            
            # Check against allowed base directories if configured
            if self.allowed_base_dirs:
                allowed = False
                for base_dir in self.allowed_base_dirs:
                    try:
                        resolved_path.relative_to(base_dir)
                        allowed = True
                        break
                    except ValueError:
                        continue
                
                if not allowed:
                    logger.warning(f"Path outside allowed directories: {directory_path}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Path validation error for {directory_path}: {str(e)}")
            return False
    
    def validate_filename(self, filename: str) -> bool:
        """
        Validate filename for security and filesystem compatibility
        
        Args:
            filename: Filename to validate
            
        Returns:
            True if filename is safe, False otherwise
        """
        try:
            if not filename or not isinstance(filename, str):
                return False
            
            # Length check
            if len(filename) > 255:
                return False
            
            # Check for invalid characters
            invalid_chars = '<>:"/\\|?*'
            for char in invalid_chars:
                if char in filename:
                    return False
            
            # Check for control characters
            for i in range(32):
                if chr(i) in filename:
                    return False
            
            # Check for reserved names (Windows)
            reserved_names = {
                'CON', 'PRN', 'AUX', 'NUL',
                'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
                'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
            }
            
            name_without_ext = Path(filename).stem.upper()
            if name_without_ext in reserved_names:
                return False
            
            # Check for names ending with space or period
            if filename.endswith(' ') or filename.endswith('.'):
                return False
            
            # Check for dangerous patterns
            for pattern in self.dangerous_patterns:
                if re.search(pattern, filename):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Filename validation error for {filename}: {str(e)}")
            return False
    
    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename by removing or replacing invalid characters
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        if not filename:
            return "untitled"
        
        # Replace invalid characters with underscores
        invalid_chars = '<>:"/\\|?*'
        sanitized = filename
        for char in invalid_chars:
            sanitized = sanitized.replace(char, '_')
        
        # Remove control characters
        sanitized = ''.join(char for char in sanitized if ord(char) >= 32)
        
        # Truncate if too long
        if len(sanitized) > 255:
            name = Path(sanitized).stem
            ext = Path(sanitized).suffix
            max_name_length = 255 - len(ext)
            if len(name) > max_name_length:
                name = name[:max_name_length]
            sanitized = name + ext
        
        # Handle reserved names
        reserved_names = {
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        }
        
        name_part = Path(sanitized).stem
        if name_part.upper() in reserved_names:
            sanitized = f"_{sanitized}"
        
        # Remove trailing spaces and periods
        sanitized = sanitized.rstrip(' .')
        
        # Ensure filename is not empty
        if not sanitized:
            sanitized = "untitled"
        
        return sanitized
    
    def get_safe_path(self, base_path: str, filename: str) -> Optional[str]:
        """
        Get a safe full path by combining base path and filename
        
        Args:
            base_path: Base directory path
            filename: Filename to append
            
        Returns:
            Safe full path or None if validation fails
        """
        try:
            if not self.validate_directory_path(base_path):
                return None
            
            sanitized_filename = self.sanitize_filename(filename)
            if not self.validate_filename(sanitized_filename):
                return None
            
            full_path = os.path.join(base_path, sanitized_filename)
            return full_path
            
        except Exception as e:
            logger.error(f"Safe path generation error: {str(e)}")
            return None


# Global validator instance
_path_validator = None


def get_path_validator() -> PathValidator:
    """Get global path validator instance"""
    global _path_validator
    if _path_validator is None:
        _path_validator = PathValidator()
    return _path_validator


def configure_allowed_directories(directories: List[str]):
    """Configure allowed base directories"""
    validator = get_path_validator()
    validator.set_allowed_base_directories(directories)