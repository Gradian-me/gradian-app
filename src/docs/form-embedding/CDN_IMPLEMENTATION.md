# CDN Implementation Guide

This guide explains how to publish and use the Gradian Form Embed Helper from a CDN.

## Overview

Publishing the form embed helper to a CDN allows third-party applications to use it without copying files or managing dependencies. They simply include a `<script>` tag and start using the API.

## Publishing to CDN

### Step 1: Build the CDN Script

The CDN script is located at:
```
src/gradian-ui/form-builder/utils/form-embed-helper.cdn.js
```

This is a standalone, browser-compatible JavaScript file that:
- Works in all modern browsers
- Has no dependencies
- Exposes a global `GradianFormEmbed` object
- Supports CommonJS, AMD, and browser globals

### Step 2: Build the Minified and Obfuscated Script

Build the script using webpack with obfuscation:

```bash
# Build the CDN script (minified and obfuscated)
npm run build:cdn

# Or watch mode for development
npm run build:cdn:watch
```

This will:
- Minify the code
- Obfuscate the code using webpack-obfuscator
- Output to `public/cdn/form-embed-helper.min.js`

The build uses the same obfuscation settings as your main Next.js build for consistency.

### Step 3: Verify the Build

After building, verify the output:

```bash
# Check the file was created
ls -lh public/cdn/form-embed-helper.min.js

# Test that it works (optional)
node -e "console.log('File size:', require('fs').statSync('public/cdn/form-embed-helper.min.js').size, 'bytes')"
```

### Step 4: Upload to CDN

Upload the script to your CDN provider. Examples:

#### Option A: AWS CloudFront + S3

```bash
# Upload to S3 (from public/cdn/ directory)
aws s3 cp public/cdn/form-embed-helper.min.js s3://your-bucket/cdn/form-embed-helper.min.js \
  --content-type "application/javascript" \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/cdn/form-embed-helper.min.js"
```

#### Option B: Cloudflare CDN

1. Upload to Cloudflare Workers or R2
2. Configure a custom domain
3. Enable caching

#### Option C: jsDelivr (GitHub-based)

1. Push the file to a GitHub repository
2. Use jsDelivr URL: `https://cdn.jsdelivr.net/gh/your-org/your-repo@main/path/to/form-embed-helper.min.js`

#### Option D: Your Own Server (Recommended for Quick Setup)

The build script automatically outputs to `public/cdn/form-embed-helper.min.js`, which Next.js will serve automatically:

```bash
# Build the script
npm run build:cdn

# The file is now available at:
# https://yourapp.com/cdn/form-embed-helper.min.js
```

No additional upload needed! Next.js will serve files from the `public/` directory automatically.

### Step 5: Version Your Script

For production, use versioned URLs:

```
https://cdn.yourapp.com/form-embed-helper/v1.0.0.min.js
https://cdn.yourapp.com/form-embed-helper/v1.0.1.min.js
```

This allows:
- Cache busting when needed
- Gradual rollouts
- Easy rollback if issues occur

## Using from CDN

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>Third Party App</title>
  <!-- Include the CDN script -->
  <script src="https://cdn.yourapp.com/form-embed-helper.min.js"></script>
