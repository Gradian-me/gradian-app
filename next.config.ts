import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
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
      'lucide-react',
      'date-fns',
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
      const WebpackObfuscator = require("webpack-obfuscator").default || require("webpack-obfuscator");
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
    return config;
  },
};

export default nextConfig;
