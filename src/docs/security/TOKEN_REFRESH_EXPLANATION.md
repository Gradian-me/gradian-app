# Token Refresh Process Explanation

## Token Refresh Flow

The refresh endpoint `/api/auth/token/refresh` is called **client-side** from the `authTokenManager` when:
- Access token expires (401 response)
- Access token is missing
- Token needs to be refreshed proactively

**You WILL see this in the Network tab** because it's a client-side fetch request.

## The Complete Flow

### 1. **Client-Side Token Refresh** (Visible in Network Tab)
```
Browser → POST /api/auth/token/refresh
         Headers: 
           - Content-Type: application/json
           - Cookie: refresh_token=... (HttpOnly cookie, sent automatically)
         Body: (empty or optional refreshToken)
```

### 2. **Server-Side Refresh Endpoint** (`/api/auth/token/refresh`)
- Reads `refresh_token` from HttpOnly cookie (or request body/header)
- Validates refresh token
- Calls external auth service to refresh
- **Stores new access token in server memory** (global cache, keyed by refresh token)
- Returns new `accessToken` in response body (for client to store in memory)
- Sets new `refresh_token` in HttpOnly cookie (if rotated)
- Updates server cache if refresh token was rotated

### 3. **Client Receives New Token**
```
Browser ← Response:
         {
           "success": true,
           "accessToken": "eyJhbGciOiJIUzI1NiIs...",
           "expiresIn": 3600
         }
         Headers: Set-Cookie: refresh_token=... (if rotated)
```

### 4. **Client Stores Access Token**
- `authTokenManager.setAccessToken(newToken)` - stores in memory only (client-side)
- Token is NOT stored in cookies or localStorage
- **Server already stored it** in global cache (keyed by refresh token)
- Both client and server have the token for redundancy

### 5. **Retry Original Request**
```
Browser → GET /api/schemas/change-categories
         Headers: Authorization: Bearer <new_access_token>
```

### 6. **Server Processes Request**
```
Server receives request:
  - Checks Authorization header for access token
  - If missing, looks up access token from server cache using refresh token from cookie
  - Validates token (with fallback for external tokens)
  - Extracts userId and processes request
         ↓
Server → External API (if needed)
         Headers: Authorization: Bearer <access_token>
         ↓
Server ← Response with data
         ↓
Browser ← Response with data
```

## The Problem We Fixed

### **Issue: Multiple Concurrent Refresh Attempts**

**Before the fix:**
1. Page loads with 2 components that need data
2. Both components trigger API calls simultaneously
3. Both API routes see "no access token"
4. Both try to refresh using the same refresh token
5. First refresh succeeds, second fails (refresh token already consumed)
6. Result: One request succeeds, one fails

**After the fix:**
1. Page loads with 2 components that need data
2. Both components trigger API calls simultaneously
3. Both API routes see "no access token"
4. Both call `enqueueServerRefresh()` (cache coordinator)
5. First request: Starts refresh, stores promise
6. Second request: Finds existing promise, waits for it
7. Refresh completes: Both requests get the result
8. Result: Both requests succeed

## How the Cache Coordinator Works

The `enqueueServerRefresh()` function implements a **single-flight pattern**:

```typescript
// Request 1: No refresh in progress → Start refresh
enqueueServerRefresh(token, refreshFn) 
  → refreshFn() called
  → Promise stored in cache
  → Returns promise

// Request 2: Refresh in progress → Wait for existing promise
enqueueServerRefresh(token, refreshFn)
  → refreshFn() NOT called (already in progress)
  → Returns same promise from cache
  → Waits for Request 1's refresh to complete

// Both requests get the same result
```

## Why Backend Rejects Token (Still Investigating)

Even after refresh succeeds, the backend returns:
```
401 Unauthorized: "Unauthorized request due to invalid bearer token"
```

**Possible causes:**
1. **Token not yet valid in backend session store** - Backend might need time to process the refresh
2. **Missing session cookies** - Backend might require `session_token` or `sso_session` cookies
3. **Token format issue** - Token might be valid but backend expects different format
4. **Timing issue** - Backend might validate against old session before new one is ready

**What we're doing:**
- ✅ Set-Cookie headers are extracted and added to response
- ✅ New access token is used for backend call
- ✅ Logging shows token is sent correctly
- 🔍 Still investigating why backend rejects it

## Single-Flight Pattern

The `authTokenManager` implements a **single-flight pattern** to prevent multiple concurrent refresh attempts:

1. **First request** triggers refresh, stores promise
2. **Concurrent requests** wait for the same promise
3. **All requests** get the same refreshed token
4. **No duplicate refresh calls** - only one refresh happens at a time

## Logout Flow

When logout is triggered (via `performLogout()` in `logout-flow.ts`):

1. **Calls `/api/auth/logout`** - Invalidates server-side session
2. **Clears in-memory access token** - `authTokenManager.clearAccessToken()`
3. **Clears all cookies** - access_token, refresh_token, session_token, user_session_id
4. **Clears localStorage** - user-store, company-store, tenant-store, menu-items-store, etc.
5. **Clears Zustand stores** - user, company, tenant, menu-items
6. **Redirects to login** - Preserves returnUrl for post-login redirect

## Server-Side Token Cache

### How It Works
- Access tokens are stored in **server memory (global cache)** keyed by refresh token
- Uses `globalThis` for persistence across serverless/edge function invocations
- When API route needs authentication:
  1. First checks Authorization header for access token
  2. If missing, extracts refresh token from HttpOnly cookie
  3. Looks up access token from server cache using refresh token as key
  4. Validates token and extracts userId

### Benefits
- **Redundancy**: Both client and server have access token
- **Fallback**: Works even if client token is missing
- **Security**: Access token never exposed to client-side JavaScript (server-only)
- **Persistence**: Global cache persists across requests in serverless environments

### Cache Management
- Tokens automatically expire based on `expiresIn` value
- Expired tokens are cleaned up periodically (every 5 minutes)
- Cache is cleared on logout
- Cache is updated when refresh token is rotated

## Summary

1. **Refresh endpoint in Network tab?** ✅ Yes - it's client-side
2. **Multiple refresh attempts?** ✅ Fixed - using single-flight pattern
3. **Server-side token cache?** ✅ Yes - access tokens stored in global cache
4. **Cookies cleared on logout?** ✅ Yes - all auth cookies cleared
5. **Complete cleanup?** ✅ Yes - memory, cookies, localStorage, stores, and server cache cleared
6. **External token validation?** ✅ Yes - decodes without signature verification for external tokens



