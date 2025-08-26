# Multi-stage Docker build for Clear File Frontend  
# Optimized for production deployment with security best practices

# Build stage
FROM node:20-alpine as builder

# Set build arguments
ARG APP_ENV=production
ARG BUILD_DATE
ARG VCS_REF

# Set working directory
WORKDIR /build

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:1.25-alpine as production

# Set metadata labels
LABEL maintainer="Clear File Team"
LABEL org.opencontainers.image.title="Clear File Frontend"
LABEL org.opencontainers.image.description="React frontend for file management system"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF

# Copy built application
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user (nginx already runs as nginx user)
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]