#!/usr/bin/env node
/**
 * Docker Health Check Script
 * 
 * Checks the /api/health endpoint and verifies:
 * 1. HTTP status code is 200
 * 2. JSON response contains status: "healthy"
 * 
 * Exit codes:
 * - 0: Healthy
 * - 1: Unhealthy or error
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8502,
  path: '/api/health',
  method: 'GET',
  timeout: 8000, // 8 second timeout (less than Docker's 10s)
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);

      // Check HTTP status code and JSON status field
      if (res.statusCode === 200 && json.status === 'healthy') {
        process.exit(0);
      } else {
        // Log the issue for debugging
        console.error(`Health check failed: HTTP ${res.statusCode}, status: ${json.status}`);
        process.exit(1);
      }
    } catch (error) {
      // Invalid JSON response
      console.error('Health check failed: Invalid JSON response', error.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Health check failed: Request error', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.error('Health check failed: Request timeout');
  process.exit(1);
});

req.end();

