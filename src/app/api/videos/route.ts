// Video List API Route
// Proxies video list requests to the video API with bearer token authentication

import { NextRequest, NextResponse } from 'next/server';
import { getApiKey } from '@/domains/ai-builder/utils/ai-security-utils';
import { getApiUrlForAgentType } from '@/domains/ai-builder/utils/ai-agent-url';

/**
 * GET - Fetch list of videos
 * Route: GET /api/videos
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Get API key with validation
    const apiKeyResult = getApiKey();
    if (!apiKeyResult.key) {
      return NextResponse.json(
        { success: false, error: apiKeyResult.error || 'LLM_API_KEY is not configured' },
        { status: 500 }
      );
    }
    const apiKey = apiKeyResult.key;

    // Get video API base URL
    const videosApiBaseUrl = getApiUrlForAgentType('video-generation');
    const listUrl = videosApiBaseUrl;

    // Get query parameters from request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${listUrl}?${queryString}` : listUrl;

    // Fetch video list from API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || `Failed to fetch video list: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The API returns { object: "list", data: [{ id, status, ... }], ... }
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching video list:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch video list' },
      { status: 500 }
    );
  }
}

