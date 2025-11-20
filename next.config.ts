import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Argon2 is a native module that should only run on the server
  // serverExternalPackages tells Next.js/Turbopack not to bundle this package
  serverExternalPackages: ["argon2"],
  // Disable Turbopack to use webpack for obfuscation
  // Empty turbopack config to silence the warning (Next.js 16 uses Turbopack by default)
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
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
