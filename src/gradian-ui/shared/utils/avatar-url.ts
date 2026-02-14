/**
 * Avatar URL utilities.
 * Uses NEXT_PUBLIC_URL_AVATAR template (e.g. https://example.com/avatar/{username}).
 * Extracts part before @ when username is an email.
 */

const AVATAR_URL_TEMPLATE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_URL_AVATAR) || '';

/**
 * Build avatar URL from template when username is provided.
 * Uses part before @ if username looks like email (e.g. taghipouram@cinnagen.com → taghipouram).
 */
export function getAvatarUrlFromUsername(username: string): string | undefined {
  if (!AVATAR_URL_TEMPLATE || !username || typeof username !== 'string') return undefined;
  const trimmed = username.trim();
  if (!trimmed) return undefined;
  const localPart = trimmed.includes('@') ? trimmed.split('@')[0]! : trimmed;
  return AVATAR_URL_TEMPLATE.replace(/\{username\}/gi, encodeURIComponent(localPart));
}
