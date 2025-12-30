/**
 * Edge-Compatible Token Validation
 * This utility works in Edge Runtime without Node.js dependencies
 */

interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
  type?: string;
}

interface TokenValidationResponse {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * Decode JWT token without verification (Edge-compatible)
 * This only decodes the payload, does not verify the signature
 * For full verification, use the API route
 */
function decodeJWT(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const decoded = atob(base64);
    const parsed = JSON.parse(decoded) as TokenPayload;
    return parsed;
  } catch (error) {
    return null;
  }
}

/**
 * Validate token structure and expiration (Edge-compatible)
 * Note: This does NOT verify the signature. For full verification, 
 * the token should be validated via API route or the signature should be verified separately
 */
export function validateTokenEdge(token: string): TokenValidationResponse {
  try {
    const payload = decodeJWT(token);
    
    if (!payload) {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    // Check expiration
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return {
          valid: false,
          error: 'Token has expired',
        };
      }
    }

    // Validate required fields
    if (!payload.userId || !payload.email) {
      return {
        valid: false,
        error: 'Invalid token payload',
      };
    }

    return {
      valid: true,
      payload: {
        userId: payload.userId,
        email: payload.email,
        name: payload.name || '',
        role: payload.role || '',
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    };
  }
}

/**
 * Extract token from cookies (Edge-compatible)
 * Handles case-insensitive cookie name matching
 */
export function extractTokenFromCookiesEdge(cookies: string | null, cookieName: string): string | null {
  if (!cookies) {
    return null;
  }

  const cookieMap = new Map<string, string>();
  cookies.split(';').forEach((cookie) => {
    const trimmedCookie = cookie.trim();
    if (!trimmedCookie) {
      return; // Skip empty cookie strings
    }
    
    const [name, ...valueParts] = trimmedCookie.split('=');
    if (!name) {
      return; // Skip if no name found
    }
    
    const trimmedName = name.trim();
    const value = valueParts.join('=');
    
    // Safely decode URI component
    let decodedValue = value;
    try {
      decodedValue = decodeURIComponent(value);
    } catch (error) {
      // If decoding fails, use original value (might not be encoded)
      decodedValue = value;
    }
    
    // Store with trimmed name for exact match, but also enable case-insensitive lookup
    cookieMap.set(trimmedName, decodedValue);
  });

  // Try exact match first (with trimmed cookie name)
  const trimmedCookieName = cookieName.trim();
  let token = cookieMap.get(trimmedCookieName);
  
  // If not found, try case-insensitive match
  if (!token) {
    for (const [name, value] of cookieMap.entries()) {
      if (name.toLowerCase() === trimmedCookieName.toLowerCase()) {
        token = value;
        break;
      }
    }
  }

  // Return null if token is empty string or falsy
  return (token && token.trim()) || null;
}

