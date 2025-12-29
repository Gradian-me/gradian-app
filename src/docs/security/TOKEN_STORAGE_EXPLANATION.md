# Token Storage & Logging Guide

## 🔐 Token Storage Locations

### Access Token
- **Client Storage**: **MEMORY ONLY** (JavaScript variable in browser)
  - Stored in `authTokenManager` private variable
  - **NOT stored in**: Cookies, localStorage, sessionStorage
  - **Why**: Security best practice - tokens in memory are cleared on page refresh/close
- **Server Storage**: **SERVER MEMORY (Global Cache)** (keyed by refresh token)
  - Stored in `globalThis` cache for persistence across requests
  - Keyed by refresh token for lookup
  - Used when client token is missing or expired
  - Persists across serverless/edge function invocations
- **Visibility**: You **WON'T** see access token in:
  - Browser DevTools → Application → Cookies ❌
  - Browser DevTools → Application → Local Storage ❌
  - Browser DevTools → Application → Session Storage ❌
- **How to verify**: Check browser console logs with `[AUTH_TOKEN]` prefix
- **Server logs**: Check `[ServerTokenCache]` and `[API_AUTH]` logs

### Refresh Token
- **Storage**: **HttpOnly Cookie** (set by server)
- **Visibility**: You **WILL** see refresh token in:
  - Browser DevTools → Application → Cookies ✅ (as `refresh_token`)
- **Security**: HttpOnly means JavaScript cannot access it (prevents XSS attacks)
- **Sent automatically**: With every request via `credentials: 'include'`
- **Used for**: Looking up access token from server-side cache

## 📊 How to Verify Token Flow

### 1. Open Browser Console
Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

### 2. Filter Logs
Use these prefixes to filter logs:
- `[AUTH_TOKEN]` - Token manager operations
- `[API_CLIENT]` - API request/response with tokens
- `[REFRESH_API]` - Server-side refresh endpoint
- `[LOGIN_API]` - Server-side login endpoint
- `[LOGIN]` - Client-side login page
- `[LOGOUT_FLOW]` - Logout flow operations

### 3. Expected Flow After Login

#### Step 1: Login
```
[LOGIN_API] Login successful
  - accessTokenStorage: "STORED IN SERVER MEMORY (keyed by refresh_token)"
  - refreshTokenStorage: "SET IN HTTPONLY COOKIE via Set-Cookie headers"
  - accessTokenInCookie: false
  - refreshTokenInCookie: true

[ServerTokenCache] ✅ Stored access token in server memory
  - cacheSize: 1
  - usingGlobalCache: true

[LOGIN] Storing access token in memory...
[AUTH_TOKEN] setAccessToken()
  - hasToken: true
  - storage: "MEMORY_ONLY (not in cookies/localStorage)"
```

#### Step 2: Making API Request
```
[API_CLIENT] request() - token retrieval
  - hasAccessToken: true
  - tokenStorage: "MEMORY_ONLY (not in cookies)"
  - tokenPreview: "eyJhbGciOiJIUzI1NiIs..."

[API_CLIENT] request() - Authorization header added

[API_AUTH] REQUIRE_LOGIN is true, checking authentication
[API_AUTH] Attempting to retrieve access token from server-side cache
[ServerTokenCache] Looking up access token
  - cacheSize: 1
  - usingGlobalCache: true
[ServerTokenCache] ✅ Retrieved access token from server memory
[API_AUTH] ✅ Retrieved access token from server-side cache using refresh token
[API_AUTH] Validating token
[API_AUTH] Token validation result: valid: true, userId: "..."
[API_AUTH] ✅ Authentication successful
```

#### Step 3: Token Expired (401)
```
[API_CLIENT] request() - 401 received, attempting token refresh and retry
[AUTH_TOKEN] handleUnauthorized() - 401 received, refreshing token
[AUTH_TOKEN] refreshAccessToken() called
[AUTH_TOKEN] performRefresh() - calling /api/auth/token/refresh
[REFRESH_API] POST /api/auth/token/refresh - request received
[REFRESH_API] Refresh token source: "cookie"
[REFRESH_API] Refresh SUCCESS
  - responseFormat: "accessToken in body (NOT in cookie)"
  - clientStorage: "MEMORY_ONLY"
[AUTH_TOKEN] performRefresh() - SUCCESS
  - tokenStored: true
  - storageLocation: "MEMORY (not in cookies)"
[API_CLIENT] request() - token refreshed, retrying request
```

