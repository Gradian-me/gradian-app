import { NextRequest, NextResponse } from 'next/server';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';
import { readSchemaData, writeSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';

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

type IntegrationEntity = Record<string, any>;

function isServerDemoMode(): boolean {
  try {
    const vars = loadApplicationVariables();
    return Boolean(vars?.DEMO_MODE);
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to read application variables for demo mode detection: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return true;
  }
}

function findLocalIntegrationById(id: string): IntegrationEntity | null {
  try {
    const integrations = readSchemaData<IntegrationEntity>('integrations');
    return integrations.find(integration => integration.id === id) || null;
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to read integrations from local storage: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

function saveLocalIntegration(updatedIntegration: IntegrationEntity): void {
  try {
    const integrations = readSchemaData<IntegrationEntity>('integrations');
    const index = integrations.findIndex(integration => integration.id === updatedIntegration.id);
    if (index === -1) {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Attempted to update non-existent integration locally: ${updatedIntegration.id}`
      );
      return;
    }
    integrations[index] = updatedIntegration;
    writeSchemaData('integrations', integrations);
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to persist integration update locally: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function updateIntegrationLastSyncedTimestamp(
  id: string,
  integration: IntegrationEntity,
  useLocalData: boolean
): Promise<IntegrationEntity> {
  const timestamp = new Date().toISOString();
  const updatedIntegration: IntegrationEntity = {
    ...integration,
    lastSynced: timestamp,
    updatedAt: timestamp,
    id,
  };

  if (useLocalData) {
    saveLocalIntegration(updatedIntegration);
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'lastSynced timestamp updated in local storage');
    return updatedIntegration;
  }

  try {
    const updateUrl = getApiUrl(`/api/data/integrations/${id}`);
    await fetch(updateUrl, {
      method: 'PUT' as any,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedIntegration),
      cache: 'no-store',
    });
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'lastSynced timestamp updated via data API');
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to update lastSynced timestamp via data API: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return updatedIntegration;
}

async function fetchIntegrationFromApi(id: string): Promise<IntegrationEntity | null> {
  loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Fetching integration with id via API: ${id}`);
  try {
    const byIdUrl = getApiUrl(`/api/data/integrations/${id}`);
    const byIdResponse = await fetch(byIdUrl, {
      method: 'GET' as any,
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (byIdResponse.ok) {
      const byIdData = await byIdResponse.json();
      if (byIdData.success && byIdData.data) {
        const integrationCandidate = Array.isArray(byIdData.data)
          ? byIdData.data[0]
          : byIdData.data?.data || byIdData.data;
        if (integrationCandidate) {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Integration fetched successfully via API by ID: ${id}`);
          return integrationCandidate;
        }
      }
    } else {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Integration API returned ${byIdResponse.status} when querying by ID ${id}`
      );
    }
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to fetch integration by ID via API: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    const listUrl = getApiUrl('/api/data/integrations');
    const listResponse = await fetch(listUrl, {
      method: 'GET' as any,
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      if (listData.success && listData.data) {
        const integrations = Array.isArray(listData.data)
          ? listData.data
          : listData.data?.data || listData.data?.items || [];
        const integration = integrations.find((integration: IntegrationEntity) => integration.id === id) || null;
        if (integration) {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Integration located via API list fallback: ${id}`);
          return integration;
        }
      }
    } else {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Integration list API returned ${listResponse.status} when searching for ${id}`
      );
    }
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Error fetching integrations list from API: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return null;
}

/**
 * POST - Sync an integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Starting integration sync for id: ${id}`);
    
    if (!id) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Missing required field: id');
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id'
        },
        { status: 400 }
      );
    }

    const useLocalData = isServerDemoMode();
    let integration: IntegrationEntity | null = null;

    if (useLocalData) {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Attempting to resolve integration from local data store');
      integration = findLocalIntegrationById(id);
      if (integration) {
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Integration resolved from local data: ${id}`);
      } else {
        loggingCustom(
          LogType.INTEGRATION_LOG,
          'warn',
          `Integration ${id} not found in local data, falling back to API lookup`
        );
      }
    }

    if (!integration) {
      integration = await fetchIntegrationFromApi(id);
    }

    if (!integration) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', `Integration with id "${id}" not found`);
      return NextResponse.json(
        {
          success: false,
          error: `Integration with id "${id}" not found`
        },
        { status: 404 }
      );
    }
    
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration found: ${integration.title || integration.name || id}`);
    
    // Extract targetRoute - handle string, object, or array (from picker fields)
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Extracting targetRoute from integration');
    let targetRoute: string | null = null;
    if (typeof integration.targetRoute === 'string') {
      targetRoute = integration.targetRoute;
    } else if (Array.isArray(integration.targetRoute) && integration.targetRoute.length > 0) {
      // If it's an array (from picker multiselect), get the first item
      const firstRoute = integration.targetRoute[0];
      // Extract metadata.address if available, otherwise fall back to other properties
      targetRoute = firstRoute?.metadata?.address || firstRoute?.address || firstRoute?.url || firstRoute?.value || firstRoute?.id || null;
    } else if (integration.targetRoute && typeof integration.targetRoute === 'object') {
      // If it's an object (from picker), try to extract the address/url
      targetRoute = integration.targetRoute.metadata?.address || integration.targetRoute.address || integration.targetRoute.url || integration.targetRoute.value || null;
    }
    
    if (!targetRoute) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Integration targetRoute is not configured or invalid');
      return NextResponse.json(
        {
          success: false,
          error: 'Integration targetRoute is not configured or invalid'
        },
        { status: 400 }
      );
    }
    
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route: ${targetRoute}`);
    
    // Extract sourceRoute - handle string, object, or array (from picker fields)
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Extracting sourceRoute from integration');
    let sourceRoute: string | null = null;
    if (typeof integration.sourceRoute === 'string') {
      sourceRoute = integration.sourceRoute;
    } else if (Array.isArray(integration.sourceRoute) && integration.sourceRoute.length > 0) {
      // If it's an array (from picker multiselect), get the first item
      const firstRoute = integration.sourceRoute[0];
      // Extract metadata.address if available, otherwise fall back to other properties
      sourceRoute = firstRoute?.metadata?.address || firstRoute?.address || firstRoute?.url || firstRoute?.value || firstRoute?.id || null;
    } else if (integration.sourceRoute && typeof integration.sourceRoute === 'object') {
      // If it's an object (from picker), try to extract the address/url
      sourceRoute = integration.sourceRoute.metadata?.address || integration.sourceRoute.address || integration.sourceRoute.url || integration.sourceRoute.value || null;
    }
    
    if (sourceRoute) {
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `Source route: ${sourceRoute}`);
    } else {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'No source route configured, will call target route directly');
    }
    
    let syncResponse = null;
    let dataToSend: any = null;
    
    try {
      // Step 1: If sourceRoute exists, fetch data from it first
      if (sourceRoute) {
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Step 1: Fetching data from source route: ${sourceRoute}`);
        // Extract sourceMethod - handle string, object, or array (from picker fields)
        let sourceMethodValue: string = 'GET';
        if (typeof integration.sourceMethod === 'string') {
          sourceMethodValue = integration.sourceMethod;
        } else if (Array.isArray(integration.sourceMethod) && integration.sourceMethod.length > 0) {
          // If it's an array (from picker multiselect), get the first item's id or label
          const firstMethod = integration.sourceMethod[0];
          sourceMethodValue = firstMethod?.id || firstMethod?.label || firstMethod?.value || 'GET';
        } else if (integration.sourceMethod && typeof integration.sourceMethod === 'object') {
          sourceMethodValue = integration.sourceMethod.id || integration.sourceMethod.label || integration.sourceMethod.value || 'GET';
        }
        const sourceMethod = String(sourceMethodValue || 'GET').toUpperCase();
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Source method: ${sourceMethod}`);
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
          loggingCustom(LogType.INTEGRATION_LOG, 'error', `Source route failed: ${sourceResponse.status} ${sourceResponse.statusText}`);
          throw new Error(`Source route failed: ${sourceResponse.statusText}`);
        }
        
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Source route response: ${sourceResponse.status} ${sourceResponse.statusText}`);
        const sourceData = await sourceResponse.json();
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Source data received: ${JSON.stringify(sourceData).substring(0, 200)}...`);
        
        // Step 2: Extract data using sourceDataPath if provided, otherwise default to "data"
        const sourceDataPath = integration.sourceDataPath || 'data';
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Extracting data using sourceDataPath: ${sourceDataPath}`);
        const extractedData = extractDataByPath(sourceData, sourceDataPath);
        if (extractedData === null || extractedData === undefined) {
          loggingCustom(LogType.INTEGRATION_LOG, 'error', `Failed to extract data from path: ${sourceDataPath}`);
          throw new Error(`Failed to extract data from path: ${sourceDataPath}`);
        }
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Data extracted successfully from path: ${sourceDataPath}`);
        
        // If targetDataPath is empty, post data directly without wrapping
        const targetDataPath = integration.targetDataPath?.trim();
        if (!targetDataPath || targetDataPath === '') {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Target Data Path is empty, posting data directly without wrapping');
          dataToSend = extractedData;
        } else {
          // Wrap extracted data in an object with targetDataPath key
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Wrapping data with targetDataPath: ${targetDataPath}`);
          dataToSend = { [targetDataPath]: extractedData };
        }
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Data to send size: ${JSON.stringify(dataToSend).length} characters`);
      }
      
      // Step 3: POST data to targetRoute
      // If we have data from source route, always POST it to target route
      // Otherwise, use the configured targetMethod (or default to POST)
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `Step 3: Calling target route: ${targetRoute}`);
      let targetMethodValue: string = 'POST';
      if (dataToSend) {
        // When we have data from source route, always use POST
        targetMethodValue = 'POST';
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Using POST method (data available from source route)');
      } else {
        // Only use configured method if there's no data to send
        if (typeof integration.targetMethod === 'string') {
          targetMethodValue = integration.targetMethod;
        } else if (Array.isArray(integration.targetMethod) && integration.targetMethod.length > 0) {
          // If it's an array (from picker multiselect), get the first item's id or label
          const firstMethod = integration.targetMethod[0];
          targetMethodValue = firstMethod?.id || firstMethod?.label || firstMethod?.value || 'POST';
        } else if (integration.targetMethod && typeof integration.targetMethod === 'object') {
          targetMethodValue = integration.targetMethod.id || integration.targetMethod.label || integration.targetMethod.value || 'POST';
        }
      }
      const method = String(targetMethodValue || 'POST').toUpperCase();
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target method: ${method}`);
      const targetUrl = targetRoute;
      const fetchOptions: RequestInit = {
        method: method as any,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // Include body for POST/PUT/PATCH requests when we have data
      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && dataToSend) {
        fetchOptions.body = JSON.stringify(dataToSend);
        const bodyString = fetchOptions.body;
        const bodyLength = bodyString.length;
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Request body size: ${bodyLength} characters`);
        
        // Log body content (truncated if long)
        const maxBodyLogLength = 500;
        if (bodyLength > maxBodyLogLength) {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Request body (first ${maxBodyLogLength} chars): ${bodyString.substring(0, maxBodyLogLength)}...`);
        } else {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Request body: ${bodyString}`);
        }
      } else if (method === 'GET' && dataToSend) {
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Using GET method with query parameters');
        // For GET requests, append data as query parameters (fallback case)
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
            const urlWithParams = url.toString();
            loggingCustom(LogType.INTEGRATION_LOG, 'debug', `GET request URL with params: ${urlWithParams}`);
            const targetResponse = await fetch(urlWithParams, fetchOptions);
            
            if (!targetResponse.ok) {
              let errorResponseData: any = null;
              try {
                errorResponseData = await targetResponse.json();
                loggingCustom(LogType.INTEGRATION_LOG, 'error', `Target route failed: ${targetResponse.status} ${targetResponse.statusText}`);
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Error response data: ${JSON.stringify(errorResponseData).substring(0, 200)}...`);
              } catch (parseError) {
                loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              }
              
              // Extract error message from response (check message, error, or messages)
              const errorMessage = errorResponseData?.message || errorResponseData?.error || null;
              
              // If we have messages in the error response, include them and return
              if (errorResponseData?.messages && Array.isArray(errorResponseData.messages) && errorResponseData.messages.length > 0) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${errorResponseData.messages.length} message(s) in error response`);
                
                // Transform messages from { path, en } to { path, message: { en } } format
                const transformedMessages = errorResponseData.messages.map((msg: any) => {
                  if (msg.en && !msg.message) {
                    return {
                      path: msg.path,
                      message: { en: msg.en }
                    };
                  }
                  return msg;
                });
                
                return NextResponse.json({
                  success: false,
                  error: errorMessage || `Target route failed: ${targetResponse.statusText}`,
                  messages: transformedMessages,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              // If we have a single message field, use it in the error
              if (errorMessage) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains error message: ${errorMessage}`);
                return NextResponse.json({
                  success: false,
                  error: errorMessage,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              throw new Error(`Target route failed: ${targetResponse.statusText}`);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route response: ${targetResponse.status} ${targetResponse.statusText}`);
            syncResponse = await targetResponse.json();
            loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data: ${JSON.stringify(syncResponse).substring(0, 200)}...`);
            
            // Extract messages from target response if present
            let getResponseMessages1 = syncResponse?.messages || [];
            const getResponseMessage1 = syncResponse?.message;
            
            // Transform messages from { path, en } to { path, message: { en } } format if needed
            if (getResponseMessages1.some((msg: any) => msg.en && !msg.message)) {
              getResponseMessages1 = getResponseMessages1.map((msg: any) => {
                if (msg.en && !msg.message) {
                  return {
                    path: msg.path,
                    message: { en: msg.en }
                  };
                }
                return msg;
              });
            }
            
            if (integration) {
              integration = await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration sync completed successfully for id: ${id}`);
            
            // Build response with messages if available
            const getResponse1: any = {
              success: true,
              data: syncResponse,
              integration: integration
            };
            
            if (getResponseMessages1.length > 0) {
              getResponse1.messages = getResponseMessages1;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Including ${getResponseMessages1.length} message(s) in response`);
            }
            
            if (getResponseMessage1) {
              getResponse1.message = getResponseMessage1;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Including single message in response');
            }
            
            return NextResponse.json(getResponse1);
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
            const urlWithParams = url.pathname + url.search;
            loggingCustom(LogType.INTEGRATION_LOG, 'debug', `GET request URL with params: ${urlWithParams}`);
            const targetResponse = await fetch(getApiUrl(urlWithParams), fetchOptions);
            
            if (!targetResponse.ok) {
              let errorResponseData: any = null;
              try {
                errorResponseData = await targetResponse.json();
                loggingCustom(LogType.INTEGRATION_LOG, 'error', `Target route failed: ${targetResponse.status} ${targetResponse.statusText}`);
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Error response data: ${JSON.stringify(errorResponseData).substring(0, 200)}...`);
              } catch (parseError) {
                loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              }
              
              // Extract error message from response (check message, error, or messages)
              const errorMessage = errorResponseData?.message || errorResponseData?.error || null;
              
              // If we have messages in the error response, include them and return
              if (errorResponseData?.messages && Array.isArray(errorResponseData.messages) && errorResponseData.messages.length > 0) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${errorResponseData.messages.length} message(s) in error response`);
                
                // Transform messages from { path, en } to { path, message: { en } } format
                const transformedMessages = errorResponseData.messages.map((msg: any) => {
                  if (msg.en && !msg.message) {
                    return {
                      path: msg.path,
                      message: { en: msg.en }
                    };
                  }
                  return msg;
                });
                
                return NextResponse.json({
                  success: false,
                  error: errorMessage || `Target route failed: ${targetResponse.statusText}`,
                  messages: transformedMessages,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              // If we have a single message field, use it in the error
              if (errorMessage) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains error message: ${errorMessage}`);
                return NextResponse.json({
                  success: false,
                  error: errorMessage,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              throw new Error(`Target route failed: ${targetResponse.statusText}`);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route response: ${targetResponse.status} ${targetResponse.statusText}`);
            syncResponse = await targetResponse.json();
            loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data: ${JSON.stringify(syncResponse).substring(0, 200)}...`);
            
            // Extract messages from target response if present
            let getResponseMessages2 = syncResponse?.messages || [];
            const getResponseMessage2 = syncResponse?.message;
            
            // Transform messages from { path, en } to { path, message: { en } } format if needed
            if (getResponseMessages2.some((msg: any) => msg.en && !msg.message)) {
              getResponseMessages2 = getResponseMessages2.map((msg: any) => {
                if (msg.en && !msg.message) {
                  return {
                    path: msg.path,
                    message: { en: msg.en }
                  };
                }
                return msg;
              });
            }
            
            if (integration) {
              integration = await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration sync completed successfully for id: ${id}`);
            
            // Build response with messages if available
            const getResponse2: any = {
              success: true,
              data: syncResponse,
              integration: integration
            };
            
            if (getResponseMessages2.length > 0) {
              getResponse2.messages = getResponseMessages2;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Including ${getResponseMessages2.length} message(s) in response`);
            }
            
            if (getResponseMessage2) {
              getResponse2.message = getResponseMessage2;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Including single message in response');
            }
            
            return NextResponse.json(getResponse2);
          }
        } catch (error) {
          // If URL parsing fails, just use the original URL
          loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse URL for GET request: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      const targetResponse = await fetch(targetUrl, fetchOptions);
      
      // Parse response regardless of status to extract messages
      let errorResponseData: any = null;
      if (!targetResponse.ok) {
        try {
          errorResponseData = await targetResponse.json();
          loggingCustom(LogType.INTEGRATION_LOG, 'error', `Target route failed: ${targetResponse.status} ${targetResponse.statusText}`);
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Error response data: ${JSON.stringify(errorResponseData).substring(0, 200)}...`);
        } catch (parseError) {
          loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
        
        // Extract error message from response (check message, error, or messages)
        const errorMessage = errorResponseData?.message || errorResponseData?.error || null;
        
        // If we have messages in the error response, include them and return
        if (errorResponseData?.messages && Array.isArray(errorResponseData.messages) && errorResponseData.messages.length > 0) {
          loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${errorResponseData.messages.length} message(s) in error response`);
          
          // Transform messages from { path, en } to { path, message: { en } } format
          const transformedMessages = errorResponseData.messages.map((msg: any) => {
            if (msg.en && !msg.message) {
              return {
                path: msg.path,
                message: { en: msg.en }
              };
            }
            return msg;
          });
          
          return NextResponse.json({
            success: false,
            error: errorMessage || `Target route failed: ${targetResponse.statusText}`,
            messages: transformedMessages,
            statusCode: targetResponse.status
          }, { status: targetResponse.status });
        }
        
        // If we have a single message field, use it in the error
        if (errorMessage) {
          loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains error message: ${errorMessage}`);
          return NextResponse.json({
            success: false,
            error: errorMessage,
            statusCode: targetResponse.status
          }, { status: targetResponse.status });
        }
        
        // No messages, throw error as before
        throw new Error(`Target route failed: ${targetResponse.statusText}`);
      }
      
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route response: ${targetResponse.status} ${targetResponse.statusText}`);
      syncResponse = await targetResponse.json();
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data: ${JSON.stringify(syncResponse).substring(0, 200)}...`);
      
      // Extract messages from target response if present
      if (syncResponse?.messages && syncResponse.messages.length > 0) {
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${syncResponse.messages.length} message(s)`);
        
        // Transform messages from { path, en } to { path, message: { en } } format if needed
        if (syncResponse.messages.some((msg: any) => msg.en && !msg.message)) {
          syncResponse.messages = syncResponse.messages.map((msg: any) => {
            if (msg.en && !msg.message) {
              return {
                path: msg.path,
                message: { en: msg.en }
              };
            }
            return msg;
          });
        }
      }
      
      if (integration) {
        integration = await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData);
      }
      
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration sync completed successfully for id: ${id}`);
    } catch (error) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', `Sync request failed: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Sync request failed'
        },
        { status: 500 }
      );
    }
    
    // Extract messages from syncResponse if present
    let responseMessages = syncResponse?.messages || [];
    const responseMessage = syncResponse?.message;
    
    // Transform messages from { path, en } to { path, message: { en } } format if needed
    if (responseMessages.some((msg: any) => msg.en && !msg.message)) {
      responseMessages = responseMessages.map((msg: any) => {
        if (msg.en && !msg.message) {
          return {
            path: msg.path,
            message: { en: msg.en }
          };
        }
        return msg;
      });
    }
    
    // Build response with messages if available
    const response: any = {
      success: true,
      data: syncResponse,
      integration: integration
    };
    
    // Include messages from target response if present
    if (responseMessages.length > 0) {
      response.messages = responseMessages;
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Including ${responseMessages.length} message(s) in response`);
    }
    
    // Include single message if present
    if (responseMessage) {
      response.message = responseMessage;
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Including single message in response');
    }
    
    return NextResponse.json(response);
  } catch (error) {
    loggingCustom(LogType.INTEGRATION_LOG, 'error', `Failed to sync integration: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync integration'
      },
      { status: 500 }
    );
  }
}
