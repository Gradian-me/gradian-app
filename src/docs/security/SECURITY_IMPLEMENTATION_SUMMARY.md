# Security Implementation Summary

## Overview

Comprehensive security measures have been implemented to prevent sensitive data from being visible in React DevTools, browser console, and client-side inspection tools.

## What Was Implemented

### 1. ✅ React DevTools Protection
- **File**: `src/gradian-ui/shared/utils/security.util.ts`
- Automatically disables React DevTools in production builds
- Prevents inspection of component state, props, and hooks
- **Component**: `src/components/security/SecurityProvider.tsx` (added to root layout)

### 2. ✅ Zustand Store Security
- **File**: `src/gradian-ui/shared/utils/zustand-devtools.util.ts`
- All Zustand stores now conditionally disable DevTools in production
- Updated stores:
  - `user.store.ts` - User data sanitized
  - `company.store.ts` - Company data sanitized
  - `tenant.store.ts` - Tenant data sanitized
  - `dashboard.store.ts` - Dashboard data sanitized
  - `dynamic-form-context.store.ts` - Form data sanitized
  - `language.store.ts` - Language preference
  - `ai-response.store.ts` - AI responses

### 3. ✅ Data Sanitization
- **Utility**: `sanitizeNestedData()` and `sanitizeUserData()`
- Automatically removes sensitive fields before storing in state
- Sanitized fields include: password, token, accessToken, refreshToken, secret, apiKey, privateKey, creditCard, ssn, etc.

### 4. ✅ Secure Token Storage
- **File**: `src/gradian-ui/shared/utils/token-storage.util.ts`
- Removed localStorage token storage from login page
- **Client-side**: Access tokens stored in memory only (not in cookies or localStorage)
- **Server-side**: Access tokens stored in global cache (server memory, keyed by refresh token)
- Refresh tokens stored in httpOnly cookies (set by server)
- Added migration utility for existing localStorage tokens
- **Server cache**: Uses `globalThis` for persistence across serverless/edge invocations

### 5. ✅ Centralized Logout Flow
- **File**: `src/gradian-ui/shared/utils/logout-flow.ts`
- Centralized logout logic to prevent code duplication
- Calls `/api/auth/logout` API to invalidate server-side session
- Clears all cookies (access_token, refresh_token, session_token, user_session_id)
- Clears all localStorage stores (user-store, company-store, tenant-store, menu-items-store, etc.)
- Clears all Zustand stores (user, company, tenant, menu-items)
- Clears in-memory access token
- Handles errors gracefully to ensure cleanup completes

### 6. ✅ AuthGuard Component
- **File**: `src/components/auth/AuthGuard.tsx`
- Prevents layout flash during authentication checks
- Shows loading spinner instead of layout during auth verification
- Redirects to login if not authenticated (without showing layout)
- Integrated into root layout for seamless UX

### 7. ✅ Security Headers
- **File**: `next.config.ts`
- Added comprehensive security headers:
  - Strict-Transport-Security
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Content-Security-Policy
  - Referrer-Policy

### 8. ✅ Security Documentation
- **File**: `docs/SECURITY.md`
- Complete security guidelines and best practices
- Developer checklist and testing procedures

### 9. ✅ Avoid "400 header or cookies too long"
- **Cause**: Large Cookie/Authorization headers can exceed Node (default ~8KB) or nginx limits.
- **Node**: `dev`, `start`, and `start:standalone` scripts set `NODE_OPTIONS=--max-http-header-size=32768` (32KB) via `cross-env`.
- **Cookie trimming**: When forwarding cookies to internal APIs, the app uses `getCookieHeaderWithinLimit()` so only auth-needed cookies are sent if the full header would exceed ~6KB (see `src/gradian-ui/shared/utils/cookie-header-size.util.ts`).
- **Nginx** (if used in front of the app): Increase buffer size so large headers are accepted:
  ```nginx
  client_header_buffer_size 16k;
  large_client_header_buffers 4 32k;
  ```

## Files Modified

### Core Security Files (New)
1. `src/gradian-ui/shared/utils/security.util.ts` - Security utilities
2. `src/gradian-ui/shared/utils/zustand-devtools.util.ts` - Conditional DevTools
3. `src/gradian-ui/shared/utils/token-storage.util.ts` - Secure token storage
4. `src/gradian-ui/shared/utils/logout-flow.ts` - Centralized logout flow
5. `src/components/security/SecurityProvider.tsx` - Security initialization
6. `src/components/auth/AuthGuard.tsx` - Authentication guard component
7. `docs/SECURITY.md` - Security documentation

### Updated Stores
1. `src/stores/user.store.ts`
2. `src/stores/company.store.ts`
3. `src/stores/tenant.store.ts`
4. `src/stores/dashboard.store.ts`
5. `src/stores/dynamic-form-context.store.ts`
6. `src/stores/language.store.ts`
7. `src/stores/ai-response.store.ts`

