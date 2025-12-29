'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { cn } from '@/gradian-ui/shared/utils';

export interface LogoProps {
  /**
   * Variant of the logo to display
   * - 'auto': Automatically uses dark/light based on theme
   * - 'dark': Force dark mode logo
   * - 'light': Force light mode logo
   * - 'white': White logo variant
   */
  variant?: 'auto' | 'dark' | 'light' | 'white' | 'icon';
  /**
   * Width of the logo
   * @default 120
   */
  width?: number;
  /**
   * Height of the logo
   * @default 40
   */
  height?: number;
  /**
   * CSS class name
   */
  className?: string;
  /**
   * Alt text for the image
   * @default "Gradian Logo"
   */
  alt?: string;
}

export function Logo({
  variant = 'auto',
  width = 120,
  height = 40,
  className,
  alt = 'Gradian Logo',
}: LogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which logo to show
  const getLogoPath = (): string => {
    if (variant === 'white') {
      return '/logo/Gradian-logo-white.png';
    }
    
    if (variant === 'dark') {
      return '/logo/Gradian-Logo-darkmode-min.png';
    }
    
    if (variant === 'light') {
      return '/logo/Gradian-Logo-lightmode-min.png';
    }

    if (variant === 'icon') {
      return '/logo/Gradian_Logo_Icon.png';
    }
    
    // Auto mode: use theme
    if (!mounted) {
      // Default to light during SSR
      return '/logo/Gradian-Logo-lightmode-min.png';
    }
    
    const currentTheme = theme === 'system' ? systemTheme : theme;
    return currentTheme === 'dark'
      ? '/logo/Gradian-Logo-darkmode-min.png'
      : '/logo/Gradian-Logo-lightmode-min.png';
  };

  return (
    <Image
      src={getLogoPath()}
      alt={alt}
      width={width}
      height={height}
      className={cn('object-contain m-0', className)}
      priority
      quality={90}
      loading="eager"
    />
  );
}

Logo.displayName = 'Logo';

