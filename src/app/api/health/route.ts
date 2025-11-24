import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

/**
 * Health check endpoint for Docker/Kubernetes
 * GET /api/health
 * 
 * Best Practices:
 * - Returns 200 for healthy, 503 for unhealthy
 * - Checks critical dependencies (database, external services)
 * - Provides detailed component status
 * - Includes version and uptime information
 * - Fast response time (< 1s ideally)
 * - No authentication required (for monitoring tools)
 */
export async function GET() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const checks: Record<string, { status: 'healthy' | 'unhealthy' | 'degraded'; message?: string; responseTime?: number }> = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  let httpStatus = 200;

  // Check 1: Application Health (always passes if endpoint is reachable)
  checks.application = {
    status: 'healthy',
    responseTime: 0,
  };

  // Check 2: Database Connectivity
  if (config.dataSource === 'database') {
    try {
      const dbStartTime = Date.now();
      // Simple query to check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStartTime;
      
      checks.database = {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime: dbResponseTime,
      };
    } catch (error) {
      overallStatus = 'unhealthy';
      httpStatus = 503;
      checks.database = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  } else {
    // Mock data mode - database not required
    checks.database = {
      status: 'healthy',
      message: 'Using mock data (database not required)',
    };
  }

  // Check 3: Environment Configuration
  try {
    const requiredEnvVars = ['NODE_ENV'];
    const missingEnvVars: string[] = [];
    
    requiredEnvVars.forEach((varName) => {
      if (!process.env[varName]) {
        missingEnvVars.push(varName);
      }
    });

    if (missingEnvVars.length > 0) {
      checks.environment = {
        status: 'degraded',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
      };
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } else {
      checks.environment = {
        status: 'healthy',
        message: 'All required environment variables are set',
      };
    }
  } catch (error) {
    checks.environment = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Environment check failed',
    };
    overallStatus = 'unhealthy';
    httpStatus = 503;
  }

  // Calculate total response time
  const totalResponseTime = Date.now() - startTime;

  // Build response
  const response = {
    status: overallStatus,
    timestamp,
    service: 'gradian-app',
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'unknown',
    dataSource: config.dataSource,
    uptime: process.uptime(), // seconds
    checks,
    responseTime: totalResponseTime, // milliseconds
  };

  // Return appropriate HTTP status code
  // 200 = healthy, 503 = unhealthy/degraded
  return NextResponse.json(response, { status: httpStatus });
}
