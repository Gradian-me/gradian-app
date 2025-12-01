// Image Viewer Component
// Displays images from URL or base64 content using Next.js Image component

import React from 'react';
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
  width = 512,
  height = 512,
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

  // Determine if we have a valid image source
  const hasImageUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0;
  const hasBase64Content = base64Content && typeof base64Content === 'string' && base64Content.length > 0;

  // If no image source, return null
  if (!hasImageUrl && !hasBase64Content) {
    return null;
  }

  // Prepare image source
  let imageSrc: string;
  let useNextImage = true;

  if (hasBase64Content) {
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
    imageSrc = imageUrl!;
  }

  const containerClasses = cn(
    'relative overflow-hidden rounded-lg',
    className
  );

  const imageClasses = cn(
    'object-contain',
    objectFit === 'contain' && 'object-contain',
    objectFit === 'cover' && 'object-cover',
    objectFit === 'fill' && 'object-fill',
    objectFit === 'none' && 'object-none',
    objectFit === 'scale-down' && 'object-scale-down'
  );

  // Use regular img tag for base64 content
  if (!useNextImage) {
    return (
      <div className={containerClasses} style={{ width, height }}>
        <img
          src={imageSrc}
          alt={imageAlt}
          className={cn(imageClasses, 'w-full h-full')}
          style={{ objectFit }}
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
  
  return (
    <div className={containerClasses} style={{ width, height }}>
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={width}
        height={height}
        className={imageClasses}
        priority={priority}
        quality={quality}
        style={{ objectFit }}
        unoptimized={isExternalUrl} // Use unoptimized for external URLs
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

