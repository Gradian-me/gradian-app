# Schema API Configuration Guide

## Overview

The schema fetching API route is now configurable via environment variables, allowing you to change the endpoint where schemas are loaded without modifying code.

## Configuration

### Environment Variable

Add to your `.env.local` file:

```bash
# Schema API Configuration
# Override the schema API base path (default: /api/schemas)
NEXT_PUBLIC_SCHEMA_API_BASE="/custom/api/schemas"
```

### Default Behavior

If not set, the system defaults to:
```
/api/schemas
```

### Example Routes

With the default configuration:
- All schemas: `GET /api/schemas`
- Single schema: `GET /api/schemas/vendors`
- Single schema: `GET /api/schemas/tenders`

With `NEXT_PUBLIC_SCHEMA_API_BASE="/v1/config/schemas"`:
- All schemas: `GET /v1/config/schemas`
- Single schema: `GET /v1/config/schemas/vendors`
- Single schema: `GET /v1/config/schemas/tenders`

## What's Affected

### ✅ Client-Side Schema Fetching

All client-side schema lookups use the configured path:
- `fetchSchemaById()` - Fetches individual schemas
- `fetchAllSchemas()` - Fetches all schemas
- `fetchSchemaIds()` - Fetches schema ID list

### ❌ Not Affected

Server-side schema loading continues to read directly from `data/all-schemas.json`:
- `schema-loader.ts` - File system access
- `schema-registry.server.ts` - Server-side functions
- Static generation in `page.tsx`

## Implementation Details

### Configuration Location

`src/lib/config.ts`:
```typescript
export const config = {
  schemaApi: {
    basePath: process.env.NEXT_PUBLIC_SCHEMA_API_BASE || '/api/schemas',
  },
} as const;
```

### Usage in Code

`src/shared/utils/schema-registry.ts`:
```typescript
import { config } from '../../lib/config';

// Fetch all schemas
const response = await fetch(config.schemaApi.basePath);

// Fetch single schema
const response = await fetch(`${config.schemaApi.basePath}/${schemaId}`);
```

## Migration Guide

### If You Had Custom Schema Routes

If you previously hardcoded schema routes, update your code:

**Before:**
```typescript
const response = await fetch('/api/schemas');
```

**After:**
```typescript
import { config } from '@/lib/config';
const response = await fetch(config.schemaApi.basePath);
```

## Testing

1. Create `.env.local`:
   ```bash
   NEXT_PUBLIC_SCHEMA_API_BASE="/test/api/schemas"
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

3. Check the browser console - schema requests should go to the new path

## Troubleshooting

### Schema Not Loading

Check:
1. Environment variable is set correctly in `.env.local`
2. Development server was restarted after changing `.env.local`
3. The custom API route exists and returns the correct format

### Format Requirements

Your custom API must return:
```typescript
// For /api/schemas (all schemas)
{
  success: true,
  data: [/* array of schemas */]
}

// For /api/schemas/{id} (single schema)
{
  success: true,
  data: {/* single schema object */}
}
```

## Related Files

- `env.example` - Example environment configuration
- `src/lib/config.ts` - Configuration definition
- `src/shared/utils/schema-registry.ts` - Schema fetching logic
- `src/shared/utils/schema-loader.ts` - Server-side schema loading
- `src/shared/utils/schema-registry.server.ts` - Server-only functions
- `src/app/api/schemas/route.ts` - Default API route (all schemas)
- `src/app/api/schemas/[schema-id]/route.ts` - Default API route (single schema)

## See Also

- [Schema to Page Flow Architecture](./SCHEMA_TO_PAGE_FLOW.md) - Complete flow documentation
- [Dynamic CRUD Architecture](./DYNAMIC_CRUD_ARCHITECTURE.md) - CRUD operations guide
