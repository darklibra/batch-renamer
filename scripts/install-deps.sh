#!/bin/bash

# Clear File System - Dependency Installation Script
# Installs all required dependencies for backend and frontend

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log "Installing dependencies for Clear File System"
log "Project directory: $PROJECT_DIR"

# Install backend dependencies
log "Installing backend dependencies..."
cd "$PROJECT_DIR/backend"

if command -v uv &> /dev/null; then
    log "Using UV package manager"
    uv pip install -e .
    success "Backend dependencies installed with UV"
elif command -v pip &> /dev/null; then
    log "Using pip package manager"
    pip install -e .
    success "Backend dependencies installed with pip"
else
    error "No Python package manager found (pip or uv)"
    exit 1
fi

# Install frontend dependencies
log "Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"

if command -v npm &> /dev/null; then
    log "Using npm package manager"
    npm install
    success "Frontend dependencies installed with npm"
else
    error "npm not found"
    exit 1
fi

# Return to project root
cd "$PROJECT_DIR"

# Validate installation
log "Validating installation..."

# Test backend imports
if python -c "from backend.app.core.config import get_settings; print('Backend imports OK')" 2>/dev/null; then
    success "Backend configuration system working"
else
    warn "Backend validation failed - may need to install dependencies manually"
fi

# Test frontend setup
if [ -d "frontend/node_modules" ]; then
    success "Frontend node_modules directory exists"
else
    warn "Frontend node_modules not found"
fi

success "Dependency installation complete!"
echo ""
log "Next steps:"
echo "  1. Copy environment configuration: cp .env.example .env"
echo "  2. Edit .env file with your settings"
echo "  3. Run deployment script: ./scripts/deploy.sh --environment development"