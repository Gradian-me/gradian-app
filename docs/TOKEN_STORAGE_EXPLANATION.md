# Token Storage & Logging Guide

## 🔐 Token Storage Locations

### Access Token
- **Storage**: **MEMORY ONLY** (JavaScript variable in browser)
- **NOT stored in**: Cookies, localStorage, sessionStorage
- **Why**: Security best practice - tokens in memory are cleared on page refresh/close
- **Visibility**: You **WON'T** see access token in:
  - Browser DevTools → Application → Cookies ❌
  - Browser DevTools → Application → Local Storage ❌
  - Browser DevTools → Application → Session Storage ❌
- **How to verify**: Check browser console logs with `[AUTH_TOKEN]` prefix

### Refresh Token
- **Storage**: **HttpOnly Cookie** (set by server)
- **Visibility**: You **WILL** see refresh token in:
  - Browser DevTools → Application → Cookies ✅ (as `refresh_token`)
- **Security**: HttpOnly means JavaScript cannot access it (prevents XSS attacks)
- **Sent automatically**: With every request via `credentials: 'include'`

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

### 3. Expected Flow After Login

#### Step 1: Login
```
[LOGIN_API] Login successful
  - accessTokenStorage: "RETURNED IN RESPONSE BODY (client stores in MEMORY)"
  - refreshTokenStorage: "SET IN HTTPONLY COOKIE"
  - accessTokenInCookie: false
  - refreshTokenInCookie: true

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

### 4. Check Cookies (Refresh Token Only)
1. Open DevTools → Application tab
2. Click "Cookies" → Your domain
3. Look for `refresh_token` cookie ✅
4. You should **NOT** see `access_token` cookie ❌

### 5. Verify Access Token in Memory
Access token is stored in a private variable in `authTokenManager`. To check:
```javascript
// In browser console:
import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
const token = authTokenManager.getAccessToken();
console.log('Access token:', token ? `${token.substring(0, 20)}...` : 'null');
```

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
| `[REFRESH_API]` | Server | Refresh endpoint processing |
| `[LOGIN_API]` | Server | Login endpoint processing |
| `[LOGIN]` | Client | Login page operations |

## 🎯 Quick Verification Checklist

- [ ] After login, see `[AUTH_TOKEN] setAccessToken()` with `storage: "MEMORY_ONLY"`
- [ ] In cookies, see `refresh_token` but **NOT** `access_token`
- [ ] API requests show `[API_CLIENT] request() - Authorization header added`
- [ ] On 401, see `[AUTH_TOKEN] performRefresh()` and `[REFRESH_API] Refresh SUCCESS`
- [ ] After refresh, see `[AUTH_TOKEN] performRefresh() - SUCCESS` with `storageLocation: "MEMORY"`

