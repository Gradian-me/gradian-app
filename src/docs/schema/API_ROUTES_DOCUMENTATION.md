# API Routes Documentation: `/api/schemas` and `/api/data`

This document provides comprehensive documentation for the `/api/schemas` and `/api/data` API routes, including all rules, query parameters, exceptions, and considerations for backend deployment.

## Table of Contents

1. [Overview](#overview)
2. [Environment Configuration](#environment-configuration)
3. [Common Behaviors](#common-behaviors)
4. [Schemas API Routes](#schemas-api-routes)
5. [Data API Routes](#data-api-routes)
6. [Error Handling](#error-handling)
7. [Security Considerations](#security-considerations)
8. [Performance Considerations](#performance-considerations)
9. [Backend Deployment Checklist](#backend-deployment-checklist)

---

## Overview

The application operates in two modes:
- **Demo Mode**: Uses local file storage (`data/all-schemas.json`, `data/all-data.json`)
- **Live Mode**: Proxies requests to external backend services

The API routes automatically handle mode detection and proxy/fallback logic.

---

## Environment Configuration

### Required Environment Variables

```bash
# Backend service URLs (required for live mode)
URL_SCHEMA_CRUD=https://your-backend.com/api/schemas
URL_DATA_CRUD=https://your-backend.com/api/data

# Demo mode flag (optional, defaults to false)
DEMO_MODE=false

# CORS configuration (optional, for form embedding)
FORM_EMBED_ALLOWED_ORIGINS=https://example.com,https://another-domain.com
```

### Mode Detection

- **Demo Mode**: When `DEMO_MODE=true`, routes use local file storage
- **Live Mode**: When `DEMO_MODE=false` (or unset), routes proxy to backend services

---

## Common Behaviors

### 1. Proxy Behavior (Live Mode)

In live mode, requests are proxied to external backend services:

1. **Request Forwarding**:
   - All query parameters are preserved
   - Headers are forwarded (except hop-by-hop headers)
   - Authorization tokens are extracted and normalized to `Bearer <token>` format
   - Tenant domain is extracted from headers or DNS and forwarded as `x-tenant-domain`

2. **Fallback Logic**:
   - **Schemas API**: If backend returns 404 or 5xx, falls back to local `data/all-schemas.json`
   - **Data API**: For `tenants` and `integrations` schemas only, falls back to local files if backend fails
   - Other schemas: No fallback, proxy errors are returned directly

3. **Response Normalization**:
   - Backend responses are normalized to consistent format:
     ```json
     {
       "success": true|false,
       "data": <response_data>,
       "error": "<error_message>",
       "message": "<optional_message>",
       "meta": { <optional_metadata> }
     }
     ```

### 2. Tenant Domain Extraction

The system extracts tenant domain from requests in this priority order:

1. **`x-tenant-domain` header** (if present)
   - If URL format (`http://` or `https://`), extracts hostname
   - If hostname format, uses directly (normalized to lowercase)

2. **Request headers** (fallback):
   - `x-forwarded-host` (preferred)
   - `host` header
   - `nextUrl.hostname`

3. **Normalization**:
   - Converts to lowercase
   - Removes port numbers
   - Skips `localhost` and `127.0.0.1` (no tenant context)

The extracted tenant domain is forwarded to backend as `x-tenant-domain` header.

### 3. Authorization Token Handling

Authorization tokens are extracted and normalized:

1. **Extraction Sources** (in order):
   - `Authorization` header (case-insensitive)
   - Cookies (`accessToken` by default)

2. **Normalization**:
   - Ensures `Bearer <token>` format
   - If token is provided without `Bearer` prefix, adds it automatically

3. **Forwarding**:
   - Token is forwarded to backend in `Authorization: Bearer <token>` format
   - If no token found, request proceeds but backend may reject it

### 4. Cache Control Headers

All responses include cache-busting headers:
```
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

---

## Schemas API Routes

### Base Route: `/api/schemas`

#### GET `/api/schemas`

Retrieves schemas with optional filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | Single schema ID to retrieve |
| `schemaIds` | string (comma-separated) | No | Multiple schema IDs (e.g., `vendors,tenants`) |
| `tenantIds` | string (comma-separated) | Yes* | Tenant IDs for filtering (*required on non-localhost hosts) |
| `summary` | boolean (`true`/`1`) | No | Return summary format (excludes fields/sections details) |
| `includeStatistics` | boolean (`true`/`1`) | No | Include statistics (records count, size, etc.) in summary |

**Rules:**

1. **Tenant Filtering**:
   - **Non-localhost hosts**: `tenantIds` is **REQUIRED** (returns 400 if missing)
   - **Localhost**: `tenantIds` is optional (all schemas returned if not provided)
   - Filtering logic:
     - System schemas (`schemaType === 'system'`): Always visible
     - Schemas with `applyToAllTenants: true`: Always visible
     - Other schemas: Must have matching tenant in `relatedTenants` array

2. **Response Format**:
   - **Single schema** (`?id=xxx`): Returns single object in `data` field
   - **Multiple schemas** (`?schemaIds=xxx,yyy`): Returns array in `data` field with `meta` containing `requestedIds` and `returnedCount`
   - **All schemas** (no `id` or `schemaIds`): Returns array in `data` field

3. **Summary Format**:
   - When `summary=true`, excludes fields from `SCHEMA_SUMMARY_EXCLUDED_KEYS`
   - Always includes: `id`, `name`, `plural_name`, `singular_name`, `applyToAllTenants`, `relatedTenants`, `syncStrategy`, `syncToDatabases`
   - Adds: `fieldsCount`, `sectionsCount`
   - If `includeStatistics=true`, adds `statistics` object with:
     - `hasPartition`: boolean
     - `isIndexed`: boolean
     - `records`: number
     - `size`: number (megabytes)
     - `maxUpdatedAt`: string (ISO date) or null

**Example Requests:**

```bash
# Get all schemas
GET /api/schemas?tenantIds=tenant1,tenant2

# Get single schema
GET /api/schemas?id=vendors&tenantIds=tenant1

# Get multiple schemas with summary
GET /api/schemas?schemaIds=vendors,tenants&tenantIds=tenant1&summary=true&includeStatistics=true
```

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "id": "vendors",
      "name": "Vendors",
      "fieldsCount": 15,
      "sectionsCount": 3,
      "applyToAllTenants": false,
      "relatedTenants": ["tenant1"],
      "syncStrategy": "schema-and-data",
      "statistics": {
        "hasPartition": false,
        "isIndexed": true,
        "records": 1250,
        "size": 2.5,
        "maxUpdatedAt": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

**Exceptions:**

- **400 Bad Request**: Missing `tenantIds` on non-localhost hosts
- **404 Not Found**: Schema file not found or empty, or specific schema ID not found
- **500 Internal Server Error**: File parsing errors, size limit exceeded (8MB max)

#### POST `/api/schemas`

Creates one or more schemas.

**Request Body:**

- **Single schema**: Object
- **Multiple schemas**: Array of objects

**Schema Validation:**

- Must be an object (not array for single schema)
- Must have `id` field (string)
- No duplicate IDs in request
- No existing schemas with same ID (returns 409 Conflict)

**Request Body Normalization:**

- Automatically parses JSON strings in nested fields (e.g., `repeatingConfig`)
- Recursively normalizes all nested objects

**Response Format:**

```json
{
  "success": true,
  "data": <created_schema_or_array>,
  "message": "Schema \"vendors\" created successfully"
}
```

**Status Codes:**

- **201 Created**: Success
- **400 Bad Request**: Invalid request body or validation errors
- **409 Conflict**: Schema with same ID already exists
- **500 Internal Server Error**: File write errors

**Post-Creation Actions:**

- Automatically calls `/api/schemas/clear-cache` endpoint
- Clears all schema-related caches

### Dynamic Route: `/api/schemas/[schema-id]`

#### GET `/api/schemas/[schema-id]`

Retrieves a specific schema by ID.

**Path Parameters:**

- `schema-id`: Schema identifier (e.g., `vendors`, `tenants`)

**Query Parameters:**

- None (all query params are preserved and forwarded to backend in live mode)

**Response Format:**

```json
{
  "success": true,
  "data": {
    "id": "vendors",
    "name": "Vendors",
    "fields": [...],
    "sections": [...],
    ...
  }
}
```

**CORS Headers:**

- Supports CORS for form embedding
- Checks `FORM_EMBED_ALLOWED_ORIGINS` environment variable
- Returns appropriate CORS headers if origin is allowed

**Caching:**

- Uses file modification time-based caching
- Cache TTL configured via `cache-config.ts`
- Cache invalidated on file changes

#### PUT `/api/schemas/[schema-id]`

Updates a specific schema.

**Request Body:**

- Schema object (partial updates supported - merges with existing)

**Request Body Normalization:**

- Automatically parses JSON strings in nested fields
- Recursively normalizes all nested objects

**Response Format:**

```json
{
  "success": true,
  "data": <updated_schema>
}
```

**Post-Update Actions:**

- Clears all schema-related caches
- Invalidates file modification time cache

#### DELETE `/api/schemas/[schema-id]`

Deletes a schema.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hardDelete` | boolean (`true`) | No | If `true`, permanently deletes schema, all data, and relations |

**Delete Modes:**

1. **Soft Delete** (default):
   - Sets `inactive: true` on schema
   - Schema and data remain in storage

2. **Hard Delete** (`?hardDelete=true`):
   - Removes schema from `all-schemas.json`
   - Deletes all data for schema from `all-data.json`
   - Removes all relations involving schema (as source or target)
   - Clears all caches

**Response Format:**

```json
{
  "success": true,
  "data": <deleted_schema>,
  "message": "Schema \"vendors\" and all its data have been permanently deleted"
}
```

**Status Codes:**

- **200 OK**: Success
- **400 Bad Request**: Missing schema ID
- **404 Not Found**: Schema not found
- **500 Internal Server Error**: Deletion errors

---

## Data API Routes

### Base Route: `/api/data/[schema-id]`

#### GET `/api/data/[schema-id]`

Retrieves entities for a schema.

**Path Parameters:**

- `schema-id`: Schema identifier (e.g., `vendors`, `tenants`)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantIds` | string (comma-separated) | Yes* | Tenant IDs for filtering (*required on non-localhost hosts) |
| `allowDataRelatedTenants` | boolean (`true`) | No | Auto-set when schema has `allowDataRelatedTenants: true` and `tenantIds` provided |
| `companyIds` | string (comma-separated) | Yes** | Company IDs for filtering (**required for company-based schemas unless `includeIds` is used) |
| `companyId` | string | No | Single company ID (backward compatibility) |
| `includeIds` | string (comma-separated) or array | No | Specific entity IDs to retrieve (bypasses company filter) |
| `search` | string | No | Search query (passed to controller) |
| `status` | string | No | Filter by status (passed to controller) |
| ... | ... | No | All other query params passed to controller for filtering |

**Rules:**

1. **Tenant Filtering**:
   - **Non-localhost hosts**: `tenantIds` is **REQUIRED** (returns 400 if missing)
   - **Localhost**: `tenantIds` is optional
   - Schema must match tenant filter:
     - `applyToAllTenants: true`: Always accessible
     - Otherwise: Must have `syncStrategy: 'schema-and-data'` AND tenant in `relatedTenants`

2. **Company Filtering** (for company-based schemas):
   - **Required** unless:
     - Schema is `companies` itself
     - `tenantIds` is provided (tenant filtering takes precedence)
     - `includeIds` is provided (explicit entity targeting)
   - Supports both `companyIds` (comma-separated) and `companyId` (single, backward compatibility)

3. **Special Schema Handling**:
   - **`schemas`**: Delegates to `/api/schemas` route
   - **`companies`**: Uses cached loader when no company filters applied
   - **`tenants`** and **`integrations`**: Has fallback to local files if backend fails

4. **Tenant-Based Data Filtering**:
   - If schema has `allowDataRelatedTenants: true` and `tenantIds` provided:
     - Automatically sets `allowDataRelatedTenants=true` query param
     - Repository filters entities by `relatedTenants` field

5. **Demo Mode Enrichment**:
   - Enriches `createdBy` and `updatedBy` fields with full user objects (excluding password)
   - Enriches picker fields from `HAS_FIELD_VALUE` relations

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "name": "Vendor Name",
      "createdBy": {
        "id": "user1",
        "name": "John Doe",
        "email": "john@example.com"
      },
      ...
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**Exceptions:**

- **400 Bad Request**: 
  - Missing `tenantIds` on non-localhost hosts
  - Missing `companyIds` for company-based schemas (unless `includeIds` provided)
- **404 Not Found**: 
  - Schema not found
  - Schema not available for requested tenants/sync strategy
- **500 Internal Server Error**: Internal errors

#### POST `/api/data/[schema-id]`

Creates one or more entities.

**Request Body:**

- **Single entity**: Object
- **Multiple entities**: Array of objects

**Validation:**

- Schema must exist
- For company-based schemas:
  - `companyId` is required
  - Cannot be `-1`, empty string, `null`, or `undefined` ("All Companies" not allowed)

**Demo Mode Behavior:**

1. **Picker Field Handling**:
   - Extracts picker field values before saving
   - Minimizes picker values to `[{id: "xxx"}]` format in storage
   - Creates `HAS_FIELD_VALUE` relations for picker fields
   - Updates entity with minimized values after relation sync

2. **User Enrichment**:
   - Enriches `createdBy` and `updatedBy` with full user objects in response

**Response Format:**

**Single Entity:**
```json
{
  "success": true,
  "data": <created_entity>,
  "message": "Entity created successfully"
}
```

**Multiple Entities:**
```json
{
  "success": true,
  "data": [<created_entities>],
  "message": "5 entities created successfully"
}
```

**Partial Success (207 Multi-Status):**
```json
{
  "success": true,
  "data": [<successfully_created_entities>],
  "message": "Created 3 of 5 entity(ies)",
  "errors": [
    {
      "index": 2,
      "error": "Company ID is required"
    },
    {
      "index": 4,
      "error": "Validation failed"
    }
  ],
  "partial": true
}
```

**Status Codes:**

- **201 Created**: All entities created successfully
- **207 Multi-Status**: Partial success (some entities created, some failed)
- **400 Bad Request**: Validation errors or all entities failed
- **404 Not Found**: Schema not found
- **500 Internal Server Error**: Internal errors

**Post-Creation Actions:**

- Clears companies cache if `schema-id === 'companies'`

### Dynamic Route: `/api/data/[schema-id]/[id]`

#### GET `/api/data/[schema-id]/[id]`

Retrieves a single entity by ID.

**Path Parameters:**

- `schema-id`: Schema identifier
- `id`: Entity identifier

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantIds` | string (comma-separated) | No | Tenant IDs for filtering (if schema supports `allowDataRelatedTenants`) |

**Rules:**

1. **Tenant Filtering** (if `allowDataRelatedTenants: true`):
   - Checks entity's `relatedTenants` field
   - Returns 404 if entity not visible to requested tenants
   - If `relatedTenants` is empty/undefined, entity is visible to all

2. **Special Schema Handling**:
   - **`schemas`**: Delegates to `/api/schemas/[id]` route
   - **`tenants`** and **`integrations`**: Has fallback to local files if backend fails

3. **Demo Mode Enrichment**:
   - Enriches `createdBy` and `updatedBy` with full user objects
   - Enriches picker fields from relations

**Response Format:**

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Entity Name",
    "createdBy": {
      "id": "user1",
      "name": "John Doe"
    },
    ...
  }
}
```

**Exceptions:**

- **404 Not Found**: 
  - Schema not found
  - Entity not found
  - Entity not accessible for requested tenants

#### PUT `/api/data/[schema-id]/[id]`

Updates a single entity.

**Request Body:**

- Entity object (partial updates supported)

**Rules:**

1. **Tenant Visibility Check** (if `allowDataRelatedTenants: true`):
   - Verifies entity is accessible to requested tenants before update
   - Returns 404 if entity not visible

2. **Demo Mode Behavior**:
   - Extracts picker field values
   - Minimizes picker values in storage
   - Syncs `HAS_FIELD_VALUE` relations
   - Enriches response with user objects

**Response Format:**

```json
{
  "success": true,
  "data": <updated_entity>
}
```

**Post-Update Actions:**

- Clears companies cache if `schema-id === 'companies'`

#### DELETE `/api/data/[schema-id]/[id]`

Deletes a single entity.

**Response Format:**

```json
{
  "success": true,
  "data": <deleted_entity>
}
```

**Post-Delete Actions:**

- Clears companies cache if `schema-id === 'companies'`

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

- **200 OK**: Successful GET, PUT, DELETE operations
- **201 Created**: Successful POST operations
- **207 Multi-Status**: Partial success (batch operations)
- **400 Bad Request**: Validation errors, missing required parameters
- **401 Unauthorized**: Authentication required (from backend)
- **403 Forbidden**: Access denied (from backend)
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists (e.g., duplicate schema ID)
- **422 Unprocessable Entity**: Validation errors (from backend)
- **500 Internal Server Error**: Server errors
- **502 Bad Gateway**: Backend service unavailable or error

### Error Propagation

- **Live Mode**: Backend errors (401, 403, 422, etc.) are propagated as-is
- **Demo Mode**: Errors are generated locally with appropriate status codes
- **Fallback Errors**: If fallback fails, original proxy error is returned

---

## Security Considerations

### 1. Input Validation

- **Schema ID Validation**: Must exist in schema registry
- **Entity ID Validation**: Must be valid format
- **Request Body Validation**: Type checking, required fields
- **File Size Limits**: 8MB maximum for schema files

### 2. Authorization

- **Token Extraction**: From headers or cookies
- **Token Normalization**: Ensures `Bearer` format
- **Token Forwarding**: Passed to backend services
- **Missing Tokens**: Logged as warnings, backend may reject

### 3. Tenant Isolation

- **Tenant Filtering**: Enforced on non-localhost hosts
- **Tenant Domain Extraction**: From headers or DNS
- **Tenant Visibility**: Schema and data filtered by tenant relationships
- **System Schemas**: Always visible (bypass tenant filtering)

### 4. Data Sanitization

- **Password Fields**: Excluded from user enrichment
- **Sensitive Data**: Not logged in full (truncated in logs)
- **JSON Parsing**: Safe parsing with error handling

### 5. CORS

- **Form Embedding**: Controlled via `FORM_EMBED_ALLOWED_ORIGINS`
- **CORS Headers**: Only set for allowed origins
- **Credentials**: Supported for allowed origins

---

## Performance Considerations

### 1. Caching

- **Schema Caching**: File modification time-based caching
- **Companies Caching**: In-memory cache for companies list
- **Cache Invalidation**: Automatic on file changes
- **Cache Clearing**: Manual via `/api/schemas/clear-cache` endpoint

### 2. File Operations

- **Atomic Writes**: Uses temporary files and rename for atomicity
- **Size Limits**: 8MB maximum for schema files
- **Empty File Handling**: Returns empty array gracefully

### 3. Proxy Performance

- **Request Forwarding**: All query params preserved
- **Response Normalization**: Minimal overhead
- **Error Handling**: Fast fallback for 404/5xx errors

### 4. Batch Operations

- **Multiple Entities**: Processed sequentially with error collection
- **Partial Success**: Returns 207 status with error details
- **Transaction Safety**: Each entity processed independently

### 5. Enrichment (Demo Mode Only)

- **User Enrichment**: Loads users once, creates map for O(1) lookup
- **Relation Enrichment**: Loads relations once per request
- **Performance Impact**: Only in demo mode, not in production

---

## Backend Deployment Checklist

### Required Backend Endpoints

Your backend must implement these endpoints with matching behavior:

#### Schemas API

- `GET /api/schemas` - List/filter schemas
- `GET /api/schemas/:id` - Get single schema
- `POST /api/schemas` - Create schema(s)
- `PUT /api/schemas/:id` - Update schema
- `DELETE /api/schemas/:id` - Delete schema (with `?hardDelete=true` support)

#### Data API

- `GET /api/data/:schema-id` - List/filter entities
- `GET /api/data/:schema-id/:id` - Get single entity
- `POST /api/data/:schema-id` - Create entity(ies)
- `PUT /api/data/:schema-id/:id` - Update entity
- `DELETE /api/data/:schema-id/:id` - Delete entity

### Required Headers

Backend must accept and process:

- **`Authorization`**: `Bearer <token>` format
- **`x-tenant-domain`**: Tenant domain for multi-tenant filtering
- **`Content-Type`**: `application/json` for POST/PUT requests

### Required Query Parameters

Backend must support all query parameters documented above:

- **Schemas**: `id`, `schemaIds`, `tenantIds`, `summary`, `includeStatistics`
- **Data**: `tenantIds`, `companyIds`, `companyId`, `includeIds`, `allowDataRelatedTenants`, plus any schema-specific filters

### Required Response Format

Backend must return responses in this format:

```json
{
  "success": true|false,
  "data": <response_data>,
  "error": "<error_message>",
  "message": "<optional_message>",
  "meta": { <optional_metadata> }
}
```

### Required Behaviors

1. **Tenant Filtering**:
   - Filter schemas by `tenantIds` query param
   - Filter data by `tenantIds` when `allowDataRelatedTenants=true`
   - Respect `applyToAllTenants` flag
   - System schemas always visible

2. **Company Filtering**:
   - Filter data by `companyIds` for company-based schemas
   - Support `includeIds` to bypass company filter

3. **Error Handling**:
   - Return appropriate HTTP status codes
   - Include error messages in response body
   - Support partial success (207) for batch operations

4. **CORS** (if needed):
   - Support CORS for form embedding
   - Check origin against allowed list

### Testing Checklist

- [ ] All endpoints return correct response format
- [ ] Tenant filtering works correctly
- [ ] Company filtering works correctly
- [ ] Authorization tokens are accepted
- [ ] Tenant domain header is processed
- [ ] Error responses match expected format
- [ ] Batch operations support partial success
- [ ] Query parameters are preserved and processed
- [ ] CORS headers are set correctly (if needed)

### Environment Variables

Set these in your deployment:

```bash
URL_SCHEMA_CRUD=https://your-backend.com/api/schemas
URL_DATA_CRUD=https://your-backend.com/api/data
DEMO_MODE=false
FORM_EMBED_ALLOWED_ORIGINS=https://example.com
```

---

## Additional Notes

### Special Cases

1. **Schema ID "schemas"**: 
   - In data routes, delegates to schemas routes
   - Prevents circular dependencies

2. **Companies Schema**:
   - Uses cached loader for performance
   - Cache cleared on create/update/delete

3. **Tenants/Integrations Schemas**:
   - Have fallback to local files in live mode
   - Useful for bootstrapping or offline scenarios

4. **Demo Mode Enrichment**:
   - Only active in demo mode
   - Enriches user fields and picker fields
   - Not applicable in production (backend handles this)

### File Storage (Demo Mode)

- **Schemas**: `data/all-schemas.json` (array of schema objects)
- **Data**: `data/all-data.json` (object with schema IDs as keys, arrays as values)
- **Relations**: `data/all-relations.json` (array of relation objects)

### Proxy Normalization

The proxy automatically normalizes backend responses to ensure consistency:

- Extracts data from various nested paths (`data`, `items`, `results`, etc.)
- Normalizes success/error indicators
- Preserves metadata and messages
- Handles both JSON and text responses

---

## Support

For questions or issues with these API routes, refer to:
- Implementation files: `src/app/api/schemas/` and `src/app/api/data/`
- Utility files: `src/app/api/schemas/utils.ts` and `src/app/api/data/utils.ts`
- Configuration: `src/gradian-ui/shared/configs/`

