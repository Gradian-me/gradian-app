# Environment Variables Requiring Docker Image Rebuild

This document lists all environment variables that, when changed, **require rebuilding the Docker image** because they are embedded at build time.

## Quick Answer: Variables That Do NOT Need Build Time

**All variables WITHOUT the `NEXT_PUBLIC_` prefix do NOT need to be available at build time.**

These can be set at runtime via `docker-compose.yml` or container environment variables. Examples:
- `JWT_SECRET`, `PEPPER`, `URL_DATA_CRUD`, `REQUIRE_LOGIN`, `ENABLE_LOGGING`, etc.
- See full list in the "Variables That Do NOT Require Rebuild" section below.

**Exception**: `OBFUSCATE` is a build configuration variable (not `NEXT_PUBLIC_*`) but affects the build process.

## Critical Build-Time Variables

These variables are explicitly passed as `ARG` in the Dockerfile and embedded into the Next.js build:

### 1. `NEXT_PUBLIC_ENCRYPTION_KEY`
- **Location**: `Dockerfile` lines 7-8
- **Usage**: SHA1 key for encrypt/decrypt operations
- **Why rebuild**: Embedded in client-side bundle during Next.js build
- **Build arg**: `--build-arg NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY`

### 2. `NEXT_PUBLIC_SKIP_KEY`
- **Location**: `Dockerfile` lines 9-10
- **Usage**: Skip key for authentication/authorization
- **Why rebuild**: Embedded in client-side bundle during Next.js build
- **Build arg**: `--build-arg NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY`

## Additional Build-Time Variables

These `NEXT_PUBLIC_*` variables are embedded at build time by Next.js (even if not explicitly in Dockerfile):

### 3. `NEXT_PUBLIC_CLIENT_ID`
- **Usage**: 2FA service client ID (client-side)
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 4. `NEXT_PUBLIC_SECRET_KEY`
- **Usage**: 2FA service secret key (client-side)
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 5. `NEXT_PUBLIC_SCHEMA_API_BASE`
- **Usage**: Schema API base path (default: `/api/schemas`)
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 6. `NEXT_PUBLIC_URL_DATA_CRUD`
- **Usage**: Backend data CRUD URL (client-side)
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 7. `NEXT_PUBLIC_URL_SCHEMA_CRUD`
- **Usage**: Backend schema CRUD URL (client-side)
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 8. `NEXT_PUBLIC_URL_SYNC_MAIL_TEMPLATE`
- **Usage**: Backend mail template sync URL (client-side)
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 9. `NEXT_PUBLIC_DEMO_MODE`
- **Usage**: Demo mode flag (client-side)
- **Location**: `src/gradian-ui/shared/configs/env-config.ts` line 53
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 10. `NEXT_PUBLIC_ENABLE_LOGGING`
- **Usage**: Enable logging flag (client-side)
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

### 11. `NEXT_PUBLIC_ENABLE_BUILDER`
- **Usage**: Enable builder UI flag (client-side)
- **Location**: `src/gradian-ui/shared/configs/env-config.ts` line 108
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time
- **Note**: Comment in code states: "In Next.js, NEXT_PUBLIC_* variables are embedded at build/start time. You must restart the dev server after changing this variable."

