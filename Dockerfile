# syntax=docker/dockerfile:1.4

# =============================================================================
# Build stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:20-slim AS builder

# Install build dependencies for native modules (argon2, etc.)
# Combined into single layer to reduce image size
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        gcc \
        libc6-dev \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --legacy-peer-deps --include=optional --prefer-offline --no-audit

# Copy source code
COPY . .

# Generate Prisma Client (required before build)
RUN npx prisma generate

# Build the application
# Using BuildKit cache mount for .next directory
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm run build

# =============================================================================
# Production stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:20-slim AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production \
    PORT=8502 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Create a non-root user and install tini and curl in a single layer
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        tini \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    chown -R nextjs:nodejs /app

# Copy necessary files from builder
# Using --chown to set ownership during copy (more efficient)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy standalone output (includes server.js and minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files if needed (for migrations at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 8502

# Health check - checks the health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8502/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))" || exit 1

# Use tini as entrypoint for proper signal handling (PID 1)
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the Next.js server
CMD ["node", "server.js"]

