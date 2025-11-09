# ============================================================================
# Server Backend Dockerfile - Production-ready multi-stage build
# ============================================================================

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS dependencies

# Install security updates and dumb-init for proper signal handling
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /tmp/*

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for TypeScript)
RUN npm ci && npm cache clean --force

# Copy server source code and shared dependencies
COPY server/ ./server/
COPY src/shared/ ./src/shared/
COPY src/lib/ ./src/lib/

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM node:20-alpine AS production

# Install security updates and dumb-init
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy package files
COPY --chown=nodejs:nodejs package.json ./

# Copy application code from build stage
COPY --from=build --chown=nodejs:nodejs /app/server ./server
COPY --from=build --chown=nodejs:nodejs /app/src/shared ./src/shared
COPY --from=build --chown=nodejs:nodejs /app/src/lib ./src/lib

# Set NODE_ENV to production
ENV NODE_ENV=production

# Switch to non-root user
USER nodejs

# Expose port (can be overridden via environment variable)
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use dumb-init to handle signals properly (SIGTERM, SIGINT, etc.)
ENTRYPOINT ["dumb-init", "--"]

# Start the server using ts-node
CMD ["node", "-r", "ts-node/register", "-P", "server/tsconfig.json", "server/server.ts"]

