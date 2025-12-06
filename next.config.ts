import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Argon2 is a native module that should only run on the server
  // serverExternalPackages tells Next.js/Turbopack not to bundle this package
  serverExternalPackages: [
    "argon2",
    "swagger-jsdoc",
    "jsonwebtoken",
    "remark",
    "remark-parse",
    "remark-gfm",
  ],

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
      // Data fetching and state management
      '@tanstack/react-query',
      '@tanstack/react-table',
      // Form handling
      'react-hook-form',
      // Date picker
      'react-day-picker'
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Enable webpack caching for faster builds
    // Cache is stored in .next/cache/webpack
    config.cache = {
      type: "filesystem",
      buildDependencies: {
        config: [path.join(process.cwd(), "next.config.ts")],
      },
    };

    // Mark client-only packages as externals for server-side rendering
    // These packages are only used on the client side and should not be bundled on the server
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'jspdf': 'commonjs jspdf',
        'html2canvas': 'commonjs html2canvas',
      });
    }



    // Only obfuscate in release builds (when OBFUSCATE=true) and for client-side code
    if (!dev && !isServer && process.env.OBFUSCATE === "true") {
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
