/**
 * URL Utility Functions
 * Helper functions for working with URLs
 */

/**
 * Extract domain/hostname from a route URL
 * Handles string, object, or array formats (from picker fields)
 * 
 * @param route - The route can be:
 *   - A string URL (e.g., "https://example.com/api")
 *   - An object from picker (e.g., { address: "https://example.com/api", id: "..." })
 *   - An array from multiselect picker (e.g., [{ address: "https://example.com/api", ... }])
 * @returns The hostname/domain (e.g., "example.com") or null if extraction fails
 * 
 * @example
 * extractDomainFromRoute("https://api.example.com/v1/data") // Returns "api.example.com"
 * extractDomainFromRoute({ address: "https://example.com/api" }) // Returns "example.com"
 * extractDomainFromRoute([{ metadata: { address: "https://test.com/api" } }]) // Returns "test.com"
 */
export function extractDomainFromRoute(route: any): string | null {
  if (!route) return null;

  let url: string | null = null;

  // Extract URL from different formats
  if (typeof route === 'string') {
    url = route;
  } else if (Array.isArray(route) && route.length > 0) {
    const firstRoute = route[0];
    url = firstRoute?.metadata?.address || firstRoute?.address || firstRoute?.url || firstRoute?.value || null;
  } else if (typeof route === 'object') {
    url = route.metadata?.address || route.address || route.url || route.value || null;
  }

  if (!url) return null;

  try {
    // If it's not a full URL, try to construct one
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/(?:https?:\/\/)?([^\/\s]+)/);
    return match ? match[1] : null;
  }
}

