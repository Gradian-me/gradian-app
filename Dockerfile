# syntax=docker/dockerfile:1.4

# =============================================================================
# Build stage
# =============================================================================
FROM node:20-slim AS builder

# Install build dependencies for native modules (argon2, etc.)
# Combined into single layer to reduce image size
# Added DEBIAN_FRONTEND=noninteractive and retry logic to prevent hanging
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        gcc \
        libc6-dev \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps --include=optional --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the application
RUN npm run build

# =============================================================================
# Production stage
# =============================================================================
FROM node:20-slim AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production \
    PORT=8502 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Create a non-root user and install tini and curl in a single layer
# Added DEBIAN_FRONTEND=noninteractive to prevent hanging
RUN export DEBIAN_FRONTEND=noninteractive && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        tini \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    chown -R nextjs:nodejs /app

# Copy necessary files from builder
# Using --chown to set ownership during copy (more efficient)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy full Next.js build output (.next) and node_modules for non-standalone runtime
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.* ./

# Copy data directory (contains JSON files used at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 8502

# Health check - checks the health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8502/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))" || exit 1

# Use tini as entrypoint for proper signal handling (PID 1)
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the Next.js server using the standard `next start` script
CMD ["npm", "start"]

