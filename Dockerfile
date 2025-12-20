# =============================================================================
# Build stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS builder

# Build-time environment variables
ARG NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_SKIP_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY

# Install only build dependencies for native modules (argon2, etc.)
# Using python3-minimal for smaller size
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        python3-minimal \
        make \
        g++ \
        gcc \
        libc6-dev && \
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
RUN npm run build && \
    # Remove devDependencies and unnecessary files to reduce size
    npm prune --production && \
    # Clean npm cache
    npm cache clean --force

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

# Create non-root user and install only essential runtime dependencies
# Removed curl (not needed - health check uses node)
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -qq && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    apt-get install -y --no-install-recommends \
        tini \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Copy only production files from builder (node_modules already pruned)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.* ./
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user for security (ownership already set via COPY --chown)
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

