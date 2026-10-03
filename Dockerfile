# ==============================================================================
# OpenWebProject - Multi-Stage Dockerfile
# Stage 1: Build the production static application
# Stage 2: Serve via ultra-lightweight Nginx Alpine (<25MB)
# ==============================================================================

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverage Docker layer caching)
COPY package.json ./
RUN npm install

# Copy source code and configuration
COPY tsconfig.json vite.config.ts index.html metadata.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Build optimized production bundle
RUN npm run build

# ---- Production Runner Stage ----
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy standalone single-file version as well for convenience
COPY --from=builder /app/OpenWebProject.html /usr/share/nginx/html/OpenWebProject.html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Document port 80
EXPOSE 80

# Health check to ensure Nginx is serving
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
