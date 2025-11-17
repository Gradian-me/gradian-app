import { NextRequest, NextResponse } from 'next/server';

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
 * Extract data from object using JSON path (e.g., "results", "data.items", "response.data")
 */
function extractDataByPath(data: any, path: string): any {
  if (!path) return data;
  
  const parts = path.split('.');
  let result = data;
  
  for (const part of parts) {
    if (result === null || result === undefined) {
      return null;
    }
    result = result[part];
  }
  
  return result;
}

/**
 * POST - Sync an integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id'
        },
        { status: 400 }
      );
    }
    
    // Fetch integration from dynamic data API
    let integration: any = null;
    try {
      // Try to fetch by ID first
      const byIdUrl = getApiUrl(`/api/data/integrations/${id}`);
      const byIdResponse = await fetch(byIdUrl, {
        method: 'GET' as any,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (byIdResponse.ok) {
        const byIdData = await byIdResponse.json();
        if (byIdData.success && byIdData.data) {
          // Handle different response formats
          integration = Array.isArray(byIdData.data) ? byIdData.data[0] : (byIdData.data?.data || byIdData.data);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch integration by ID, trying list:', error);
    }

    // If not found by ID, fetch all and filter
    if (!integration) {
      try {
        const listUrl = getApiUrl('/api/data/integrations');
        const listResponse = await fetch(listUrl, {
          method: 'GET' as any,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.success && listData.data) {
            const integrations = Array.isArray(listData.data) ? listData.data : (listData.data?.data || listData.data?.items || []);
            integration = integrations.find((i: any) => i.id === id);
          }
        }
      } catch (error) {
        console.error('Error fetching integrations list:', error);
      }
    }

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: `Integration with id "${id}" not found`
        },
        { status: 404 }
      );
    }
    
    // Extract targetRoute - handle both string and object (from picker fields)
    let targetRoute: string | null = null;
    if (typeof integration.targetRoute === 'string') {
      targetRoute = integration.targetRoute;
    } else if (integration.targetRoute && typeof integration.targetRoute === 'object') {
      // If it's an object (from picker), try to extract the address/url
      targetRoute = integration.targetRoute.address || integration.targetRoute.url || integration.targetRoute.value || null;
    }
    
    if (!targetRoute) {
      return NextResponse.json(
        {
          success: false,
          error: 'Integration targetRoute is not configured or invalid'
        },
        { status: 400 }
      );
    }
    
    // Extract sourceRoute - handle both string and object (from picker fields)
    let sourceRoute: string | null = null;
    if (typeof integration.sourceRoute === 'string') {
      sourceRoute = integration.sourceRoute;
    } else if (integration.sourceRoute && typeof integration.sourceRoute === 'object') {
      // If it's an object (from picker), try to extract the address/url
      sourceRoute = integration.sourceRoute.address || integration.sourceRoute.url || integration.sourceRoute.value || null;
    }
    
    let syncResponse = null;
    let dataToSend: any = null;
    
    try {
      // Step 1: If sourceRoute exists, fetch data from it first
      if (sourceRoute) {
        const sourceMethod = String(integration.sourceMethod || 'GET').toUpperCase();
        const sourceFetchOptions: RequestInit = {
          method: sourceMethod as any,
          headers: {
            'Content-Type': 'application/json',
          },
        };
        
        // For POST source requests, we might need to send data
        // For now, GET is the default and most common for source routes
        if (sourceMethod === 'POST') {
          // If source is POST, we might need to send empty body or configurable body
          sourceFetchOptions.body = JSON.stringify({});
        }
        
        const sourceResponse = await fetch(sourceRoute, sourceFetchOptions);
        
        if (!sourceResponse.ok) {
          throw new Error(`Source route failed: ${sourceResponse.statusText}`);
        }
        
        const sourceData = await sourceResponse.json();
        
        // Step 2: Extract data using sourceDataPath if provided
        if (integration.sourceDataPath) {
          dataToSend = extractDataByPath(sourceData, integration.sourceDataPath);
          if (dataToSend === null || dataToSend === undefined) {
            throw new Error(`Failed to extract data from path: ${integration.sourceDataPath}`);
          }
        } else {
          dataToSend = sourceData;
        }
      }
      
      // Step 3: Call targetRoute with the data (or empty if no sourceRoute)
      const method = String(integration.targetMethod || 'GET').toUpperCase();
      let targetUrl = targetRoute;
      const fetchOptions: RequestInit = {
        method: method as any,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // Only include body for POST requests
      if (method === 'POST' && dataToSend) {
        fetchOptions.body = JSON.stringify(dataToSend);
      } else if (method === 'GET' && dataToSend) {
        // For GET requests, append data as query parameters
        try {
          // Check if it's an absolute URL
          if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
            const url = new URL(targetUrl);
            if (typeof dataToSend === 'object') {
              Object.entries(dataToSend).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  url.searchParams.append(key, String(value));
                }
              });
            }
            targetUrl = url.toString();
          } else {
            // Relative URL - construct with base
            const url = new URL(targetUrl, 'http://localhost');
            if (typeof dataToSend === 'object') {
              Object.entries(dataToSend).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  url.searchParams.append(key, String(value));
                }
              });
            }
            targetUrl = url.pathname + url.search;
          }
        } catch (error) {
          // If URL parsing fails, just use the original URL
          console.warn('Failed to parse URL for GET request:', error);
        }
      }
      
      const targetResponse = await fetch(targetUrl, fetchOptions);
      
      if (!targetResponse.ok) {
        throw new Error(`Target route failed: ${targetResponse.statusText}`);
      }
      
      syncResponse = await targetResponse.json();
      
      // Update lastSynced timestamp using the dynamic data API
      try {
        const updateUrl = getApiUrl(`/api/data/integrations/${id}`);
        const updatedIntegration = {
          ...integration,
          lastSynced: new Date().toISOString(),
        };
        
        await fetch(updateUrl, {
          method: 'PUT' as any,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedIntegration),
        });
      } catch (error) {
        console.error('Failed to update lastSynced timestamp:', error);
        // Don't fail the sync if timestamp update fails
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Sync request failed'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: syncResponse,
      integration: integration
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync integration'
      },
      { status: 500 }
    );
  }
}
