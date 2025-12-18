// AI Models API Route
// Serves AI model pricing information from JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In-memory cache for models
let cachedModels: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load AI models with caching
 */
async function loadAiModels(useCache: boolean = true): Promise<any[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (useCache && cachedModels !== null && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedModels;
  }
  
  // Load fresh data
  const dataPath = path.join(process.cwd(), 'data', 'ai-models.json');
  
  if (!fs.existsSync(dataPath)) {
    console.warn(`[API] AI models file not found at: ${dataPath}`);
    cachedModels = [];
    cacheTimestamp = now;
    return cachedModels;
  }
  
  try {
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    
    if (!fileContents || fileContents.trim().length === 0) {
      cachedModels = [];
      cacheTimestamp = now;
      return cachedModels;
    }
    
    const parsed = JSON.parse(fileContents);
    
    // Handle different JSON structures
    let models: any[] = [];
    if (Array.isArray(parsed)) {
      models = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.data)) {
        models = parsed.data;
      } else if (Array.isArray(parsed.models)) {
        models = parsed.models;
      } else {
        models = Object.values(parsed);
      }
    }
    
    cachedModels = models;
    cacheTimestamp = now;
    return models;
  } catch (error) {
    console.error(`[API] Error parsing AI models file at ${dataPath}:`, error);
    cachedModels = [];
    cacheTimestamp = now;
    return cachedModels;
  }
}

/**
 * Clear cache (internal function - not exported to avoid Next.js route type errors)
 */
function clearCache() {
  cachedModels = null;
  cacheTimestamp = 0;
}

/**
 * GET - Get all AI models or a specific model by ID
 * Example: 
 * - GET /api/ai-models - returns all models
 * - GET /api/ai-models?id=gpt-4o - returns only gpt-4o model
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modelId = searchParams.get('id');

    // Load models (with caching)
    const models = await loadAiModels(true);
    
    if (!models || models.length === 0) {
      return NextResponse.json(
        { success: true, data: [], message: 'No AI models configured' },
        { status: 200 }
      );
    }

    // If specific model ID requested, return only that model
    if (modelId) {
      const model = models.find((m: any) => m.id === modelId);
      
      if (!model) {
        return NextResponse.json(
          { success: false, error: `Model with ID "${modelId}" not found` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: model,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Return all models
    return NextResponse.json({
      success: true,
      data: models,
      meta: {
        count: models.length,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Error in GET /api/ai-models:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load AI models',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

