// Preload Routes Utility
// Handles parallel API calls for preloading data before LLM requests

import { cleanText, formatToToon, formatJsonForMarkdown } from './text-utils';

export interface PreloadRoute {
  route: string;
  title: string;
  description: string;
  method?: 'GET' | 'POST';
  jsonPath?: string; // Path to extract from response (e.g., "data" or "data.schemas")
  body?: any; // For POST requests
  queryParameters?: Record<string, string>; // For GET requests
  outputFormat?: 'json' | 'string' | 'toon'; // Format for output: json (default), string, or toon
  includedFields?: string[]; // Filter response to only include these fields (e.g., ["id", "description", "plural_name"])
}

export interface PreloadResult {
  route: string;
  title: string;
  description: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Build URL with query parameters
 * Exported for use in both server and client
 */
export function buildUrlWithQuery(route: string, queryParams?: Record<string, string>): string {
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
 * Exported for use in both server and client
 */
export function extractDataByPath(data: any, jsonPath?: string): any {
  if (!jsonPath) {
    return data;
  }

  // SECURITY: Use safe path access from security utility to prevent prototype pollution
  const { safeGetByPath } = require('@/gradian-ui/shared/utils/security-utils');
  return safeGetByPath(data, jsonPath) ?? null;
}

/**
 * Get dynamic includedFields based on outputFormat and route context
 * Exported for use in both server and client
 */
export function getDynamicIncludedFields(
  outputFormat?: string,
  route?: string,
  explicitIncludedFields?: string[]
): string[] | undefined {
  // If explicitly provided, use that (manual override)
  if (explicitIncludedFields && explicitIncludedFields.length > 0) {
    return explicitIncludedFields;
  }

  // Auto-determine based on outputFormat (case-insensitive)
  const normalizedFormat = (outputFormat || '').toLowerCase();
  if (normalizedFormat === 'toon') {
    // For toon format, check if route is related to schemas (TOON flattens to one row; for full schema structure use json)
    if (route && (route.includes('/api/schemas') || route.includes('schemas'))) {
      return ['id', 'description', 'plural_name'];
    }
    // For other toon routes, return undefined to include all fields
  }

  // For json or string formats, don't filter by default
  return undefined;
}

/**
 * Filter data to only include specified fields
 * Exported for use in both server and client
 */
export function filterFields(data: any, includedFields?: string[]): any {
  if (!includedFields || includedFields.length === 0) {
    return data;
  }

  if (Array.isArray(data)) {
    // Filter each object in the array
    return data.map((item: any) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const filtered: any = {};
        includedFields.forEach((field) => {
          if (field in item) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      }
      return item;
    });
  } else if (data && typeof data === 'object' && !Array.isArray(data)) {
    // Filter single object
    const filtered: any = {};
    includedFields.forEach((field) => {
      if (field in data) {
        filtered[field] = data[field];
      }
    });
    return filtered;
  }

  return data;
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

    // Check content-type to handle both JSON and text/plain (for TOON format)
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;
    
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      // Parse as JSON
      responseData = await response.json();
      const extractedData = extractDataByPath(responseData, preloadRoute.jsonPath);
      
      return {
        route: preloadRoute.route,
        title: preloadRoute.title,
        description: preloadRoute.description,
        success: true,
        data: extractedData,
      };
    } else {
      // Handle text/plain (e.g., TOON format) or other text formats
      const responseText = await response.text();
      
      // If outputFormat is 'toon', return the text as-is
      if (preloadRoute.outputFormat === 'toon') {
        return {
          route: preloadRoute.route,
          title: preloadRoute.title,
          description: preloadRoute.description,
          success: true,
          data: responseText,
        };
      }
      
      // Try to parse as JSON if it looks like JSON
      try {
        responseData = JSON.parse(responseText);
        const extractedData = extractDataByPath(responseData, preloadRoute.jsonPath);
        
        return {
          route: preloadRoute.route,
          title: preloadRoute.title,
          description: preloadRoute.description,
          success: true,
          data: extractedData,
        };
      } catch {
        // If parsing fails, return as string
        return {
          route: preloadRoute.route,
          title: preloadRoute.title,
          description: preloadRoute.description,
          success: true,
          data: responseText,
        };
      }
    }
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
 * Extract entity name from route (e.g., "/api/schemas" -> "schemas")
 * Exported for use in both server and client
 */
export function extractEntityNameFromRoute(route: string): string {
  // Remove leading/trailing slashes and split
  const parts = route.replace(/^\/+|\/+$/g, '').split('/');
  // Get the last meaningful part (usually the entity name)
  const lastPart = parts[parts.length - 1];
  // Remove query parameters if any
  const entityName = lastPart.split('?')[0];
  return cleanText(entityName) || 'items';
}

/**
 * Format data in TOON format using the formatToToon utility
 * Exported for use in both server and client
 */
export function formatDataInToonFormat(data: any, route: string, includedFields?: string[]): string {
  // Ensure data is an array
  let dataArray: any[] = [];
  if (Array.isArray(data)) {
    dataArray = data;
  } else if (data && typeof data === 'object') {
    dataArray = [data];
  } else {
    // For non-object/non-array data, return empty or format as single value
    return '';
  }

  if (dataArray.length === 0) {
    return '';
  }

  // Determine fields to use - prioritize includedFields
  let fields: string[] = [];
  if (includedFields && includedFields.length > 0) {
    fields = includedFields;
  } else if (dataArray[0] && typeof dataArray[0] === 'object') {
    // Fallback to keys from first item
    fields = Object.keys(dataArray[0]);
  }

  if (fields.length === 0) {
    // If no fields available, return empty string (shouldn't happen in practice)
    return '';
  }

  // Extract entity name from route
  const entityName = extractEntityNameFromRoute(route);

  // Use the formatToToon utility - this will always return TOON format
  const toonResult = formatToToon(entityName, dataArray, fields);
  
  // If formatToToon returns empty (shouldn't happen), fallback to basic format
  if (!toonResult) {
    // Last resort: create basic TOON format manually
    const header = `${entityName}[${dataArray.length}]{${fields.join(',')}}:`;
    const rows = dataArray.map((item: any) => {
      const values = fields.map((field) => cleanText(item?.[field] || ''));
      return `  ${values.join(',')}`;
    });
    return `${header}\n\n${rows.join('\n')}`;
  }

  return toonResult;
}

/**
 * Format a single preload route result based on outputFormat and includedFields
 * This function is shared between server and client
 */
export function formatPreloadRouteResult(
  result: PreloadResult,
  route: PreloadRoute
): string {
  if (!result.success || !result.data) {
    return `## ${cleanText(result.title)}\n${cleanText(result.description)}\n\n` +
      `⚠️ Failed to load data from ${result.route}: ${cleanText(result.error || 'Unknown error')}\n`;
  }

  const outputFormat = (route.outputFormat || 'json').toLowerCase();

  if (outputFormat === 'toon') {
    // Check if data is already a TOON-formatted string (from API response)
    if (typeof result.data === 'string') {
      // Data is already in TOON format, use it directly
      return `## ${cleanText(result.title)}\n${cleanText(result.description)}\n\n` +
        `Data from ${result.route}:\n\`\`\`text\n${result.data}\n\`\`\`\n`;
    }
    
    // Otherwise, format JSON data to TOON format
    // Get includedFields dynamically, filter data, then format to TOON
    const dynamicIncludedFields = getDynamicIncludedFields(
      route.outputFormat,
      route.route,
      route.includedFields
    );
    
    // Filter the full JSON data using includedFields
    const filteredData = filterFields(result.data, dynamicIncludedFields);
    
    // Determine which fields to use for TOON format
    let fieldsToUse: string[] | undefined = dynamicIncludedFields;
    if (!fieldsToUse || fieldsToUse.length === 0) {
      if (Array.isArray(filteredData) && filteredData.length > 0) {
        fieldsToUse = Object.keys(filteredData[0] || {});
      } else if (filteredData && typeof filteredData === 'object') {
        fieldsToUse = Object.keys(filteredData);
      }
    }
    
    // Format filtered data to TOON format
    const toonFormatted = formatDataInToonFormat(
      filteredData,
      result.route,
      fieldsToUse
    );
    
    return `## ${cleanText(result.title)}\n${cleanText(result.description)}\n\n` +
      `Data from ${result.route}:\n\`\`\`text\n${toonFormatted}\n\`\`\`\n`;
  } else if (outputFormat === 'string') {
    // String format - filter data if includedFields is provided
    let dataToFormat = result.data;
    if (route.includedFields && route.includedFields.length > 0) {
      dataToFormat = filterFields(result.data, route.includedFields);
    }
    
    let stringFormatted: string;
    if (typeof dataToFormat === 'string') {
      stringFormatted = cleanText(dataToFormat);
    } else {
      const jsonString = JSON.stringify(dataToFormat, null, 2);
      stringFormatted = cleanText(jsonString);
    }
    return `## ${cleanText(result.title)}\n${cleanText(result.description)}\n\n` +
      `Data from ${result.route}:\n\`\`\`\n${stringFormatted}\n\`\`\`\n`;
  } else {
    // Default JSON formatting - filter data if includedFields is provided
    let dataToFormat = result.data;
    if (route.includedFields && route.includedFields.length > 0) {
      dataToFormat = filterFields(result.data, route.includedFields);
    }
    
    // Format JSON with proper indentation using utility function
    const formattedJson = formatJsonForMarkdown(dataToFormat);
    
    return `## ${cleanText(result.title)}\n${cleanText(result.description)}\n\n` +
      `Data from ${result.route}:\n\`\`\`json\n${formattedJson}\n\`\`\`\n`;
  }
}

/**
 * Cache for preload route results
 * Key: route URL with query params, Value: { result: PreloadResult, timestamp: number }
 */
const preloadCache = new Map<string, { result: PreloadResult; timestamp: number }>();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate cache key from route configuration
 */
function getCacheKey(route: PreloadRoute, baseUrl: string): string {
  const method = route.method || 'GET';
  let routePath = route.route;
  
  // Build URL with query parameters for GET requests
  if (method === 'GET' && route.queryParameters) {
    routePath = buildUrlWithQuery(route.route, route.queryParameters);
  }
  
  // Build full URL
  const fullUrl = routePath.startsWith('http') 
    ? routePath 
    : `${baseUrl}${routePath.startsWith('/') ? routePath : '/' + routePath}`;
  
  // Include method and jsonPath in cache key to ensure uniqueness
  return `${method}:${fullUrl}:${route.jsonPath || ''}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Call all preload routes in parallel and format results for system prompt
 * Results are cached to prevent unnecessary refetches
 */
export async function preloadRoutes(
  preloadRoutes: PreloadRoute[],
  baseUrl: string = ''
): Promise<string> {
  if (!preloadRoutes || preloadRoutes.length === 0) {
    return '';
  }

  // Check cache and fetch only routes that need updating
  const routesToFetch: Array<{ route: PreloadRoute; index: number; cacheKey: string }> = [];
  const cachedResults: Array<{ result: PreloadResult; index: number }> = [];

  preloadRoutes.forEach((route, index) => {
    const cacheKey = getCacheKey(route, baseUrl);
    const cached = preloadCache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      // Use cached result
      cachedResults.push({
        result: cached.result,
        index,
      });
    } else {
      // Need to fetch
      routesToFetch.push({ route, index, cacheKey });
    }
  });

  // Fetch routes that aren't cached or are stale
  const fetchResults = routesToFetch.length > 0
    ? await Promise.all(
        routesToFetch.map(({ route }) => callPreloadRoute(route, baseUrl))
      )
    : [];

  // Combine cached and fetched results in correct order
  const allResults: PreloadResult[] = new Array(preloadRoutes.length);
  
  // Add cached results
  cachedResults.forEach(({ result, index }) => {
    allResults[index] = result;
  });
  
  // Add fetched results and update cache
  fetchResults.forEach((result, fetchIndex) => {
    const { index, cacheKey } = routesToFetch[fetchIndex];
    allResults[index] = result;
    
    // Cache successful results
    if (result.success) {
      preloadCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });
    }
  });

  // Format results for system prompt
  const sections: string[] = [];

  allResults.forEach((result, index) => {
    const route = preloadRoutes[index];
    sections.push(formatPreloadRouteResult(result, route));
  });

  if (sections.length > 0) {
    return `\n\n## Preloaded Context Data\n\n${sections.join('\n')}\n`;
  }

  return '';
}