</head>
<body>
  <button onclick="createTag()">Create Tag</button>

  <script>
    async function createTag() {
      try {
        const result = await GradianFormEmbed.createData('tags', {
          baseUrl: 'https://yourapp.com',
          initialValues: {
            name: 'New Tag',
            color: '#3b82f6',
          },
        });

        if (result.success) {
          alert('Tag created! ID: ' + result.entityId);
          console.log('Tag data:', result.data);
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to open form. Please check popup blocker settings.');
      }
    }
  </script>
</body>
</html>
```

### React Example

```tsx
import React, { useEffect } from 'react';

declare global {
  interface Window {
    GradianFormEmbed: {
      createData: (schemaId: string, options?: any) => Promise<any>;
      editData: (schemaId: string, entityId: string, options?: any) => Promise<any>;
      openFormEmbed: (options: any) => Promise<any>;
      version: string;
    };
  }
}

function DataManager() {
  useEffect(() => {
    // Load the CDN script if not already loaded
    if (!window.GradianFormEmbed) {
      const script = document.createElement('script');
      script.src = 'https://cdn.yourapp.com/form-embed-helper.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleCreate = async (schemaId: string) => {
    if (!window.GradianFormEmbed) {
      alert('Form embed helper is still loading...');
      return;
    }

    try {
      const result = await window.GradianFormEmbed.createData(schemaId, {
        baseUrl: 'https://yourapp.com',
      });

      if (result.success) {
        console.log('Created:', result.data);
        alert('Created successfully!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <button onClick={() => handleCreate('tags')}>Create Tag</button>
      <button onClick={() => handleCreate('vendors')}>Create Vendor</button>
    </div>
  );
}
```

### Vue.js Example

```vue
<template>
  <div>
    <button @click="createData('tags')">Create Tag</button>
    <button @click="createData('vendors')">Create Vendor</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      helperLoaded: false,
    };
  },
  mounted() {
    // Load the CDN script
    if (!window.GradianFormEmbed) {
      const script = document.createElement('script');
      script.src = 'https://cdn.yourapp.com/form-embed-helper.min.js';
      script.async = true;
      script.onload = () => {
        this.helperLoaded = true;
      };
      document.body.appendChild(script);
    } else {
      this.helperLoaded = true;
    }
  },
  methods: {
    async createData(schemaId) {
      if (!this.helperLoaded) {
        alert('Form embed helper is still loading...');
        return;
      }

      try {
        const result = await window.GradianFormEmbed.createData(schemaId, {
          baseUrl: 'https://yourapp.com',
        });

        if (result.success) {
          alert('Created successfully!');
          console.log('Created:', result.data);
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    },
  },
};
</script>
```

### TypeScript with Type Definitions

Create a type definition file for better TypeScript support:

```typescript
// types/gradian-form-embed.d.ts
declare namespace GradianFormEmbed {
  interface FormEmbedResult {
    success: boolean;
    data?: Record<string, any>;
    entityId?: string;
    error?: string;
  }

  interface OpenFormEmbedOptions {
    baseUrl?: string;
    schemaId: string;
    mode?: 'create' | 'edit';
    entityId?: string;
    initialValues?: Record<string, any>;
    popupFeatures?: {
      width?: number;
      height?: number;
      left?: number;
      top?: number;
    };
    allowedOrigins?: string[];
    timeout?: number;
  }

  interface CreateDataOptions {
    baseUrl?: string;
    initialValues?: Record<string, any>;
    popupFeatures?: OpenFormEmbedOptions['popupFeatures'];
    timeout?: number;
    allowedOrigins?: string[];
  }

  function openFormEmbed(options: OpenFormEmbedOptions): Promise<FormEmbedResult> & { close: () => void };
  function createData(schemaId: string, options?: CreateDataOptions): Promise<FormEmbedResult>;
  function editData(schemaId: string, entityId: string, options?: CreateDataOptions): Promise<FormEmbedResult>;
  
  const version: string;
}

declare const GradianFormEmbed: typeof GradianFormEmbed;
```

Then use it:

```typescript
import { GradianFormEmbed } from './types/gradian-form-embed';

async function createTag() {
  const result = await GradianFormEmbed.createData('tags', {
    baseUrl: 'https://yourapp.com',
    initialValues: { name: 'New Tag' },
  });
  
  if (result.success) {
    console.log('Created:', result.entityId);
  }
}
```

## Advanced Usage

### With Custom Configuration

```javascript
// Configure default base URL
const config = {
  baseUrl: 'https://yourapp.com',
  defaultPopupSize: { width: 1200, height: 800 },
};

async function createData(schemaId, initialValues) {
  return GradianFormEmbed.createData(schemaId, {
    baseUrl: config.baseUrl,
    initialValues: initialValues,
    popupFeatures: config.defaultPopupSize,
  });
}
```

### With Error Handling Wrapper

```javascript
async function safeCreateData(schemaId, initialValues) {
  try {
    const result = await GradianFormEmbed.createData(schemaId, {
      baseUrl: 'https://yourapp.com',
      initialValues: initialValues,
    });

    if (result.success) {
      return { success: true, data: result.data, entityId: result.entityId };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    if (error.message.includes('popup blocker')) {
      return { success: false, error: 'Please allow popups for this site' };
    }
    return { success: false, error: error.message };
  }
}
```

### Loading Script Dynamically

```javascript
function loadFormEmbedHelper() {
  return new Promise((resolve, reject) => {
    if (window.GradianFormEmbed) {
      resolve(window.GradianFormEmbed);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.yourapp.com/form-embed-helper.min.js';
    script.async = true;
    script.onload = () => {
      if (window.GradianFormEmbed) {
        resolve(window.GradianFormEmbed);
      } else {
        reject(new Error('Failed to load form embed helper'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load form embed helper script'));
    };
    document.head.appendChild(script);
  });
}

// Usage
async function init() {
  const helper = await loadFormEmbedHelper();
  const result = await helper.createData('tags', {
    baseUrl: 'https://yourapp.com',
  });
}
```

## CDN Configuration

### CORS Headers

Ensure your CDN/server sets proper CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Content-Type
Content-Type: application/javascript; charset=utf-8
```

### Caching Strategy

For production:
- **Cache-Control**: `public, max-age=31536000, immutable` (for versioned URLs)
- **Cache-Control**: `public, max-age=3600` (for latest version)

For development:
- **Cache-Control**: `no-cache, no-store, must-revalidate`

### Content Security Policy

If your third-party apps use CSP, they need to allow:

```
script-src 'self' https://cdn.yourapp.com;
```

## Version Management

### Semantic Versioning

Use semantic versioning for your CDN scripts:

```
https://cdn.yourapp.com/form-embed-helper/v1.0.0.min.js
https://cdn.yourapp.com/form-embed-helper/v1.0.1.min.js
https://cdn.yourapp.com/form-embed-helper/v1.1.0.min.js
```

### Latest Version Alias

Provide a "latest" alias that always points to the newest version:

```
https://cdn.yourapp.com/form-embed-helper/latest.min.js
```

### Breaking Changes

For breaking changes, increment the major version:

```
https://cdn.yourapp.com/form-embed-helper/v2.0.0.min.js
```

## Monitoring and Analytics

### Track Usage

Add analytics to track CDN usage:

```javascript
// In your CDN script, add usage tracking
(function() {
  if (typeof fetch !== 'undefined') {
    fetch('https://analytics.yourapp.com/track', {
      method: 'POST',
      body: JSON.stringify({
        event: 'form_embed_helper_loaded',
        version: '1.0.0',
        timestamp: Date.now(),
      }),
    }).catch(() => {}); // Silently fail
  }
})();
```

### Error Reporting

Track errors from third-party apps:

```javascript
window.addEventListener('error', function(event) {
  if (event.filename && event.filename.includes('form-embed-helper')) {
    // Report to your error tracking service
    console.error('Form embed helper error:', event);
  }
});
```

## Security Considerations

### Origin Validation

The script validates message origins. Ensure your CDN domain is in the allowed origins list when third-party apps use it.

### Content Integrity

Use Subresource Integrity (SRI) for security:

```html
<script 
  src="https://cdn.yourapp.com/form-embed-helper.min.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

Generate the hash:

```bash
openssl dgst -sha384 -binary form-embed-helper.min.js | openssl base64 -A
```

### HTTPS Only

Always serve the CDN script over HTTPS to prevent man-in-the-middle attacks.

## Testing

### Test in Different Environments

1. **Local Development**: Test with local CDN server
2. **Staging**: Test with staging CDN
3. **Production**: Test with production CDN

### Test Checklist

- [ ] Script loads correctly
- [ ] Global object is available
- [ ] `createData` works
- [ ] `editData` works
- [ ] Error handling works
- [ ] Popup blocker detection works
- [ ] Cross-origin messages work
- [ ] Timeout works
- [ ] Works in all major browsers

## Example: Complete CDN Setup

### 1. Build Script

```bash
# Build the minified and obfuscated script
npm run build:cdn

# This creates: public/cdn/form-embed-helper.min.js
# The script is minified, obfuscated, and ready for production

# Generate integrity hash (for SRI)
openssl dgst -sha384 -binary public/cdn/form-embed-helper.min.js | openssl base64 -A
```

### 2. Upload to CDN (if using external CDN)

```bash
# Upload to S3
aws s3 cp public/cdn/form-embed-helper.min.js s3://your-bucket/cdn/v1.0.0/form-embed-helper.min.js \
  --content-type "application/javascript" \
  --cache-control "public, max-age=31536000, immutable"
```

### 2b. Or Use Next.js Public Directory (No Upload Needed)

If using Next.js public directory, the file is automatically served:

```bash
# Build the script
npm run build:cdn

# File is now available at:
# https://yourapp.com/cdn/form-embed-helper.min.js
```

### 3. Provide Usage Instructions

Share with third-party developers:

```html
<!-- Include in your HTML -->
<script 
  src="https://cdn.yourapp.com/form-embed-helper/v1.0.0.min.js"
  integrity="sha384-GENERATED_HASH_HERE"
  crossorigin="anonymous">
</script>

<script>
  // Use the helper
  GradianFormEmbed.createData('tags', {
    baseUrl: 'https://yourapp.com',
    initialValues: { name: 'New Tag' },
  }).then(result => {
    if (result.success) {
      console.log('Created:', result.entityId);
    }
  });
</script>
```

## Troubleshooting

### Script Not Loading

- Check CDN URL is correct
- Verify CORS headers are set
- Check browser console for errors
- Verify script file exists on CDN

### Global Object Not Available

- Ensure script is loaded before use
- Check for JavaScript errors
- Verify script loaded successfully

### Popup Blocked

- Inform users to allow popups
- Ensure popup is triggered by user action
- Check browser popup blocker settings

## Next Steps

1. Set up your CDN infrastructure
2. Upload the minified script
3. Test in various environments
4. Share CDN URL and usage instructions with third-party developers
5. Monitor usage and errors
6. Version and update as needed

