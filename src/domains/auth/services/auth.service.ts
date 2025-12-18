// Authentication Service
// Handles user authentication logic

import { readSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { createTokenPair, verifyToken } from '../utils/jwt.util';
import { verifyPassword, detectHashType } from '../utils/password.util';
import { User, LoginCredentials, LoginResponse, TokenValidationResponse, JWTPayload } from '../types';

/**
 * Extract avatar URL from user data based on schema fields with role="avatar"
 */
async function extractAvatarFromUser(userData: any): Promise<string | undefined> {
  try {
    // Try to load the users schema to find fields with role="avatar"
    const { getSchemaById } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
    const schema = await getSchemaById('users');
    
    if (!schema || !schema.fields) {
      // Fallback: check for common avatar field names
      return userData.avatarUrl || userData.avatar || undefined;
    }
    
    // Find fields with role="avatar"
    const avatarFields = schema.fields.filter((field: any) => field.role === 'avatar');
    
    if (avatarFields.length === 0) {
      // Fallback: check for common avatar field names
      return userData.avatarUrl || userData.avatar || undefined;
    }
    
    // Get the value from the first avatar field found
    for (const field of avatarFields) {
      const fieldValue = userData[field.name];
      
      // If the value is a URL (starts with http:// or https://), use it
      if (fieldValue && typeof fieldValue === 'string') {
        const urlPattern = /^https?:\/\//i;
        if (urlPattern.test(fieldValue)) {
          return fieldValue;
        }
      }
    }
    
    // Fallback: check for common avatar field names
    return userData.avatarUrl || userData.avatar || undefined;
  } catch (error) {
    console.warn('[AUTH] Error extracting avatar from schema, using fallback:', error);
    // Fallback: check for common avatar field names
    return userData.avatarUrl || userData.avatar || undefined;
  }
}

/**
 * Find user by email in the users data
 */
async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const users = readSchemaData<User>('users');
    
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  } catch (error) {
    // Handle DataStorageError and other errors gracefully
    if (error instanceof Error) {
      console.error('[AUTH] Error finding user:', error.message);
      console.error('[AUTH] Error stack:', error.stack);
    } else {
      console.error('[AUTH] Unknown error finding user:', error);
    }
    // Return null instead of throwing - let the authentication flow handle it
    return null;
  }
}

/**
 * Validate user credentials
 * Uses Argon2 with pepper for secure password verification
 */
async function validatePassword(user: User, password: string): Promise<boolean> {
  if (!user.password) {
    // If no password is set, deny access (user should have a password)
    console.warn(`[AUTH] User ${user.email} has no password set`);
    return false;
  }
  
  // Determine hash type from user data or detect from stored hash
  const hashType = user.hashType || detectHashType(user.password);
  
  // Verify password using the appropriate method
  const isValid = await verifyPassword(password, user.password, hashType);
  return isValid;
}

/**
 * Authenticate user and return tokens
 */
export async function authenticateUser(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    // Validate input
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    // Find user by email
    const user = await findUserByEmail(credentials.email);
    
    if (!user) {
      return {
        success: false,
        error: AUTH_CONFIG.ERROR_MESSAGES.USER_NOT_FOUND,
      };
    }

    // Check if user has a password set
    if (!user.password) {
      console.warn(`[AUTH] User ${user.email} does not have a password set`);
      return {
        success: false,
        error: 'User account does not have a password set. Please contact administrator.',
      };
    }

    // Validate password
    const isValidPassword = await validatePassword(user, credentials.password);
    
    if (!isValidPassword) {
      return {
        success: false,
        error: AUTH_CONFIG.ERROR_MESSAGES.INVALID_PASSWORD,
      };
    }

    // Create tokens
    const tokens = createTokenPair({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Extract avatar from user data based on schema fields with role="avatar"
    const avatarUrl = await extractAvatarFromUser(user);

    // Return user data (without password) and tokens
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastname: (user as any).lastname, // Include lastname if available
        role: user.role,
        department: user.department,
        avatar: avatarUrl || user.avatar,
      },
      tokens,
      message: 'Login successful',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Validate a JWT token
 */
export function validateToken(token: string): TokenValidationResponse {
  try {
    const payload = verifyToken(token);
    
    return {
      valid: true,
      payload: {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : AUTH_CONFIG.ERROR_MESSAGES.INVALID_TOKEN,
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): { success: boolean; accessToken?: string; error?: string } {
  try {
    const payload = verifyToken(refreshToken);
    
    // Verify it's a refresh token
    if ((payload as any).type !== 'refresh') {
      return {
        success: false,
        error: 'Invalid token type',
      };
    }

    // Create new access token
    const newAccessToken = createTokenPair({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    }).accessToken;

    return {
      success: true,
      accessToken: newAccessToken,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : AUTH_CONFIG.ERROR_MESSAGES.INVALID_TOKEN,
    };
  }
}

