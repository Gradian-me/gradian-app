# Testing Refresh Token Flow

## Method 1: Manual Cookie Manipulation (Fastest)

### Steps:
1. **Login to your app** - Make sure you're logged in successfully
2. **Open Browser DevTools** (F12)
3. **Go to Application tab → Cookies**
4. **Delete or corrupt the `access_token` cookie**:
   - Right-click `access_token` → Delete
   - OR edit it to an invalid value like `invalid_token`
5. **Trigger an API call**:
   - Navigate to a page that makes API calls
   - OR open Network tab and watch for requests
6. **Check the Network tab**:
   - You should see a request to `/api/auth/token/refresh`
   - Then the original request should retry successfully
   - Check that a new `access_token` cookie is set

### Expected Behavior:
- ✅ Automatic refresh call to `/api/auth/token/refresh`
- ✅ New access token cookie set
- ✅ Original request retries and succeeds
- ✅ No redirect to login (refresh token still valid)

---

## Method 2: Wait for Natural Expiration (Realistic)

### Steps:
1. **Login to your app**
2. **Note the current time** - Access token expires in 899 seconds (~15 minutes)
3. **Keep the app open** and wait, OR:
   - Use browser DevTools → Application → Cookies
   - Check the `access_token` cookie expiration time
   - Wait until after that time
4. **Trigger an API call** (navigate, refresh page, etc.)
5. **Check Network tab** for automatic refresh

### Expected Behavior:
- ✅ After 15 minutes, next API call triggers refresh
- ✅ New access token cookie set with new expiration
- ✅ Request succeeds without user noticing

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

---

## Method 4: Test Refresh Token Expiration (Redirect to Login)

### Steps:
1. **Login to your app**
2. **Open DevTools → Application → Cookies**
3. **Delete BOTH cookies**:
   - `access_token`
   - `refresh_token`
4. **Trigger an API call** or navigate to a protected page
5. **Check the behavior**

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
3. **Delete `access_token` cookie**
4. **Trigger an API call**

### Expected Behavior:
- ❌ Refresh attempt fails (refresh token expired)
- ✅ Redirect to `/authentication/login?returnUrl=...`
- ✅ User must login again

---

## Method 6: Test Client-Side Interceptor

### Steps:
1. **Login to your app**
2. **Open DevTools → Network tab**
3. **Delete `access_token` cookie** (keep `refresh_token`)
4. **Make an API call** (e.g., navigate to a page)
5. **Watch Network tab**:
   - First request should return 401
   - Automatic call to `/api/auth/token/refresh`
   - Original request retries with new token

### Expected Network Flow:
```
1. GET /api/data/something → 401 Unauthorized
2. POST /api/auth/token/refresh → 200 OK (new token)
3. GET /api/data/something → 200 OK (retry successful)
```

---

## Method 7: Test Middleware Refresh (Server-Side)

### Steps:
1. **Login to your app**
2. **Delete `access_token` cookie** (keep `refresh_token`)
3. **Navigate to a protected page** (not an API route)
4. **Check server logs** for middleware refresh activity

### Expected Behavior:
- ✅ Middleware detects expired/missing access token
- ✅ Calls refresh endpoint
- ✅ Sets new access token cookie
- ✅ Allows request to proceed

---

## Debugging Tips

### Check Console Logs:
Look for these log messages:
- `[checkAuthAndRedirect] Starting auth check...`
- `[checkAuthAndRedirect] Validate response: ...`
- `[LOGIN_LOG] Token refresh successful...`
- `[LOGIN_LOG] Token refresh failed...`

### Check Network Tab:
- Filter by "refresh" to see refresh calls
- Check request/response headers
- Verify cookies are being sent/received

### Check Cookies:
- DevTools → Application → Cookies
- Verify `access_token` and `refresh_token` exist
- Check expiration times match `expiresIn` values

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
  
  console.log('📋 Current cookies:', {
    hasAccessToken: !!cookies.access_token,
    hasRefreshToken: !!cookies.refresh_token,
  });
  
  // 2. Delete access token
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  console.log('🗑️ Deleted access_token cookie');
  
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
    
    // 4. Check new cookie
    const newCookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    console.log('✅ New cookies:', {
      hasAccessToken: !!newCookies.access_token,
      hasRefreshToken: !!newCookies.refresh_token,
    });
    
    if (newCookies.access_token) {
      console.log('✅ SUCCESS: New access token set!');
    } else {
      console.log('❌ FAILED: No new access token set');
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
- [ ] New access token cookie is set with correct expiration
- [ ] Original request retries successfully after refresh
- [ ] Redirect to login when refresh token is missing
- [ ] Redirect to login when refresh token is expired
- [ ] No infinite redirect loops
- [ ] Client-side interceptor works (401 → refresh → retry)
- [ ] Server-side middleware works (expired token → refresh → continue)
- [ ] Console logs show refresh activity
- [ ] Network tab shows refresh calls

