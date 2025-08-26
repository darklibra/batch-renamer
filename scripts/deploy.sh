#!/bin/bash

# Clear File System - Production Deployment Script
# Enterprise-grade deployment with validation and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/deployment.log"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --environment ENV    Deployment environment (development|staging|production)"
    echo "  --skip-tests        Skip test execution"
    echo "  --skip-build        Skip Docker image building"
    echo "  --backup-only       Only create backup, don't deploy"
    echo "  --rollback VERSION  Rollback to specific version"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment production"
    echo "  $0 --environment staging --skip-tests"
    echo "  $0 --rollback v1.0.0"
}

# Parse command line arguments
ENVIRONMENT="development"
SKIP_TESTS=false
SKIP_BUILD=false
BACKUP_ONLY=false
ROLLBACK_VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --backup-only)
            BACKUP_ONLY=true
            shift
            ;;
        --rollback)
            ROLLBACK_VERSION="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error "Invalid environment: $ENVIRONMENT"
    show_usage
    exit 1
fi

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required files exist
    required_files=(
        "$PROJECT_DIR/docker-compose.yml"
        "$PROJECT_DIR/.env"
        "$PROJECT_DIR/backend/Dockerfile"
        "$PROJECT_DIR/frontend/Dockerfile"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file not found: $file"
            exit 1
        fi
    done
    
    # Check environment configuration
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if grep -q "your_secure_password" "$PROJECT_DIR/.env"; then
            error "Production deployment detected default passwords in .env file"
            error "Please update all default credentials before production deployment"
            exit 1
        fi
        
        if grep -q "dev-secret-key" "$PROJECT_DIR/.env"; then
            error "Production deployment detected development secret key"
            error "Please update SECRET_KEY in .env file"
            exit 1
        fi
    fi
    
    success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment
    if docker-compose ps -q &> /dev/null; then
        log "Backing up current containers..."
        docker-compose config > "$BACKUP_DIR/docker-compose-backup.yml"
        
        # Export database if running
        if docker-compose ps db | grep -q "Up"; then
            log "Backing up database..."
            docker-compose exec -T db pg_dump -U clear_file_user clear_file > "$BACKUP_DIR/database-backup.sql"
        fi
        
        # Backup volumes
        log "Backing up volumes..."
        docker run --rm -v clear-file_postgres_data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
        docker run --rm -v clear-file_file_data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/file_data.tar.gz -C /data .
    fi
    
    # Backup configuration files
    cp "$PROJECT_DIR/.env" "$BACKUP_DIR/"
    cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_DIR/"
    
    success "Backup created at: $BACKUP_DIR"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warn "Skipping tests as requested"
        return 0
    fi
    
    log "Running tests..."
    
    # Backend tests
    log "Running backend tests..."
    cd "$PROJECT_DIR/backend"
    
    if [[ -f "pyproject.toml" ]]; then
        # Using UV package manager
        if command -v uv &> /dev/null; then
            uv run pytest tests/ -v
        else
            pip install -e .
            pytest tests/ -v
        fi
    else
        error "Backend pyproject.toml not found"
        exit 1
    fi
    
    # Frontend tests
    log "Running frontend tests..."
    cd "$PROJECT_DIR/frontend"
    
    if [[ -f "package.json" ]]; then
        npm test -- --coverage --watchAll=false
    else
        error "Frontend package.json not found"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    success "All tests passed"
}

# Build Docker images
build_images() {
    if [[ "$SKIP_BUILD" == true ]]; then
        warn "Skipping build as requested"
        return 0
    fi
    
    log "Building Docker images..."
    
    # Set build arguments
    export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    export VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Build images with Docker Compose
    docker-compose build --no-cache --pull
    
    success "Docker images built successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services for $ENVIRONMENT environment..."
    
    # Set environment
    export APP_ENV="$ENVIRONMENT"
    
    # Deploy based on environment
    case "$ENVIRONMENT" in
        "development")
            docker-compose up -d --remove-orphans
            ;;
        "staging")
            docker-compose up -d --remove-orphans
            ;;
        "production")
            # Production deployment with nginx proxy
            docker-compose --profile production up -d --remove-orphans
            ;;
    esac
    
    success "Services deployed successfully"
}

# Health check
health_check() {
    log "Running health checks..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check backend health
    for i in {1..12}; do
        if curl -f http://localhost:8000/api/v1/monitoring/health &> /dev/null; then
            success "Backend health check passed"
            break
        elif [[ $i -eq 12 ]]; then
            error "Backend health check failed after 60 seconds"
            return 1
        else
            log "Waiting for backend to be ready... ($i/12)"
            sleep 5
        fi
    done
    
    # Check frontend health
    frontend_port=80
    if [[ "$ENVIRONMENT" == "development" ]]; then
        frontend_port=3000
    fi
    
    for i in {1..12}; do
        if curl -f http://localhost:$frontend_port/health &> /dev/null; then
            success "Frontend health check passed"
            break
        elif [[ $i -eq 12 ]]; then
            error "Frontend health check failed after 60 seconds"
            return 1
        else
            log "Waiting for frontend to be ready... ($i/12)"
            sleep 5
        fi
    done
    
    # Check database connectivity
    if docker-compose exec -T backend curl -f http://localhost:8000/api/v1/monitoring/readiness &> /dev/null; then
        success "Database connectivity check passed"
    else
        error "Database connectivity check failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Rollback function
rollback() {
    local version="$1"
    log "Rolling back to version: $version"
    
    # Find backup directory for version
    backup_path="$PROJECT_DIR/backups"
    if [[ ! -d "$backup_path" ]]; then
        error "No backup directory found"
        exit 1
    fi
    
    # Stop current services
    docker-compose down
    
    # Restore from backup (simplified - would need proper version management)
    log "Rollback functionality would be implemented based on your version management strategy"
    warn "Manual intervention required for rollback"
    
    exit 1
}

# Main execution
main() {
    log "Starting deployment process for $ENVIRONMENT environment"
    log "Deployment started at: $(date)"
    
    # Handle rollback
    if [[ -n "$ROLLBACK_VERSION" ]]; then
        rollback "$ROLLBACK_VERSION"
        return 0
    fi
    
    # Handle backup-only mode
    if [[ "$BACKUP_ONLY" == true ]]; then
        create_backup
        return 0
    fi
    
    # Full deployment process
    pre_deployment_checks
    create_backup
    run_tests
    build_images
    deploy_services
    health_check
    
    success "Deployment completed successfully!"
    success "Environment: $ENVIRONMENT"
    success "Backup location: $BACKUP_DIR"
    
    # Show service URLs
    echo ""
    log "Service URLs:"
    case "$ENVIRONMENT" in
        "development")
            echo "  - Backend API: http://localhost:8000"
            echo "  - Frontend: http://localhost:3000"
            echo "  - API Docs: http://localhost:8000/docs"
            echo "  - Health Check: http://localhost:8000/api/v1/monitoring/health"
            ;;
        "staging"|"production")
            echo "  - Application: http://localhost"
            echo "  - API Docs: http://localhost/api/v1/docs"
            echo "  - Health Check: http://localhost/api/v1/monitoring/health"
            echo "  - Monitoring: http://localhost/api/v1/monitoring/performance/summary"
            ;;
    esac
    
    log "Deployment completed at: $(date)"
}

# Trap errors and cleanup
trap 'error "Deployment failed"; exit 1' ERR

# Run main function
main "$@"