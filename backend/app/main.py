from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import files, patterns, smart_operations
from app.core.database import create_tables
from app.infrastructure.configuration import initialize_services, check_services_health

# Create FastAPI app
app = FastAPI(
    title="Clear File API",
    description="File indexing and pattern extraction system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
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
app.include_router(files.router, prefix="/api/v1", tags=["files"])
app.include_router(patterns.router, prefix="/api/v1", tags=["patterns"])
app.include_router(smart_operations.router, tags=["smart-operations"])

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
