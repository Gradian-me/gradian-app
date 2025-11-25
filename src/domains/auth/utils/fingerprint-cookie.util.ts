import { getFingerprint } from '../services/fingerprint.service';

const COOKIE_NAME = 'x-fingerprint';
const DEFAULT_MAX_AGE_DAYS = 30;

const isBrowser = (): boolean => typeof document !== 'undefined';

const getExpiryDate = (days: number): string => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  return expires.toUTCString();
};

export function getFingerprintCookie(): string | null {
  if (!isBrowser()) {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function setFingerprintCookie(value: string, options?: { maxAgeDays?: number }): void {
  if (!isBrowser()) {
    return;
  }

  const maxAgeDays = options?.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  const expires = getExpiryDate(maxAgeDays);
  const secureFlag = window.location.protocol === 'https:' ? 'Secure; ' : '';

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; ${secureFlag}SameSite=Strict; Expires=${expires}`;
}

export function deleteFingerprintCookie(): void {
  if (!isBrowser()) {
    return;
  }
  document.cookie = `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export async function ensureFingerprintCookie(forceRefresh = false): Promise<string | null> {
  if (!isBrowser()) {
    return null;
  }

  if (!forceRefresh) {
    const existing = getFingerprintCookie();
    if (existing) {
      return existing;
    }
  }

  const fingerprint = await getFingerprint();
  if (fingerprint) {
    setFingerprintCookie(fingerprint);
  }
  return fingerprint;
}


