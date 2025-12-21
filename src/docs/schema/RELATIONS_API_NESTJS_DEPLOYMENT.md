# Relations API - NestJS Backend Deployment Rules

This document provides comprehensive rules and guidelines for implementing the `/api/relations` endpoint in a NestJS backend service.

## Table of Contents

1. [Overview](#overview)
2. [Endpoint Structure](#endpoint-structure)
3. [Request/Response Formats](#requestresponse-formats)
4. [Query Parameters](#query-parameters)
5. [Business Logic Requirements](#business-logic-requirements)
6. [Database Schema](#database-schema)
7. [Security & Authentication](#security--authentication)
8. [Error Handling](#error-handling)
9. [Performance Considerations](#performance-considerations)
10. [Implementation Checklist](#implementation-checklist)

---

## Overview

The Relations API handles CRUD operations for data relations between entities across different schemas. Relations represent connections between entities (e.g., a vendor is related to multiple tenders).

**Base Endpoint**: `GET|POST /api/relations`

**Key Features**:
- Bidirectional relation queries (source/target/both)
- Soft-delete support (inactive flag)
- Relation enrichment with target metadata
- Multiple query patterns for different use cases
- Duplicate prevention with revival logic

---

## Endpoint Structure

### GET /api/relations

Query relations based on various criteria. Supports multiple query patterns with priority order.

### POST /api/relations

Create a new relation. Includes duplicate detection and revival logic for inactive relations.

---

## Request/Response Formats

### Required Response Format

All endpoints must return responses in this standardized format:

```typescript
{
  success: boolean;
  data?: any | any[];
  error?: string;
  message?: string;
  count?: number; // For list responses
  code?: string; // Error code
}
```

### Success Response Examples

**GET - Single Query Result**:
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
      "direction": "source"
    }
  ],
  "count": 1
}
```

**GET - With Resolved Targets**:
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

**POST - Success**:
```json
{
  "success": true,
  "data": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "sourceSchema": "vendors",
    "sourceId": "vendor-123",
    "targetSchema": "tenders",
    "targetId": "tender-456",
    "relationTypeId": "vendor-tender",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**POST - Revived Relation**:
```json
{
  "success": true,
  "data": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    // ... relation data
    "inactive": false,
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "revived": true
}
```

### Error Response Examples

**400 Bad Request - Missing Fields**:
```json
{
  "success": false,
  "error": "Missing required fields: sourceSchema, sourceId, targetSchema, targetId, relationTypeId",
  "code": "VALIDATION_ERROR"
}
```

**409 Conflict - Duplicate Relation**:
```json
{
  "success": false,
  "error": "Duplicate relation not allowed for the same source, target, and relation type.",
  "code": "DUPLICATE_RELATION",
  "existing": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    // ... existing relation data
  }
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to process relations request",
  "code": "INTERNAL_ERROR"
}
```

---

## Query Parameters

### GET /api/relations

All query parameters are optional, but specific combinations trigger different query modes (checked in priority order).

#### Available Parameters

| Parameter | Type | Description | Required For |
|-----------|------|-------------|--------------|
| `schema` | string | Schema ID of the entity | New unified query |
| `id` | string | Entity ID | New unified query |
| `direction` | string | `'source'` \| `'target'` \| `'both'` | Optional (default: `'both'`) |
| `otherSchema` | string | Filter by the other schema | Optional filter |
| `sourceSchema` | string | Source schema ID (legacy) | Legacy queries |
| `sourceId` | string | Source entity ID (legacy) | Legacy queries |
| `targetSchema` | string | Target schema ID | Legacy queries / filters |
| `targetId` | string | Target entity ID (legacy) | Legacy queries |
| `relationTypeId` | string | Relation type identifier | Type query / section query |
| `fieldId` | string | Field identifier filter | Optional filter |
| `includeInactive` | boolean | Include inactive relations (`'true'`) | Optional (default: `false` when `relationTypeId` present) |
| `resolveTargets` | boolean | Enrich with target data (`'true'`) | Optional (default: `false`) |

#### Query Mode Priority

The endpoint checks query parameters in this order (first match wins):

1. **New Unified Query** (`schema` + `id`)
   - Required: `schema`, `id`
   - Optional: `direction` (default: `'both'`), `otherSchema`, `relationTypeId`
   - Returns relations where the entity appears as source, target, or both

2. **Repeating Section Query** (`sourceSchema` + `sourceId` + `relationTypeId`)
   - Required: `sourceSchema`, `sourceId`, `relationTypeId`
   - Optional: `targetSchema`
   - Used for repeating section components
   - Automatically adds `direction: 'source'` to results

3. **Legacy Source Query** (`sourceSchema` + `sourceId`)
   - Required: `sourceSchema`, `sourceId`
   - Optional: `targetSchema` (filter)
   - Automatically adds `direction: 'source'` to results

4. **Legacy Target Query** (`targetSchema` + `targetId`)
   - Required: `targetSchema`, `targetId`
   - Automatically adds `direction: 'target'` to results

5. **Type Query** (`relationTypeId` only)
   - Required: `relationTypeId`
   - Returns all relations of a specific type

6. **All Relations** (no parameters)
   - Fallback: Returns all relations in the system

#### Additional Filters (Applied After Main Query)

- **`fieldId`**: Filters relations by field identifier (mainly for HAS_FIELD_VALUE relations)
- **`includeInactive`**: When `relationTypeId` is specified, inactive relations are excluded by default unless `includeInactive=true`
- **`resolveTargets`**: When `true`, enriches relations with target entity metadata (label, icon, color, custom metadata)

#### Query Examples

```
# New unified query - both directions
GET /api/relations?schema=vendors&id=vendor-123

# New unified query - source only
GET /api/relations?schema=vendors&id=vendor-123&direction=source

# New unified query - with target schema filter
GET /api/relations?schema=vendors&id=vendor-123&direction=source&otherSchema=tenders

# Repeating section query
GET /api/relations?sourceSchema=vendors&sourceId=vendor-123&relationTypeId=vendor-tender

# Legacy source query
GET /api/relations?sourceSchema=vendors&sourceId=vendor-123

# Type query
GET /api/relations?relationTypeId=vendor-tender

# With target resolution
GET /api/relations?schema=vendors&id=vendor-123&resolveTargets=true

# Include inactive relations
GET /api/relations?relationTypeId=vendor-tender&includeInactive=true
```

---

## Business Logic Requirements

### POST /api/relations - Create Relation

#### Request Body

```typescript
{
  sourceSchema: string;      // Required
  sourceId: string;          // Required
  targetSchema: string;      // Required
  targetId: string;          // Required
  relationTypeId: string;    // Required
  fieldId?: string;          // Optional
}
```

#### Validation Rules

1. **Required Fields**: All of `sourceSchema`, `sourceId`, `targetSchema`, `targetId`, `relationTypeId` must be present
2. **Duplicate Detection**: Check for existing relation with exact match on:
   - `sourceSchema`
   - `sourceId`
   - `targetSchema`
   - `targetId`
   - `relationTypeId`

#### Duplicate Handling

- **If duplicate exists and is ACTIVE**: Return `409 Conflict` with existing relation data
- **If duplicate exists and is INACTIVE**: Revive the relation by:
  - Setting `inactive: false` (or removing the field)
  - Updating `updatedAt` to current timestamp
  - Return `200 OK` with `revived: true` flag

#### Relation Creation

- Generate unique ID using ULID format (e.g., `01ARZ3NDEKTSV4RRFFQ69G5FAV`)
- Set `createdAt` and `updatedAt` to current ISO timestamp
- `inactive` defaults to `false` (or `undefined`/`null`)

### GET /api/relations - Query Logic

#### Filtering Priority

1. Execute main query based on parameter combination (see Query Mode Priority above)
2. Apply `fieldId` filter if provided
3. Apply `includeInactive` filter if `relationTypeId` is present:
   - Default behavior: Exclude inactive relations when `relationTypeId` is specified
   - Override: Include inactive if `includeInactive=true`
4. Apply `resolveTargets` enrichment if requested

#### Direction Indicators

When returning results, add `direction` field based on query context:
- **Source queries**: Add `direction: 'source'` to all results
- **Target queries**: Add `direction: 'target'` to all results
- **Both/unified queries**: Add appropriate direction based on which side of the relation the queried entity appears

#### Target Resolution (`resolveTargets=true`)

When `resolveTargets=true`, enrich each relation's target entity with:

1. **For External Nodes** (`targetSchema === 'external-nodes'`):
   - Lookup in external nodes registry
   - Include: `id`, `label`, `icon`, `color`

2. **For Internal Entities**:
   - Batch fetch all target entities by schema (avoid N+1 queries)
   - Resolve `label` from schema field with role `'title'` (fallback: `name`, `title`, or `targetId`)
   - Resolve `icon` from schema field with role `'icon'` (fallback: entity `icon`)
   - Resolve `color` from schema field with role `'color'` (fallback: entity `color`)
   - Extract metadata from fields with `addToReferenceMetadata: true`

**Performance Optimization**:
- Group relations by `targetSchema`
- Batch fetch all entities per schema in parallel
- Use Map/Set for O(1) lookups
- Handle errors gracefully (log and continue without enrichment)

---

## Database Schema

### Recommended Database Table Structure

```sql
CREATE TABLE relations (
  id VARCHAR(26) PRIMARY KEY,              -- ULID format
  source_schema VARCHAR(255) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  target_schema VARCHAR(255) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  relation_type_id VARCHAR(255) NOT NULL,
  field_id VARCHAR(255) NULL,              -- Optional field identifier
  inactive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  
  -- Composite unique index to prevent duplicates
  UNIQUE KEY unique_active_relation (
    source_schema, 
    source_id, 
    target_schema, 
    target_id, 
    relation_type_id,
    inactive
  ),
  
  -- Indexes for common queries
  INDEX idx_source (source_schema, source_id),
  INDEX idx_target (target_schema, target_id),
  INDEX idx_relation_type (relation_type_id),
  INDEX idx_field (field_id),
  INDEX idx_inactive (inactive),
  
  -- Foreign key constraints (if applicable)
  -- FOREIGN KEY (source_schema, source_id) REFERENCES entities(schema, id),
  -- FOREIGN KEY (target_schema, target_id) REFERENCES entities(schema, id)
);
```

### Alternative: NoSQL Structure (MongoDB)

```typescript
{
  _id: ObjectId,
  id: string,                    // ULID
  sourceSchema: string,
  sourceId: string,
  targetSchema: string,
  targetId: string,
  relationTypeId: string,
  fieldId?: string,
  inactive?: boolean,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{
  sourceSchema: 1,
  sourceId: 1
}

{
  targetSchema: 1,
  targetId: 1
}

{
  relationTypeId: 1
}

{
  sourceSchema: 1,
  sourceId: 1,
  targetSchema: 1,
  targetId: 1,
  relationTypeId: 1,
  unique: true,
  partialFilterExpression: { inactive: { $ne: true } }
}
```

---

## Security & Authentication

### Required Headers

Backend must accept and process:

1. **Authorization Header** (Required)
   - Format: `Bearer <access_token>`
   - Extract from: `Authorization` or `authorization` header
   - Validate token and extract user/tenant context

2. **x-tenant-domain Header** (Optional but Recommended)
   - Format: Tenant domain hostname (e.g., `example.com`)
   - Used for multi-tenant filtering
   - Extract from header or derive from request host

### Security Rules

1. **Input Validation**
   - Validate all query parameters (sanitize strings, validate IDs)
   - Validate request body schema (use DTOs/class-validator)
   - Reject malformed requests with `400 Bad Request`

2. **Authorization**
   - Verify user has permission to read relations for requested schemas/entities
   - Verify user has permission to create relations
   - Implement tenant isolation (filter by tenant domain)

3. **SQL Injection Prevention**
   - Use parameterized queries / ORM query builders
   - Never concatenate user input into SQL strings
   - Validate schema IDs and entity IDs against allowlist if possible

4. **Rate Limiting**
   - Implement rate limiting per user/IP
   - Especially important for `resolveTargets=true` queries (more expensive)

5. **Data Exposure**
   - Only return relations the user has permission to see
   - Filter by tenant domain when applicable
   - Don't expose sensitive metadata in `targetData` if user lacks permission

---

## Error Handling

### HTTP Status Codes

| Status | Scenario |
|--------|----------|
| `200 OK` | Successful query, relation created, or relation revived |
| `201 Created` | New relation created successfully |
| `400 Bad Request` | Missing required fields, invalid parameters |
| `401 Unauthorized` | Missing or invalid authentication token |
| `403 Forbidden` | User lacks permission for requested operation |
| `404 Not Found` | Relation not found (if querying by ID) |
| `409 Conflict` | Duplicate active relation exists |
| `500 Internal Server Error` | Server error during processing |
| `502 Bad Gateway` | Upstream service error (if applicable) |

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
- `AUTHORIZATION_ERROR`: User lacks permission
- `NOT_FOUND`: Requested relation does not exist
- `INTERNAL_ERROR`: Unexpected server error
- `DATABASE_ERROR`: Database operation failed

### Exception Handling Best Practices

1. **Catch and Transform**: Catch database/ORM exceptions and transform to standardized error responses
2. **Log Errors**: Log all errors with context (user ID, tenant, query parameters) for debugging
3. **Don't Expose Internals**: Don't return raw database errors or stack traces to clients
4. **Graceful Degradation**: For `resolveTargets`, if enrichment fails, return relation without `targetData` rather than failing entire request

---

## Performance Considerations

### Query Optimization

1. **Indexing Strategy**
   - Index on `(sourceSchema, sourceId)` for source queries
   - Index on `(targetSchema, targetId)` for target queries
   - Index on `relationTypeId` for type queries
   - Composite unique index on `(sourceSchema, sourceId, targetSchema, targetId, relationTypeId, inactive)` for duplicate detection

2. **Batch Operations**
   - When `resolveTargets=true`, batch fetch entities by schema
   - Use `IN` queries or `$in` operators instead of N+1 queries
   - Cache schema definitions if frequently accessed

3. **Pagination** (Future Enhancement)
   - Consider adding `limit` and `offset` parameters for large result sets
   - Default limit: 1000 relations per query

4. **Caching**
   - Cache external nodes registry (if applicable)
   - Cache schema definitions
   - Consider caching frequently accessed relations (with TTL)

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

### NestJS Controller Setup

- [ ] Create `RelationsController` with `@Controller('api/relations')`
- [ ] Implement `@Get()` handler for query operations
- [ ] Implement `@Post()` handler for create operations
- [ ] Add `@UseGuards()` for authentication (JWT/AuthGuard)
- [ ] Add DTOs for request validation (`class-validator`)

### Service Layer

- [ ] Create `RelationsService` with business logic
- [ ] Implement query methods matching utility functions:
  - [ ] `getRelationsBySchemaAndId()`
  - [ ] `getRelationsForSection()`
  - [ ] `getRelationsBySource()`
  - [ ] `getRelationsByTarget()`
  - [ ] `getRelationsByType()`
- [ ] Implement `createRelation()` with duplicate detection and revival
- [ ] Implement `resolveTargets()` enrichment logic
- [ ] Add proper error handling and logging

### Repository/Data Access Layer

- [ ] Create `RelationsRepository` or use ORM entities
- [ ] Implement database queries with proper indexing
- [ ] Add batch fetch methods for target resolution
- [ ] Implement transaction support for create operations
- [ ] Add database connection error handling

### DTOs and Validation

- [ ] Create `CreateRelationDto` with validation decorators
- [ ] Create `QueryRelationsDto` for GET parameters
- [ ] Add custom validators for:
  - [ ] ULID format validation (for IDs)
  - [ ] Schema ID validation
  - [ ] Direction enum validation

### Security

- [ ] Integrate authentication guard
- [ ] Implement authorization checks (permission to read/write relations)
- [ ] Add tenant domain extraction and filtering
- [ ] Implement rate limiting
- [ ] Add input sanitization

### Error Handling

- [ ] Create custom exception filters
- [ ] Map database exceptions to HTTP status codes
- [ ] Implement standardized error response format
- [ ] Add error logging with context

### Testing

- [ ] Unit tests for service methods
- [ ] Integration tests for controller endpoints
- [ ] Test all query parameter combinations
- [ ] Test duplicate detection and revival
- [ ] Test target resolution with various schemas
- [ ] Test error scenarios (401, 403, 409, 500)

### Documentation

- [ ] Add Swagger/OpenAPI decorators
- [ ] Document all query parameters
- [ ] Document request/response examples
- [ ] Document error codes

### Performance

- [ ] Verify database indexes are created
- [ ] Test batch fetching for `resolveTargets`
- [ ] Load test with large relation sets
- [ ] Optimize slow queries

---

## NestJS Code Structure Example

### Controller

```typescript
import { Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RelationsService } from './relations.service';
import { CreateRelationDto, QueryRelationsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/relations')
@UseGuards(JwtAuthGuard)
export class RelationsController {
  constructor(private readonly relationsService: RelationsService) {}

  @Get()
  async getRelations(@Query() query: QueryRelationsDto) {
    return this.relationsService.queryRelations(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRelation(@Body() dto: CreateRelationDto) {
    return this.relationsService.createRelation(dto);
  }
}
```

### Service

```typescript
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { RelationsRepository } from './relations.repository';
import { CreateRelationDto, QueryRelationsDto } from './dto';
import { DataRelation } from './entities/relation.entity';

@Injectable()
export class RelationsService {
  constructor(private readonly repository: RelationsRepository) {}

  async queryRelations(query: QueryRelationsDto) {
    // Implement query logic based on parameter combinations
    // See business logic requirements above
  }

  async createRelation(dto: CreateRelationDto): Promise<{ success: boolean; data: DataRelation; revived?: boolean }> {
    // Validate required fields
    // Check for duplicates
    // Revive if inactive, create if new
    // Return standardized response
  }
}
```

---

## Additional Notes

- **ULID Generation**: Use a ULID library (e.g., `ulid` npm package) for generating relation IDs
- **Timestamp Format**: Use ISO 8601 format (e.g., `2024-01-15T10:30:00.000Z`)
- **Soft Delete**: Use `inactive` boolean field rather than hard deletes for audit trail
- **Backward Compatibility**: Support legacy query parameters (`sourceSchema`, `sourceId`, etc.) for existing clients
- **External Nodes**: If your system uses external nodes, implement lookup logic for `targetSchema === 'external-nodes'`
- **Schema Registry**: Implement schema lookup service to resolve field roles (`title`, `icon`, `color`, `addToReferenceMetadata`)

---

## Version History

- **v1.0.0** (2024-01-15): Initial documentation based on Next.js implementation

