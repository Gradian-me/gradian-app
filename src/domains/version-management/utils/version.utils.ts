import { Priority } from '../types';

/**
 * Convert semver format (x.y.z) to our format (x.yy.zzz)
 */
function convertSemverToFormat(version: string): string {
  const parts = version.split('.');
  if (parts.length >= 3) {
    const major = parseInt(parts[0], 10) || 1;
    const minor = parseInt(parts[1], 10) || 0;
    const patch = parseInt(parts[2], 10) || 0;
    return formatVersion(major, minor, patch);
  }
  return '1.00.000';
}

/**
 * Parse version string (x.yy.zzz) into components
 * Also handles semver format (x.y.z) by converting it
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  // Check if it's already in our format (x.yy.zzz)
  if (/^\d+\.\d{2}\.\d{3}$/.test(version)) {
    const parts = version.split('.');
    return {
      major: parseInt(parts[0], 10),
      minor: parseInt(parts[1], 10),
      patch: parseInt(parts[2], 10),
    };
  }
  
  // Try to parse as semver (x.y.z) and convert
  const parts = version.split('.');
  if (parts.length >= 3) {
    return {
      major: parseInt(parts[0], 10) || 1,
      minor: parseInt(parts[1], 10) || 0,
      patch: parseInt(parts[2], 10) || 0,
    };
  }
  
  throw new Error(`Invalid version format: ${version}. Expected format: x.yy.zzz or x.y.z`);
}

/**
 * Format version components into string (x.yy.zzz)
 */
export function formatVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor.toString().padStart(2, '0')}.${patch.toString().padStart(3, '0')}`;
}

/**
 * Increment version based on priority
 * - LOW/Medium: increment patch (zzz)
 * - High: increment minor (yy)
 * - Major (x) is never auto-incremented (manual only)
 */
export function incrementVersion(currentVersion: string, priority: Priority): string {
  const { major, minor, patch } = parseVersion(currentVersion);
  
  if (priority === 'High') {
    // Increment minor, reset patch
    return formatVersion(major, minor + 1, 0);
  } else {
    // LOW or Medium: increment patch
    return formatVersion(major, minor, patch + 1);
  }
}

/**
 * Validate version format (x.yy.zzz)
 */
export function isValidVersion(version: string): boolean {
  const regex = /^\d+\.\d{2}\.\d{3}$/;
  return regex.test(version);
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);
  
  if (parsed1.major !== parsed2.major) {
    return parsed1.major - parsed2.major;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor - parsed2.minor;
  }
  return parsed1.patch - parsed2.patch;
}

