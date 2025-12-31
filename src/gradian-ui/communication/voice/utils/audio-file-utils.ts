/**
 * Audio File Utilities
 * Secure validation and handling of audio file uploads
 */

// Security constants for audio files
const MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024; // 25MB max audio file size
const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg', // MP3
  'audio/mp4', // MP4 audio
  'video/mp4', // MP4 video (can contain audio)
  'audio/x-m4a', // M4A
  'audio/wav', // WAV
  'audio/wave', // WAV alternative
  'audio/x-wav', // WAV alternative
  'audio/webm', // WebM audio
  'video/webm', // WebM video (can contain audio)
  'audio/ogg', // OGG
  'video/ogg', // OGG video (can contain audio)
  'audio/x-ms-wma', // WMA
  'audio/flac', // FLAC
] as const;

const ALLOWED_AUDIO_EXTENSIONS = [
  '.mp4',
  '.m4a',
  '.wav',
  '.mp3',
  '.webm',
  '.ogg',
  '.wma',
  '.flac',
] as const;

/**
 * Validate audio file for secure upload
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateAudioFile(file: File | Blob): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }

  // Check if it's a File instance (has name and type)
  if (!(file instanceof File)) {
    // For Blob instances, we can't check MIME type or extension
    // But we can check size
    if (file.size > MAX_AUDIO_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum allowed size is ${Math.floor(MAX_AUDIO_FILE_SIZE / (1024 * 1024))}MB`,
      };
    }
    // Blob without type info - allow but warn that it might not be valid
    return { valid: true };
  }

  // Check file size
  if (file.size > MAX_AUDIO_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum allowed size is ${Math.floor(MAX_AUDIO_FILE_SIZE / (1024 * 1024))}MB`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // Validate MIME type
  if (file.type) {
    const fileMimeType = file.type.toLowerCase();
    const isValidMime = ALLOWED_AUDIO_MIME_TYPES.some((mime) => {
      const mimeLower = mime.toLowerCase();
      // Exact match
      if (fileMimeType === mimeLower) return true;
      // Starts with mime type followed by semicolon (for codecs like audio/mp4; codecs=...)
      if (fileMimeType.startsWith(mimeLower + ';')) return true;
      // For video/mp4, also check if it's an MP4 file by extension (some browsers report video/mp4 for audio-only MP4s)
      if (mimeLower === 'video/mp4' && file.name) {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.mp4') || fileName.endsWith('.m4a')) {
          return true;
        }
      }
      return false;
    });

    if (!isValidMime) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Allowed types: MP4, WAV, MP3, WebM, OGG, WMA, FLAC`,
      };
    }
  }

  // Validate file extension as additional security check
  if (file.name) {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_AUDIO_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext.toLowerCase())
    );

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `Unsupported file extension. Allowed extensions: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`,
      };
    }

    // Security: Check for path traversal in filename
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return {
        valid: false,
        error: 'Invalid file name. File name contains illegal characters.',
      };
    }
  }

  return { valid: true };
}

/**
 * Convert File to Blob for processing
 * @param file - The file to convert
 * @returns Promise resolving to Blob
 */
export async function fileToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Blob([reader.result], { type: file.type }));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Human-readable file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 * @param filename - The filename
 * @returns File extension (with dot) or empty string
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

