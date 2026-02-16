// Video Content Proxy API Route
// Proxies video content requests to the video API with bearer token authentication

import { NextRequest, NextResponse } from 'next/server';
import { getApiKey } from '@/domains/ai-builder/utils/ai-security-utils';
import { getApiUrlForAgentType } from '@/domains/ai-builder/utils/ai-agent-url';

/**
 * GET - Fetch video content by video ID
 * Route: GET /api/videos/[videoId]/content
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
    const contentUrl = `${videosApiBaseUrl}/${videoId}/content`;

    // Fetch video content from API
    const response = await fetch(contentUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Failed to fetch video content: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get content type from response
    let contentType = response.headers.get('content-type') || 'video/mp4';

    // Clone response to check content without consuming body
    const responseClone = response.clone();
    const firstBytes = await responseClone.arrayBuffer().catch(() => null);
    
    // Check if response starts with JSON indicators (starts with '{' or '[')
    if (firstBytes && firstBytes.byteLength > 0) {
      const textDecoder = new TextDecoder();
      const firstChars = textDecoder.decode(firstBytes.slice(0, 100)).trim();
      if (firstChars.startsWith('{') || firstChars.startsWith('[')) {
        // This is likely JSON, parse it as error
        try {
          const text = await response.text();
          const jsonData = JSON.parse(text);
          return NextResponse.json(
            { success: false, error: jsonData.error || jsonData.message || jsonData.code || 'Video content not available' },
            { status: 404 }
          );
        } catch {
          // If parsing fails, return generic error
          return NextResponse.json(
            { success: false, error: 'Video content not available' },
            { status: 404 }
          );
        }
      }
    }

    // Get video content as blob
    const videoBlob = await response.blob();

    // Check if blob is empty
    if (videoBlob.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Video content is empty' },
        { status: 404 }
      );
    }

    // Ensure content-type is set correctly for video
    if (!contentType.startsWith('video/')) {
      // Try to detect from blob type
      if (videoBlob.type && videoBlob.type.startsWith('video/')) {
        contentType = videoBlob.type;
      } else {
        // Default to mp4
        contentType = 'video/mp4';
      }
    }

    // Return video content with proper headers
    return new NextResponse(videoBlob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': videoBlob.size.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error fetching video content:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch video content' },
      { status: 500 }
    );
  }
}

