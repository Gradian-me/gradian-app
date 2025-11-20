// Preload Routes Utility
// Handles parallel API calls for preloading data before LLM requests

export interface PreloadRoute {
  route: string;
  title: string;
  description: string;
  method?: 'GET' | 'POST';
  jsonPath?: string; // Path to extract from response (e.g., "data" or "data.schemas")
  body?: any; // For POST requests
  queryParameters?: Record<string, string>; // For GET requests
}

interface PreloadResult {
  route: string;
  title: string;
  description: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Build URL with query parameters
 */
function buildUrlWithQuery(route: string, queryParams?: Record<string, string>): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return route;
  }

  // If route already has query params, parse them
  const [path, existingQuery] = route.split('?');
  const searchParams = new URLSearchParams(existingQuery || '');
  
  // Add new query parameters
  Object.entries(queryParams).forEach(([key, value]) => {
    searchParams.set(key, value);
  });

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Extract data from response using jsonPath
 */
function extractDataByPath(data: any, jsonPath?: string): any {
  if (!jsonPath) {
    return data;
  }

  const pathParts = jsonPath.split('.');
  let result = data;

  for (const part of pathParts) {
    if (result && typeof result === 'object' && part in result) {
      result = result[part];
    } else {
      return null;
    }
  }

  return result;
}

/**
 * Call a single preload route
 */
async function callPreloadRoute(
  preloadRoute: PreloadRoute,
  baseUrl: string
): Promise<PreloadResult> {
  try {
    const method = preloadRoute.method || 'GET';
    let routePath = preloadRoute.route;

    // Build URL with query parameters for GET requests
    if (method === 'GET' && preloadRoute.queryParameters) {
      routePath = buildUrlWithQuery(preloadRoute.route, preloadRoute.queryParameters);
    }

    // Build full URL - handle absolute URLs and relative paths
    const fullUrl = routePath.startsWith('http') 
      ? routePath 
      : `${baseUrl}${routePath.startsWith('/') ? routePath : '/' + routePath}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST requests
    if (method === 'POST' && preloadRoute.body) {
      fetchOptions.body = JSON.stringify(preloadRoute.body);
    }

    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      return {
        route: preloadRoute.route,
        title: preloadRoute.title,
        description: preloadRoute.description,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const responseData = await response.json();
    const extractedData = extractDataByPath(responseData, preloadRoute.jsonPath);

    return {
      route: preloadRoute.route,
      title: preloadRoute.title,
      description: preloadRoute.description,
      success: true,
      data: extractedData,
    };
  } catch (error) {
    return {
      route: preloadRoute.route,
      title: preloadRoute.title,
      description: preloadRoute.description,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Call all preload routes in parallel and format results for system prompt
 */
export async function preloadRoutes(
  preloadRoutes: PreloadRoute[],
  baseUrl: string = ''
): Promise<string> {
  if (!preloadRoutes || preloadRoutes.length === 0) {
    return '';
  }

  // Call all routes in parallel
  const results = await Promise.all(
    preloadRoutes.map((route) => callPreloadRoute(route, baseUrl))
  );

  // Format results for system prompt
  const sections: string[] = [];

  results.forEach((result) => {
    if (result.success && result.data) {
      sections.push(
        `## ${result.title}\n${result.description}\n\n` +
        `Data from ${result.route}:\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n`
      );
    } else {
      // Include error information but don't fail the entire request
      sections.push(
        `## ${result.title}\n${result.description}\n\n` +
        `⚠️ Failed to load data from ${result.route}: ${result.error || 'Unknown error'}\n`
      );
    }
  });

  if (sections.length > 0) {
    return `\n\n## Preloaded Context Data\n\n${sections.join('\n')}\n`;
  }

  return '';
}