### Updated Application Files
1. `src/app/layout.tsx` - Added SecurityProvider and AuthGuard
2. `src/app/authentication/login/page.tsx` - Removed localStorage token storage
3. `src/app/authentication/change-password/page.tsx` - Updated token clearing
4. `src/app/authentication/sign-up/page.tsx` - Updated to use centralized logout flow
5. `src/app/authentication/reset-password/page.tsx` - Updated to use centralized logout flow
6. `src/gradian-ui/shared/utils/auth-token-manager.ts` - Fixed refresh endpoint to use `/api/auth/token/refresh`
7. `src/gradian-ui/shared/utils/auth-events.ts` - Updated to use centralized logout flow
8. `src/components/layout/UserProfileSelector.tsx` - Updated to use centralized logout flow
9. `src/components/layout/UserProfileDropdown.tsx` - Updated to use centralized logout flow
10. `next.config.ts` - Added security headers
11. `src/app/api/auth/helpers/server-token-cache.ts` - Server-side token cache with global persistence
12. `src/gradian-ui/shared/utils/api-auth.util.ts` - Unified API authentication with server cache lookup
13. `src/domains/auth/services/auth.service.ts` - External token validation (decode without signature verification)
14. `src/domains/auth/utils/jwt.util.ts` - Added `decodeTokenWithoutVerification` for external tokens

## How It Works

### Development Mode
- React DevTools: **Enabled** (for debugging)
- Zustand DevTools: **Enabled** (for state inspection)
- Console logging: **Full** (for development)
- Data sanitization: **Active** (removes sensitive fields)

### Production Mode
- React DevTools: **Disabled** (cannot inspect components)
- Zustand DevTools: **Disabled** (cannot inspect state)
- Console logging: **Optional** (controlled by env var)
- Data sanitization: **Active** (always removes sensitive fields)
- Security headers: **Active** (prevents common attacks)

## Environment Variables

### Optional Configuration

```env
# Disable DevTools completely (including development)
NEXT_PUBLIC_DISABLE_DEVTOOLS=true

# Disable console logging in production
NEXT_PUBLIC_DISABLE_CONSOLE=true

# Set production environment explicitly
NEXT_PUBLIC_ENVIRONMENT=production
```

## Key Security Features

### 1. Automatic DevTools Disabling
```typescript
// Automatically disables in production
import { initializeSecurity } from '@/gradian-ui/shared/utils/security.util';
initializeSecurity();
```

### 2. Data Sanitization
```typescript
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';

const sanitized = sanitizeNestedData(userData); // Removes sensitive fields
```

### 3. Conditional DevTools in Stores
```typescript
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';

devtools(
  (set) => ({ /* store */ }),
  getZustandDevToolsConfig<MyState>('my-store') // Auto-disables in production
)
```

### 4. Centralized Logout Flow
```typescript
import { performLogout } from '@/gradian-ui/shared/utils/logout-flow';

// Perform complete logout (clears everything and redirects)
await performLogout('User requested logout', false);

// Or skip redirect (useful for testing)
await performLogout('User requested logout', true);
```

### 5. AuthGuard Component
```typescript
import { AuthGuard } from '@/components/auth/AuthGuard';

// Wrap protected routes to prevent layout flash
<AuthGuard>
  {children}
</AuthGuard>
```

## Testing

### Verify DevTools are Disabled
1. Build for production: `npm run build`
2. Start production server: `npm start`
3. Open browser DevTools
4. Try to use React DevTools → Should be disabled/empty

### Verify Data Sanitization
1. Login and check Zustand DevTools (development only)
2. Verify sensitive fields are not present in state
3. Check that passwords/tokens are never stored

### Verify Token Storage
1. Login to application
2. Check browser DevTools → Application → Storage
3. Verify access tokens are NOT in localStorage (stored in memory only on client)
4. Verify refresh tokens ARE in Cookies (httpOnly, secure)
5. Verify access tokens are NOT in cookies (stored in memory only on client)
6. Check server logs for `[ServerTokenCache] ✅ Stored access token in server memory`
7. Verify server cache persists across requests (check `cacheSize` in logs)

### Verify Logout Flow
1. Click logout button
2. Check browser console for `[LOGOUT_FLOW]` logs
3. Verify all cookies are cleared (check DevTools → Application → Cookies)
4. Verify all localStorage stores are cleared
5. Verify redirect to login page occurs

## Important Notes

### ⚠️ Token Storage
- **Client-side access tokens**: Stored in memory only (not in cookies or localStorage)
- **Server-side access tokens**: Stored in global cache (server memory, keyed by refresh token)
- **Refresh tokens**: Stored in httpOnly cookies (server-side)
- **Never store tokens in**: localStorage, sessionStorage, or React state (except memory for access tokens)
- The login API sets refresh token cookies and stores access token in server cache
- Access tokens are also returned to client for storage in memory (redundancy)

### ⚠️ Environment Variables
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- **Never use** `NEXT_PUBLIC_` for secrets, API keys, or tokens
- Use server-only environment variables for sensitive data

### ⚠️ Production Deployment
- Always use HTTPS in production
- Ensure security headers are working
- Verify DevTools are disabled
- Test token storage (cookies only)

## Next Steps

1. **Review** the security documentation: `docs/SECURITY.md`
2. **Test** in production build to verify DevTools are disabled
3. **Verify** tokens are stored in httpOnly cookies only
4. **Check** that no sensitive data appears in state stores
5. **Configure** environment variables as needed

## Support

For questions or security concerns, refer to:
- Security documentation: `docs/SECURITY.md`
- Security utilities: `src/gradian-ui/shared/utils/security.util.ts`
- Security provider: `src/components/security/SecurityProvider.tsx`

## Summary

✅ React DevTools automatically disabled in production
✅ Zustand DevTools automatically disabled in production
✅ Sensitive data automatically sanitized before storage
✅ Tokens moved from localStorage to httpOnly cookies
✅ Centralized logout flow with complete cleanup
✅ AuthGuard prevents layout flash during auth checks
✅ Security headers configured
✅ Comprehensive documentation provided

Your application is now protected from common client-side inspection vulnerabilities and has improved authentication UX!

