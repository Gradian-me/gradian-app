// UI Components API Route
// Serves all form-elements components from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

/**
 * Load components from JSON file
 */
async function loadComponents(): Promise<any[]> {
  const dataPath = path.join(process.cwd(), 'data', 'component-registry.json');
  
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  
  const fileContents = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(fileContents);
}

/**
 * GET - Get all form-elements components or filter by category
 * Example: 
 * - GET /api/ui/components - returns all form-elements
 * - GET /api/ui/components?category=form-elements - returns only form-elements
 */
export async function GET(request: NextRequest) {
  // Check authentication if REQUIRE_LOGIN is true
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Load components (always fresh, no caching)
    const components = await loadComponents();
    
    if (!components || components.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Components file not found or empty' },
        { status: 404 }
      );
    }

    // Filter by category if provided
    let filteredComponents = components;
    if (category) {
      filteredComponents = components.filter((comp: any) => comp.category === category);
    }

    return NextResponse.json({
      success: true,
      data: filteredComponents
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error loading components:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load components' 
      },
      { status: 500 }
    );
  }
}

