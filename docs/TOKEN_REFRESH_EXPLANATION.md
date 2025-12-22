# Token Refresh Process Explanation

## Why `/api/auth/token/refresh` Doesn't Show in Network Tab

**This is NORMAL and EXPECTED!** 

The refresh endpoint is called **server-side** (from `proxySchemaRequest` and `proxyDataRequest`), not from the browser. When server-side code makes internal `fetch()` calls to other API routes, those requests:
- ✅ Happen on the server (Node.js)
- ✅ Don't appear in the browser's Network tab
- ✅ Are invisible to the browser (by design)

**Only client-side requests** (from React components, `useEffect`, etc.) appear in the Network tab.

## The Complete Flow

### 1. **Browser Request**
```
Browser → GET /api/schemas/change-categories
```

### 2. **Server-Side API Route Handler** (`proxySchemaRequest`)
- Checks cookies for `access_token`
- If missing, checks for `refresh_token`
- If refresh token exists, calls refresh endpoint **server-side**

### 3. **Server-Side Refresh** (Internal, not visible in Network tab)
```
Server → POST /api/auth/token/refresh (internal fetch)
         ↓
Server → POST http://cg-gr-api-dev-1.cinnagen.com:8505/refresh (external)
         ↓
Server ← New tokens + Set-Cookie headers
         ↓
Server → Sets cookies in refresh response
```

### 4. **API Route Extracts Tokens**
- Extracts `accessToken` from refresh response
- Extracts `Set-Cookie` headers from refresh response
- Uses new `accessToken` to call backend

### 5. **Backend Call**
```
Server → GET http://cg-gr-api-dev-1.cinnagen.com:3002/api/schemas/...
         Headers: Authorization: Bearer <new_access_token>
```

### 6. **Response to Browser**
```
Server → Browser
         Status: 200 or 401
         Headers: Set-Cookie: access_token=...; Set-Cookie: refresh_token=...
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

## Summary

1. **Refresh endpoint not in Network tab?** ✅ Normal - it's server-side
2. **Multiple refresh attempts?** ✅ Fixed - using cache coordinator
3. **Cookies not set?** ✅ Fixed - Set-Cookie headers are extracted and added
4. **Backend rejects token?** 🔍 Still investigating

The process is now working correctly on our side - the remaining issue is why the backend rejects the refreshed token.



