# Authentication Login Service Documentation

This document provides detailed information about the backend login service, including request payloads, response structures, token verification, and refresh token mechanisms.

## Overview

The login service (`/api/auth/login`) authenticates users and issues JWT tokens for access control. It supports both local (demo mode) and external authentication services.

## Endpoint

**POST** `/api/auth/login`

## Request Payload

### Required Fields

```json
{
  "emailOrUsername": "user@example.com",
  "email": "user@example.com",  // Alternative field name (accepted)
  "password": "userPassword"
}
```

### Optional Fields

```json
{
  "deviceFingerprint": "optional-device-identifier",
  "fingerprint": "optional-device-identifier"  // Alternative field name
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `emailOrUsername` | string | Yes* | User's email address or username (*if `email` is not provided) |
| `email` | string | Yes* | User's email address (*if `emailOrUsername` is not provided) |
| `password` | string | Yes | User's password (plain text, will be hashed and verified) |
| `deviceFingerprint` | string | No | Optional device identifier for external auth services |
| `fingerprint` | string | No | Alternative field name for device fingerprint |

### Validation

The service validates:
- At least one of `emailOrUsername` or `email` must be provided
- `password` must be provided
- All required fields must be non-empty strings

**Error Response (400):**
```json
{
  "success": false,
  "error": "Email and password are required"
}
```

## Authentication Modes

The service operates in two modes:

### 1. Demo Mode (Local Authentication)

**Condition:** `NODE_ENV !== 'production'` or explicitly enabled via configuration

**Process:**
1. Authenticates against local user database (`data/users.json`)
2. Verifies password using Argon2 hashing algorithm
3. Checks user status (must be `approved` to log in)
4. Generates JWT tokens locally

**Backend Flow:**
```
POST /api/auth/login
  → authenticateUser({ email, password })
    → findUserByEmail(email)
    → validatePassword(user, password) [Argon2 verification]
    → createTokenPair({ userId, email, name, role })
      → createAccessToken()
      → createRefreshToken()
```

### 2. External Authentication Mode

**Condition:** Production mode or external auth service configured

**Process:**
1. Proxies request to external authentication service
2. Forwards authentication headers and app ID
3. Receives tokens from external service
4. Stores tokens and sets cookies

**Backend Flow:**
```
POST /api/auth/login
  → Build proxy headers and URL
  → POST to external auth service (/login)
  → Receive response with tokens
  → Store access token in server memory
  → Set refresh token in HttpOnly cookie
```

**External Service Request:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "userPassword",
  "appId": "application-id-from-config",
  "deviceFingerprint": "optional-device-identifier"
}
```

## Success Response

### Response Structure

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "lastname": "Last Name",
    "role": "user",
    "department": "Engineering",
    "avatar": "https://example.com/avatar.jpg"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  },
  "message": "Login successful"
}
```

**Note:** The `refreshToken` is **NOT** returned in the response body. It is set in an HttpOnly cookie (see [Token Storage](#token-storage) below).

### Response Headers

```
Set-Cookie: refresh_token=<refresh-token-value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
Set-Cookie: session_token=<session-token-value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
Set-Cookie: user_session_id=<user-session-id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
```

### Status Code

- **200 OK** - Authentication successful

## Error Responses

### 400 Bad Request

**Missing Required Fields:**
```json
{
  "success": false,
  "error": "Email and password are required"
}
```

**Invalid Request Body:**
```json
{
  "success": false,
  "error": "Invalid request payload"
}
```

### 401 Unauthorized

**Invalid Credentials:**
```json
{
  "success": false,
  "error": "Password is incorrect"
}
```

**User Not Found:**
```json
{
  "success": false,
  "error": "User does not exist"
}
```

**User Not Approved:**
```json
{
  "success": false,
  "error": "User account is pending approval"
}
```

**No Password Set:**
```json
{
  "success": false,
  "error": "User account does not have a password set. Please contact administrator."
}
```

### 503 Service Unavailable

**External Service Connection Failed:**
```json
{
  "success": false,
  "error": "Unable to connect to authentication service"
}
```

### 500 Internal Server Error

**Server Error:**
```json
{
  "success": false,
  "error": "Login failed"
}
```

## Token Structure

### Access Token

**Type:** JWT (JSON Web Token)

**Algorithm:** HS256 (HMAC SHA-256)

**Payload:**
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "iat": 1234567890,  // Issued at (Unix timestamp)
  "exp": 1234571490   // Expiration (Unix timestamp)
}
```