#### Step 4: Logout
```
[LOGOUT_FLOW] ========== LOGOUT STARTED ==========
[LOGOUT_FLOW] Calling logout API...
[LOGOUT_FLOW] Logout API call successful
[LOGOUT_FLOW] In-memory access token cleared
[LOGOUT_FLOW] User store cleared
[LOGOUT_FLOW] Company store cleared
[LOGOUT_FLOW] Tenant store cleared
[LOGOUT_FLOW] Menu items cache cleared
[LOGOUT_FLOW] ========== LOGOUT CLEANUP COMPLETED ==========
[LOGOUT_FLOW] Redirecting to login: /authentication/login?returnUrl=...
```

### 4. Check Cookies (Refresh Token Only)
1. Open DevTools → Application tab
2. Click "Cookies" → Your domain
3. Look for `refresh_token` cookie ✅
4. You should **NOT** see `access_token` cookie ❌

### 5. Verify Access Token Storage
**Client-side (Memory):**
Access token is stored in a private variable in `authTokenManager`. To check:
```javascript
// In browser console:
import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
const token = authTokenManager.getAccessToken();
console.log('Access token:', token ? `${token.substring(0, 20)}...` : 'null');
```

**Server-side (Global Cache):**
Access tokens are stored in server memory (global cache) keyed by refresh token:
- Check server logs for `[ServerTokenCache]` entries
- Cache persists across requests using `globalThis`
- Lookup happens automatically when refresh token is in cookies

## 🔍 Troubleshooting

### Issue: "I don't see access token in cookies"
✅ **This is CORRECT!** Access tokens are stored in memory only for security.

### Issue: "I see refresh token in cookies"
✅ **This is CORRECT!** Refresh tokens are in HttpOnly cookies.

### Issue: "Token refresh keeps failing"
Check logs for:
- `[REFRESH_API] No refresh token found` - Refresh token cookie missing
- `[AUTH_TOKEN] performRefresh() - refresh failed` - Check error details
- `[API_CLIENT] request() - 401 received` - Token expired, refresh should trigger

### Issue: "Login page keeps reloading"
Check logs for:
- `[AUTH_TOKEN] getValidAccessToken() - skipped (on login page)` - Should see this
- `[AUTH_TOKEN] refreshAccessToken() skipped - on login page` - Should see this

## 📝 Log Prefixes Reference

| Prefix | Location | What It Logs |
|--------|----------|--------------|
| `[AUTH_TOKEN]` | Client | Token manager operations (get, set, refresh) |
| `[API_CLIENT]` | Client | API requests with token handling |
| `[API_AUTH]` | Server | API route authentication checks |
| `[ServerTokenCache]` | Server | Server-side token cache operations |
| `[REFRESH_API]` | Server | Refresh endpoint processing |
| `[LOGIN_API]` | Server | Login endpoint processing |
| `[LOGIN]` | Client | Login page operations |
| `[LOGOUT_FLOW]` | Client | Logout flow (API call, cleanup, redirect) |
| `[INFRA_LOG]` | Server | Infrastructure logs (cache operations) |

## 🎯 Quick Verification Checklist

- [ ] After login, see `[ServerTokenCache] ✅ Stored access token in server memory`
- [ ] After login, see `[AUTH_TOKEN] setAccessToken()` with `storage: "MEMORY_ONLY"`
- [ ] In cookies, see `refresh_token` but **NOT** `access_token`
- [ ] API requests show `[API_AUTH] ✅ Retrieved access token from server-side cache`
- [ ] API requests show `[API_AUTH] ✅ Authentication successful`
- [ ] On 401, see `[AUTH_TOKEN] performRefresh()` and `[REFRESH_API] Refresh SUCCESS`
- [ ] After refresh, see `[ServerTokenCache] ✅ Stored access token in server memory`
- [ ] After refresh, see `[AUTH_TOKEN] performRefresh() - SUCCESS` with `storageLocation: "MEMORY"`
- [ ] On logout, see `[LOGOUT_FLOW]` logs showing complete cleanup
- [ ] After logout, verify all cookies and localStorage are cleared

