// Video Status API Route
// Proxies video status requests to the video API with bearer token authentication

import { NextRequest, NextResponse } from 'next/server';
import { getApiKey } from '@/domains/ai-builder/utils/ai-security-utils';
import { getApiUrlForAgentType } from '@/domains/ai-builder/utils/ai-agent-url';

/**
 * GET - Get video status by video ID
 * Route: GET /api/videos/[videoId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      );
    }

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
    const statusUrl = `${videosApiBaseUrl}/${videoId}`;

    // Fetch video status from API
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Failed to fetch video status: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Parse response
    const data = await response.json();

    // Extract video data from response (handle list format)
    let videoData = null;
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      videoData = data.data[0];
    } else if (data.id || data.status) {
      videoData = data;
    }

    return NextResponse.json({
      success: true,
      data: videoData,
    });
  } catch (error) {
    console.error('Error fetching video status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch video status' },
      { status: 500 }
    );
  }
}