**Expiration:** 3600 seconds (1 hour) - configurable via `AUTH_CONFIG.ACCESS_TOKEN_EXPIRY`

**Storage:**
- Returned in response body (`tokens.accessToken`)
- Stored in **client memory only** (not in localStorage or cookies)
- Also stored in **server memory** (keyed by refresh token) for redundancy

### Refresh Token

**Type:** JWT (JSON Web Token)

**Algorithm:** HS256 (HMAC SHA-256)

**Payload:**
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "type": "refresh",  // Distinguishes from access token
  "iat": 1234567890,  // Issued at (Unix timestamp)
  "exp": 1235172690   // Expiration (Unix timestamp)
}
```

**Expiration:** 604800 seconds (7 days) - configurable via `AUTH_CONFIG.REFRESH_TOKEN_EXPIRY`

**Storage:**
- Set in **HttpOnly cookie** (`refresh_token`)
- **NOT** accessible to JavaScript (prevents XSS attacks)
- Automatically sent with subsequent requests

**Cookie Configuration:**
```
Name: refresh_token
HttpOnly: true
Secure: true (production only)
SameSite: Lax
Path: /
Max-Age: 604800 (7 days)
```

## Token Verification

### Verification Process

The system uses a two-stage verification approach:

#### 1. Signature Verification (Internal Tokens)

For tokens generated by the local authentication service:

```typescript
// Verifies token signature using JWT_SECRET
const payload = jwt.verify(token, AUTH_CONFIG.JWT_SECRET);
```

**Checks:**
- Token signature is valid
- Token has not been tampered with
- Token is not expired
- Token structure is valid

**On Success:**
```json
{
  "valid": true,
  "payload": {
    "userId": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "iat": 1234567890,
    "exp": 1234571490
  }
}
```

**On Failure:**
```json
{
  "valid": false,
  "error": "Token has expired" | "Invalid token" | "Token verification failed"
}
```

#### 2. Decode-Only Verification (External Tokens)

For tokens from external authentication services (where we don't have the signing secret):

```typescript
// Decodes token without signature verification
const decoded = jwt.decode(token, { complete: false });

// Validates expiration manually
if (decoded.exp < now) {
  return { valid: false, error: "Token has expired" };
}