### 12. `NEXT_PUBLIC_ENABLE_NOTIFICATION`
- **Usage**: Enable notifications flag (client-side)
- **Location**: `src/gradian-ui/shared/configs/env-config.ts` line 91
- **Why rebuild**: `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time

## Build Configuration Variables

### 13. `OBFUSCATE`
- **Location**: `next.config.ts` line 84, `package.json` line 9
- **Usage**: Controls webpack obfuscation during build (`process.env.OBFUSCATE === "true"`)
- **Why rebuild**: Affects the build process itself, changing the output bundle
- **Build script**: `build:release` sets `OBFUSCATE=true` (see `package.json`)
- **Note**: Currently not passed as build arg in Dockerfile, but should be if you want to control obfuscation via build args

## Variables That Do NOT Require Rebuild (Runtime Only)

These variables **do NOT need to be available at build time** and can be changed at runtime via `docker-compose.yml` or container environment. They are only used in server-side API routes and are never embedded in the client bundle:

### Authentication & Security
- `AVALAI_API_KEY` - Server-side only, used in AI API routes
- `CLIENT_ID` - Server-side only, used in 2FA/auth routes
- `SECRET_KEY` - Server-side only, used in 2FA/auth routes
- `JWT_SECRET` - Server-side only, used for JWT token signing/verification
- `NEXTAUTH_SECRET` - Server-side only, used by NextAuth.js
- `NEXTAUTH_URL` - Server-side only, used by NextAuth.js
- `PEPPER` - Server-side only, used in password hashing (Argon2)
- `APP_ID` - Server-side only, used in external authentication
- `APP_SECRET_KEY` - Server-side only, used in external authentication

### Backend Service URLs (Server-Side Proxies)
- `URL_DATA_CRUD` - Server-side only, used in API proxy routes (`src/app/api/data/utils.ts`)
- `URL_SCHEMA_CRUD` - Server-side only, used in API proxy routes (`src/app/api/schemas/utils.ts`)
- `URL_SEND_EMAIL` - Server-side only, used in email API routes
- `URL_SYNC_MAIL_TEMPLATE` - Server-side only, used in email template sync
- `URL_AUTHENTICATION` - Server-side only, used in external auth routes
- `INTERNAL_API_BASE_URL` - Server-side only, fallback for internal API calls

### Feature Flags (Server-Side)
- `REQUIRE_LOGIN` - Server-side only, used in API route authentication checks
- `ENABLE_LOGGING` - Server-side only, controls server-side logging
- `LOGIN_LOCALLY` - Server-side only, enables local demo users
- `AD_MODE` - Server-side only, enables Active Directory mode
- `ENABLE_NOTIFICATION` - Server-side only (non-NEXT_PUBLIC version)
- `ENABLE_BUILDER` - Server-side only (non-NEXT_PUBLIC version)

### Development/Infrastructure
- `DEV_TENANT_DOMAIN` - Server-side only, used for local development tenant
- `GITLAB_TOKEN` - Server-side only, used in GitLab API routes
- `GITLAB_PROJECT_ID` - Server-side only, used in GitLab API routes
- `GITLAB_API_URL` - Server-side only, used in GitLab API routes
- `DATABASE_URL` - Server-side only (if used in future database connections)

### Why These Don't Need Build Time
These variables are:
1. **Only accessed in API routes** (`src/app/api/**`) which run on the server at request time
2. **Never imported in client-side code** - they don't appear in the Next.js client bundle
3. **Evaluated at runtime** - when API routes execute, not during the build process
4. **Can be changed without rebuild** - just restart the container or update `docker-compose.yml`

## How to Rebuild

### Using Docker Build
```bash
docker build \
  --build-arg NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY \
  --build-arg NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY \
  -t gradian-app:latest .
```

### Using GitLab CI
The GitLab CI pipeline (`.gitlab-ci.yml` line 83) automatically passes these build args:
```bash
docker build \
  --build-arg NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY \
  --build-arg NEXT_PUBLIC_SKIP_KEY=$NEXT_PUBLIC_SKIP_KEY \
  --tag="$CI_REGISTRY_IMAGE:latest" .
```

## Important Notes

1. **All `NEXT_PUBLIC_*` variables** are embedded at build time by Next.js, even if not explicitly listed as `ARG` in the Dockerfile. Changing any of them requires a rebuild.

2. **Server-side variables** (without `NEXT_PUBLIC_` prefix) can be changed at runtime without rebuilding.

3. **The Dockerfile currently only accepts 2 build args** (`NEXT_PUBLIC_ENCRYPTION_KEY` and `NEXT_PUBLIC_SKIP_KEY`). If you need to change other `NEXT_PUBLIC_*` variables, you should either:
   - Add them as `ARG` in the Dockerfile, or
   - Ensure they are available in the build environment when `npm run build` executes

4. **Best Practice**: If you frequently change `NEXT_PUBLIC_*` variables, consider adding them as `ARG` in the Dockerfile for explicit control.

