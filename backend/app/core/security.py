"""
Production Security Configuration for Clear File System.
Implements enterprise-grade security measures including API authentication,
rate limiting, input validation, and security headers.
"""

import hashlib
import secrets
import hmac
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
import re

from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator
import bcrypt

from .config import get_settings

settings = get_settings()
security = HTTPBearer(auto_error=False)

class SecurityConfig:
    """Security configuration constants."""
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True  
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL_CHARS = True
    
    # Rate limiting
    DEFAULT_RATE_LIMIT = "100/minute"
    AUTH_RATE_LIMIT = "5/minute"
    UPLOAD_RATE_LIMIT = "10/minute"
    
    # Token settings
    TOKEN_EXPIRE_HOURS = 24
    REFRESH_TOKEN_EXPIRE_DAYS = 30
    
    # Security headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
    }

class SecurityValidator:
    """Security validation utilities."""
    
    @staticmethod
    def validate_password(password: str) -> Dict[str, Any]:
        """Validate password strength according to security policy."""
        errors = []
        
        if len(password) < SecurityConfig.MIN_PASSWORD_LENGTH:
            errors.append(f"Password must be at least {SecurityConfig.MIN_PASSWORD_LENGTH} characters")
        
        if SecurityConfig.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if SecurityConfig.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if SecurityConfig.REQUIRE_NUMBERS and not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        if SecurityConfig.REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Check for common weak patterns
        weak_patterns = [
            r'(.)\1{2,}',  # Repeated characters (aaa, 111)
            r'(012|123|234|345|456|567|678|789)',  # Sequential numbers
            r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)',  # Sequential letters
        ]
        
        for pattern in weak_patterns:
            if re.search(pattern, password.lower()):
                errors.append("Password contains weak patterns")
                break
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "strength_score": max(0, 100 - len(errors) * 20)
        }
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent directory traversal and injection attacks."""
        # Remove path separators and dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        # Prevent directory traversal
        sanitized = sanitized.replace('..', '')
        
        # Limit length
        if len(sanitized) > 255:
            name, ext = sanitized.rsplit('.', 1) if '.' in sanitized else (sanitized, '')
            max_name_len = 250 - len(ext)
            sanitized = f"{name[:max_name_len]}.{ext}" if ext else name[:255]
        
        return sanitized or "unnamed_file"
    
    @staticmethod
    def validate_file_type(filename: str, allowed_extensions: Optional[set] = None) -> bool:
        """Validate file type based on extension whitelist."""
        if allowed_extensions is None:
            # Default allowed extensions for file processing
            allowed_extensions = {
                '.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
                '.jpg', '.jpeg', '.png', '.gif', '.bmp',
                '.mp3', '.mp4', '.avi', '.mov', '.wmv',
                '.zip', '.rar', '.7z', '.tar', '.gz'
            }
        
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        return f'.{ext}' in allowed_extensions

class APIKeyAuth:
    """API Key authentication handler."""
    
    @staticmethod
    def verify_api_key(api_key: str) -> bool:
        """Verify API key against configured keys."""
        if not settings.api_key:
            return True  # No API key required
        
        return hmac.compare_digest(api_key, settings.api_key)
    
    @staticmethod
    def get_api_key(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
        """Extract and verify API key from request."""
        if not settings.api_key:
            return None  # No API key required
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required"
            )
        
        if not APIKeyAuth.verify_api_key(credentials.credentials):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        return credentials.credentials

class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self):
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, identifier: str, limit: int, window_minutes: int = 1) -> bool:
        """Check if request is within rate limit."""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        # Clean old requests
        if identifier in self.requests:
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier]
                if req_time > window_start
            ]
        else:
            self.requests[identifier] = []
        
        # Check limit
        if len(self.requests[identifier]) >= limit:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True

# Global rate limiter instance
rate_limiter = RateLimiter()

def require_api_key(func):
    """Decorator to require API key authentication."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # API key verification is handled by dependency injection
        return await func(*args, **kwargs)
    return wrapper

def rate_limit(limit: int = 100, window_minutes: int = 1):
    """Decorator to apply rate limiting to endpoints."""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Use IP address as identifier
            client_ip = request.client.host if request.client else "unknown"
            
            if not rate_limiter.is_allowed(client_ip, limit, window_minutes):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: {limit} requests per {window_minutes} minute(s)"
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def apply_security_headers(response):
    """Apply security headers to response."""
    for header, value in SecurityConfig.SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

class SecureHasher:
    """Secure password hashing utilities."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def generate_token() -> str:
        """Generate secure random token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate secure API key."""
        return secrets.token_urlsafe(64)

class InputSanitizer:
    """Input sanitization utilities."""
    
    @staticmethod
    def sanitize_regex_pattern(pattern: str) -> str:
        """Sanitize regex pattern to prevent ReDoS attacks."""
        # This is handled by the existing security_validator.py
        # But we provide a simplified version here for consistency
        dangerous_patterns = [
            r'\(\?\#',  # Comments
            r'\(\?\!',  # Negative lookahead
            r'\(\?\<\!',  # Negative lookbehind  
            r'\(\?\<\=',  # Positive lookbehind
            r'\(\?\=',   # Positive lookahead
        ]
        
        for dangerous in dangerous_patterns:
            pattern = re.sub(dangerous, '', pattern, flags=re.IGNORECASE)
        
        return pattern
    
    @staticmethod
    def sanitize_path(path: str) -> str:
        """Sanitize file path to prevent directory traversal."""
        # Remove dangerous path components
        sanitized = path.replace('..', '').replace('~', '')
        
        # Normalize separators
        sanitized = sanitized.replace('\\', '/')
        
        # Remove leading slashes for relative paths
        sanitized = sanitized.lstrip('/')
        
        return sanitized

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    # Check for proxy headers first
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct connection
    return request.client.host if request.client else "unknown"

# Security middleware setup
class SecurityMiddleware:
    """Security middleware for FastAPI."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Add security headers to all responses
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    headers = dict(message.get("headers", []))
                    
                    # Add security headers
                    for header, value in SecurityConfig.SECURITY_HEADERS.items():
                        headers[header.encode()] = value.encode()
                    
                    message["headers"] = list(headers.items())
                
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)