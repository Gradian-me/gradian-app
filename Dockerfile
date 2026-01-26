# ---------------------------
# Dependencies stage
# ---------------------------
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS deps

WORKDIR /app

# Configure apt to use Nexus mirrors
# RUN echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-main-bookworm bookworm main" > /etc/apt/sources.list && \
#     echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-de-bookworm bookworm main" >> /etc/apt/sources.list && \
#     echo "deb [trusted=yes] https://reg.cinnagen.com/repository/apt-debian-security-bookworm bookworm main" >> /etc/apt/sources.list

# Update system packages and install runtime dependencies 
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
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install only production dependencies
COPY package.json package-lock.json* ./

RUN npm ci --registry=https://reg.cinnagen.com/repository/npm-group/ --only=production \
    && npm cache clean --force \
    && rm -rf /tmp/* /var/tmp/* /root/.npm /root/.node-gyp

# ---------------------------
# Builder stage
# ---------------------------
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS builder

WORKDIR /app

# Build-time environment variables
ARG NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_SKIP_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY
ENV NEXT_TELEMETRY_DISABLED=1

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

# Copy package files and install all dependencies for build
COPY package.json package-lock.json* ./

# Configure npm for better network reliability and install dependencies
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm ci --legacy-peer-deps --include=optional --prefer-offline --no-audit \
    && npm cache clean --force

# Copy source code and build
COPY . .

RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm run build \
    && npm cache clean --force \
    && rm -rf /tmp/* /var/tmp/* /root/.npm /root/.node-gyp \
    && find /app/node_modules -type f -name "*.md" -delete \
    && find /app/node_modules -type f -name "*.txt" -delete \
    && find /app/node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -type f -name "*.test.js" -delete 2>/dev/null || true

# ---------------------------
# Setup stage - Prepare files with proper ownership
# ---------------------------
FROM reg.cinnagen.com:8083/node:25.2.1-slim AS setup

WORKDIR /app

# Create non-root user with home directory (matching distroless nonroot uid 65532)
RUN groupadd -g 65532 nonroot && \
    useradd -u 65532 -g nonroot -d /home/nonroot -s /bin/sh -m nonroot

# Copy only the necessary build artifacts from standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/healthcheck.js ./healthcheck.js

# Create uploads folder and set restrictive permissions
RUN mkdir -p /app/public/uploads /home/nonroot && \
    chown -R nonroot:nonroot /app /home/nonroot && \
    chmod -R 755 /app && \
    chmod -R 750 /app/public/uploads && \
    chmod 700 /home/nonroot && \
    find /app -type f -perm /4000 -exec chmod -s {} \; 2>/dev/null || true && \
    find /app -type f -perm /2000 -exec chmod -s {} \; 2>/dev/null || true && \
    find /app -type d -perm /4000 -exec chmod -s {} \; 2>/dev/null || true && \
    find /app -type d -perm /2000 -exec chmod -s {} \; 2>/dev/null || true && \
    rm -rf /tmp/* /var/tmp/* /root/.npm /root/.node-gyp

# ---------------------------
# Runner stage
# ---------------------------
FROM reg.cinnagen.com:8083/distroless/nodejs24-debian13 AS runner

WORKDIR /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=8502
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Copy files from setup stage with proper ownership
# Distroless runs as nonroot (uid 65532) by default, matching our setup
COPY --from=setup --chown=65532:65532 /app ./

# Explicitly set user to nonroot (uid 65532)
USER 65532:65532

EXPOSE 8502

# Health check using dedicated script
# Checks /api/health endpoint and verifies JSON response has status: "healthy"
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["node", "healthcheck.js"]

CMD ["server.js"]
