# ---------------------------
# Dependencies stage (production deps only)
# ---------------------------
    FROM reg.cinnagen.com:8083/node:25.2.1-slim AS deps

    WORKDIR /app
    
    # Copy package files and npm config
    COPY package.json package-lock.json* .npmrc* ./
    
    # Configure npm to use internal registry + retry settings
    RUN npm config set registry https://reg.cinnagen.com/repository/npm-group/ && \
        npm config set fetch-retries 5 && \
        npm config set fetch-retry-mintimeout 20000 && \
        npm config set fetch-retry-maxtimeout 120000 && \
        npm config set fetch-timeout 300000
    
    # Install production dependencies – no cache mount
    RUN npm ci --only=production \
        && npm cache clean --force \
        && rm -rf /tmp/* /var/tmp/* /root/.npm /root/.node-gyp
    
    
    # ---------------------------
    # Builder stage
    # ---------------------------
    FROM reg.cinnagen.com:8083/node:25.2.1-slim AS builder
    
    WORKDIR /app
    
    # Build-time environment variables (optional – can also be set at container runtime)
    ARG NEXT_PUBLIC_ENCRYPTION_KEY
    ARG NEXT_PUBLIC_SKIP_KEY
    ARG URL_LOOKUP_CRUD
    ARG URL_DATA_CRUD
    ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
    ENV NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY
    ENV URL_LOOKUP_CRUD=$URL_LOOKUP_CRUD
    ENV URL_DATA_CRUD=$URL_DATA_CRUD
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # Copy package files and npm config
    COPY package.json package-lock.json* .npmrc* ./
    
    # Same npm registry + retry config
    RUN npm config set registry https://reg.cinnagen.com/repository/npm-group/ && \
        npm config set fetch-retries 5 && \
        npm config set fetch-retry-mintimeout 20000 && \
        npm config set fetch-retry-maxtimeout 120000 && \
        npm config set fetch-timeout 300000
    
    # Install all dependencies (dev + prod) – no cache mount
    RUN npm ci --legacy-peer-deps --include=optional --no-audit \
        && npm cache clean --force
    
    # Copy full source code
    COPY . .
    
    # Build the application – no cache mount for .next
    RUN npm run build \
        && npm cache clean --force \
        && rm -rf /tmp/* /var/tmp/* /root/.npm /root/.node-gyp \
        && find /app/node_modules -type f -name "*.md"       -delete 2>/dev/null || true \
        && find /app/node_modules -type f -name "*.txt"      -delete 2>/dev/null || true \
        && find /app/node_modules -type d -name "test"       -exec rm -rf {} + 2>/dev/null || true \
        && find /app/node_modules -type d -name "tests"      -exec rm -rf {} + 2>/dev/null || true \
        && find /app/node_modules -type d -name "__tests__"  -exec rm -rf {} + 2>/dev/null || true \
        && find /app/node_modules -type f -name "*.test.js"  -delete 2>/dev/null || true
    
    
    # ---------------------------
    # Setup stage (permissions + artifact copy)
    # ---------------------------
    FROM reg.cinnagen.com:8083/node:25.2.1-slim AS setup
    
    WORKDIR /app
    
    # Create non-root user
    RUN groupadd -g 65532 nonroot && \
        useradd -u 65532 -g nonroot -d /home/nonroot -s /bin/sh -m nonroot
    
    # Copy only necessary build artifacts
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static    ./.next/static
    COPY --from=builder /app/public          ./public
    COPY --from=builder /app/data            ./data
    COPY --from=builder /app/healthcheck.js  ./healthcheck.js
    
    # Prepare directories & permissions
    RUN mkdir -p /app/public/uploads /home/nonroot && \
        chown -R nonroot:nonroot /app /home/nonroot && \
        chmod -R 755 /app && \
        chmod -R 750 /app/public/uploads && \
        chmod 700 /home/nonroot
    
    
    # ---------------------------
    # Final runner stage – distroless
    # ---------------------------
    FROM reg.cinnagen.com:8083/distroless/nodejs24-debian13 AS runner
    
    WORKDIR /app
    
    # Optional: bake URL_LOOKUP_CRUD / URL_DATA_CRUD into image via --build-arg; else set at container runtime
    ARG URL_LOOKUP_CRUD
    ARG URL_DATA_CRUD
    ENV URL_LOOKUP_CRUD=$URL_LOOKUP_CRUD
    ENV URL_DATA_CRUD=$URL_DATA_CRUD
    
    ENV NODE_ENV=production
    ENV PORT=8502
    ENV HOSTNAME="0.0.0.0"
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # Copy everything from setup stage with correct ownership
    COPY --from=setup --chown=65532:65532 /app ./
    
    USER 65532:65532
    
    EXPOSE 8502
    
    HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
        CMD ["node", "healthcheck.js"]
    
    CMD ["server.js"]