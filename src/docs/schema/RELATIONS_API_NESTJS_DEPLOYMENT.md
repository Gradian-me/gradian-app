# Complete API Routes - NestJS Backend Deployment Guide

This comprehensive document provides detailed specifications, rules, and implementation guidelines for deploying all API routes in a NestJS backend service.

## Table of Contents

1. [Overview](#overview)
2. [Common Standards](#common-standards)
3. [Route Categories](#route-categories)
   - [Data & Schema Management](#1-data--schema-management)
   - [Relations API](#2-relations-api)
   - [Authentication & Authorization](#3-authentication--authorization)
   - [Chat & AI](#4-chat--ai)
   - [Dashboard & Analytics](#5-dashboard--analytics)
   - [Builder & Configuration](#6-builder--configuration)
   - [Graph & Visualization](#7-graph--visualization)
   - [Email Templates](#8-email-templates)
   - [Notifications](#9-notifications)
   - [Media & Assets](#10-media--assets)
   - [Integrations](#11-integrations)
   - [System & Utilities](#12-system--utilities)
4. [Security & Authentication](#security--authentication)
5. [Error Handling](#error-handling)
6. [Performance Considerations](#performance-considerations)
7. [Implementation Checklist](#implementation-checklist)

---

## Overview

This application uses a standardized API response format and follows RESTful conventions across all endpoints. The backend should implement all routes with consistent patterns for authentication, validation, error handling, and response formatting.

**Key Principles:**
- All responses use standardized format: `{ success: boolean, data?: any, error?: string, ... }`
- Authentication via JWT Bearer tokens
- Multi-tenant support via `tenantIds` query parameter or `x-tenant-domain` header
- Comprehensive input validation
- Consistent error handling with appropriate HTTP status codes
- Demo mode vs Live mode support (proxy to external services or use local storage)

---

## Common Standards

### Standard Response Format

All endpoints must return responses in this standardized format:

```typescript
{
  success: boolean;
  data?: any | any[];
  error?: string;
  message?: string;
  count?: number;        // For list responses
  code?: string;         // Error code
  meta?: {               // Optional metadata
    [key: string]: any;
  };
}
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| `200 OK` | Successful GET, PUT, DELETE (non-creation) |
| `201 Created` | Successful POST (resource created) |
| `400 Bad Request` | Invalid request, validation errors |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | User lacks permission |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Duplicate resource, conflict |
| `413 Payload Too Large` | Request body too large |
| `500 Internal Server Error` | Server error |
| `502 Bad Gateway` | Upstream service error |
| `503 Service Unavailable` | Service temporarily unavailable |

### Query Parameter Conventions

- **Pagination**: `page` (1-based), `limit` (items per page)
- **Filtering**: Schema-specific query params (e.g., `status`, `search`, `category`)
- **Tenant Filtering**: `tenantIds` (comma-separated, required on non-localhost)
- **Summary/List Views**: `summary=true` (returns lightweight data)
- **Sorting**: `sortBy` (field name), `sortOrder` (`asc` | `desc`)

### Authentication

All protected endpoints require:
- **Authorization Header**: `Bearer <access_token>`
- Token extraction from `Authorization` header (case-insensitive) or cookies
- JWT validation with user context extraction

### Multi-Tenant Support

- **Tenant Domain**: Extracted from `x-tenant-domain` header or request hostname
- **Tenant IDs**: Passed via `tenantIds` query parameter (comma-separated)
- **Tenant Filtering**: Applied at data layer (filter by `relatedTenants` field or tenant domain)

---

## Route Categories

### 1. Data & Schema Management

#### 1.1 Dynamic CRUD Routes

**Base Path**: `/api/data/{schema-id}`

##### GET `/api/data/{schema-id}`

List all entities for a schema with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search across text fields |
| `status` | string | Filter by status |
| `category` | string | Filter by category |
| `tenantIds` | string (comma-separated) | Filter by tenant IDs (required on non-localhost) |
| `page` | number | Page number (1-based) |
| `limit` | number | Items per page |
| `sortBy` | string | Field to sort by |
| `sortOrder` | `asc` \| `desc` | Sort order |

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 100,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Business Logic:**
- Validate schema ID exists
- Apply tenant filtering if `tenantIds` provided
- Filter by query parameters
- Apply pagination
- Sort results
- Enrich with user objects and picker field relations (if applicable)

##### POST `/api/data/{schema-id}`

Create new entity or multiple entities.

**Request Body:**
- Single entity: `{ ...entityData }`
- Multiple entities: `[{ ...entityData1 }, { ...entityData2 }]`

**Response:**
```json
{
  "success": true,
  "data": { ...createdEntity },
  "message": "Entity created successfully"
}
```

**Business Logic:**
- Validate schema ID exists
- Validate entity data against schema
- Extract picker field values and repeating section values
- Create entity with minimal picker format `[{id}, {id}]`
- Sync HAS_FIELD_VALUE relations for picker fields
- Sync repeating section relations
- Return enriched entity data

##### GET `/api/data/{schema-id}/{id}`

Get single entity by ID.

**Response:**
```json
{
  "success": true,
  "data": { ...entity }
}
```

**Business Logic:**
- Validate schema ID and entity ID
- Check tenant visibility (if `allowDataRelatedTenants` enabled)
- Enrich with user objects and picker field relations
- Return entity

##### PUT `/api/data/{schema-id}/{id}`

Update existing entity.

**Request Body:** `{ ...partialEntityData }`

**Business Logic:**
- Validate schema ID and entity ID
- Check tenant visibility before update
- Extract picker field values
- Update entity
- Sync relations (picker fields, repeating sections)
- Return updated entity

##### DELETE `/api/data/{schema-id}/{id}`

Delete entity (soft delete by default, hard delete with query param).

**Query Parameters:**
- `hardDelete=true` - Permanently delete entity

**Business Logic:**
- Validate schema ID and entity ID
- Check tenant visibility
- Soft delete (set `inactive: true`) or hard delete
- Clean up related relations
- Return deleted entity

#### 1.2 Schema Routes

**Base Path**: `/api/schemas`

##### GET `/api/schemas`

Get all schemas or specific schemas with filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | Single schema ID |
| `schemaIds` | string (comma-separated) | No | Multiple schema IDs |
| `tenantIds` | string (comma-separated) | Yes* | Tenant IDs (*required on non-localhost) |
| `summary` | boolean | No | Return summary format (excludes fields) |
| `includeStatistics` | boolean | No | Include statistics (records count, size) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "vendors",
      "singular_name": "Vendor",
      "plural_name": "Vendors",
      "fieldsCount": 15,
      "sectionsCount": 3,
      "applyToAllTenants": false,
      "relatedTenants": ["tenant1"],
      "statistics": {
        "hasPartition": false,
        "isIndexed": false,
        "records": 150,
        "size": 2.5,
        "maxUpdatedAt": "2024-01-15T10:30:00.000Z"
      }
    }
  ],
  "meta": {
    "requestedIds": ["vendors"],
    "returnedCount": 1
  }
}
```

**Tenant Filtering Logic:**
- System schemas (`schemaType === 'system'`): Always visible
- Schemas with `applyToAllTenants: true`: Always visible
- Other schemas: Must have matching tenant in `relatedTenants` array

##### POST `/api/schemas`

Create new schema(s).

**Request Body:**
- Single schema: `{ id: string, ...schemaData }`
- Multiple schemas: `[{ ...schema1 }, { ...schema2 }]`

**Validation:**
- Schema ID must be unique
- Required fields: `id`, `singular_name`, `plural_name`
- Normalize nested fields (e.g., `repeatingConfig` JSON strings to objects)

**Response:**
```json
{
  "success": true,
  "data": { ...createdSchema },
  "message": "Schema created successfully"
}
```

##### GET `/api/schemas/{schema-id}`

Get specific schema by ID.

##### PUT `/api/schemas/{schema-id}`

Update schema.

##### DELETE `/api/schemas/{schema-id}`

Delete schema.

**Query Parameters:**
- `hardDelete=true` - Delete schema, all its data, and relations

**Business Logic:**
- If `hardDelete=true`: Delete schema, all data, and all relations
- Otherwise: Soft delete (set `inactive: true`)
- Clear all caches

##### POST `/api/schemas/clear-cache`

Clear schema cache (no-op, kept for compatibility).

#### 1.3 Relations Routes

**Base Path**: `/api/relations`

See [Relations API Documentation](#2-relations-api) for detailed specification.

---

### 2. Relations API

**Base Path**: `/api/relations`

#### GET `/api/relations`

Query relations based on various criteria.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` + `id` + `direction` | string | Unified query (direction: `'source'` \| `'target'` \| `'both'`) |
| `otherSchema` | string | Filter by the other schema (optional with unified query) |
| `sourceSchema` + `sourceId` | string | Legacy source query |
| `targetSchema` + `targetId` | string | Legacy target query |
| `relationTypeId` | string | Filter by relation type |
| `fieldId` | string | Filter by field ID |
| `includeInactive` | boolean | Include inactive relations |
| `resolveTargets` | boolean | Enrich with target entity data (label, icon, color, metadata) |

**Query Mode Priority:**
1. Unified query (`schema` + `id`)
2. Repeating section query (`sourceSchema` + `sourceId` + `relationTypeId`)
3. Legacy source query (`sourceSchema` + `sourceId`)
4. Legacy target query (`targetSchema` + `targetId`)
5. Type query (`relationTypeId` only)
6. All relations (no parameters)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "sourceSchema": "vendors",
      "sourceId": "vendor-123",
      "targetSchema": "tenders",
      "targetId": "tender-456",
      "relationTypeId": "vendor-tender",
      "fieldId": "relatedTenders",
      "inactive": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "direction": "source",
      "targetData": {
        "id": "tender-456",
        "label": "Q1 Procurement Tender",
        "icon": "📋",
        "color": "#3B82F6",
        "metadata": {
          "status": "active",
          "budget": 50000
        }
      }
    }
  ],
  "count": 1
}
```

**Target Resolution (`resolveTargets=true`):**
- For external nodes: Lookup in external nodes registry
- For internal entities: Batch fetch by schema, resolve label/icon/color from schema fields with roles
- Extract metadata from fields with `addToReferenceMetadata: true`
- **Performance**: Batch fetch entities by schema to avoid N+1 queries

#### POST `/api/relations`

Create new relation.

**Request Body:**
```json
{
  "sourceSchema": "vendors",
  "sourceId": "vendor-123",
  "targetSchema": "tenders",
  "targetId": "tender-456",
  "relationTypeId": "vendor-tender",
  "fieldId": "relatedTenders"
}
```

**Business Logic:**
- Validate required fields
- Check for duplicate relation
- If duplicate exists and is inactive: Revive it (set `inactive: false`, update `updatedAt`)
- If duplicate exists and is active: Return `409 Conflict`
- Generate ULID for new relation
- Set `createdAt` and `updatedAt` timestamps

**Response:**
```json
{
  "success": true,
  "data": { ...relation },
  "revived": true  // If relation was revived
}
```

#### GET `/api/relations/{id}`

Get relation by ID.

#### PUT `/api/relations/{id}`

Update relation.

#### DELETE `/api/relations/{id}`

Delete relation (soft delete: set `inactive: true`).

---

### 3. Authentication & Authorization

**Base Path**: `/api/auth`

#### POST `/api/auth/login`

Authenticate user and return JWT tokens.

**Request Body:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "password123",
  "deviceFingerprint": "optional-device-id"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    ...
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  },
  "message": "Login successful"
}
```

**Cookie Handling:**
- **Refresh Token**: Set in HttpOnly cookie (`refresh_token`)
- **Session Token**: Set in HttpOnly cookie (`session_token`)
- **Access Token**: Returned in response body only (client stores in memory)
- **Server Memory**: Access token stored in server memory, keyed by refresh token

**Status Codes:**
- `200 OK`: Successful login
- `400 Bad Request`: Missing email/password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: External auth service unavailable

#### POST `/api/auth/logout`

Logout user (clear tokens).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST `/api/auth/token/refresh`

Refresh access token using refresh token.

**Request:**
- Refresh token from HttpOnly cookie or request body

**Response:**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

#### GET `/api/auth/token/validate`

Validate access token.

**Response:**
```json
{
  "success": true,
  "valid": true,
  "user": { ...userData }
}
```

#### POST `/api/auth/password/reset`

Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/password/change`

Change password (requires authentication).

**Request Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword"
}
```

#### POST `/api/auth/2fa/generate`

Generate 2FA code.

#### POST `/api/auth/2fa/validate`

Validate 2FA code.

**Request Body:**
```json
{
  "code": "123456"
}
```

#### GET `/api/auth/middleware-config`

Get middleware configuration (CORS, auth requirements, etc.).

---

### 4. Chat & AI

**Base Path**: `/api/chat`

#### GET `/api/chat` (Deprecated)

Get all chats for authenticated user.

**Query Parameters:**
- `summary=true` - Return lightweight chat data without messages

**Use POST `/api/chat` instead.**

#### POST `/api/chat`

Get chats or create new chat.

**To Get Chats:**
```json
{
  "userId": "user-123",  // Optional, uses authenticated user ID
  "summary": true
}
```

**To Create Chat:**
```json
{
  "userId": "user-123",  // Optional, uses authenticated user ID
  "title": "New Chat",
  "selectedAgentId": "agent-123"
}
```

**Response (Get):**
```json
{
  "success": true,
  "data": [
    {
      "id": "chat-123",
      "userId": "user-123",
      "title": "Chat Title",
      "selectedAgentId": "agent-123",
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "messages": [...]  // Only if summary=false
    }
  ]
}
```

**Response (Create):**
```json
{
  "success": true,
  "data": { ...createdChat }
}
```

**Business Logic:**
- Require authentication
- Use authenticated user ID (ignore userId in body)
- Validate request body size (max 1MB)
- Sort chats by `lastMessageAt` (most recent first)

#### GET `/api/chat/{chat-id}`

Get chat by ID with pagination.

**Query Parameters:**
- `page` - Page number (1-based, default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chat-123",
    "userId": "user-123",
    "title": "Chat Title",
    "messages": [...],  // Paginated
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalMessages": 100,
      "hasMore": true
    }
  }
}
```

**Business Logic:**
- Require authentication and ownership
- Validate chat ID format (ULID)
- Return messages in reverse chronological order (newest first)
- Paginate messages (from end of array)

#### PUT `/api/chat/{chat-id}`

Update chat (title, selectedAgentId).

**Request Body:**
```json
{
  "title": "Updated Title",
  "selectedAgentId": "agent-456"  // or null
}
```

#### DELETE `/api/chat/{chat-id}`

Delete chat.

**Business Logic:**
- Require authentication and ownership
- Validate chat ID format
- Delete chat and all messages

#### GET `/api/chat/{chat-id}/messages`

Get chat messages with pagination.

**Query Parameters:**
- `limit` - Items per page (default: 50)
- `offset` - Offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-123",
      "role": "user",
      "content": "Hello",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 100,
    "hasMore": true
  }
}
```

#### POST `/api/chat/{chat-id}/messages`

Add message to chat.

**Request Body:**
```json
{
  "role": "user",  // "user" | "assistant" | "system"
  "content": "Message content",
  "agentId": "agent-123",  // Optional
  "agentType": "chat",  // Optional
  "metadata": {}  // Optional
}
```

**Validation:**
- `role`: Must be "user", "assistant", or "system"
- `content`: Required, max length validation
- Request body size: Max 1MB

#### GET `/api/chat/{chat-id}/todos`

Get todos for chat.

#### POST `/api/chat/{chat-id}/execute-todos`

Execute all todos in chat.

#### POST `/api/chat/{chat-id}/execute-todo/{todo-id}`

Execute specific todo.

#### POST `/api/chat/orchestrate`

Orchestrate chat with AI agents.

---

### 5. Dashboard & Analytics

**Base Path**: `/api/dashboard`

#### GET `/api/dashboard`

Get dashboard metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalOrders": 150,
      "totalVendors": 25,
      ...
    },
    "spendAnalysis": {
      "totalSpend": 500000,
      "byCategory": [...]
    },
    "monthlyTrends": [
      {
        "month": "2024-01",
        "orders": 50,
        "spend": 150000
      }
    ]
  }
}
```

#### GET `/api/dashboard/stats`

Get dashboard statistics.

#### GET `/api/dashboard/kpi-cards`

Get KPI cards data.

#### GET `/api/dashboard/kpi-lists`

Get KPI lists data.

#### GET `/api/dashboard/spend-analysis`

Get spend analysis data.

#### GET `/api/dashboard/performance-metrics`

Get performance metrics.

---

### 6. Builder & Configuration

**Base Path**: `/api/builders`

#### GET `/api/builders`

Get all builders.

#### POST `/api/builders`

Create builder.

#### GET `/api/builders/{id}`

Get builder by ID.

#### PUT `/api/builders/{id}`

Update builder.

#### DELETE `/api/builders/{id}`

Delete builder.

#### GET `/api/builders/versions`

Get all builder versions.

#### POST `/api/builders/versions`

Create builder version.

**Request Body:**
```json
{
  "changes": [
    {
      "changeType": "feature" | "refactor" | "add" | "restore" | "enhance" | "update",
      "description": "Change description",
      "priority": "LOW" | "Medium" | "High",
      "affectedDomains": ["domain1", "domain2"]
    }
  ],
  "priority": "High"  // Overall priority (determines version increment)
}
```

**Version Increment Rules:**
- LOW or Medium priority: Increments patch version (e.g., 1.00.000 → 1.00.001)
- High priority: Increments minor version (e.g., 1.00.000 → 1.01.000)
- Major version: Never auto-incremented

---

### 7. Graph & Visualization

**Base Path**: `/api/graph`

#### GET `/api/graph`

Get graph data.

**Query Parameters:**
- `includedSchemaIds` - Comma-separated schema IDs to include
- `excludedSchemaIds` - Comma-separated schema IDs to exclude

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "entity-123",
        "schemaId": "vendors",
        "label": "Vendor Name",
        ...
      }
    ],
    "edges": [
      {
        "source": "entity-123",
        "target": "entity-456",
        "relationTypeId": "vendor-tender"
      }
    ]
  }
}
```

#### POST `/api/graph`

Create new graph.

#### GET `/api/graph/{graphId}`

Get graph by ID.

#### PUT `/api/graph/{graphId}`

Update graph.

#### DELETE `/api/graph/{graphId}`

Delete graph.

---

### 8. Email Templates

**Base Path**: `/api/email-templates`

#### GET `/api/email-templates`

Get all email templates.

#### POST `/api/email-templates`

Create email template.

#### GET `/api/email-templates/{id}`

Get email template by ID.

#### PUT `/api/email-templates/{id}`

Update email template.

#### DELETE `/api/email-templates/{id}`

Delete email template.

#### GET `/api/email-templates/{id}/content`

Get email template content.

#### PUT `/api/email-templates/{id}/content`

Update email template content.

#### POST `/api/email-templates/send`

Send email template.

**Request Body:**
```json
{
  "templateId": "template-123",
  "to": "recipient@example.com",
  "variables": {
    "name": "John Doe",
    ...
  }
}
```

---

### 9. Notifications

**Base Path**: `/api/notifications`

#### GET `/api/notifications`

Get all notifications (filtered by authenticated user).

**Query Parameters:**
- `unread` - Filter unread notifications only
- `limit` - Items per page
- `offset` - Offset

#### POST `/api/notifications`

Create notification.

**Request Body:**
```json
{
  "userId": "user-123",
  "title": "Notification Title",
  "message": "Notification message",
  "type": "info",
  "read": false
}
```

#### GET `/api/notifications/{id}`

Get notification by ID.

#### PUT `/api/notifications/{id}`

Update notification (e.g., mark as read).

**Request Body:**
```json
{
  "read": true
}
```

#### DELETE `/api/notifications/{id}`

Delete notification.

---

### 10. Media & Assets

#### Images

**Base Path**: `/api/images`

##### GET `/api/images/{filename}`

Get image by filename.

**Response:** Image binary with appropriate Content-Type header.

##### POST `/api/images/save`

Save uploaded image.

**Request:** Multipart form data with image file.

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "image-123.jpg",
    "url": "/api/images/image-123.jpg",
    "size": 102400
  }
}
```

#### Videos

**Base Path**: `/api/videos`

##### GET `/api/videos`

Get all videos.

##### POST `/api/videos`

Create video.

##### GET `/api/videos/{videoId}`

Get video by ID.

##### PUT `/api/videos/{videoId}`

Update video.

##### DELETE `/api/videos/{videoId}`

Delete video.

##### GET `/api/videos/{videoId}/content`

Get video content (stream).

#### Avatars

**Base Path**: `/api/avatars`

##### GET `/api/avatars/{filename}`

Get avatar by filename.

---

### 11. Integrations

**Base Path**: `/api/integrations`

#### GET `/api/integrations`

Get all integrations.

#### POST `/api/integrations`

Create integration.

#### GET `/api/integrations/lucide-icons`

Get Lucide icons.

#### POST `/api/integrations/lucide-icons/sync`

Sync Lucide icons.

#### POST `/api/integrations/sync`

Sync integrations.

---

### 12. System & Utilities

#### Health Checks

##### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

##### GET `/api/health/proxy`

Proxy health check.

##### GET `/api/data/health`

Data layer health check.

#### Settings

##### GET `/api/settings`

Get application settings.

##### PUT `/api/settings`

Update application settings.

**Request Body:**
```json
{
  "setting1": "value1",
  "setting2": "value2"
}
```

#### UI Components

##### GET `/api/ui/components`

Get UI components registry.

#### Documentation

##### GET `/api/docs/swagger`

Get Swagger API documentation.

#### Migration

##### POST `/api/migrate/picker-fields`

Migrate picker fields (one-time migration endpoint).

#### Git Integration

##### POST `/api/git/pull-env`

Pull environment variables from Git.

##### POST `/api/git/sync-env`

Sync environment variables to Git.

#### AI Models

##### GET `/api/ai-models`

Get available AI models.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai",
      ...
    }
  ]
}
```

#### AI Agents

**Base Path**: `/api/ai-agents`

##### GET `/api/ai-agents`

Get all AI agents.

**Query Parameters:**
- `id` - Single agent ID
- `agentIds` - Comma-separated agent IDs
- `summary` - Return summary format

##### POST `/api/ai-agents`

Create AI agent.

##### GET `/api/ai-agents/{agent-id}`

Get AI agent by ID.

##### PUT `/api/ai-agents/{agent-id}`

Update AI agent.

##### DELETE `/api/ai-agents/{agent-id}`

Delete AI agent.

#### AI Prompts

**Base Path**: `/api/ai-prompts`

##### GET `/api/ai-prompts`

Get AI prompts with filters.

**Query Parameters:**
- `username` - Filter by username
- `aiAgent` - Filter by AI agent
- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `search` - Search query

##### POST `/api/ai-prompts`

Create AI prompt record.

##### GET `/api/ai-prompts/{id}`

Get AI prompt by ID.

##### PUT `/api/ai-prompts/{id}`

Update AI prompt.

##### DELETE `/api/ai-prompts/{id}`

Delete AI prompt.

#### AI Builder

**Base Path**: `/api/ai-builder`

##### GET `/api/ai-builder/{agent-id}`

Get AI builder agent configuration.

##### POST `/api/ai-builder/{agent-id}`

Update AI builder agent.

---

## Security & Authentication

### Required Headers

1. **Authorization Header** (Required for protected routes)
   - Format: `Bearer <access_token>`
   - Extract from: `Authorization` or `authorization` header
   - Validate JWT token and extract user/tenant context

2. **x-tenant-domain Header** (Optional but Recommended)
   - Format: Tenant domain hostname (e.g., `example.com`)
   - Used for multi-tenant filtering
   - Extract from header or derive from request host

### Security Rules

1. **Input Validation**
   - Validate all query parameters (sanitize strings, validate IDs)
   - Validate request body schema (use DTOs/class-validator)
   - Reject malformed requests with `400 Bad Request`
   - Validate ULID formats for IDs
   - Validate email formats
   - Validate URL formats

2. **Authorization**
   - Verify user has permission to access requested resources
   - Implement tenant isolation (filter by tenant domain/IDs)
   - Verify ownership for user-specific resources (e.g., chats)

3. **SQL Injection Prevention**
   - Use parameterized queries / ORM query builders
   - Never concatenate user input into SQL strings
   - Validate schema IDs and entity IDs against allowlist if possible

4. **Rate Limiting**
   - Implement rate limiting per user/IP
   - Stricter limits for expensive operations (e.g., `resolveTargets=true`)
   - Stricter limits for authentication endpoints

5. **Data Exposure**
   - Only return data the user has permission to see
   - Filter by tenant domain/IDs when applicable
   - Don't expose sensitive metadata if user lacks permission
   - Mask sensitive fields in logs (passwords, tokens, PII)

6. **Request Size Limits**
   - Enforce maximum request body size (e.g., 1MB for chat messages, 10MB for file uploads)
   - Return `413 Payload Too Large` if exceeded

---

## Error Handling

### HTTP Status Codes

| Status | Scenario |
|--------|----------|
| `200 OK` | Successful GET, PUT, DELETE (non-creation), successful query |
| `201 Created` | New resource created successfully |
| `400 Bad Request` | Missing required fields, invalid parameters, validation errors |
| `401 Unauthorized` | Missing or invalid authentication token |
| `403 Forbidden` | User lacks permission for requested operation |
| `404 Not Found` | Resource not found (entity, schema, relation, etc.) |
| `409 Conflict` | Duplicate resource exists, conflict |
| `413 Payload Too Large` | Request body exceeds size limit |
| `500 Internal Server Error` | Server error during processing |
| `502 Bad Gateway` | Upstream service error (if applicable) |
| `503 Service Unavailable` | Service temporarily unavailable |

### Error Response Format

```typescript
{
  success: false;
  error: string;           // Human-readable error message
  code?: string;          // Machine-readable error code
  details?: any;          // Additional error details (optional)
}
```

### Error Codes

- `VALIDATION_ERROR`: Missing or invalid input
- `DUPLICATE_RELATION`: Attempted to create duplicate active relation
- `DUPLICATE_ENTITY`: Attempted to create duplicate entity
- `DUPLICATE_SCHEMA`: Attempted to create duplicate schema
- `AUTHORIZATION_ERROR`: User lacks permission
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `NOT_FOUND`: Requested resource does not exist
- `INTERNAL_ERROR`: Unexpected server error
- `DATABASE_ERROR`: Database operation failed
- `UPSTREAM_ERROR`: External service error

### Exception Handling Best Practices

1. **Catch and Transform**: Catch database/ORM exceptions and transform to standardized error responses
2. **Log Errors**: Log all errors with context (user ID, tenant, query parameters) for debugging
3. **Don't Expose Internals**: Don't return raw database errors or stack traces to clients
4. **Graceful Degradation**: For optional features (e.g., `resolveTargets`), if enrichment fails, return data without enrichment rather than failing entire request
5. **Validation Errors**: Return detailed validation errors with field names and messages
6. **Rate Limit Errors**: Return `429 Too Many Requests` with retry-after header

---

## Performance Considerations

### Query Optimization

1. **Indexing Strategy**
   - Index on `(schemaId, id)` for entity lookups
   - Index on `(sourceSchema, sourceId)` for relation source queries
   - Index on `(targetSchema, targetId)` for relation target queries
   - Index on `relationTypeId` for relation type queries
   - Composite indexes for common query patterns
   - Index on `tenantIds` or tenant-related fields for multi-tenant filtering

2. **Batch Operations**
   - When `resolveTargets=true`, batch fetch entities by schema
   - Use `IN` queries or `$in` operators instead of N+1 queries
   - Cache schema definitions if frequently accessed
   - Batch create/update operations when possible

3. **Pagination**
   - Implement pagination for all list endpoints
   - Default limit: 20-50 items per page
   - Maximum limit: 1000 items per page
   - Use cursor-based pagination for large datasets

4. **Caching**
   - Cache schema definitions (TTL: 5 minutes)
   - Cache frequently accessed entities (TTL: 1-5 minutes)
   - Cache external nodes registry (TTL: 1 hour)
   - Invalidate cache on writes (POST/PUT/DELETE)
   - Use Redis or in-memory cache for shared caching

5. **Database Query Optimization**
   - Use SELECT only needed fields (avoid `SELECT *`)
   - Use JOINs instead of multiple queries when possible
   - Implement query result caching for read-heavy endpoints
   - Use database connection pooling

### Target Resolution Performance

**Critical Optimization**: When `resolveTargets=true`:

1. **Group Relations by Schema**:
   ```typescript
   const relationsBySchema = new Map<string, DataRelation[]>();
   relations.forEach(rel => {
     if (!relationsBySchema.has(rel.targetSchema)) {
       relationsBySchema.set(rel.targetSchema, []);
     }
     relationsBySchema.get(rel.targetSchema).push(rel);
   });
   ```

2. **Batch Fetch Entities**:
   ```typescript
   await Promise.all(
     Array.from(relationsBySchema.keys()).map(async (schemaId) => {
       const entities = await repository.findAllBySchema(schemaId);
       // Store in map for lookup
     })
   );
   ```

3. **Single Schema Lookup**:
   - Fetch each unique schema once (not per relation)
   - Store in Map for O(1) lookup

4. **Error Handling**:
   - If batch fetch fails for a schema, log warning and continue
   - Return relations without enrichment rather than failing entire request

---

## Implementation Checklist

### NestJS Project Structure

```
src/
├── common/
│   ├── decorators/
│   │   ├── auth.decorator.ts        # @CurrentUser(), @TenantDomain()
│   │   └── public.decorator.ts      # @Public() for public routes
│   ├── filters/
│   │   └── http-exception.filter.ts # Global exception filter
│   ├── guards/
│   │   ├── jwt-auth.guard.ts        # JWT authentication guard
│   │   └── roles.guard.ts           # Role-based authorization guard
│   ├── interceptors/
│   │   ├── transform.interceptor.ts # Response transformation
│   │   └── logging.interceptor.ts   # Request/response logging
│   ├── pipes/
│   │   └── validation.pipe.ts       # Global validation pipe
│   └── dto/
│       └── pagination.dto.ts        # Common DTOs
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── refresh-token.dto.ts
│   ├── data/
│   │   ├── data.controller.ts
│   │   ├── data.service.ts
│   │   ├── data.module.ts
│   │   └── dto/
│   │       └── create-entity.dto.ts
│   ├── schemas/
│   │   ├── schemas.controller.ts
│   │   ├── schemas.service.ts
│   │   └── schemas.module.ts
│   ├── relations/
│   │   ├── relations.controller.ts
│   │   ├── relations.service.ts
│   │   └── relations.module.ts
│   ├── chat/
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── chat.module.ts
│   └── ... (other modules)
└── main.ts
```

### Core Setup Checklist

- [ ] Initialize NestJS project with TypeScript
- [ ] Configure environment variables (.env)
- [ ] Set up database connection (TypeORM, Prisma, or Mongoose)
- [ ] Configure JWT authentication (Passport)
- [ ] Set up global exception filter
- [ ] Set up global validation pipe (class-validator, class-transformer)
- [ ] Configure CORS
- [ ] Set up logging (Winston or Pino)
- [ ] Configure rate limiting (Throttler)
- [ ] Set up caching (Redis or in-memory)

### Module Implementation Checklist

For each module (data, schemas, relations, chat, etc.):

#### Controller Setup
- [ ] Create controller with `@Controller('api/{module}')`
- [ ] Implement GET handler(s) for list/single resource
- [ ] Implement POST handler for create
- [ ] Implement PUT handler for update
- [ ] Implement DELETE handler for delete
- [ ] Add `@UseGuards(JwtAuthGuard)` for protected routes
- [ ] Add DTOs for request validation (`class-validator`)
- [ ] Add `@UseInterceptors(TransformInterceptor)` for response formatting
- [ ] Add Swagger decorators (`@ApiTags`, `@ApiOperation`, etc.)

#### Service Layer
- [ ] Create service with business logic
- [ ] Implement query methods
- [ ] Implement create methods with validation
- [ ] Implement update methods
- [ ] Implement delete methods (soft/hard delete)
- [ ] Add proper error handling and logging
- [ ] Implement tenant filtering logic
- [ ] Implement caching logic

#### Repository/Data Access Layer
- [ ] Create repository or use ORM entities
- [ ] Implement database queries with proper indexing
- [ ] Add batch fetch methods for performance
- [ ] Implement transaction support for create/update operations
- [ ] Add database connection error handling
- [ ] Implement soft delete support (if applicable)

#### DTOs and Validation
- [ ] Create DTOs for all request/response types
- [ ] Add validation decorators (`@IsString()`, `@IsOptional()`, etc.)
- [ ] Add custom validators for:
  - ULID format validation (for IDs)
  - Schema ID validation
  - Email format validation
  - URL format validation
- [ ] Create pagination DTOs

#### Security
- [ ] Integrate authentication guard
- [ ] Implement authorization checks (permission to read/write)
- [ ] Add tenant domain extraction and filtering
- [ ] Implement rate limiting
- [ ] Add input sanitization
- [ ] Implement request size limits

#### Error Handling
- [ ] Create custom exception filters
- [ ] Map database exceptions to HTTP status codes
- [ ] Implement standardized error response format
- [ ] Add error logging with context
- [ ] Handle validation errors gracefully

#### Testing
- [ ] Unit tests for service methods
- [ ] Integration tests for controller endpoints
- [ ] Test all query parameter combinations
- [ ] Test authentication and authorization
- [ ] Test error scenarios (401, 403, 404, 409, 500)
- [ ] Test tenant filtering
- [ ] Load testing for performance

#### Documentation
- [ ] Add Swagger/OpenAPI decorators
- [ ] Document all query parameters
- [ ] Document request/response examples
- [ ] Document error codes
- [ ] Add API versioning if needed

### Specific Module Checklists

#### Data Module
- [ ] Implement dynamic schema-based CRUD
- [ ] Support multi-tenant filtering
- [ ] Implement picker field relation syncing
- [ ] Implement repeating section relation syncing
- [ ] Support bulk create (array of entities)
- [ ] Support soft/hard delete
- [ ] Implement entity enrichment (users, picker fields)

#### Relations Module
- [ ] Implement all query modes (unified, legacy, type-based)
- [ ] Implement target resolution with batch fetching
- [ ] Implement duplicate detection and revival
- [ ] Support direction indicators
- [ ] Implement relation enrichment

#### Chat Module
- [ ] Implement chat ownership verification
- [ ] Support message pagination (reverse chronological)
- [ ] Implement request body size validation
- [ ] Support chat summary mode
- [ ] Implement message validation (role, content)

#### Schema Module
- [ ] Implement tenant-based schema filtering
- [ ] Support summary format (excludes fields)
- [ ] Support statistics calculation
- [ ] Implement schema normalization (repeatingConfig, etc.)
- [ ] Support bulk create (array of schemas)
- [ ] Implement hard delete (schema + data + relations)

---

## NestJS Code Examples

### Controller Example (Data Module)

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DataService } from './data.service';
import { CreateEntityDto, UpdateEntityDto, QueryEntitiesDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/auth.decorator';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { UseInterceptors } from '@nestjs/common';

@ApiTags('Data')
@Controller('api/data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(TransformInterceptor)
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get(':schemaId')
  @ApiOperation({ summary: 'Get all entities for a schema' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tenantIds', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAll(
    @Param('schemaId') schemaId: string,
    @Query() query: QueryEntitiesDto,
    @CurrentUser() user: any,
  ) {
    return this.dataService.findAll(schemaId, query, user);
  }

  @Post(':schemaId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new entity' })
  async create(
    @Param('schemaId') schemaId: string,
    @Body() createDto: CreateEntityDto,
    @CurrentUser() user: any,
  ) {
    return this.dataService.create(schemaId, createDto, user);
  }

  @Get(':schemaId/:id')
  @ApiOperation({ summary: 'Get entity by ID' })
  async getById(
    @Param('schemaId') schemaId: string,
    @Param('id') id: string,
    @Query('tenantIds') tenantIds?: string,
    @CurrentUser() user: any,
  ) {
    return this.dataService.findById(schemaId, id, tenantIds, user);
  }

  @Put(':schemaId/:id')
  @ApiOperation({ summary: 'Update entity' })
  async update(
    @Param('schemaId') schemaId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateEntityDto,
    @CurrentUser() user: any,
  ) {
    return this.dataService.update(schemaId, id, updateDto, user);
  }

  @Delete(':schemaId/:id')
  @ApiOperation({ summary: 'Delete entity' })
  async delete(
    @Param('schemaId') schemaId: string,
    @Param('id') id: string,
    @Query('hardDelete') hardDelete?: boolean,
    @CurrentUser() user: any,
  ) {
    return this.dataService.delete(schemaId, id, hardDelete, user);
  }
}
```

### Service Example (Data Module)

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataRepository } from './data.repository';
import { CreateEntityDto, UpdateEntityDto, QueryEntitiesDto } from './dto';
import { RelationsService } from '../relations/relations.service';

@Injectable()
export class DataService {
  constructor(
    private readonly repository: DataRepository,
    private readonly relationsService: RelationsService,
  ) {}

  async findAll(schemaId: string, query: QueryEntitiesDto, user: any) {
    // Validate schema exists
    const schema = await this.repository.findSchema(schemaId);
    if (!schema) {
      throw new NotFoundException(`Schema "${schemaId}" not found`);
    }

    // Apply tenant filtering
    const tenantIds = query.tenantIds?.split(',').map(id => id.trim()) || [];
    if (tenantIds.length > 0 && !this.isLocalhost(user)) {
      // Apply tenant filtering logic
    }

    // Build query filters
    const filters = this.buildFilters(query);

    // Query entities
    const entities = await this.repository.findAll(schemaId, filters);

    // Enrich with relations if needed
    const enriched = await this.enrichEntities(schemaId, entities);

    return {
      success: true,
      data: enriched,
      count: enriched.length,
    };
  }

  async create(schemaId: string, createDto: CreateEntityDto, user: any) {
    // Validate schema
    const schema = await this.repository.findSchema(schemaId);
    if (!schema) {
      throw new NotFoundException(`Schema "${schemaId}" not found`);
    }

    // Validate entity data against schema
    this.validateEntityData(schema, createDto);

    // Extract picker values and repeating section values
    const { pickerValues, repeatingSectionValues, cleanedData } = 
      this.extractRelationValues(schema, createDto);

    // Create entity
    const entity = await this.repository.create(schemaId, cleanedData);

    // Sync relations
    await this.relationsService.syncPickerFieldRelations(
      schemaId,
      entity.id,
      pickerValues,
    );
    await this.relationsService.syncRepeatingSectionRelations(
      schemaId,
      entity.id,
      repeatingSectionValues,
    );

    // Enrich and return
    const enriched = await this.enrichEntity(schemaId, entity);
    return {
      success: true,
      data: enriched,
      message: 'Entity created successfully',
    };
  }

  // ... other methods
}
```

### DTO Example

```typescript
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryEntitiesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantIds?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class CreateEntityDto {
  @ApiProperty()
  @IsString()
  name: string;

  // ... other fields based on schema
}
```

---

## Additional Notes

- **ULID Generation**: Use a ULID library (e.g., `ulid` npm package) for generating IDs
- **Timestamp Format**: Use ISO 8601 format (e.g., `2024-01-15T10:30:00.000Z`)
- **Soft Delete**: Use `inactive` boolean field rather than hard deletes for audit trail
- **Backward Compatibility**: Support legacy query parameters for existing clients
- **External Nodes**: If your system uses external nodes, implement lookup logic for `targetSchema === 'external-nodes'`
- **Schema Registry**: Implement schema lookup service to resolve field roles (`title`, `icon`, `color`, `addToReferenceMetadata`)
- **Demo Mode**: Consider supporting demo mode for development/testing (use local file storage instead of database)
- **Migration Strategy**: Plan migration path from file-based storage to database
- **API Versioning**: Consider adding API versioning (`/api/v1/...`) for future changes

---

## Version History

- **v1.0.0** (2024-01-15): Initial comprehensive documentation covering all API routes
