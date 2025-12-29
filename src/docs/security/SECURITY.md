# Security Guidelines

This document outlines security measures implemented to protect sensitive data from exposure in browser DevTools and client-side inspection.

## Overview

The application implements multiple layers of security to prevent sensitive data from being exposed through React DevTools, browser console, or client-side inspection tools.

## Security Features

### 1. React DevTools Protection

React DevTools are automatically disabled in production builds to prevent inspection of component state, props, and hooks.

**Implementation:**
- `src/gradian-ui/shared/utils/security.util.ts` - Core security utilities
- `src/components/security/SecurityProvider.tsx` - Security initialization component

**Configuration:**
- DevTools are disabled when `NODE_ENV=production`
- Can be explicitly disabled with `NEXT_PUBLIC_DISABLE_DEVTOOLS=true`

### 2. Zustand Store Security

All Zustand stores use conditional DevTools that are automatically disabled in production.

**Stores Updated:**
- `user.store.ts` - User data sanitized before storage
- `company.store.ts` - Company data sanitized
- `tenant.store.ts` - Tenant data sanitized
- `dashboard.store.ts` - Dashboard data sanitized
- `dynamic-form-context.store.ts` - Form data sanitized
- `ai-response.store.ts` - AI responses (already encrypted)
- `language.store.ts` - Language preference

**Implementation:**
- `src/gradian-ui/shared/utils/zustand-devtools.util.ts` - Conditional DevTools wrapper

### 3. Data Sanitization

Sensitive data is automatically sanitized before being stored in React state.

**Sanitized Fields:**
- `password`
- `token`
- `accessToken`
- `refreshToken`
- `secret`
- `apiKey`
- `privateKey`
- `creditCard`
- `ssn`
- `socialSecurityNumber`
- `passport`

**Usage:**
```typescript
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';

const sanitizedUser = sanitizeNestedData(userData);
```

### 4. Secure Token Storage

**Important:** Tokens should NEVER be stored in localStorage or React state.

**Current Implementation:**
- **Client-side**: Access tokens stored in **memory only** (not in cookies or localStorage)
- **Server-side**: Access tokens stored in **global cache** (server memory, keyed by refresh token)
- Refresh tokens are stored in httpOnly cookies (set by server)
- localStorage token storage has been removed from login flow
- Tokens are automatically sent with requests via Authorization header (client) or server cache lookup

**Best Practices:**
1. Server sets refresh tokens as httpOnly cookies (prevents XSS)
2. Client stores access tokens in memory only (cleared on page refresh)
3. Server stores access tokens in global cache (persists across requests, keyed by refresh token)
4. API routes can look up access tokens from server cache using refresh token from cookies
5. Cookies use `secure` flag in production (HTTPS only)
6. Cookies use `sameSite=lax` to prevent CSRF while allowing navigation
7. Never expose tokens in client-side code
8. Server cache uses `globalThis` for persistence in serverless/edge environments

**Migration Utility:**
```typescript
import { migrateTokensToCookies } from '@/gradian-ui/shared/utils/token-storage.util';

// Migrate existing localStorage tokens to cookies
await migrateTokensToCookies();
```

### 5. Centralized Logout Flow

**Implementation:**
- **File**: `src/gradian-ui/shared/utils/logout-flow.ts`
- Centralized logout logic prevents code duplication
- Ensures complete cleanup on logout

**What Gets Cleared:**
1. Calls `/api/auth/logout` API to invalidate server-side session
2. Clears in-memory access token
3. Clears all cookies (access_token, refresh_token, session_token, user_session_id)
4. Clears all localStorage stores (user-store, company-store, tenant-store, menu-items-store, language-store, etc.)
5. Clears all Zustand stores (user, company, tenant, menu-items)
6. Redirects to login page with returnUrl

**Usage:**
```typescript
import { performLogout } from '@/gradian-ui/shared/utils/logout-flow';

// Complete logout with redirect
await performLogout('User requested logout', false);

// Logout without redirect (for testing)
await performLogout('User requested logout', true);
```

### 6. AuthGuard Component

**Implementation:**
- **File**: `src/components/auth/AuthGuard.tsx`
- Prevents layout flash during authentication checks
- Shows loading spinner instead of authenticated layout
- Redirects to login if not authenticated

**Usage:**
The AuthGuard is automatically integrated into the root layout. It:
- Checks for refresh token before rendering children
- Shows loading spinner during auth check
- Redirects to login if not authenticated (without showing layout)
- Skips check for authentication pages

This ensures users don't see the authenticated layout flash before being redirected to login.

