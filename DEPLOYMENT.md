# Clear File System - Production Deployment Guide

## 🚀 Enterprise Deployment Architecture

Clear File System는 Docker 컨테이너화된 마이크로서비스 아키텍처로 구성된 엔터프라이즈급 파일 관리 시스템입니다.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   React Frontend │    │  FastAPI Backend │
│   (Production)  │────│     (Nginx)     │────│    (Python)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Redis Cache    │    │  PostgreSQL DB  │
                       │   (Optional)    │    │   (Primary)     │
                       └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **CPU**: 2+ cores (4+ recommended for production)
- **Memory**: 4GB RAM minimum (8GB+ recommended for production)
- **Storage**: 20GB available disk space
- **Network**: Internet connectivity for Docker image pulls

### Required Software
- **Docker**: 20.10+ and Docker Compose 2.0+
- **Git**: For repository management
- **Python**: 3.13+ (for local development and validation scripts)
- **Node.js**: 20+ (for frontend development)

### Installation Commands
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose git python3 python3-pip nodejs npm

# macOS (using Homebrew)
brew install docker docker-compose git python@3.13 node

# Verify installations
docker --version
docker-compose --version
python3 --version
node --version
```

## 🏗️ Production Deployment

### 1. Repository Setup
```bash
# Clone repository
git clone <your-repository-url>
cd clear-file

# Verify project structure
ls -la
# Should show: backend/, frontend/, docker-compose.yml, .env, scripts/
```

### 2. Environment Configuration

**Critical Security Step**: Update production environment variables

```bash
# Copy environment template
cp .env .env.production

# Edit production configuration
nano .env.production
```

**Required Changes for Production**:
```env
# Database Configuration - CHANGE THESE
DB_PASSWORD=your_ultra_secure_database_password_here

# Security Configuration - MUST BE CHANGED
SECRET_KEY=your-super-secret-key-at-least-32-characters-long-and-random
API_KEY=your-optional-api-key-for-additional-security

# CORS Configuration - SET YOUR DOMAIN
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Application Environment
APP_ENV=production
DEBUG=false

# Feature Flags (recommended for production)
ENABLE_ASYNC_PROCESSING=true
ENABLE_PATTERN_CACHE=true
ENABLE_SECURITY_VALIDATION=true
```

### 3. SSL/TLS Configuration (Production Only)

For HTTPS in production, configure SSL certificates:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp your_domain.crt nginx/ssl/
cp your_domain.key nginx/ssl/
cp ca_bundle.crt nginx/ssl/  # If using CA bundle
```

Update nginx configuration for HTTPS:
```bash
# Edit nginx/nginx.conf to enable SSL
# Add SSL certificate paths and redirect HTTP to HTTPS
```

### 4. Deploy with Automated Script

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Development deployment
./scripts/deploy.sh --environment development

# Staging deployment (with tests)
./scripts/deploy.sh --environment staging

# Production deployment (full security checks)
./scripts/deploy.sh --environment production
```

### 5. Manual Deployment (Alternative)

```bash
# Set environment variables
export APP_ENV=production
export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VCS_REF=$(git rev-parse --short HEAD)

# Build and deploy
docker-compose --profile production up -d --build

# Verify deployment
docker-compose ps
```

## 🔍 Validation & Testing

### Automated Validation Suite
```bash
# Install validation dependencies
pip3 install aiohttp psutil

# Run comprehensive validation
./scripts/validate-deployment.py --environment production --base-url http://localhost

# Expected output:
# ✅ PASS Basic API Connectivity
# ✅ PASS Health Check
# ✅ PASS Database Connectivity
# ✅ PASS API Endpoints
# ✅ PASS Performance Benchmarks
# ✅ PASS System Resources
# ✅ PASS Docker Containers
```

### Manual Health Checks
```bash
# Basic connectivity
curl http://localhost/api/v1/monitoring/health

# Performance metrics
curl http://localhost/api/v1/monitoring/performance/summary

# System readiness
curl http://localhost/api/v1/monitoring/readiness

# API documentation
open http://localhost/docs
```

### Load Testing (Optional)
```bash
# Install hey for load testing
go install github.com/rakyll/hey@latest

# Run load test (100 requests, 10 concurrent)
hey -n 100 -c 10 http://localhost/api/v1/monitoring/health

