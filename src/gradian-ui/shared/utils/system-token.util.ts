// System Token Utility
// SERVER-ONLY: This file uses server-side fetch and can only be used in server-side code

import 'server-only';
import { loggingCustom } from './logging-custom';
import { LogType } from '../constants/application-variables';

/**
 * Get the API URL for internal server-side calls
 * Server-side fetch requires absolute URLs, so we construct them here
 */
function getApiUrl(apiPath: string): string {
  // If it's already a full URL, use it as-is
  if (apiPath.startsWith('http')) {
    return apiPath;
  }

  // For relative URLs, construct absolute URL for server-side fetch
  // Priority: NEXTAUTH_URL > VERCEL_URL > localhost (default for development)
  let baseUrl = process.env.NEXTAUTH_URL;

  if (!baseUrl) {
    // Use Vercel URL if available (for Vercel deployments)
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // Default to localhost for local development
      const port = process.env.PORT || '3000';
      baseUrl = `http://localhost:${port}`;
    }
  }

  // Clean and combine paths
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

  // Remove trailing slash from baseUrl if present
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return `${normalizedBase}${cleanPath}`;
}

/**
 * Extract URL repository ID from targetRoute
 * targetRoute can be a string (URL), object (picker), or array (multiselect picker)
 */
function extractUrlRepositoryId(targetRoute: any): string | null {
  if (!targetRoute) {
    return null;
  }

  // If it's a string, we can't extract ID - need to fetch URL repository by address
  if (typeof targetRoute === 'string') {
    return null;
  }

  // If it's an array (from picker multiselect), get the first item
  if (Array.isArray(targetRoute) && targetRoute.length > 0) {
    const firstRoute = targetRoute[0];
    return firstRoute?.id || null;
  }

  // If it's an object (from picker), extract the ID
  if (typeof targetRoute === 'object') {
    return targetRoute.id || null;
  }

  return null;
}

/**
 * Fetch URL repository entity by ID
 */
async function fetchUrlRepositoryById(id: string): Promise<any | null> {
  try {
    const url = getApiUrl(`/api/data/url-repositories/${id}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Failed to fetch URL repository ${id}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      return Array.isArray(data.data) ? data.data[0] : data.data;
    }

    return null;
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Error fetching URL repository ${id}: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Fetch URL repository entity by address (when ID is not available)
 */
async function fetchUrlRepositoryByAddress(address: string): Promise<any | null> {
  try {
    const url = getApiUrl('/api/data/url-repositories');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Failed to fetch URL repositories: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      const repositories = Array.isArray(data.data) ? data.data : data.data?.data || [];
      // Find repository by address (check metadata.address, address, url fields)
      const repository = repositories.find((repo: any) => {
        return (
          repo.metadata?.address === address ||
          repo.address === address ||
          repo.url === address
        );
      });
      return repository || null;
    }

    return null;
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Error fetching URL repository by address: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Get related servers for a URL repository
 */
async function getRelatedServers(urlRepositoryId: string): Promise<any[]> {
  try {
    const url = getApiUrl(
      `/api/data/all-relations?schema=url-repositories&direction=both&otherSchema=servers&id=${urlRepositoryId}`
    );
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Failed to fetch related servers for URL repository ${urlRepositoryId}: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    if (data.success && data.data) {
      // Find the relation group for servers
      const relations = Array.isArray(data.data) ? data.data : [];
      for (const relation of relations) {
        if (relation.schema === 'servers' && relation.data && Array.isArray(relation.data)) {
          return relation.data;
        }
      }
    }

    return [];
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Error fetching related servers: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

/**
 * Get system access token from OAuth2 endpoint
 */
async function getSystemAccessToken(audience: string): Promise<string | null> {
  const authUrl = process.env.URL_AUTHENTICATION;
  const appId = process.env.APP_ID;
  const appSecretKey = process.env.APP_SECRET_KEY;

  if (!authUrl) {
    loggingCustom(LogType.INTEGRATION_LOG, 'error', 'URL_AUTHENTICATION environment variable is not configured');
    return null;
  }

  if (!appId) {
    loggingCustom(LogType.INTEGRATION_LOG, 'error', 'APP_ID environment variable is not configured');
    return null;
  }

  if (!appSecretKey) {
    loggingCustom(LogType.INTEGRATION_LOG, 'error', 'APP_SECRET_KEY environment variable is not configured');
    return null;
  }

  if (!audience) {
    loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Audience is required for system token');
    return null;
  }

  try {
    const tokenUrl = `${authUrl.replace(/\/+$/, '')}/oauth2/token`;
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Calling OAuth2 token endpoint: ${tokenUrl}`);
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', `OAuth2 token request - appId: ${appId}, audience: ${audience}`);

    const requestBody = {
      appId: appId,
      secretKey: appSecretKey,
      audience: audience,
    };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });

    loggingCustom(LogType.INTEGRATION_LOG, 'info', `OAuth2 token response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'error',
        `Failed to get system token from /oauth2/token: ${response.status} ${response.statusText} - ${errorText}`
      );
      return null;
    }

    const tokenData = await response.json();
    if (tokenData.accessToken) {
      const tokenPrefix = tokenData.accessToken.substring(0, 20);
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `System token obtained successfully from /oauth2/token: ${tokenPrefix}...`);
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Token expires in: ${tokenData.expiresIn || 'N/A'} seconds`);
      return tokenData.accessToken;
    }

    loggingCustom(LogType.INTEGRATION_LOG, 'error', 'OAuth2 token response does not contain accessToken');
    return null;
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Error getting system token: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Get system token for a target route if enabled
 * @param targetRoute - The target route (can be string, object, or array from picker)
 * @returns The system access token as Bearer token string, or null if not applicable
 */
export async function getSystemTokenForTargetRoute(targetRoute: any): Promise<string | null> {
  try {
    // Extract URL repository ID or address
    const urlRepositoryId = extractUrlRepositoryId(targetRoute);
    let urlRepository: any = null;

    if (urlRepositoryId) {
      // Fetch by ID
      urlRepository = await fetchUrlRepositoryById(urlRepositoryId);
    } else if (typeof targetRoute === 'string') {
      // Fetch by address
      urlRepository = await fetchUrlRepositoryByAddress(targetRoute);
    }

    if (!urlRepository) {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'URL repository not found, skipping system token');
      return null;
    }

    // Check if system token is enabled
    // Field can be stored as either the field ID (url-enable-system-token) or the field name (enableSystemToken)
    const enableSystemToken = urlRepository['url-enable-system-token'] || urlRepository['enableSystemToken'];
    if (!enableSystemToken) {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'System token is not enabled for this URL repository');
      return null;
    }

    loggingCustom(LogType.INTEGRATION_LOG, 'info', 'System token is enabled, fetching related server...');

    // Get related servers
    const repositoryId = urlRepository.id || urlRepositoryId;
    if (!repositoryId) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Cannot determine URL repository ID for fetching related servers');
      return null;
    }

    const servers = await getRelatedServers(repositoryId);
    if (servers.length === 0) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'No related servers found for URL repository');
      return null;
    }

    // Get the first server's audience ID
    // Field can be stored as either the field ID (server-audience-id) or the field name (audienceId)
    const firstServer = servers[0];
    const audienceId = firstServer['audienceId'];

    if (!audienceId) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Server does not have server-audience-id or audienceId configured');
      return null;
    }

    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Using audience ID: ${audienceId}`);

    // Get system token
    const accessToken = await getSystemAccessToken(audienceId);
    if (!accessToken) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Failed to obtain system access token');
      return null;
    }

    return `Bearer ${accessToken}`;
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Error getting system token for target route: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

