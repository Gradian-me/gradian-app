// Image Save API Route
// Saves base64 images to CDN_IMAGE_URL or public/images/ai-generated/

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ulid } from 'ulid';

const CDN_IMAGE_URL = process.env.CDN_IMAGE_URL;
const PUBLIC_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'ai-generated');

/**
 * Ensure images directory exists
 */
async function ensureImagesDirectory(): Promise<void> {
  try {
    if (!existsSync(PUBLIC_IMAGES_DIR)) {
      await mkdir(PUBLIC_IMAGES_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error ensuring images directory:', error);
    throw error;
  }
}

/**
 * POST - Save base64 image and return URL
 * Body: { base64: string, mimeType?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64, mimeType = 'image/png' } = body;

    if (!base64 || typeof base64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'base64 image data is required' },
        { status: 400 }
      );
    }

    // Extract base64 data (remove data URL prefix if present)
    let base64Data = base64;
    if (base64Data.startsWith('data:image/')) {
      base64Data = base64Data.split(',')[1] || base64Data;
    }

    // Generate unique filename with Gradian prefix
    const uuid = ulid();
    const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const filename = `Gradian_Image_${uuid}.${extension}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // If CDN_IMAGE_URL is set, we would upload to CDN here
    // For now, we'll save to public directory and return the URL
    if (CDN_IMAGE_URL) {
      // TODO: Implement CDN upload (e.g., AWS S3, Cloudflare R2, etc.)
      // For now, save locally and return CDN URL path
      await ensureImagesDirectory();
      const filePath = join(PUBLIC_IMAGES_DIR, filename);
      await writeFile(filePath, buffer);
      
      // Return CDN URL
      const cdnUrl = `${CDN_IMAGE_URL}/images/ai-generated/${filename}`;
      return NextResponse.json({
        success: true,
        url: cdnUrl,
        localPath: `/images/ai-generated/${filename}`,
      });
    } else {
      // Save to public directory
      await ensureImagesDirectory();
      const filePath = join(PUBLIC_IMAGES_DIR, filename);
      await writeFile(filePath, buffer);
      
      // Return local URL (will be served by Next.js from public directory)
      const localUrl = `/images/ai-generated/${filename}`;
      return NextResponse.json({
        success: true,
        url: localUrl,
        localPath: localUrl,
      });
    }
  } catch (error) {
    console.error('Error saving image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save image',
      },
      { status: 500 }
    );
  }
}

