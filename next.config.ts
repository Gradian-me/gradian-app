import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone output for Docker deployments
  output: 'standalone',
  // Argon2 is a native module that should only run on the server
  // serverExternalPackages tells Next.js/Turbopack not to bundle this package
  serverExternalPackages: ["argon2"],
  // Disable Turbopack to use webpack for obfuscation
  // Empty turbopack config to silence the warning (Next.js 16 uses Turbopack by default)
  turbopack: {},
  // Enable experimental build cache for faster incremental builds
  experimental: {
    // Optimize package imports - reduces bundle size and improves build speed
    optimizePackageImports: [
      // Radix UI components
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      // Icons and utilities
      'lucide-react',
      'date-fns',
      // Data fetching and state management
      '@tanstack/react-query',
      '@tanstack/react-table',
      // Animation library
      'framer-motion',
      // Form handling
      'react-hook-form',
      // Charts
      'recharts',
      'echarts',
      'echarts-for-react',
      // Date picker
      'react-day-picker',
      // Syntax highlighting
      'react-syntax-highlighter',
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Enable webpack caching for faster builds
    // Cache is stored in .next/cache/webpack
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        // Reference the actual source config file, not the compiled one
        config: [path.resolve(__dirname, 'next.config.ts')],
      },
      // Cache location - must be absolute path
      cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'),
      // Compression for cache files
      compression: 'gzip',
      // Only cache in production builds (dev mode has its own caching)
      ...(dev ? {} : {
        maxMemoryGenerations: 1,
      }),
    };

    // Only obfuscate in production builds and for client-side code
    if (!dev && !isServer) {
      // Use dynamic require to avoid issues with Next.js config compilation
      try {
        const webpackObfuscatorModule = require("webpack-obfuscator");
        const WebpackObfuscator = webpackObfuscatorModule.default || webpackObfuscatorModule;
        if (WebpackObfuscator) {
          config.plugins.push(
            new WebpackObfuscator(
              {
                rotateStringArray: true,
                stringArray: true,
                stringArrayCallsTransform: true,
                stringArrayEncoding: [],
                stringArrayIndexShift: true,
                stringArrayRotate: true,
                stringArrayShuffle: true,
                stringArrayWrappersCount: 2,
                stringArrayWrappersChainedCalls: true,
                stringArrayWrappersParametersMaxCount: 4,
                stringArrayWrappersType: "function",
                stringArrayThreshold: 0.75,
                unicodeEscapeSequence: false,
              },
              ["**/node_modules/**", "**/server/**", "**/api/**"]
            )
          );
        }
      } catch (error) {
        console.warn("Failed to load webpack-obfuscator:", error);
      }
    }
    return config;
  },
};

export default nextConfig;
