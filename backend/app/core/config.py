"""
Enterprise Configuration Management System
Centralized configuration with environment-based overrides and validation
"""
import os
from enum import Enum
from typing import Optional
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings


class Environment(str, Enum):
    """Application environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings(BaseSettings):
    """
    Application settings with environment-based configuration
    Follows 12-factor app principles for configuration management
    """
    
    # Environment Configuration
    environment: Environment = Field(default=Environment.DEVELOPMENT, env="APP_ENV")
    debug: bool = Field(default=True, env="DEBUG")
    testing: bool = Field(default=False, env="TESTING")
    
    # Application Configuration  
    app_name: str = Field(default="Clear File Management System", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    api_prefix: str = Field(default="/api/v1", env="API_PREFIX")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    reload: bool = Field(default=True, env="RELOAD")
    workers: int = Field(default=1, env="WORKERS")
    
    # Database Configuration
    database_url: str = Field(
        default="sqlite:///./db/clear_file.db", 
        env="DATABASE_URL"
    )
    database_pool_size: int = Field(default=5, env="DB_POOL_SIZE")
    database_max_overflow: int = Field(default=10, env="DB_MAX_OVERFLOW")
    
    # Security Configuration
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
        env="CORS_ORIGINS"
    )
    api_key: Optional[str] = Field(default=None, env="API_KEY")
    secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        env="SECRET_KEY"
    )
    
    # File Processing Configuration
    max_file_size: int = Field(default=100 * 1024 * 1024, env="MAX_FILE_SIZE")  # 100MB
    max_files_per_batch: int = Field(default=1000, env="MAX_FILES_PER_BATCH")
    upload_directory: str = Field(default="./uploads", env="UPLOAD_DIR")
    temp_directory: str = Field(default="./temp", env="TEMP_DIR")
    
    # Performance Configuration
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    max_workers: int = Field(default=4, env="MAX_WORKERS")
    chunk_size: int = Field(default=1000, env="CHUNK_SIZE")
    
    # Monitoring & Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    enable_metrics: bool = Field(default=False, env="ENABLE_METRICS")
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    
    # Feature Flags
    enable_async_processing: bool = Field(default=True, env="ENABLE_ASYNC_PROCESSING")
    enable_pattern_cache: bool = Field(default=True, env="ENABLE_PATTERN_CACHE")
    enable_security_validation: bool = Field(default=True, env="ENABLE_SECURITY_VALIDATION")
    
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v):
        """Ensure valid environment setting"""
        if isinstance(v, str):
            try:
                return Environment(v.lower())
            except ValueError:
                raise ValueError(f"Invalid environment: {v}")
        return v
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v):
        """Validate database URL format"""
        if not v:
            raise ValueError("Database URL is required")
        return v
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @model_validator(mode='after')
    def validate_secret_key(self):
        """Ensure secret key is changed in production"""
        if self.environment == Environment.PRODUCTION:
            if self.secret_key == "dev-secret-key-change-in-production":
                raise ValueError("Must change secret key in production")
        return self
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.environment == Environment.DEVELOPMENT
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.environment == Environment.PRODUCTION
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing mode"""
        return self.environment == Environment.TESTING
    
    @property
    def database_options(self) -> dict:
        """Get database connection options based on environment"""
        options = {}
        
        if self.database_url.startswith("sqlite"):
            options["connect_args"] = {"check_same_thread": False}
            # Import StaticPool here to avoid circular imports
            from sqlalchemy.pool import StaticPool
            options["poolclass"] = StaticPool
        else:
            options["pool_size"] = self.database_pool_size
            options["max_overflow"] = self.database_max_overflow
            options["pool_pre_ping"] = True
        
        return options
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "validate_assignment": True,
        "extra": "ignore"
    }


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Get application settings
    Can be overridden for dependency injection in FastAPI
    """
    return settings


def validate_environment():
    """
    Validate environment configuration
    Should be called at application startup
    """
    try:
        # Test database URL
        if settings.database_url.startswith("postgresql"):
            print("ℹ️ Using PostgreSQL database")
        elif settings.database_url.startswith("mysql"):
            print("ℹ️ Using MySQL database") 
        else:
            print("ℹ️ Using SQLite database")
        
        # Validate directories
        os.makedirs(settings.upload_directory, exist_ok=True)
        os.makedirs(settings.temp_directory, exist_ok=True)
        
        # Create database directory for SQLite
        if settings.database_url.startswith("sqlite"):
            db_path = settings.database_url.replace("sqlite:///", "")
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        print(f"✅ Configuration validated for {settings.environment.value} environment")
        return True
        
    except Exception as e:
        print(f"❌ Configuration validation failed: {e}")
        return False


def print_configuration():
    """Print non-sensitive configuration for debugging"""
    print("\n🔧 Configuration Summary:")
    print(f"Environment: {settings.environment.value}")
    print(f"Debug: {settings.debug}")
    print(f"Host: {settings.host}:{settings.port}")
    print(f"Database: {'PostgreSQL' if 'postgresql' in settings.database_url else 'SQLite'}")
    print(f"CORS Origins: {len(settings.cors_origins)} configured")
    print(f"Max File Size: {settings.max_file_size // (1024*1024)}MB")
    print(f"Cache TTL: {settings.cache_ttl}s")
    print(f"Workers: {settings.max_workers}")
    print("=" * 50)