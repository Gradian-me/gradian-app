import { NextRequest, NextResponse } from 'next/server';

/**
 * Health Check Proxy Endpoint
 * GET /api/health/proxy?url=<health-api-url>
 * 
 * This endpoint proxies health check requests to external services,
 * bypassing CORS restrictions by making the request server-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameter: url',
      },
      { status: 400 }
    );
  }

  // Validate URL format
  let healthApiUrl: URL;
  try {
    healthApiUrl = new URL(targetUrl);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid URL format',
      },
      { status: 400 }
    );
  }

  // Security: Only allow http/https protocols
  if (!['http:', 'https:'].includes(healthApiUrl.protocol)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Only HTTP and HTTPS protocols are allowed',
      },
      { status: 400 }
    );
  }

  try {
    // Create AbortController for timeout (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const startTime = Date.now();
      
      // Fetch from the health API (server-side, no CORS restrictions)
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Gradian-Health-Checker/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            statusCode: response.status,
          },
          { status: 200 } // Return 200 so client can handle the error
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        data: {
          ...data,
          responseTime,
          proxied: true,
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return NextResponse.json(
            {
              success: false,
              error: 'Request timeout: Health check took too long',
            },
            { status: 200 }
          );
        }

        // Handle network errors
        if (
          fetchError.message.includes('Failed to fetch') ||
          fetchError.message.includes('ECONNREFUSED') ||
          fetchError.message.includes('ENOTFOUND') ||
          fetchError.message.includes('ETIMEDOUT')
        ) {
          return NextResponse.json(
            {
              success: false,
              error: `Network error: Unable to reach ${targetUrl}. The service may be down or unreachable.`,
            },
            { status: 200 }
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error occurred',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error in health proxy:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to proxy health check',
      },
      { status: 500 }
    );
  }
}

