import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fingerprintPromise: Promise<string | null> | null = null;

const IP_ENDPOINT = 'https://api.ipify.org?format=json';

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

const textEncoder = new TextEncoder();

async function fetchPublicIp(): Promise<string | null> {
  if (!isBrowser()) {
    return null;
  }

  try {
    const response = await fetch(IP_ENDPOINT);
    if (!response.ok) {
      throw new Error(`IP fetch failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { ip?: string };
    return payload.ip ?? null;
  } catch (error) {
    console.warn('[fingerprint] Failed to fetch public IP:', error);
    return null;
  }
}

async function generateFingerprint(): Promise<string | null> {
  if (!isBrowser()) {
    return null;
  }

  try {
    const fpAgent = await FingerprintJS.load();
    const result = await fpAgent.get();
    const visitorId = result.visitorId ?? '';
    const ipAddress = (await fetchPublicIp()) ?? '';

    if (!visitorId && !ipAddress) {
      return null;
    }

    const rawFingerprint = `${visitorId}:${ipAddress}:${navigator.userAgent}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', textEncoder.encode(rawFingerprint));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('[fingerprint] Failed to generate fingerprint:', error);
    return null;
  }
}

export function getFingerprint(): Promise<string | null> {
  if (!fingerprintPromise) {
    fingerprintPromise = generateFingerprint();
  }
  return fingerprintPromise;
}


