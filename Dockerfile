# =============================================================================
# Build stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS builder

# Build-time environment variables
ARG NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_SKIP_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Configure apt to use Nexus mirrors
RUN echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-main-bookworm bookworm main" > /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-de-bookworm bookworm main" >> /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-security-bookworm bookworm main" >> /etc/apt/sources.list

# Update system packages and install build dependencies
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -qq && \
    apt-get --only-upgrade install -y --no-install-recommends \
        libldap-2.5-0 \
        libpam-modules \
        libpam-modules-bin \
        libpam-runtime \
        libpam0g \
        zlib1g || true && \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        gcc \
        libc6-dev \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Configure npm for better network reliability and install dependencies
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm ci --legacy-peer-deps --include=optional --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the application
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm run build

# =============================================================================
# Production stage
# =============================================================================
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8502 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Configure apt to use Nexus mirrors
RUN echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-arvancloud-bookworm/ bookworm main" > /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-arvancloud-security-bookworm/ bookworm main" > /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-main-bookworm bookworm main" > /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-de-bookworm bookworm main" >> /etc/apt/sources.list && \
    echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-security-bookworm bookworm main" >> /etc/apt/sources.list

# Update system packages, create non-root user, and install runtime dependencies
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -qq && \
    apt-get --only-upgrade install -y --no-install-recommends \
        libldap-2.5-0 \
        libpam-modules \
        libpam-modules-bin \
        libpam-runtime \
        libpam0g \
        zlib1g || true && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    apt-get install -y --no-install-recommends \
        tini \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy build artifacts and app files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/data ./data
COPY --from=builder /app/public ./public

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 8502

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8502/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))" || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "start"]
