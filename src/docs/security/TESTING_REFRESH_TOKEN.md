# Testing Refresh Token Flow

## Method 1: Manual Token Removal (Fastest)

### Steps:
1. **Login to your app** - Make sure you're logged in successfully
2. **Open Browser DevTools** (F12)
3. **Clear client-side access token** (stored in memory):
   ```javascript
   // In browser console:
   import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
   authTokenManager.clearAccessToken();
   ```
4. **Trigger an API call**:
   - Navigate to a page that makes API calls
   - OR open Network tab and watch for requests
5. **Check the Network tab**:
   - You should see a request to `/api/auth/token/refresh`
   - Then the original request should retry successfully
   - Check server logs for `[ServerTokenCache]` entries

### Expected Behavior:
- ✅ Automatic refresh call to `/api/auth/token/refresh`
- ✅ Server stores new access token in global cache
- ✅ Client stores new access token in memory
- ✅ Original request retries and succeeds
- ✅ No redirect to login (refresh token still valid)
- ✅ Server cache lookup works as fallback

---

## Method 2: Wait for Natural Expiration (Realistic)

### Steps:
1. **Login to your app**
2. **Note the current time** - Access token expires in 899 seconds (~15 minutes)
3. **Keep the app open** and wait for token expiration
4. **Trigger an API call** (navigate, refresh page, etc.)
5. **Check Network tab** for automatic refresh
6. **Check server logs** for cache operations

### Expected Behavior:
- ✅ After 15 minutes, next API call triggers refresh
- ✅ Server stores new access token in global cache
- ✅ Client stores new access token in memory
- ✅ Request succeeds without user noticing
- ✅ Server cache persists across requests

---

## Method 3: Test Refresh Endpoint Directly

### Using Browser Console:
```javascript
// Test refresh endpoint
fetch('/api/auth/token/refresh', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
})
.then(res => res.json())
.then(data => {
  console.log('Refresh response:', data);
  // Check if new access_token cookie is set
  console.log('Cookies:', document.cookie);
})
.catch(err => console.error('Refresh error:', err));
```

### Using cURL:
```bash
# Get refresh token from cookies first, then:
curl -X POST http://localhost:3000/api/auth/token/refresh \
  -H "Content-Type: application/json" \
  -H "Cookie: refresh_token=YOUR_REFRESH_TOKEN_HERE" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN_HERE"}'
```

### Expected Response:
```json
{
  "success": true,
  "accessToken": "eyJhbGci...",
  "expiresIn": 899,
  "message": "Token refreshed successfully"
}
```

**Note**: The access token is:
- Returned in response body (for client to store in memory)
- Stored in server global cache (keyed by refresh token)
- NOT set as a cookie (stored in memory only)

---

## Method 4: Test Refresh Token Expiration (Redirect to Login)

### Steps:
1. **Login to your app**
2. **Open DevTools → Application → Cookies**
3. **Delete the refresh token cookie**:
   - `refresh_token` (this is the only auth cookie)
4. **Clear client-side access token** (in memory):
   ```javascript
   import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
   authTokenManager.clearAccessToken();
   ```
5. **Trigger an API call** or navigate to a protected page
6. **Check the behavior**

### Expected Behavior:
- ❌ Refresh token missing
- ✅ Redirect to `/authentication/login?returnUrl=...`
- ✅ User must login again

---

## Method 5: Test with Expired Refresh Token

### Steps:
1. **Login to your app**
2. **Manually expire the refresh token**:
   - Open DevTools → Application → Cookies
   - Edit `refresh_token` to an expired/invalid token
   - OR wait for refresh token to expire (604799 seconds = ~7 days)
3. **Clear client-side access token** (in memory):
   ```javascript
   import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
   authTokenManager.clearAccessToken();
   ```
4. **Trigger an API call**

### Expected Behavior:
- ❌ Refresh attempt fails (refresh token expired)
- ❌ Server cache lookup fails (no valid refresh token)
- ✅ Redirect to `/authentication/login?returnUrl=...`
- ✅ User must login again

---

## Method 6: Test Client-Side Interceptor

### Steps:
1. **Login to your app**
2. **Open DevTools → Network tab**
3. **Clear client-side access token** (in memory):
   ```javascript
   import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
   authTokenManager.clearAccessToken();
   ```
4. **Make an API call** (e.g., navigate to a page)
5. **Watch Network tab**:
   - First request may succeed (server cache lookup) OR return 401
   - If 401, automatic call to `/api/auth/token/refresh`
   - Original request retries with new token

### Expected Network Flow:
```
1. GET /api/data/something → 200 OK (server cache lookup) OR 401 Unauthorized
2. If 401: POST /api/auth/token/refresh → 200 OK (new token)
3. GET /api/data/something → 200 OK (retry successful)
```

**Note**: Server can look up access token from cache using refresh token, so 401 may not occur if server cache has the token.

