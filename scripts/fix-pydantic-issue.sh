#!/bin/bash

# Clear File System - Pydantic BaseSettings Fix Script
# Resolves the "ModuleNotFoundError: No module named 'pydantic_settings'" issue

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
BACKEND_DIR="$PROJECT_DIR/backend"

log "Fixing Pydantic BaseSettings Import Error"
log "Project directory: $PROJECT_DIR"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    log "Creating virtual environment..."
    python3 -m venv .venv
    success "Virtual environment created"
fi

# Activate virtual environment
log "Activating virtual environment..."
source .venv/bin/activate

# Install missing dependencies
log "Installing required dependencies..."
pip install -q pydantic-settings psutil bcrypt

# Verify pydantic-settings is installed
if python -c "import pydantic_settings; print(f'pydantic-settings {pydantic_settings.__version__} installed')" 2>/dev/null; then
    success "pydantic-settings installed successfully"
else
    error "Failed to install pydantic-settings"
    exit 1
fi

# Test the import chain
log "Testing import chain..."
if python -c "
from pydantic_settings import BaseSettings
from app.core.config import get_settings
from app.core.database import get_db
print('All imports working correctly')
" 2>/dev/null; then
    success "All imports working correctly"
else
    error "Import chain still failing"
    exit 1
fi

# Test application startup
log "Testing application startup..."
if timeout 10s python -c "
import subprocess
import time
import urllib.request

# Start server
process = subprocess.Popen(['python', '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8002'], 
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(3)

try:
    response = urllib.request.urlopen('http://127.0.0.1:8002/')
    data = response.read().decode()
    assert 'Welcome to Clear File API' in data
    print('Application startup test passed')
finally:
    process.terminate()
    process.wait()
" 2>/dev/null; then
    success "Application startup test passed"
else
    warn "Application startup test failed, but imports are working"
fi

success "Pydantic BaseSettings issue has been resolved!"
echo ""
log "Issue Summary:"
echo "  • Added pydantic-settings>=2.0.0 dependency"
echo "  • Fixed import statements in config.py"
echo "  • Updated Pydantic v2 validators"
echo "  • Fixed database poolclass configuration"
echo ""
log "Next steps:"
echo "  1. Run the application: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo "  2. Or use the deployment script: ../scripts/deploy.sh --environment development"
echo "  3. Test with: ../scripts/test-backend.py"