# =============================================================================
# Build stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS builder

# Accept build-time env vars needed for client bundle
ARG NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_SKIP_KEY
ENV NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY

# Install build dependencies for native modules (argon2, etc.)
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
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production \
    PORT=8502 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Create a non-root user and install tini and curl in a single layer
RUN export DEBIAN_FRONTEND=noninteractive && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        tini \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Copy full Next.js build output and critical files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/data ./data

# Copy public folder as root, then fix ownership (public assets not loading can be due to bad ownership/permissions)
COPY --from=builder /app/public ./public

# Fix permissions for everything, including /app/public (must run as root)
RUN chown -R nextjs:nodejs /app

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

