/**
 * Image utilities: resize, optimize, and process images for canvas/background use.
 * Used by SignaturePad background image and other components.
 */

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_JPEG_QUALITY = 0.88;

export const ACCEPTED_BACKGROUND_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
export const ACCEPTED_BACKGROUND_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp';

export interface ResizeImageOptions {
  /** Max width in pixels; if image is wider, scale down (default 1920). */
  maxWidth?: number;
  /** JPEG/WebP quality 0–1 (default 0.88). */
  quality?: number;
  /** Prefer WebP output when supported (default true). */
  preferWebP?: boolean;
}

export interface ResizeImageResult {
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Ensure a value is a PNG data URL.
 * - If the string already starts with "data:", it is returned unchanged.
 * - Otherwise, it is treated as a raw base64 payload and wrapped with the PNG data URL prefix.
 */
export function ensurePngDataUrl(value: string): string {
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  return `data:image/png;base64,${value}`;
}

/**
 * Load an image from a File and return dimensions (width, height).
 * Resolves when the image has loaded; rejects on error.
 */
export function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Resize image so width does not exceed maxWidth (aspect ratio preserved).
 * Draws to an offscreen canvas and returns a data URL (JPEG or WebP for optimization).
 * If the image is already at or below maxWidth, it is still re-encoded at the given quality.
 */
export function resizeImageToMaxWidth(
  file: File,
  options: ResizeImageOptions = {}
): Promise<ResizeImageResult> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;
  const preferWebP = options.preferWebP !== false;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      let targetWidth = w;
      let targetHeight = h;
      if (w > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = Math.round((h * maxWidth) / w);
      }
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      let dataUrl: string;
      let mimeType: string;
      const useWebP =
        preferWebP &&
        typeof canvas.toBlob === 'function' &&
        (() => {
          try {
            return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
          } catch {
            return false;
          }
        })();
      if (useWebP) {
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          mimeType = 'image/webp';
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          mimeType = 'image/jpeg';
        }
      } else {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        mimeType = 'image/jpeg';
      }
      resolve({
        dataUrl,
        width: targetWidth,
        height: targetHeight,
        mimeType,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Check if a File is an accepted background image type (jpeg, png, webp).
 */
export function isAcceptedBackgroundImageType(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  return (
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'image/webp'
  );
}
