// Image Viewer Component
// Displays images from URL or base64 content using Next.js Image component

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FormElementProps } from '../types';
import { cn } from '../../../shared/utils';

export interface ImageViewerProps extends Omit<FormElementProps, 'config'> {
  config?: any;
  sourceUrl?: string;
  content?: string; // base64 content
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  priority?: boolean;
  quality?: number;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  config,
  value,
  sourceUrl,
  content,
  alt,
  width = 1024,
  height = 1024,
  className,
  objectFit = 'contain',
  priority = false,
  quality = 90,
  ...props
}) => {
  // Extract image source from various possible locations
  const imageUrl = 
    sourceUrl || 
    config?.sourceUrl || 
    value?.url || 
    value?.sourceUrl || 
    value?.imageUrl || 
    value?.image;

  // Extract base64 content
  const base64Content = 
    content || 
    config?.content || 
    value?.b64_json || 
    value?.content;

  // Extract alt text
  const imageAlt = alt || config?.alt || config?.imageAlt || 'Generated image';

  // State for saved image URL
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Determine if we have a valid image source
  const hasImageUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0;
  const hasBase64Content = base64Content && typeof base64Content === 'string' && base64Content.length > 0;

  // Save base64 image to server if we have base64 but no URL
  useEffect(() => {
    if (hasBase64Content && !hasImageUrl && !savedImageUrl && !isSaving) {
      setIsSaving(true);
      const saveImage = async () => {
        try {
          // Prepare base64 string (add data URL prefix if needed)
          let base64String = base64Content;
          if (!base64String.startsWith('data:image/')) {
            base64String = `data:image/png;base64,${base64String}`;
          }
          
          // Extract just the base64 data (remove data URL prefix for API)
          let base64Data = base64String;
          if (base64Data.startsWith('data:image/')) {
            base64Data = base64Data.split(',')[1] || base64Data;
          }
          
          // Save image via API
          const saveResponse = await fetch('/api/images/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64: base64String, // Send full data URL for API to parse
              mimeType: 'image/png',
            }),
          });
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            if (saveResult.success && saveResult.url && typeof saveResult.url === 'string' && saveResult.url.trim().length > 0) {
              setSavedImageUrl(saveResult.url);
            }
          }
        } catch (error) {
          console.warn('Failed to save image:', error);
          // Continue with base64 if save fails
        } finally {
          setIsSaving(false);
        }
      };
      
      saveImage();
    }
  }, [hasBase64Content, hasImageUrl, savedImageUrl, isSaving, base64Content]);

  // If no image source, return null
  if (!hasImageUrl && !hasBase64Content) {
    return null;
  }

  // Helper function to validate if a string is a valid URL
  const isValidUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }
    // Check if it's a relative URL (starts with /)
    if (url.startsWith('/')) {
      return true;
    }
    // Check if it's a data URL
    if (url.startsWith('data:')) {
      return true;
    }
    // Check if it's a valid absolute URL
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Prepare image source - use saved URL if available, otherwise use original URL or base64
  let imageSrc: string;
  let useNextImage = true;

  // Priority: saved URL > original URL > base64
  if (savedImageUrl && isValidUrl(savedImageUrl)) {
    imageSrc = savedImageUrl;
    useNextImage = true;
  } else if (hasImageUrl && isValidUrl(imageUrl!)) {
    imageSrc = imageUrl!;
    useNextImage = true;
  } else if (hasBase64Content) {
    // Check if base64 content already has data URL prefix
    if (base64Content.startsWith('data:image/')) {
      imageSrc = base64Content;
    } else {
      // Assume it's base64 without prefix, add default image/jpeg prefix
      imageSrc = `data:image/jpeg;base64,${base64Content}`;
    }
    // Next.js Image doesn't support data URLs well, use regular img for base64
    useNextImage = false;
  } else {
    return null;
  }

  const containerClasses = cn(
    'relative overflow-hidden rounded-lg',
    className
  );

  const imageClasses = cn(
    objectFit === 'contain' && 'object-contain',
    objectFit === 'cover' && 'object-cover',
    objectFit === 'fill' && 'object-fill',
    objectFit === 'none' && 'object-none',
    objectFit === 'scale-down' && 'object-scale-down'
  );

  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    maxWidth: '100%',
    maxHeight: '100%',
  };

  // Use regular img tag for base64 content
  if (!useNextImage) {
    return (
      <div className={containerClasses} style={containerStyle}>
        <img
          src={imageSrc}
          alt={imageAlt}
          className={cn(imageClasses, 'w-full h-full max-w-full max-h-full rounded-lg')}
          style={{ objectFit, width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
          onError={(e) => {
            // Hide image on error
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
          {...props}
        />
      </div>
    );
  }

  // Use Next.js Image for URLs
  // Note: For external URLs, Next.js Image requires unoptimized or remotePatterns configuration
  // We'll use unoptimized for external URLs to avoid configuration issues
  const isExternalUrl = imageSrc.startsWith('http://') || imageSrc.startsWith('https://');
  const isRelativeUrl = imageSrc.startsWith('/');
  
  // Validate imageSrc before passing to Next.js Image
  if (!isValidUrl(imageSrc)) {
    // If invalid URL, fall back to regular img tag
    return (
      <div className={containerClasses} style={containerStyle}>
        <img
          src={imageSrc}
          alt={imageAlt}
          className={cn(imageClasses, 'w-full h-full max-w-full max-h-full rounded-lg')}
          style={{ objectFit, width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
          onError={(e) => {
            // Hide image on error
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
          {...props}
        />
      </div>
    );
  }
  
  return (
    <div className={containerClasses} style={containerStyle}>
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={width}
        height={height}
        className={cn(imageClasses, 'w-full h-full max-w-full max-h-full')}
        priority={priority}
        quality={quality}
        style={{ objectFit, width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
        unoptimized={isExternalUrl || isRelativeUrl} // Use unoptimized for external and relative URLs
        onError={(e) => {
          // Hide image on error
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
        {...props}
      />
    </div>
  );
};

ImageViewer.displayName = 'ImageViewer';

