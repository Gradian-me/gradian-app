# CDN Build Quick Start

Quick guide to building the minified and obfuscated CDN script.

## Build Commands

```bash
# Build the CDN script (production)
npm run build:cdn

# Build in watch mode (for development)
npm run build:cdn:watch

# Direct webpack command (alternative)
npm run build:cdn:webpack
```

## What It Does

1. **Minifies** the JavaScript code
2. **Obfuscates** using webpack-obfuscator (same settings as your Next.js build)
3. **Outputs** to `public/cdn/form-embed-helper.min.js`

## Output

After building, the file will be at:
```
public/cdn/form-embed-helper.min.js
```

This file is automatically served by Next.js at:
```
https://yourapp.com/cdn/form-embed-helper.min.js
```

## Obfuscation Settings

The build uses the same obfuscation settings as your main Next.js build:
- String array rotation and shuffling
- String array encoding
- Function wrapper chains
- Compact output
- Performance-optimized (no control flow flattening or dead code injection)

## Verification

After building, check the output:

```bash
# Check file exists and size
ls -lh public/cdn/form-embed-helper.min.js

# Test in browser console
# Load: https://yourapp.com/cdn/form-embed-helper.min.js
# Then: GradianFormEmbed.createData('tags', { baseUrl: 'https://yourapp.com' })
```

## Integration in CI/CD

Add to your build pipeline:

```yaml
# Example: GitLab CI
build_cdn:
  stage: build
  script:
    - npm run build:cdn
  artifacts:
    paths:
      - public/cdn/form-embed-helper.min.js
```

## Troubleshooting

### Error: Cannot find module 'webpack'

Install webpack-cli (already in devDependencies):
```bash
npm install --save-dev webpack-cli
```

### Error: Cannot find module 'webpack-obfuscator'

Already in devDependencies, but if missing:
```bash
npm install --save-dev webpack-obfuscator
```

### Build fails

Check that the source file exists:
```bash
ls src/gradian-ui/form-builder/utils/form-embed-helper.cdn.js
```

## Next Steps

1. Build: `npm run build:cdn`
2. Test locally: `http://localhost:3000/cdn/form-embed-helper.min.js`
3. Deploy to production
4. Share CDN URL with third-party developers

