import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'data', 'all-integrations.json');

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
    
    // Read integrations
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const integrations = JSON.parse(fileContent);
    
    const integration = integrations.find((i: any) => i.id === id);
    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: `Integration with id "${id}" not found`
        },
        { status: 404 }
      );
    }
    
    if (!integration.targetRoute) {
      return NextResponse.json(
        {
          success: false,
          error: 'Integration targetRoute is not configured'
        },
        { status: 400 }
      );
    }
    
    let syncResponse = null;
    let dataToSend: any = null;
    
    try {
      // Step 1: If sourceRoute exists, fetch data from it first
      if (integration.sourceRoute) {
        const sourceMethod = integration.sourceMethod || 'GET';
        const sourceFetchOptions: RequestInit = {
          method: sourceMethod,
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
        
        const sourceResponse = await fetch(integration.sourceRoute, sourceFetchOptions);
        
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
      const method = integration.targetMethod || 'GET';
      let targetUrl = integration.targetRoute;
      const fetchOptions: RequestInit = {
        method: method,
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
      
      // Update lastSynced timestamp
      const index = integrations.findIndex((i: any) => i.id === id);
      if (index !== -1) {
        integrations[index].lastSynced = new Date().toISOString();
        await writeFile(DATA_FILE, JSON.stringify(integrations, null, 2), 'utf-8');
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
