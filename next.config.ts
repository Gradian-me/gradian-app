import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  
  // Argon2 is a native module that should only run on the server
  // serverExternalPackages tells Next.js/Turbopack not to bundle this package
  serverExternalPackages: [
    "argon2",
    "swagger-jsdoc",
    "jsonwebtoken",
    "remark",
    "remark-parse",
    "remark-gfm",
    "jspdf",
    "html2canvas",
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

    // Mark client-only packages as externals to prevent webpack from bundling them
    // These packages are loaded dynamically at runtime using Function constructor
    // Only mark as externals for client-side builds (not server)
    if (!isServer) {
      const originalExternals = config.externals;
      if (typeof originalExternals === 'function') {
        config.externals = [
          originalExternals,
          'jspdf',
          'html2canvas',
        ];
      } else if (Array.isArray(originalExternals)) {
        config.externals = [...originalExternals, 'jspdf', 'html2canvas'];
      } else if (typeof originalExternals === 'object' && originalExternals !== null) {
        config.externals = {
          ...originalExternals,
          'jspdf': 'commonjs jspdf',
          'html2canvas': 'commonjs html2canvas',
        };
      } else {
        config.externals = ['jspdf', 'html2canvas'];
      }
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
              [
                "**/node_modules/**",
                "**/server/**",
                "**/api/**",
                "**/voice/**",
                "**/voice-powered-orb**",
                "**/VoiceVisualizer**",
                "**/VoiceInputDialog**",
                "**/RecordingTimer**",
                "**/VoicePoweredOrb**"
              ]
            )
          );
        }
      } catch (error) {
        console.warn("Failed to load webpack-obfuscator:", error);
      }
    }
    return config;
  },
  
  // Rewrite rules for serving static assets
  async rewrites() {
    return [
      // Serve KaTeX fonts from public directory
      {
        source: '/fonts/katex/:path*',
        destination: '/fonts/katex/:path*',
      },
    ];
  },

  // Security headers for production
  async headers() {
    let loginEmbedOrigins: string[] = typeof process.env.NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS === 'string'
      ? process.env.NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    // Fallback: allow same-app embedding when env not set (e.g. app1.cinnagen.com embedding its own login-modal)
    if (loginEmbedOrigins.length === 0 && typeof process.env.NEXT_PUBLIC_APP_URL === 'string') {
      try {
        const u = new URL(process.env.NEXT_PUBLIC_APP_URL.trim());
        const origin = u.origin;
        loginEmbedOrigins = [origin];
        if (u.protocol === 'https:') loginEmbedOrigins.push(u.origin.replace('https:', 'http:'));
        else if (u.protocol === 'http:') loginEmbedOrigins.push(u.origin.replace('http:', 'https:'));
      } catch {
        // ignore invalid URL
      }
    }
    // Always allow localhost for dev (when not in production or when explicitly desired)
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS?.includes('localhost')) {
      const localhostOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
      for (const o of localhostOrigins) {
        if (!loginEmbedOrigins.includes(o)) loginEmbedOrigins.push(o);
      }
    }
    const loginModalFrameAncestors = ['\'self\'', ...loginEmbedOrigins].join(' ');

    return [
      // Login modal: allow iframe embedding from allowed origins (must be first to take precedence)
      {
        source: '/authentication/login-modal',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' blob: https://*.cinnagen.com https://cg-gr-app.cinnagen.com:5001 https://www.gstatic.com https://cdn.jsdelivr.net",
              `frame-ancestors ${loginModalFrameAncestors}`,
              "object-src 'none'",
              "media-src 'self' https: blob:",
              "worker-src 'self' blob:",
            ].join('; ')
          }
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy - adjust based on your needs
          // Note: Mermaid now uses installed package, but we allow CDN as fallback
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", // Allow CDN for Mermaid fallback
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' blob: https://*.cinnagen.com https://cg-gr-app.cinnagen.com:5001 https://www.gstatic.com https://cdn.jsdelivr.net", // Allow CDN and required backend connections
              "frame-ancestors 'self'",
              "object-src 'none'",
              "media-src 'self' https: blob:",
              "worker-src 'self' blob:",
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
