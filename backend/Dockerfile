# Multi-stage Docker build for Clear File Backend
# Optimized for production deployment with security best practices

# Build stage
FROM python:3.13-slim as builder

# Set build arguments
ARG APP_ENV=production
ARG BUILD_DATE
ARG VCS_REF

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install UV package manager
RUN pip install uv

# Set working directory
WORKDIR /build

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install dependencies to virtual environment
RUN uv venv /venv
ENV PATH="/venv/bin:$PATH"
RUN uv pip install -r pyproject.toml

# Production stage
FROM python:3.13-slim as production

# Set metadata labels
LABEL maintainer="Clear File Team"
LABEL org.opencontainers.image.title="Clear File Backend"
LABEL org.opencontainers.image.description="File management system with pattern-based operations"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Create application directories
RUN mkdir -p /app/db /app/uploads /app/temp /app/logs \
    && chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV APP_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

# Expose port
EXPOSE 8000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/system/health || exit 1

# Switch to non-root user
USER appuser

# Run application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]