// Extracts user identifier from various possible fields
const userId = decoded.id || decoded.sub || decoded.userId;
```

**Checks:**
- Token can be decoded
- Token is not expired (manual check)
- Token contains required user identifier
- Token structure is valid

**Payload Extraction:**
- Supports multiple field names: `id`, `sub`, `userId`
- Extracts email, name, role from decoded payload
- Falls back to empty strings for missing fields

### Token Validation Endpoint

**POST** `/api/auth/token/validate`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Or provide token via:
- Authorization header: `Authorization: Bearer <token>`
- Cookie: `access_token=<token>`

**Success Response (200):**
```json
{
  "success": true,
  "valid": true,
  "payload": {
    "userId": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "iat": 1234567890,
    "exp": 1234571490
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "valid": false,
  "error": "Token has expired"
}
```

## Refresh Token Mechanism

### Overview

The refresh token mechanism allows clients to obtain new access tokens without re-authenticating. Access tokens have a short lifespan (1 hour), while refresh tokens have a longer lifespan (7 days).

### Refresh Flow

#### 1. Client-Side Refresh Request

**When:** Access token expires or is missing

**Endpoint:** `POST /api/auth/token/refresh`

**Request:**
```json
{
  "refreshToken": "optional-refresh-token"  // Usually not needed (from cookie)
}
```

**Headers:**
```
Cookie: refresh_token=<refresh-token-value>  // Sent automatically
Content-Type: application/json
```

#### 2. Server-Side Refresh Process

**Step 1: Extract Refresh Token**
- Reads from HttpOnly cookie (primary source)
- Falls back to request body or Authorization header

**Step 2: Validate Refresh Token**
- Verifies token signature
- Checks token expiration
- Validates token type (`type: "refresh"`)

**Step 3: Generate New Access Token**
```typescript
// Creates new access token with same user claims
const newAccessToken = createAccessToken({
  userId: payload.userId,
  email: payload.email,
  name: payload.name,
  role: payload.role
});
```

**Step 4: Store and Return**
- Stores new access token in server memory (keyed by refresh token)
- Returns new access token in response body
- Optionally rotates refresh token (if configured)

#### 3. Response

**Success Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Authentication token is required"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### 4. Client Updates Token

- Client stores new access token in memory
- Uses new token for subsequent API requests
- Retries original request that triggered the refresh

### Token Rotation (Optional)

If configured, the refresh endpoint may rotate refresh tokens:

**Response Headers:**
```
Set-Cookie: refresh_token=<new-refresh-token-value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

**Client Action:**
- New refresh token automatically replaces old one (handled by browser)
- Server updates its cache to use new refresh token as key

### Single-Flight Pattern

The refresh mechanism implements a single-flight pattern to prevent race conditions:

- Only one refresh request processes at a time per refresh token
- Concurrent refresh requests are queued
- All queued requests receive the same new access token
- Prevents multiple simultaneous refresh calls

## Token Storage

### Access Token Storage

**Client-Side:**
- Stored in **memory only** (JavaScript variable)
- **NOT** persisted to localStorage, sessionStorage, or cookies
- Lost on page refresh (will be refreshed automatically)

**Server-Side:**
- Stored in **server memory** (global cache)
- Keyed by refresh token value
- Automatically expires when access token expires
- Used as fallback if client token is missing

**Storage Structure:**
```typescript
{
  [refreshToken]: {
    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    expiresAt: 1234571490000,  // Unix timestamp in milliseconds
    expiresIn: 3600  // TTL in seconds
  }
}
```

### Refresh Token Storage

**Client-Side:**
- Stored in **HttpOnly cookie** (browser-managed)
- **NOT** accessible to JavaScript
- Automatically sent with HTTP requests
- Persists across page refreshes

**Server-Side:**
- Not explicitly stored (read from cookie on each request)
- Used as key for access token cache
- Validated on each refresh request

## Security Considerations

### Token Security

1. **HttpOnly Cookies:** Refresh tokens are stored in HttpOnly cookies, preventing XSS attacks
2. **Secure Cookies:** Cookies use `Secure` flag in production (HTTPS only)
3. **SameSite Protection:** Cookies use `SameSite=Lax` to prevent CSRF attacks
4. **Short Access Token Lifetime:** Access tokens expire after 1 hour, limiting exposure window
5. **Long Refresh Token Lifetime:** Refresh tokens last 7 days, reducing authentication frequency
6. **Token Signature Verification:** All tokens are cryptographically signed and verified
7. **Password Hashing:** Passwords are hashed using Argon2 algorithm (never stored in plain text)

### Password Verification

1. **Argon2 Hashing:** Uses Argon2id variant for password hashing
2. **Pepper Support:** Supports pepper (additional secret) for enhanced security
3. **Hash Type Detection:** Automatically detects hash type from stored password
4. **Timing Attack Protection:** Constant-time comparison prevents timing attacks

### User Validation

1. **Status Check:** Users must be in `approved` status to log in
2. **Password Requirement:** Users must have a password set
3. **Email Case-Insensitive:** Email comparison is case-insensitive
4. **Input Validation:** All inputs are validated before processing

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `your-default-secret-key-change-in-production` | Secret key for signing JWT tokens |
| `NEXTAUTH_SECRET` | - | Alternative secret key (used if `JWT_SECRET` not set) |
| `JWT_ACCESS_TOKEN_EXPIRY` | `3600` | Access token expiration time in seconds |
| `JWT_REFRESH_TOKEN_EXPIRY` | `604800` | Refresh token expiration time in seconds |

### Auth Config

```typescript
{
  JWT_SECRET: string;
  ACCESS_TOKEN_EXPIRY: number;        // Default: 3600 (1 hour)
  REFRESH_TOKEN_EXPIRY: number;       // Default: 604800 (7 days)
  ACCESS_TOKEN_COOKIE: string;        // Default: "access_token"
  REFRESH_TOKEN_COOKIE: string;       // Default: "refresh_token"
  SESSION_TOKEN_COOKIE: string;       // Default: "session_token"
  USER_SESSION_ID_COOKIE: string;     // Default: "user_session_id"
}
```

## Related Documentation

- [Authentication Flow](./AUTHENTICATION_FLOW.md) - Complete authentication flow from registration to login
- [Token Refresh Explanation](../security/TOKEN_REFRESH_EXPLANATION.md) - Detailed refresh token flow
- [Token Storage Explanation](../security/TOKEN_STORAGE_EXPLANATION.md) - Token storage architecture
- [Authentication Architecture](../security/AUTHENTICATION_ARCHITECTURE_UPDATE.md) - Overall authentication architecture