---

## Method 7: Test Server-Side Cache Lookup

### Steps:
1. **Login to your app**
2. **Clear client-side access token** (in memory):
   ```javascript
   import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
   authTokenManager.clearAccessToken();
   ```
3. **Make an API call** (e.g., navigate to a page)
4. **Check server logs** for cache lookup activity

### Expected Behavior:
- ✅ Server detects missing access token in Authorization header
- ✅ Server extracts refresh token from HttpOnly cookie
- ✅ Server looks up access token from global cache
- ✅ Server validates token (with external token fallback)
- ✅ Request succeeds without client refresh needed
- ✅ Check logs for `[ServerTokenCache] ✅ Retrieved access token from server memory`

---

## Debugging Tips

### Check Console Logs:
Look for these log messages:
- `[AUTH_TOKEN]` - Client-side token operations
- `[API_AUTH]` - Server-side authentication checks
- `[ServerTokenCache]` - Server cache operations
- `[REFRESH_API]` - Token refresh endpoint
- `[LOGIN_LOG]` - Login/authentication logs

### Check Network Tab:
- Filter by "refresh" to see refresh calls
- Check request/response headers
- Verify cookies are being sent/received
- Check Authorization headers for access tokens

### Check Cookies:
- DevTools → Application → Cookies
- Verify `refresh_token` exists (HttpOnly cookie)
- **Note**: `access_token` is NOT in cookies (stored in memory only)

### Check Server Cache:
- Look for `[ServerTokenCache]` logs in server console
- Verify `cacheSize` increases after login
- Verify tokens are retrieved from cache on API requests

### Common Issues:
1. **Refresh not happening**: Check if `REQUIRE_LOGIN` is true
2. **Infinite redirect loop**: Check if you're on `/authentication/login` page
3. **Refresh fails**: Check refresh token is valid and not expired
4. **Cookies not set**: Check cookie settings (httpOnly, secure, sameSite)

---

## Quick Test Script

Save this in browser console after logging in:

```javascript
// Quick refresh token test
async function testRefresh() {
  console.log('🧪 Testing refresh token flow...');
  
  // 1. Check current tokens
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  // Check client-side access token (in memory)
  const { authTokenManager } = await import('@/gradian-ui/shared/utils/auth-token-manager');
  const clientToken = authTokenManager.getAccessToken();
  
  console.log('📋 Current state:', {
    hasRefreshTokenCookie: !!cookies.refresh_token,
    hasClientAccessToken: !!clientToken,
    clientTokenPreview: clientToken ? `${clientToken.substring(0, 20)}...` : null,
  });
  
  // 2. Clear client-side access token
  authTokenManager.clearAccessToken();
  console.log('🗑️ Cleared client-side access token (memory)');
  
  // 3. Try to refresh
  try {
    const response = await fetch('/api/auth/token/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    console.log('🔄 Refresh response:', {
      success: data.success,
      hasAccessToken: !!data.accessToken,
      expiresIn: data.expiresIn,
    });
    
    // 4. Check if client stored new token
    const newClientToken = authTokenManager.getAccessToken();
    console.log('✅ New client token:', {
      hasToken: !!newClientToken,
      tokenPreview: newClientToken ? `${newClientToken.substring(0, 20)}...` : null,
    });
    
    // 5. Check server cache (via API call)
    const testResponse = await fetch('/api/schemas?summary=true', {
      credentials: 'include',
    });
    console.log('✅ Server cache test:', {
      status: testResponse.status,
      authenticated: testResponse.status === 200,
    });
    
    if (newClientToken && testResponse.status === 200) {
      console.log('✅ SUCCESS: Token refresh and server cache working!');
    } else {
      console.log('❌ FAILED: Check server logs for details');
    }
  } catch (error) {
    console.error('❌ Refresh error:', error);
  }
}

// Run test
testRefresh();
```

---

## Testing Checklist

- [ ] Access token refresh works when access token expires
- [ ] Refresh token is used to get new access token
- [ ] Server stores new access token in global cache
- [ ] Client stores new access token in memory
- [ ] Original request retries successfully after refresh
- [ ] Server cache lookup works when client token is missing
- [ ] External tokens validated correctly (decode without signature verification)
- [ ] Redirect to login when refresh token is missing
- [ ] Redirect to login when refresh token is expired
- [ ] No infinite redirect loops
- [ ] Client-side interceptor works (401 → refresh → retry)
- [ ] Server-side cache lookup works (refresh token → access token from cache)
- [ ] Console logs show refresh activity (`[AUTH_TOKEN]`, `[REFRESH_API]`)
- [ ] Server logs show cache operations (`[ServerTokenCache]`, `[API_AUTH]`)
- [ ] Network tab shows refresh calls
- [ ] Server cache persists across requests (check `cacheSize` in logs)

