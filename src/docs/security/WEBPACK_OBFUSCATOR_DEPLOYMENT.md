# Webpack Obfuscator Deployment Guide

This document provides comprehensive details on how webpack obfuscator is deployed and configured in the Gradian application, including how the `OBFUSCATE` environment variable is managed through `package.json`.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variable Management](#environment-variable-management)
3. [Next.js Build Configuration](#nextjs-build-configuration)
4. [CDN Build Configuration](#cdn-build-configuration)
5. [Deployment Instructions](#deployment-instructions)
6. [Obfuscation Settings](#obfuscation-settings)
7. [Excluded Paths](#excluded-paths)
8. [Troubleshooting](#troubleshooting)

## Overview

Webpack Obfuscator is used to protect client-side JavaScript code by making it harder to reverse engineer. The obfuscation is conditionally applied based on the `OBFUSCATE` environment variable, allowing you to:

- **Development builds**: No obfuscation (faster builds, easier debugging)
- **Production builds**: Standard minification only
- **Release builds**: Full obfuscation enabled (maximum protection)

## Environment Variable Management

### Package.json Scripts

The `OBFUSCATE` environment variable is managed through npm scripts in `package.json`:

```json
{
  "scripts": {
    "build": "next build --webpack",
    "build:release": "OBFUSCATE=true next build --webpack"
  }
}
```

### How It Works

1. **Standard Build** (`npm run build`):
   - Runs `next build --webpack` without the `OBFUSCATE` variable
   - Obfuscation is **disabled**
   - Code is minified but not obfuscated
   - Faster build times
   - Suitable for staging/testing environments

2. **Release Build** (`npm run build:release`):
   - Sets `OBFUSCATE=true` as an environment variable
   - Runs `next build --webpack` with obfuscation enabled
   - Code is both minified and obfuscated
   - Slower build times (due to obfuscation processing)
   - Suitable for production deployments requiring code protection

### Environment Variable Detection

The obfuscation is conditionally applied in `next.config.ts`:

```typescript
if (!dev && !isServer && process.env.OBFUSCATE === "true") {
  // Obfuscation logic here
}
```

**Conditions for obfuscation:**
- `!dev`: Only in production builds (not development mode)
- `!isServer`: Only for client-side code (not server-side bundles)
- `process.env.OBFUSCATE === "true"`: Environment variable must be explicitly set to `"true"`

## Next.js Build Configuration

### Location

The obfuscation configuration is in `next.config.ts` within the `webpack` function.

### Configuration Details

```83:124:next.config.ts
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
```

### Key Implementation Details

1. **Dynamic Require**: Uses `require()` instead of `import` to avoid issues during Next.js config compilation
2. **Error Handling**: Wraps obfuscator loading in try-catch to prevent build failures if the package is missing
3. **Module Resolution**: Handles both default and named exports from `webpack-obfuscator`
4. **Plugin Addition**: Adds the obfuscator plugin to webpack's plugin array

## CDN Build Configuration

The application also uses webpack obfuscator for CDN builds (standalone JavaScript files for third-party embedding).

### CDN Build Scripts

Located in `scripts/webpack-cdn/`:

- `webpack.cdn.config.js` - Form embed helper
- `webpack.cdn.modal.config.js` - Form modal embed
- `webpack.cdn.table.config.js` - Table embed

### CDN Build Commands

```json
{
  "scripts": {
    "build:cdn": "node scripts/build-cdn.js",
    "build:cdn:webpack": "webpack --config scripts/webpack-cdn/webpack.cdn.config.js",
    "build:cdn:modal": "webpack --config scripts/webpack-cdn/webpack.cdn.modal.config.js",
    "build:cdn:table": "webpack --config scripts/webpack-cdn/webpack.cdn.table.config.js",
    "build:cdn:all": "npm run build:cdn && npm run build:cdn:modal && npm run build:cdn:table"
  }
}
```

### CDN Obfuscation

**Important**: CDN builds **always** use obfuscation (no environment variable check). This is because CDN files are meant for public distribution and require protection.

The CDN webpack configs include the obfuscator plugin directly:

```19:50:scripts/webpack-cdn/webpack.cdn.config.js
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
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
        compact: true,
        controlFlowFlattening: false, // Disable to keep performance
        deadCodeInjection: false, // Disable to keep performance
        debugProtection: false, // Disable for CDN usage
        debugProtectionInterval: 0,
        disableConsoleOutput: false, // Keep console for debugging
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false, // Disable to keep performance
        renameGlobals: false,
        selfDefending: false, // Disable for CDN usage
        simplify: true,
        splitStrings: false, // Disable to keep performance
        transformObjectKeys: false, // Keep API names readable
      },
      []
    ),
```

## Deployment Instructions

### Local Development

For local development, use the standard build command (no obfuscation):

```bash
npm run build
```

### Production Deployment (Without Obfuscation)

For production deployments where obfuscation is not required:

```bash
npm run build
npm start
```

### Production Deployment (With Obfuscation)

For production deployments requiring code protection:

```bash
npm run build:release
npm start
```

### Docker Deployment

In your `Dockerfile`, set the environment variable before building:

```dockerfile
# Build with obfuscation
ENV OBFUSCATE=true
RUN npm run build

# Or build without obfuscation
RUN npm run build
```

### CI/CD Pipeline Examples

#### GitLab CI

```yaml
build_release:
  stage: build
  script:
    - npm ci
    - npm run build:release
  artifacts:
    paths:
      - .next/
    expire_in: 1 week
```

#### GitHub Actions

```yaml
- name: Build with obfuscation
  run: npm run build:release
  env:
    OBFUSCATE: true
```

#### Environment-Specific Builds

```yaml
build_staging:
  script:
    - npm run build  # No obfuscation

build_production:
  script:
    - npm run build:release  # With obfuscation
```

### Setting Environment Variable Manually

If you need to set the variable manually (outside of npm scripts):

**Linux/macOS:**
```bash
OBFUSCATE=true npm run build
```

**Windows (PowerShell):**
```powershell
$env:OBFUSCATE="true"; npm run build
```

**Windows (CMD):**
```cmd
set OBFUSCATE=true && npm run build
```

## Obfuscation Settings

### Next.js Build Settings

The obfuscation settings for Next.js builds are optimized for:

- **Performance**: Minimal impact on runtime performance
- **Protection**: Strong string obfuscation without breaking functionality
- **Compatibility**: Works with React, Next.js, and modern JavaScript

**Active Settings:**
- `rotateStringArray: true` - Rotates string array periodically
- `stringArray: true` - Moves strings to a special array
- `stringArrayCallsTransform: true` - Transforms string array calls
- `stringArrayIndexShift: true` - Shifts string array indices
- `stringArrayRotate: true` - Rotates string array
- `stringArrayShuffle: true` - Shuffles string array
- `stringArrayWrappersCount: 2` - Number of wrapper functions
- `stringArrayWrappersChainedCalls: true` - Enables chained wrapper calls
- `stringArrayWrappersParametersMaxCount: 4` - Maximum wrapper parameters
- `stringArrayWrappersType: "function"` - Wrapper type
- `stringArrayThreshold: 0.75` - 75% of strings are moved to array
- `unicodeEscapeSequence: false` - Disabled for better performance

**Disabled Settings (for performance):**
- `controlFlowFlattening: false` - Would significantly impact performance
- `deadCodeInjection: false` - Would increase bundle size
- `debugProtection: false` - Would break debugging tools
- `selfDefending: false` - Would cause issues with bundlers

### CDN Build Settings

CDN builds use similar settings but with additional optimizations:

- `compact: true` - Removes whitespace
- `simplify: true` - Simplifies code structure
- `identifierNamesGenerator: 'hexadecimal'` - Uses hex identifiers
- `transformObjectKeys: false` - Keeps API names readable (important for public APIs)

## Excluded Paths

Certain paths are excluded from obfuscation to prevent issues:

### Next.js Build Exclusions

```typescript
[
  "**/node_modules/**",      // Third-party dependencies
  "**/server/**",            // Server-side code
  "**/api/**",               // API routes
  "**/voice/**",             // Voice-related components
  "**/voice-powered-orb**",  // Voice orb component
  "**/VoiceVisualizer**",     // Voice visualizer
  "**/VoiceInputDialog**",   // Voice input dialog
  "**/RecordingTimer**",     // Recording timer
  "**/VoicePoweredOrb**"     // Voice powered orb
]
```

### Why These Are Excluded

1. **node_modules**: Third-party code should not be obfuscated (licensing, debugging)
2. **server/api**: Server-side code doesn't need obfuscation (not sent to clients)
3. **voice components**: Audio/voice libraries may have compatibility issues with obfuscation

### CDN Build Exclusions

CDN builds use an empty exclusion array `[]`, meaning all code is obfuscated. This is intentional as CDN files are standalone and meant for public distribution.

## Troubleshooting

### Build Fails with "Cannot find module 'webpack-obfuscator'"

**Solution:**
```bash
npm install --save-dev webpack-obfuscator
```

The package should already be in `devDependencies`, but if missing, install it.

### Obfuscation Not Working

**Check:**
1. Environment variable is set: `process.env.OBFUSCATE === "true"`
2. Build is production mode: `!dev` (not development)
3. Build is client-side: `!isServer` (not server bundle)
4. Package is installed: `webpack-obfuscator` in `node_modules`

**Debug:**
```bash
# Check if variable is set
echo $OBFUSCATE  # Linux/macOS
echo %OBFUSCATE%  # Windows CMD
$env:OBFUSCATE    # Windows PowerShell

# Verify package
npm list webpack-obfuscator
```

### Build Performance Issues

Obfuscation significantly increases build time. If builds are too slow:

1. **Use obfuscation only for release builds** (current setup)
2. **Consider excluding more paths** if not needed
3. **Use build caching** (already enabled in `next.config.ts`)

### Runtime Errors After Obfuscation

If you encounter runtime errors after enabling obfuscation:

1. **Check excluded paths** - Add problematic paths to exclusion list
2. **Disable specific obfuscation features** - Some features may break certain code patterns
3. **Test thoroughly** - Obfuscation can sometimes break dynamic code

### CDN Build Issues

If CDN builds fail:

1. **Check source files exist:**
   ```bash
   ls src/gradian-ui/form-builder/utils/form-embed-helper.cdn.js
   ```

2. **Verify webpack config:**
   ```bash
   npm run build:cdn:webpack
   ```

3. **Check output directory:**
   ```bash
   ls public/cdn/
   ```

## Security Considerations

### What Obfuscation Protects

- **String literals**: API endpoints, configuration values, messages
- **Function names**: Internal function names are harder to identify
- **Code structure**: Makes reverse engineering more difficult

### What Obfuscation Does NOT Protect

- **API endpoints**: Still visible in network requests
- **Client-side logic**: Can still be analyzed with effort
- **Security vulnerabilities**: Obfuscation is NOT a security measure
- **Sensitive data**: Never put sensitive data in client-side code

### Best Practices

1. **Never rely on obfuscation for security** - It's a deterrent, not protection
2. **Keep sensitive logic server-side** - Client-side code is always accessible
3. **Use proper authentication/authorization** - Don't trust client-side checks
4. **Validate all inputs server-side** - Client-side validation can be bypassed
5. **Use HTTPS** - Protect data in transit
6. **Regular security audits** - Obfuscation doesn't replace security practices

## Additional Resources

- [webpack-obfuscator Documentation](https://github.com/javascript-obfuscator/webpack-obfuscator)
- [Next.js Webpack Configuration](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)
- [JavaScript Obfuscator Options](https://github.com/javascript-obfuscator/javascript-obfuscator#options)

## Summary

The webpack obfuscator is managed through:

1. **Package.json scripts**: `build:release` sets `OBFUSCATE=true`
2. **Next.js config**: Conditionally applies obfuscation based on environment variable
3. **CDN builds**: Always use obfuscation (no environment variable needed)
4. **Exclusions**: Certain paths are excluded to prevent issues

To deploy with obfuscation:
```bash
npm run build:release
```

To deploy without obfuscation:
```bash
npm run build
```

