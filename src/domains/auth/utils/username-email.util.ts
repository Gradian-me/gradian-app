/**
 * Username/Email Utility Functions
 * Handles conversion of usernames to full email addresses using tenant defaultDomain
 */

interface Tenant {
  id?: string | number;
  name?: string;
  domain?: string;
  defaultDomain?: string;
  [key: string]: any;
}

/**
 * Gets the default domain from tenant or environment variable fallback
 * 
 * @param tenant - The tenant object containing defaultDomain
 * @returns The default domain string or undefined
 */
function getDefaultDomain(tenant: Tenant | null | undefined): string | undefined {
  // First, try to get from tenant
  if (tenant?.defaultDomain) {
    return tenant.defaultDomain;
  }

  // Fallback to NEXT_PUBLIC_DEFAULT_DOMAIN environment variable
  // In Next.js, NEXT_PUBLIC_* variables are available on both server and client
  const envDefaultDomain = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEFAULT_DOMAIN
    ? process.env.NEXT_PUBLIC_DEFAULT_DOMAIN
    : undefined;

  if (envDefaultDomain) {
    return envDefaultDomain.trim();
  }

  return undefined;
}

/**
 * Normalizes a username or email to a full email address.
 * If the input doesn't contain "@" (not an email format), it appends the tenant's defaultDomain
 * or falls back to NEXT_PUBLIC_DEFAULT_DOMAIN environment variable.
 * 
 * @param usernameOrEmail - The username or email input from the user
 * @param tenant - The tenant object containing defaultDomain
 * @returns The full email address (username@defaultDomain or the original email if already in email format)
 * 
 * @example
 * normalizeUsernameToEmail('john', { defaultDomain: 'example.com' }) // Returns 'john@example.com'
 * normalizeUsernameToEmail('john@example.com', { defaultDomain: 'example.com' }) // Returns 'john@example.com'
 * normalizeUsernameToEmail('john', null) // Returns 'john@NEXT_PUBLIC_DEFAULT_DOMAIN' if env var is set
 */
export function normalizeUsernameToEmail(
  usernameOrEmail: string,
  tenant: Tenant | null | undefined
): string {
  if (!usernameOrEmail || typeof usernameOrEmail !== 'string') {
    return usernameOrEmail || '';
  }

  const trimmed = usernameOrEmail.trim();

  // If already in email format (contains @), return as-is
  if (trimmed.includes('@')) {
    return trimmed;
  }

  // Get default domain from tenant or environment variable
  const defaultDomain = getDefaultDomain(tenant);

  // If no defaultDomain found, return the username as-is
  // (let the backend handle validation/error)
  if (!defaultDomain) {
    return trimmed;
  }

  // Append @defaultDomain to the username
  return `${trimmed}@${defaultDomain}`;
}

/**
 * Checks if a string is already in email format (contains @)
 * 
 * @param input - The input string to check
 * @returns true if the input contains "@", false otherwise
 */
export function isEmailFormat(input: string): boolean {
  return typeof input === 'string' && input.includes('@');
}

