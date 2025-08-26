from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import files, patterns, smart_operations, monitoring
from app.core.database import create_tables
from app.core.config import get_settings
from app.infrastructure.configuration import initialize_services, check_services_health

# Get application settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="File indexing and pattern extraction system with enterprise features",
    version=settings.app_version,
    debug=settings.debug,
    redirect_slashes=False
)

# CORS middleware with environment-based configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables and initialize services on startup
@app.on_event("startup")
def startup_event():
    create_tables()
    initialize_services()

# Include routers
app.include_router(files.router, prefix=settings.api_prefix, tags=["files"])
app.include_router(patterns.router, prefix=settings.api_prefix, tags=["patterns"])
app.include_router(smart_operations.router, prefix=settings.api_prefix, tags=["smart-operations"])
app.include_router(monitoring.router, prefix=settings.api_prefix, tags=["monitoring"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Clear File API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
def health_check():
    """Enhanced health check with service status"""
    services_health = check_services_health()
    
    overall_status = "healthy" if all([
        services_health['pattern_extractor'],
        services_health['pattern_matcher'],
        services_health['pattern_cache']
    ]) else "degraded"
    
    return {
        "status": overall_status,
        "service": "clear-file-api",
        "services": services_health
    }
