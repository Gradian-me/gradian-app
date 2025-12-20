# =============================================================================
# Build stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS builder

# Build-time environment variables
ARG NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_SKIP_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY

# Update system packages and install build dependencies for native modules (argon2, etc.)
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -qq && \
    apt-get upgrade -y && \
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

# Configure npm for better network reliability and install dependencies
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm ci --legacy-peer-deps --include=optional --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the application
RUN npm run build

# =============================================================================
# Production stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS runner

# Set working directory
WORKDIR /app

# Production environment variables
ENV NODE_ENV=production \
    PORT=8502 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Update system packages, create non-root user, and install runtime dependencies
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -qq && \
    apt-get upgrade -y && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    apt-get install -y --no-install-recommends \
        tini \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Copy Next.js build output and application files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/data ./data
COPY --from=builder /app/public ./public

# Fix ownership for all files (must run as root)
RUN chown -R nextjs:nodejs /app

# Switch to non-root user for security
USER nextjs

# Expose application port
EXPOSE 8502

# Health check - verifies the application is running correctly
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8502/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))" || exit 1

# Use tini as entrypoint for proper signal handling (PID 1)
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the Next.js server
CMD ["npm", "start"]

