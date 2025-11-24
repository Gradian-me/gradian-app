# Build Cache Guide

This guide explains how build caching is configured in this project to speed up builds.

## Overview

Build caching stores intermediate build artifacts so that subsequent builds can reuse them, significantly reducing build times. This project uses multiple caching strategies:

1. **Webpack Filesystem Cache** - Caches webpack compilation results
2. **TypeScript Incremental Compilation** - Caches TypeScript compilation
3. **Next.js Build Cache** - Next.js internal caching mechanisms
4. **Package Import Optimization** - Optimizes imports for faster builds

## Configured Caching

### 1. Webpack Filesystem Cache

Webpack caching is enabled in `next.config.ts` and stores cache in `.next/cache/webpack/`. This cache:
- Persists between builds
- Uses gzip compression to save disk space
- Automatically invalidates when configuration changes
- Significantly speeds up production builds

**Cache Location:** `.next/cache/webpack/`

### 2. TypeScript Incremental Compilation

TypeScript incremental compilation is enabled in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "incremental": true
  }
}
```

This generates `*.tsbuildinfo` files that cache TypeScript compilation results.

**Cache Files:** `*.tsbuildinfo` (already in `.gitignore`)

### 3. Next.js Package Import Optimization

The project uses Next.js experimental `optimizePackageImports` to optimize imports from commonly used packages:
- Radix UI components
- Lucide React icons
- Date-fns utilities

This reduces bundle size and improves build speed by tree-shaking unused exports.

## Cache Locations

All build caches are stored in the `.next/` directory:

```
.next/
├── cache/
│   └── webpack/          # Webpack filesystem cache
├── build-manifest.json   # Next.js build manifest
└── ...                   # Other Next.js build artifacts
```

**Important:** The `.next/` directory is already in `.gitignore`, so caches are not committed to version control.

## Using Build Cache

### Local Development

Build cache works automatically. On your first build, it will be slower as it creates the cache. Subsequent builds will be faster:

```bash
# First build - slower (creates cache)
npm run build

# Subsequent builds - faster (uses cache)
npm run build
```

### CI/CD Environments

For CI/CD pipelines, you should cache the `.next/cache/` directory between builds. Here are examples for popular CI platforms:

#### GitHub Actions

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: |
      .next/cache
      node_modules/.cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
```

#### GitLab CI

```yaml
cache:
  key:
    files:
      - package-lock.json
  paths:
    - .next/cache/
    - node_modules/.cache/
```

#### Vercel

Vercel automatically caches `.next/cache/` between deployments. No additional configuration needed.

#### Docker Builds

If using Docker, you can use BuildKit cache mounts:

```dockerfile
# Use BuildKit cache mount for .next/cache
RUN --mount=type=cache,target=.next/cache \
    npm run build
```

Or use a multi-stage build with cache:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Cache .next/cache between builds
RUN --mount=type=cache,target=.next/cache \
    npm run build
```

## Cache Invalidation

Caches are automatically invalidated when:

1. **Configuration changes** - Changes to `next.config.ts`, `tsconfig.json`, or `package.json`
2. **Source code changes** - Modified files trigger selective cache invalidation
3. **Dependency updates** - Changes to `package-lock.json` invalidate relevant caches
4. **Manual cleanup** - You can manually delete `.next/cache/` to force a full rebuild

### Manual Cache Clearing

If you encounter build issues, you can clear the cache:

```bash
# Remove all Next.js build artifacts and cache
rm -rf .next

# Or just clear the cache (keeps other build artifacts)
rm -rf .next/cache

# Clear TypeScript build info
find . -name "*.tsbuildinfo" -delete
```

## Performance Tips

### 1. Keep Cache Between Builds

- **Local:** Don't delete `.next/cache/` unless necessary
- **CI/CD:** Configure cache restoration in your pipeline
- **Docker:** Use BuildKit cache mounts or volume mounts

### 2. Optimize Dependencies

The project already optimizes package imports. To add more packages:

```typescript
// next.config.ts
experimental: {
  optimizePackageImports: [
    // Add packages with many exports that you only use partially
    'your-package-name',
  ],
}
```

### 3. Monitor Cache Size

Large caches can slow down builds. Monitor `.next/cache/` size:

```bash
# Check cache size
du -sh .next/cache
```

If cache becomes too large (>500MB), consider clearing it.


## Troubleshooting

### Build Cache Not Working

1. **Check disk space** - Ensure you have enough disk space for cache
2. **Check permissions** - Ensure write permissions for `.next/cache/`
3. **Clear and rebuild** - Try clearing cache and rebuilding
4. **Check configuration** - Verify `next.config.ts` has correct cache settings

### Slow Builds Despite Cache

1. **First build is always slower** - Cache needs to be populated
2. **Large codebase** - Very large projects may still take time
3. **Obfuscation overhead** - Webpack obfuscation adds build time (production only)
4. **Check for cache hits** - Verify cache is being used (check `.next/cache/` modification times)

### CI/CD Cache Issues

1. **Cache key too specific** - Use restore-keys for fallback
2. **Cache size limits** - Some CI platforms have cache size limits
3. **Cache not persisting** - Verify cache paths are correct
4. **Network issues** - Cache upload/download can be slow

## Best Practices

1. ✅ **Commit `package-lock.json`** - Ensures consistent dependency versions
2. ✅ **Use CI/CD caching** - Always configure cache in CI/CD pipelines
3. ✅ **Monitor cache size** - Keep cache under 500MB if possible
4. ✅ **Don't commit cache** - Keep `.next/cache/` in `.gitignore`
5. ✅ **Clear cache when needed** - If builds are inconsistent, clear cache
6. ✅ **Use incremental builds** - Let TypeScript incremental compilation work
7. ✅ **Optimize package imports** - Add large packages to `optimizePackageImports`

## Additional Resources

- [Next.js Build Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Webpack Filesystem Cache](https://webpack.js.org/configuration/cache/)
- [TypeScript Incremental Compilation](https://www.typescriptlang.org/tsconfig#incremental)

