import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker/Kubernetes
 * GET /api/health
 */
export async function GET() {
  try {
    // Basic health check - can be extended to check database, etc.
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'gradian-app',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