### 7. Environment Variables

**Never expose sensitive values in client-side code:**

✅ **Safe (Server-only):**
```env
DATABASE_URL=...
JWT_SECRET=...
API_KEY=...
```

❌ **Dangerous (Client-exposed):**
```env
NEXT_PUBLIC_API_KEY=...  # Visible in browser bundle
NEXT_PUBLIC_SECRET=...   # Visible in browser bundle
```

**Rule:** Any variable prefixed with `NEXT_PUBLIC_` is exposed to the browser and should NOT contain secrets.

### 8. Console Logging

In production:
- `console.log`, `console.debug`, `console.info`, `console.warn` are disabled
- `console.error` is preserved but sanitized to remove sensitive patterns

**Configuration:**
- Automatically applied in production builds
- Controlled by `SecurityProvider` component

### 9. Security Headers

Next.js security headers are configured to prevent common attacks:

- **Strict-Transport-Security** - Force HTTPS
- **X-Frame-Options** - Prevent clickjacking
- **X-Content-Type-Options** - Prevent MIME sniffing
- **X-XSS-Protection** - XSS protection
- **Content-Security-Policy** - Control resource loading
- **Referrer-Policy** - Control referrer information

See `next.config.ts` for full configuration.

## Developer Guidelines

### DO ✅

1. **Sanitize sensitive data before storing in state:**
   ```typescript
   const sanitized = sanitizeNestedData(userData);
   setUser(sanitized);
   ```

2. **Store tokens in httpOnly cookies (server-side):**
   ```typescript
   response.cookies.set('access_token', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict',
   });
   ```

3. **Use environment variables for server-only secrets:**
   ```typescript
   // Server-side only
   const secret = process.env.JWT_SECRET;
   ```

4. **Mask sensitive values in logs:**
   ```typescript
   import { maskSensitiveValue } from '@/gradian-ui/shared/utils/security.util';
   console.log('Token:', maskSensitiveValue(token)); // Shows only first/last 4 chars
   ```

### DON'T ❌

1. **Never store sensitive data in:**
   - React state without sanitization
   - localStorage
   - sessionStorage (unless encrypted)
   - Component props
   - URL parameters
   - Browser cookies (use httpOnly cookies instead)

2. **Never expose:**
   - API keys in client code
   - Secrets in environment variables prefixed with `NEXT_PUBLIC_`
   - Passwords or tokens in console logs
   - Sensitive data in error messages

3. **Never disable security in production:**
   - Always keep DevTools disabled in production
   - Always sanitize data before storage
   - Always use secure cookie flags in production

## Testing Security

### Verify DevTools are Disabled

1. Build for production: `npm run build`
2. Start production server: `npm start`
3. Open browser DevTools
4. Verify React DevTools are not available or show empty state

### Verify Token Storage

1. Login to the application
2. Check browser DevTools → Application → Storage
3. Verify access tokens are NOT in localStorage (stored in memory only on client)
4. Verify refresh tokens ARE in Cookies (httpOnly, secure)
5. Verify access tokens are NOT in cookies (stored in memory only on client)
6. Check server logs for `[ServerTokenCache] ✅ Stored access token in server memory`
7. Verify API authentication works by checking `[API_AUTH] ✅ Authentication successful` logs
8. Verify server cache lookup works when client token is missing

### Verify Data Sanitization

1. Check Zustand DevTools in development
2. Verify sensitive fields (password, token, etc.) are not present
3. Verify user data doesn't contain secrets

## Production Checklist

- [ ] React DevTools disabled
- [ ] Zustand DevTools disabled
- [ ] Console methods disabled/sanitized
- [ ] Access tokens stored in memory only on client (not in cookies or localStorage)
- [ ] Access tokens stored in server global cache (keyed by refresh token)
- [ ] Refresh tokens stored in httpOnly cookies only
- [ ] Server cache persists across requests (using `globalThis`)
- [ ] API authentication works with server cache lookup
- [ ] External tokens validated correctly (decode without signature verification)
- [ ] No sensitive data in localStorage
- [ ] All sensitive data sanitized before state storage
- [ ] Logout flow clears all cookies, localStorage, stores, and server cache
- [ ] AuthGuard prevents layout flash on auth redirect
- [ ] Security headers configured
- [ ] Environment variables properly scoped (no `NEXT_PUBLIC_` on secrets)
- [ ] CSP headers configured appropriately
- [ ] HTTPS enabled in production

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/going-to-production#security)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
- [Cookie Security](https://owasp.org/www-community/HttpOnly)

## Support

For security concerns or questions, please contact the development team.