# Expected: >95% success rate, <500ms average response time
```

## 🔧 Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | development | Environment: development/staging/production |
| `DEBUG` | true | Enable debug logging |
| `DATABASE_URL` | sqlite://... | Database connection string |
| `DB_PASSWORD` | - | PostgreSQL password |
| `SECRET_KEY` | - | JWT/session secret key |
| `API_KEY` | - | Optional API authentication key |
| `CORS_ORIGINS` | localhost | Allowed CORS origins |
| `MAX_FILE_SIZE` | 104857600 | Max file upload size (bytes) |
| `CACHE_TTL` | 3600 | Cache expiration time (seconds) |
| `LOG_LEVEL` | INFO | Logging level |
| `ENABLE_METRICS` | false | Enable metrics collection |

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 80 | React frontend with Nginx |
| `backend` | 8000 | FastAPI application server |
| `db` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis cache (optional) |
| `nginx` | 80/443 | Production reverse proxy |

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/monitoring/health` | Comprehensive health status |
| `/api/v1/monitoring/readiness` | Kubernetes readiness probe |
| `/api/v1/monitoring/liveness` | Kubernetes liveness probe |
| `/api/v1/monitoring/metrics/system` | System performance metrics |
| `/api/v1/monitoring/performance/summary` | Performance dashboard |

## 🔒 Security Considerations

### Production Security Checklist

- [ ] **Environment Variables**: All default passwords and keys changed
- [ ] **SSL/TLS**: HTTPS enabled with valid certificates
- [ ] **Firewall**: Only necessary ports exposed (80, 443)
- [ ] **Database**: Strong password, restricted network access
- [ ] **API Keys**: Secure API keys configured if using authentication
- [ ] **CORS**: Restricted to actual domain names (no wildcards)
- [ ] **Security Headers**: Enabled via Nginx configuration
- [ ] **File Upload**: Size limits and type restrictions configured
- [ ] **Rate Limiting**: Enabled to prevent abuse
- [ ] **Logging**: Security events logged and monitored

### Security Headers (Automatically Applied)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'...`

## 🚨 Monitoring & Maintenance

### Health Monitoring
```bash
# Set up monitoring script (run via cron)
crontab -e

# Add line for every 5 minutes
*/5 * * * * curl -f http://localhost/api/v1/monitoring/health || echo "Health check failed" | mail admin@yourdomain.com
```

### Log Management
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View system logs
docker-compose logs -f db
docker-compose logs -f redis
```

### Backup Procedures
```bash
# Database backup
docker-compose exec db pg_dump -U clear_file_user clear_file > backup_$(date +%Y%m%d).sql

# Volume backup
docker run --rm -v clear-file_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /data .

# Full system backup (automated by deploy script)
./scripts/deploy.sh --backup-only
```

### Updates & Rollbacks
```bash
# Update application
git pull origin main
./scripts/deploy.sh --environment production

# Rollback (manual process)
docker-compose down
# Restore from backup
./scripts/deploy.sh --rollback v1.0.0
```

## 🚀 Performance Optimization

### Production Performance Settings
```env
# Backend Performance
WORKERS=4                    # Number of worker processes
MAX_WORKERS=8               # Async processing workers
DB_POOL_SIZE=20             # Database connection pool
CACHE_TTL=7200              # 2-hour cache TTL

# File Processing
MAX_FILES_PER_BATCH=1000    # Batch processing size
CHUNK_SIZE=1000             # Streaming chunk size
ENABLE_PATTERN_CACHE=true   # Pattern compilation caching
```

### Database Optimization
```sql
-- PostgreSQL optimizations (run after deployment)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

## 🆘 Troubleshooting

### Common Issues

**Issue**: Containers won't start
```bash
# Check logs
docker-compose logs

# Verify configuration
docker-compose config

# Restart services
docker-compose down && docker-compose up -d
```

**Issue**: Database connection errors
```bash
# Check database status
docker-compose exec db pg_isready -U clear_file_user

# Reset database
docker-compose down
docker volume rm clear-file_postgres_data
docker-compose up -d
```

**Issue**: Permission errors
```bash
# Fix file permissions
chmod +x scripts/*.sh
chown -R $USER:$USER .

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

**Issue**: High memory usage
```bash
# Check container resource usage
docker stats

# Adjust configuration
# Reduce DB_POOL_SIZE, MAX_WORKERS in .env
```

### Support Contacts
- **Technical Issues**: [Create GitHub Issue]
- **Security Concerns**: security@yourdomain.com
- **Production Support**: support@yourdomain.com

---

## 📚 Additional Resources

- **API Documentation**: `/docs` endpoint (Swagger UI)
- **Architecture Details**: `CLAUDE.md`
- **Development Guide**: `README.md`
- **Security Guide**: `backend/app/core/security.py`

**Deployment Status**: ✅ Production Ready  
**Last Updated**: 2025-08-26  
**Version**: 1.0.0