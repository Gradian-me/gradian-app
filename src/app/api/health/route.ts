import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import fs from 'fs';
import path from 'path';

/**
 * Read and parse environment variables from .env file
 * @param envFilePath Path to the .env file
 * @returns Object with parsed environment variables
 */
function readEnvFile(envFilePath: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  
  try {
    if (!fs.existsSync(envFilePath)) {
      return envVars;
    }
    
    const fileContent = fs.readFileSync(envFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and comments
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse KEY=VALUE format
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (key) {
        envVars[key] = value;
      }
    }
  } catch (error) {
    console.error(`Error reading env file ${envFilePath}:`, error);
  }
  
  return envVars;
}

/**
 * Get environment variables from the appropriate .env file based on NODE_ENV
 * @returns Object with environment variables from .env.prod (if prod) or .env (otherwise)
 */
function getEnvVarsFromFile(): Record<string, string> {
  const nodeEnv = process.env.NODE_ENV || '';
  const isProd = nodeEnv.toLowerCase() === 'prod' || nodeEnv.toLowerCase() === 'production';
  
  const envFileName = isProd ? '.env.prod' : '.env';
  const envFilePath = path.join(process.cwd(), envFileName);
  
  return readEnvFile(envFilePath);
}

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

  try {
    // Check 1: Application Health (always passes if endpoint is reachable)
    checks.application = {
      status: 'healthy',
      responseTime: 0,
    };

    // Check 2: Data Folder Access - Verify data folder file access
    const dataCheckStartTime = Date.now();
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const criticalFiles = [
        'health.json'
      ];
      
      // Check if data directory exists
      if (!fs.existsSync(dataDir)) {
        checks.database = {
          status: 'unhealthy',
          message: 'Data directory not found',
          responseTime: Date.now() - dataCheckStartTime,
        };
        overallStatus = 'unhealthy';
        httpStatus = 503;
      } else {
        // Check accessibility of critical files
        const accessibleFiles: string[] = [];
        const missingFiles: string[] = [];
        const unreadableFiles: string[] = [];
        
        for (const fileName of criticalFiles) {
          const filePath = path.join(dataDir, fileName);
          if (!fs.existsSync(filePath)) {
            missingFiles.push(fileName);
          } else {
            try {
              // Try to read the file to verify read permissions
              fs.readFileSync(filePath, 'utf-8');
              accessibleFiles.push(fileName);
            } catch (readError) {
              unreadableFiles.push(fileName);
            }
          }
        }
        
        // Determine status based on file accessibility
        if (accessibleFiles.length === criticalFiles.length) {
          checks.database = {
            status: 'healthy',
            message: `All critical files accessible (${accessibleFiles.join(', ')})`,
            responseTime: Date.now() - dataCheckStartTime,
          };
        } else if (accessibleFiles.length > 0) {
          const messages: string[] = [];
          if (accessibleFiles.length > 0) {
            messages.push(`Accessible: ${accessibleFiles.join(', ')}`);
          }
          if (missingFiles.length > 0) {
            messages.push(`Missing: ${missingFiles.join(', ')}`);
          }
          if (unreadableFiles.length > 0) {
            messages.push(`Unreadable: ${unreadableFiles.join(', ')}`);
          }
          
          checks.database = {
            status: 'degraded',
            message: `Partial file access - ${messages.join('; ')}`,
            responseTime: Date.now() - dataCheckStartTime,
          };
          if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } else {
          checks.database = {
            status: 'unhealthy',
            message: `No critical files accessible. Missing: ${missingFiles.join(', ')}${unreadableFiles.length > 0 ? `; Unreadable: ${unreadableFiles.join(', ')}` : ''}`,
            responseTime: Date.now() - dataCheckStartTime,
          };
          overallStatus = 'unhealthy';
          httpStatus = 503;
        }
      }
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        message: `Data folder check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - dataCheckStartTime,
      };
      overallStatus = 'unhealthy';
      httpStatus = 503;
    }

    // Check 3: Environment Configuration
    try {
      const envCheckStartTime = Date.now();
      const nodeEnv = process.env.NODE_ENV || '';
      const isProd = nodeEnv.toLowerCase() === 'prod' || nodeEnv.toLowerCase() === 'production';
      const envFileName = isProd ? '.env.prod' : '.env';
      const envFilePath = path.join(process.cwd(), envFileName);
      
      // Get environment variables from the appropriate .env file
      const envVarsFromFile = getEnvVarsFromFile();
      
      // Check if the env file exists
      const envFileExists = fs.existsSync(envFilePath);
      
      const requiredEnvVars = ['NODE_ENV'];
      const missingEnvVars: string[] = [];
      
      // Check required variables from the env file first, then fallback to process.env
      requiredEnvVars.forEach((varName) => {
        const value = envVarsFromFile[varName] || process.env[varName];
        if (!value) {
          missingEnvVars.push(varName);
        }
      });

      if (missingEnvVars.length > 0) {
        checks.environment = {
          status: 'degraded',
          message: `Missing environment variables: ${missingEnvVars.join(', ')} (checked ${envFileName})`,
          responseTime: Date.now() - envCheckStartTime,
        };
        if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } else {
        const envFileStatus = envFileExists ? 'found' : 'not found (using process.env)';
        checks.environment = {
          status: 'healthy',
          message: `All required environment variables are set (${envFileName} ${envFileStatus})`,
          responseTime: Date.now() - envCheckStartTime,
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
      uptime: process.uptime(), // seconds
      checks,
      responseTime: totalResponseTime, // milliseconds
    };

    // Return appropriate HTTP status code
    // 200 = healthy, 503 = unhealthy/degraded
    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    // If any error occurs (including fetch failures), return unhealthy status
    const totalResponseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    checks.application = {
      status: 'unhealthy',
      message: `Health check failed: ${errorMessage}`,
      responseTime: totalResponseTime,
    };

    const errorResponse = {
      status: 'unhealthy' as const,
      timestamp,
      service: 'gradian-app',
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      uptime: process.uptime(),
      checks,
      responseTime: totalResponseTime,
      error: errorMessage,
    };

    // Return 503 (Service Unavailable) for unhealthy status
    return NextResponse.json(errorResponse, { status: 503 });
  }
}
