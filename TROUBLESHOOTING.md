# Clear File System - Troubleshooting Guide

## 🔧 Common Issues and Solutions

### 1. Pydantic BaseSettings Import Error

**Error Message**:
```
pydantic.errors.PydanticImportError: `BaseSettings` has been moved to the `pydantic-settings` package.
```

**Root Cause**: Pydantic v2 moved `BaseSettings` to a separate package but `pydantic-settings` dependency was missing.

**Solution** ✅ **RESOLVED**:
1. **Fixed Import**: Updated `backend/app/core/config.py` to import from `pydantic-settings`
2. **Added Dependency**: Added `pydantic-settings>=2.0.0` to `pyproject.toml`
3. **Updated Validators**: Migrated to Pydantic v2 syntax (`@field_validator`, `@model_validator`)
4. **Updated Config**: Changed `Config` class to `model_config` dictionary

**Files Modified**:
- `backend/app/core/config.py` - Fixed imports and validators
- `backend/pyproject.toml` - Added missing dependencies

**Verification**:
```bash
# Test configuration system
cd backend
python -c "from app.core.config import get_settings; print('Config working:', get_settings().app_name)"
```

---

### 2. Missing Dependencies

**Symptoms**: `ModuleNotFoundError` for various packages

**Solutions**:

#### Option A: Automatic Installation
```bash
./scripts/install-deps.sh
```

#### Option B: Manual Installation
```bash
# Backend dependencies
cd backend
pip install -e .
# or
uv pip install -e .

# Frontend dependencies  
cd ../frontend
npm install
```

#### Option C: Docker Installation
```bash
# Dependencies installed automatically during build
docker-compose build
```

---

### 3. Docker Build Issues

**Error**: Build failures or import errors in containers

**Solutions**:
```bash
# Clear Docker cache and rebuild
docker-compose down
docker system prune -f
docker-compose build --no-cache

# Verify dependencies in container
docker-compose run backend python -c "from app.core.config import get_settings; print('OK')"
```

---

### 4. Environment Configuration Issues

**Error**: Configuration validation failures

**Solutions**:
```bash
# Create environment file from template
cp .env.example .env

# Validate configuration
cd backend
python -c "from app.core.config import validate_environment; validate_environment()"
```

**Required Environment Variables**:
- `SECRET_KEY` - Must be changed in production
- `DATABASE_URL` - Database connection string
- `CORS_ORIGINS` - Allowed origins for CORS

---

### 5. Database Connection Issues

**Error**: Database connection failures

**Solutions**:

#### SQLite (Development):
```bash
# Ensure database directory exists
mkdir -p backend/db
```

#### PostgreSQL (Production):
```bash
# Verify PostgreSQL is running
docker-compose ps db

# Check connection
docker-compose exec backend python -c "
from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1'))
    print('Database OK')
"
```

---

### 6. Port Conflicts

**Error**: `Port already in use` errors

**Solutions**:
```bash
# Kill processes using ports
sudo lsof -ti:8000 | xargs kill -9  # Backend port
sudo lsof -ti:3000 | xargs kill -9  # Frontend port
sudo lsof -ti:5432 | xargs kill -9  # PostgreSQL port

# Or change ports in .env file
echo "PORT=8001" >> .env
echo "FRONTEND_PORT=3001" >> .env
```

---

### 7. Permission Issues (Linux/macOS)

**Error**: Permission denied errors

**Solutions**:
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Fix file ownership
sudo chown -R $USER:$USER .
```

---

### 8. High Resource Usage

**Symptoms**: Slow performance, high memory usage

**Solutions**:
```bash
# Monitor resource usage
docker stats

# Reduce resource usage in .env
MAX_WORKERS=2
DB_POOL_SIZE=5
CACHE_TTL=1800
```

---

### 9. Frontend Build Issues

**Error**: npm/node issues

**Solutions**:
```bash
# Clear npm cache
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Use specific Node version
nvm use 20  # or whatever version is required
```

---

### 10. Health Check Failures

**Error**: Health endpoints returning errors

**Solutions**:
```bash
# Check service status
curl http://localhost:8000/api/v1/monitoring/health

# Verify all components
./scripts/validate-deployment.py --environment development

# Check logs for errors
docker-compose logs backend
```

---

## 🚨 Emergency Procedures

### Complete System Reset
```bash
# Stop all services
docker-compose down -v

# Remove all containers and volumes
docker system prune -f
docker volume prune -f

# Rebuild from scratch
./scripts/deploy.sh --environment development
```

### Database Recovery
```bash
# Backup current database
docker-compose exec db pg_dump -U clear_file_user clear_file > backup.sql

# Reset database
docker-compose down
docker volume rm clear-file_postgres_data
docker-compose up -d db

# Wait for database to be ready
sleep 30

# Restore from backup
docker-compose exec -T db psql -U clear_file_user clear_file < backup.sql
```

### Rollback Deployment
```bash
# Create backup first
./scripts/deploy.sh --backup-only

# Manual rollback process
docker-compose down
# Restore previous working version
# Then redeploy
```

---

## 📊 Diagnostic Commands

### System Information
```bash
# Check system resources
free -h
df -h
docker system df

# Check running processes
docker-compose ps
docker stats --no-stream
```

### Application Health
```bash
# Full validation suite
./scripts/validate-deployment.py

# Manual health checks
curl http://localhost:8000/api/v1/monitoring/health | jq
curl http://localhost:8000/api/v1/monitoring/performance/summary | jq
```

### Log Analysis
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f backend

# Search for specific errors
docker-compose logs backend 2>&1 | grep -i error
```

### Network Diagnostics
```bash
# Test network connectivity
docker network ls
docker-compose exec backend ping db
docker-compose exec backend ping redis

# Check port availability
netstat -tlnp | grep :8000
```

---

## 🆘 Getting Help

### Before Reporting Issues
1. **Check Logs**: Review Docker logs for error messages
2. **Run Validation**: Use `validate-deployment.py` script
3. **Check Resources**: Verify system has adequate CPU/memory
4. **Review Configuration**: Ensure all environment variables are set

### Collect Debug Information
```bash
# Generate system report
./scripts/validate-deployment.py --environment development > debug-report.txt
docker-compose logs > docker-logs.txt
docker system info > docker-info.txt
```

### Support Contacts
- **Documentation**: Check `DEPLOYMENT.md` and `README.md`
- **GitHub Issues**: Create issue with debug information
- **System Status**: Check health endpoints

---

**Last Updated**: 2025-08-26  
**Version**: 1.0.0