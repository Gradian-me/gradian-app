# Dynamic CRUD Architecture Documentation

## Overview

This document describes the complete domain-driven dynamic CRUD system that provides automatic API routes and data management for any entity based on schema definitions.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  /page/[schema-id] → DynamicPageRenderer → UI Components    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                      API Layer                               │
│      /api/data/[schema-id] → Dynamic CRUD Routes            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Domain Layer (DDD)                         │
│  Controller → Service → Repository → Data Storage           │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. **Data Storage Layer**
- **Location**: `data/all-data.json`
- **Purpose**: Persistent storage for all entities
- **Structure**:
```json
{
  "vendors": [...],
  "tenders": [...],
  "products": [...]
}
```

### 2. **Repository Layer**
- **Location**: `src/shared/domain/repositories/base.repository.ts`
- **Responsibility**: Data access and persistence
- **Operations**:
  - `findAll(filters)` - Get all entities with filtering
  - `findById(id)` - Get single entity
  - `create(data)` - Create new entity
  - `update(id, data)` - Update existing entity
  - `delete(id)` - Delete entity
  - `exists(id)` - Check if entity exists
  - `count(filters)` - Count entities

### 3. **Service Layer**
- **Location**: `src/shared/domain/services/base.service.ts`
- **Responsibility**: Business logic and validation
- **Features**:
  - Data validation before create/update
  - Business rule enforcement
  - Error handling
  - Response formatting

### 4. **Controller Layer**
- **Location**: `src/shared/domain/controllers/base.controller.ts`
- **Responsibility**: HTTP request/response handling
- **Features**:
  - Request parsing
  - Query parameter extraction
  - Response status codes
  - Error response formatting

### 5. **API Routes**
- **Location**: `src/app/api/`
- **Dynamic CRUD Routes**:
  - `GET /api/data/{schema-id}` - List all entities
  - `POST /api/data/{schema-id}` - Create entity
  - `GET /api/data/{schema-id}/{id}` - Get single entity
  - `PUT /api/data/{schema-id}/{id}` - Update entity
  - `DELETE /api/data/{schema-id}/{id}` - Delete entity

## File Structure

```
src/
├── gradian-ui/
│   └── shared/
│       ├── domain/
│       │   ├── types/
│       │   │   └── base.types.ts          # Base type definitions
│       │   ├── interfaces/
│       │   │   ├── repository.interface.ts # Repository contract
│       │   │   └── service.interface.ts    # Service contract
│       │   ├── repositories/
│       │   │   └── base.repository.ts      # Base repository implementation
│       │   ├── services/
│       │   │   └── base.service.ts         # Base service implementation
│       │   ├── controllers/
│       │   │   └── base.controller.ts      # Base controller implementation
│       │   ├── errors/
│       │   │   └── domain.errors.ts        # Domain error classes
│       │   ├── validators/
│       │   │   └── schema.validator.ts     # Schema validation
│       │   ├── utils/
│       │   │   ├── data-storage.util.ts    # Data file operations
│       │   │   ├── relations-storage.util.ts # Relations storage
│       │   │   └── field-value-relations.util.ts # Field-value relations
│       │   └── index.ts                     # Domain exports
│       └── utils/
│           └── schema-registry.ts           # Schema utilities
├── gradian-ui/
│   └── schema-manager/
│       └── utils/
│           ├── schema-registry.server.ts    # Server-side schema registry
│           └── schema-loader.ts             # Schema loading utilities
├── app/
│   ├── api/
│   │   ├── data/
│   │   │   ├── [schema-id]/
│   │   │   │   ├── route.ts                # List & Create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts            # Get, Update, Delete
│   │   │   ├── all-relations/
│   │   │   │   └── route.ts                # All relations endpoint
│   │   │   ├── health/
│   │   │   │   └── route.ts                # Data health check
│   │   │   └── utils.ts                    # Data API utilities
│   │   ├── schemas/
│   │   │   ├── [schema-id]/
│   │   │   │   └── route.ts                # Schema CRUD
│   │   │   ├── clear-cache/
│   │   │   │   └── route.ts                # Clear schema cache
│   │   │   ├── route.ts                    # Schema list/create
│   │   │   └── utils.ts                    # Schema API utilities
│   │   ├── relations/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts                # Relation CRUD
│   │   │   └── route.ts                    # Relations query/create
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── token/
│   │   │   │   ├── refresh/route.ts
│   │   │   │   └── validate/route.ts
│   │   │   ├── password/
│   │   │   │   ├── reset/route.ts
│   │   │   │   └── change/route.ts
│   │   │   └── 2fa/
│   │   │       ├── generate/route.ts
│   │   │       └── validate/route.ts
│   │   ├── chat/
│   │   │   ├── [chat-id]/
│   │   │   │   ├── route.ts
│   │   │   │   ├── messages/route.ts
│   │   │   │   ├── todos/route.ts
│   │   │   │   └── execute-todos/route.ts
│   │   │   ├── orchestrate/route.ts
│   │   │   └── route.ts
│   │   ├── dashboard/
│   │   │   ├── route.ts
│   │   │   ├── stats/route.ts
│   │   │   ├── kpi-cards/route.ts
│   │   │   ├── kpi-lists/route.ts
│   │   │   ├── spend-analysis/route.ts
│   │   │   └── performance-metrics/route.ts
│   │   └── ... (many more API routes)
│   └── page/
│       ├── [schema-id]/
│       │   ├── [data-id]/
│       │   │   ├── page.tsx               # Dynamic detail page
│       │   │   └── forbidden/page.tsx
│       │   ├── page.tsx                   # Dynamic list page
│       │   ├── forbidden/page.tsx
│       │   └── not-found.tsx
│       ├── builder/
│       │   ├── page.tsx
│       │   ├── schemas/
│       │   ├── relation-types/
│       │   ├── ai-agents/
│       │   └── ... (builder pages)
│       ├── chat/
│       │   └── [chat-id]/page.tsx
│       ├── dashboard/page.tsx
│       └── ... (many more pages)
└── data/
    ├── all-data.json                      # Data storage
    ├── all-schemas.json                   # Schema storage
    └── all-relations.json                 # Relations storage
```

## Usage Examples

### 1. Add New Entity Type

**Step 1**: Add schema to `data/all-schemas.json` (via API or directly)

Using the API:
```bash
POST /api/schemas
Content-Type: application/json

{
  "id": "products",
  "name": "products",
  "title": "Create New Product",
  "singular_name": "Product",
  "plural_name": "Products",
  "sections": [
    {
      "id": "basic-info",
      "title": "Product Information",
      "fields": [
        {
          "id": "name",
          "name": "name",
          "label": "Product Name",
          "component": "text",
          "sectionId": "basic-info",
          "validation": {
            "required": true
          }
        }
      ]
    }
  ]
}
```

Or add directly to `data/all-schemas.json`:
```json
[
  {
    "id": "products",
    "name": "products",
    "title": "Create New Product",
    "singular_name": "Product",
    "plural_name": "Products",
    "sections": [...]
  }
]
```

**Step 2**: Initialize in `data/all-data.json` (optional - will be auto-initialized)

```json
{
  "vendors": [],
  "products": []
}
```

**That's it!** The following are automatically available:
- Page: `http://localhost:3000/page/products`
- API: `http://localhost:3000/api/data/products`
- All CRUD operations work immediately

### 2. Using the API

**Create Entity**:
```bash
POST /api/data/vendors
Content-Type: application/json

{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "phone": "+1234567890",
  "status": "ACTIVE"
}
```

**Get All Entities**:
```bash
GET /api/data/vendors?search=acme&status=ACTIVE
```

**Get Single Entity**:
```bash
GET /api/data/vendors/{id}
```

**Update Entity**:
```bash
PUT /api/data/vendors/{id}
Content-Type: application/json

{
  "name": "Acme Corporation",
  "status": "PENDING"
}
```

**Delete Entity**:
```bash
DELETE /api/data/vendors/{id}
```

### 3. Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { /* entity data */ },
  "message": "Vendor created successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Vendor with ID \"123\" not found"
}
```

## Domain-Driven Design Patterns

### 1. Repository Pattern
Abstracts data access logic from business logic.

```typescript
const repository = new BaseRepository<Vendor>('vendors');
const vendors = await repository.findAll({ status: 'ACTIVE' });
```

### 2. Service Pattern
Encapsulates business logic and validation.

```typescript
const service = new BaseService(repository, 'Vendor');
const result = await service.create(vendorData);
```

### 3. Controller Pattern
Handles HTTP concerns and delegates to services.

```typescript
const controller = new BaseController(service, 'Vendor');
const response = await controller.getAll(request);
```

## Error Handling

### Custom Error Types

1. **EntityNotFoundError** (404)
   - Thrown when entity doesn't exist
   
2. **ValidationError** (400)
   - Thrown when validation fails
   
3. **DuplicateEntityError** (409)
   - Thrown when unique constraint violated
   
4. **DataStorageError** (500)
   - Thrown when file system operations fail

### Error Response Flow

```
Error Thrown → handleDomainError() → Formatted Response → HTTP Status Code
```

## Validation

### Schema-Based Validation

The system automatically validates:
- Required fields
- Field types (email, url, phone, number)
- Min/max length
- Min/max value
- Custom regex patterns

### Custom Validation

Extend `BaseService` to add custom validation:

```typescript
class VendorService extends BaseService<Vendor> {
  protected async validateCreate(data: Omit<Vendor, 'id'>): Promise<void> {
    // Custom validation logic
    if (await this.isDuplicateEmail(data.email)) {
      throw new DuplicateEntityError('Vendor', 'email', data.email);
    }
  }
}
```

## Features

✅ **Automatic CRUD Operations** - No boilerplate code needed
✅ **Type Safety** - Full TypeScript support throughout
✅ **Validation** - Schema-based validation built-in
✅ **Error Handling** - Comprehensive error handling
✅ **Filtering** - Search, status, category filters
✅ **Domain-Driven Design** - Clean architecture patterns
✅ **Single Source of Truth** - Schema drives everything
✅ **File-Based Storage** - Simple JSON file storage
✅ **RESTful API** - Standard REST conventions
✅ **Extensible** - Easy to customize and extend

## Extending the System

### Custom Repository

```typescript
class VendorRepository extends BaseRepository<Vendor> {
  async findByEmail(email: string): Promise<Vendor | null> {
    const vendors = await this.findAll();
    return vendors.find(v => v.email === email) || null;
  }
}
```

### Custom Service

```typescript
class VendorService extends BaseService<Vendor> {
  constructor(repository: VendorRepository) {
    super(repository, 'Vendor');
  }

  async activateVendor(id: string): Promise<ApiResponse<Vendor>> {
    return this.update(id, { status: 'ACTIVE' });
  }
}
```

### Custom Controller

```typescript
class VendorController extends BaseController<Vendor> {
  async activate(id: string): Promise<NextResponse> {
    const service = this.service as VendorService;
    const result = await service.activateVendor(id);
    return NextResponse.json(result);
  }
}
```

## Benefits

1. **Rapid Development** - Add new entities in minutes
2. **Consistency** - All entities follow same patterns
3. **Maintainability** - Single place to update logic
4. **Testability** - Each layer can be tested independently
5. **Scalability** - Easy to add features and entities
6. **Type Safety** - Catch errors at compile time
7. **Clean Code** - Follows SOLID principles

## Migration from Old System

1. Move existing entity schemas to `all-schemas.ts`
2. Update API calls to use `/api/data/{schema-id}`
3. Remove old domain-specific API routes
4. Remove old repository/service implementations
5. Test thoroughly with existing data

## Next Steps

1. ✅ Test the dynamic CRUD API
2. ✅ Create entities using the new system
3. ⏭️ Add database support (replace JSON file)
4. ⏭️ Add authentication/authorization
5. ⏭️ Add pagination support
6. ⏭️ Add bulk operations
7. ⏭️ Add audit logging
8. ⏭️ Add caching layer

## Testing the System

### Test Vendors CRUD

```bash
# Create
curl -X POST http://localhost:3000/api/data/vendors \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Vendor","email":"test@test.com","phone":"1234567890","status":"ACTIVE"}'

# List
curl http://localhost:3000/api/data/vendors

# Get by ID
curl http://localhost:3000/api/data/vendors/{id}

# Update
curl -X PUT http://localhost:3000/api/data/vendors/{id} \
  -H "Content-Type: application/json" \
  -d '{"status":"INACTIVE"}'

# Delete
curl -X DELETE http://localhost:3000/api/data/vendors/{id}
```

## Complete Routes Reference

### API Routes

#### Data & Schema Management

**Dynamic CRUD Routes**
- `GET /api/data/{schema-id}` - List all entities for a schema (with filtering, search, pagination)
- `POST /api/data/{schema-id}` - Create new entity
- `GET /api/data/{schema-id}/{id}` - Get single entity by ID
- `PUT /api/data/{schema-id}/{id}` - Update entity
- `DELETE /api/data/{schema-id}/{id}` - Delete entity
- `GET /api/data/all-relations` - Get all relations across all schemas
- `GET /api/data/health` - Health check for data layer

**Schema Routes**
- `GET /api/schemas` - Get all schemas (with query filters: id, schemaIds, tenantIds, summary, includeStatistics)
- `POST /api/schemas` - Create new schema(s)
- `GET /api/schemas/{schema-id}` - Get specific schema by ID
- `PUT /api/schemas/{schema-id}` - Update schema
- `DELETE /api/schemas/{schema-id}` - Delete schema (with ?hardDelete=true option)
- `POST /api/schemas/clear-cache` - Clear schema cache

**Relations Routes**
- `GET /api/relations` - Query relations (with filters: schema, id, direction, sourceSchema, targetSchema, relationTypeId, etc.)
- `POST /api/relations` - Create new relation
- `GET /api/relations/{id}` - Get relation by ID
- `PUT /api/relations/{id}` - Update relation
- `DELETE /api/relations/{id}` - Delete relation

#### Authentication & Authorization

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/token/refresh` - Refresh access token
- `GET /api/auth/token/validate` - Validate token
- `POST /api/auth/password/reset` - Request password reset
- `POST /api/auth/password/change` - Change password
- `POST /api/auth/2fa/generate` - Generate 2FA code
- `POST /api/auth/2fa/validate` - Validate 2FA code
- `GET /api/auth/middleware-config` - Get middleware configuration

#### Chat & AI

**Chat Routes**
- `GET /api/chat` - Get all chats for authenticated user (deprecated, use POST)
- `POST /api/chat` - Get all chats or create new chat
- `GET /api/chat/{chat-id}` - Get chat by ID (with pagination)
- `PUT /api/chat/{chat-id}` - Update chat (title, selectedAgentId)
- `DELETE /api/chat/{chat-id}` - Delete chat
- `GET /api/chat/{chat-id}/messages` - Get chat messages (with pagination)
- `POST /api/chat/{chat-id}/messages` - Add message to chat
- `GET /api/chat/{chat-id}/todos` - Get todos for chat
- `POST /api/chat/{chat-id}/execute-todos` - Execute all todos in chat
- `POST /api/chat/{chat-id}/execute-todo/{todo-id}` - Execute specific todo
- `POST /api/chat/orchestrate` - Orchestrate chat with AI agents

**AI Builder Routes**
- `GET /api/ai-builder/{agent-id}` - Get AI builder agent configuration
- `POST /api/ai-builder/{agent-id}` - Update AI builder agent

**AI Agents Routes**
- `GET /api/ai-agents` - Get all AI agents
- `POST /api/ai-agents` - Create AI agent
- `GET /api/ai-agents/{agent-id}` - Get AI agent by ID
- `PUT /api/ai-agents/{agent-id}` - Update AI agent
- `DELETE /api/ai-agents/{agent-id}` - Delete AI agent

**AI Prompts Routes**
- `GET /api/ai-prompts` - Get AI prompts (with filters: username, aiAgent, startDate, endDate, search)
- `POST /api/ai-prompts` - Create AI prompt record
- `GET /api/ai-prompts/{id}` - Get AI prompt by ID
- `PUT /api/ai-prompts/{id}` - Update AI prompt
- `DELETE /api/ai-prompts/{id}` - Delete AI prompt

**AI Models Routes**
- `GET /api/ai-models` - Get available AI models

#### Dashboard & Analytics

- `GET /api/dashboard` - Get dashboard metrics
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/kpi-cards` - Get KPI cards data
- `GET /api/dashboard/kpi-lists` - Get KPI lists data
- `GET /api/dashboard/spend-analysis` - Get spend analysis data
- `GET /api/dashboard/performance-metrics` - Get performance metrics

#### Builder & Configuration

**Builder Routes**
- `GET /api/builders` - Get all builders
- `POST /api/builders` - Create builder
- `GET /api/builders/{id}` - Get builder by ID
- `PUT /api/builders/{id}` - Update builder
- `DELETE /api/builders/{id}` - Delete builder
- `GET /api/builders/versions` - Get all builder versions
- `POST /api/builders/versions` - Create builder version

#### Graph & Visualization

- `GET /api/graph` - Get graph data (with filters: includedSchemaIds, excludedSchemaIds)
- `POST /api/graph` - Create new graph
- `GET /api/graph/{graphId}` - Get graph by ID
- `PUT /api/graph/{graphId}` - Update graph
- `DELETE /api/graph/{graphId}` - Delete graph

#### Email Templates

- `GET /api/email-templates` - Get all email templates
- `POST /api/email-templates` - Create email template
- `GET /api/email-templates/{id}` - Get email template by ID
- `PUT /api/email-templates/{id}` - Update email template
- `DELETE /api/email-templates/{id}` - Delete email template
- `GET /api/email-templates/{id}/content` - Get email template content
- `PUT /api/email-templates/{id}/content` - Update email template content
- `POST /api/email-templates/send` - Send email template

#### Engagements (notifications, discussions, stickies, todos)

- `GET /api/engagements/notifications` - List notification-type engagements
- `POST /api/engagements/notifications` - Create notification
- `GET /api/engagements/discussion` - List discussions (same pattern for `sticky`, `todo`)
- `POST /api/engagements/discussion` - Create discussion
- `GET /api/engagements/{id}` - Get engagement by ID
- `PUT /api/engagements/{id}` - Update engagement
- `DELETE /api/engagements/{id}` - Soft-delete engagement
- `GET /api/engagement-groups` - List engagement groups
- `POST /api/engagement-groups` - Create group
- `GET /api/engagement-interactions` - List interactions (e.g. read/ack state)
- `POST /api/engagement-interactions` - Upsert interaction (mark read, acknowledge)
- `GET /api/data/{schema-id}/{id}/engagements/{type}` - List engagements for a record (type: notification, discussion, sticky, todo)
- `POST /api/data/{schema-id}/{id}/engagements/{type}` - Create engagement scoped to that record

#### Media & Assets

**Images**
- `GET /api/images/{filename}` - Get image by filename
- `POST /api/images/save` - Save uploaded image

**Videos**
- `GET /api/videos` - Get all videos
- `POST /api/videos` - Create video
- `GET /api/videos/{videoId}` - Get video by ID
- `PUT /api/videos/{videoId}` - Update video
- `DELETE /api/videos/{videoId}` - Delete video
- `GET /api/videos/{videoId}/content` - Get video content

**Avatars**
- `GET /api/avatars/{filename}` - Get avatar by filename

#### Integrations

- `GET /api/integrations` - Get all integrations
- `POST /api/integrations` - Create integration
- `GET /api/integrations/lucide-icons` - Get Lucide icons
- `POST /api/integrations/lucide-icons/sync` - Sync Lucide icons
- `POST /api/integrations/sync` - Sync integrations

#### System & Utilities

- `GET /api/health` - Health check
- `GET /api/health/proxy` - Proxy health check
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update application settings
- `GET /api/ui/components` - Get UI components registry
- `GET /api/docs/swagger` - Get Swagger API documentation
- `POST /api/migrate/picker-fields` - Migrate picker fields
- `POST /api/git/pull-env` - Pull environment variables from Git
- `POST /api/git/sync-env` - Sync environment variables to Git

### Page Routes

#### Dynamic Entity Pages

- `GET /page/{schema-id}` - Dynamic entity list page for any schema
- `GET /page/{schema-id}/{data-id}` - Dynamic entity detail page
- `GET /page/{schema-id}/forbidden` - Forbidden page for schema
- `GET /page/{schema-id}/{data-id}/forbidden` - Forbidden page for entity

#### Authentication Pages

- `GET /authentication/login` - Login page
- `GET /authentication/sign-up` - Sign up page
- `GET /authentication/reset-password` - Reset password page
- `GET /authentication/change-password` - Change password page

#### Builder Pages

- `GET /builder` - Builder home page
- `GET /builder/schemas` - Schema builder list
- `GET /builder/schemas/{schema-id}` - Schema editor
- `GET /builder/relation-types` - Relation types list
- `GET /builder/relation-types/{relation-type-id}` - Relation type editor
- `GET /builder/companies` - Companies management
- `GET /builder/ai-agents` - AI agents list
- `GET /builder/ai-agents/{ai-agent-id}` - AI agent editor
- `GET /builder/graphs` - Graph designer list
- `GET /builder/email-templates` - Email templates list
- `GET /builder/pages` - Custom pages list
- `GET /builder/pages/{page-id}` - Custom page editor
- `GET /builder/versions` - Version management
- `GET /builder/business-rules` - Business rules management
- `GET /builder/health` - Builder health check

#### Chat & AI Pages

- `GET /chat` - Chat list page
- `GET /chat/{chat-id}` - Individual chat page
- `GET /ai-builder` - AI builder page
- `GET /ai-builder/{prompt-id}` - AI builder prompt page
- `GET /ai-prompts` - AI prompts history page

#### Dashboard & Analytics

- `GET /dashboard` - Main dashboard
- `GET /analytics` - Analytics page
- `GET /eqms-analytics` - EQMS analytics page

#### Integration Pages

- `GET /integrations` - Integrations list
- `GET /integrations/configure` - Configure integration
- `GET /integrations/sync` - Integration sync page

#### UI Components & Testing

- `GET /ui/components` - UI components showcase
- `GET /ui/components/{component-id}` - Individual component demo
- `GET /ui/components/permissions` - Permissions test page
- `GET /ui/components/data-grid` - Data grid component demo
- `GET /ui/components/data-grid/simple` - Simple data grid demo
- `GET /ui/components/graph-viewer` - Graph viewer demo
- `GET /ui/components/mermaid-viewer` - Mermaid viewer demo
- `GET /ui/components/video` - Video component demo
- `GET /ui/components/video/{videoId}` - Video player demo
- `GET /ui/components/markdown` - Markdown component demo

#### Other Pages

- `GET /` - Home page
- `GET /settings` - Settings page
- `GET /notifications` - Notifications page
- `GET /notifications/forbidden` - Notifications forbidden page
- `GET /calendar` - Calendar page
- `GET /profiles/{user-id}` - User profile page
- `GET /apps` - Apps page
- `GET /api-docs` - API documentation page
- `GET /forbidden` - Global forbidden page
- `GET /forms/embed` - Form embed page
- `GET /qr/generate` - QR code generator
- `GET /business-rules/test` - Business rules test page
- `GET /tests/third_party_form_usage_modal` - Third-party form test
- `GET /render/md/[...route]` - Dynamic markdown renderer
- `GET /custom-pages/{page-id}` - Custom page renderer

## Route Features

### Query Parameters for Data Routes

**GET /api/data/{schema-id}** supports:
- `search` - Search across text fields
- `status` - Filter by status
- `category` - Filter by category
- `tenantIds` - Filter by tenant IDs (required on non-localhost)
- `page` - Page number for pagination
- `limit` - Items per page
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc`

**GET /api/schemas** supports:
- `id` - Get specific schema by ID
- `schemaIds` - Get multiple schemas (comma-separated)
- `tenantIds` - Filter by tenant IDs (required on non-localhost)
- `summary` - Return summary version (excludes field definitions)
- `includeStatistics` - Include statistics (records count, size, etc.)

**GET /api/relations** supports:
- `schema` + `id` + `direction` - Get relations by entity (direction: 'source' | 'target' | 'both')
- `otherSchema` - Filter by the other schema
- `sourceSchema` + `sourceId` - Get relations by source (legacy)
- `targetSchema` + `targetId` - Get relations by target (legacy)
- `relationTypeId` - Filter by relation type
- `fieldId` - Filter by field ID
- `includeInactive` - Include inactive relations
- `resolveTargets` - Resolve target entity data (label, icon, color)

### Demo Mode vs Live Mode

The application supports two modes:

- **Demo Mode** (`NEXT_PUBLIC_DEMO_MODE=true`): Uses local data (e.g. `data/all-data.json`, `data/engagements.json`, engagement JSON files). All `/api/data/*` and engagement APIs (`/api/engagement-groups`, `/api/engagements/*`, `/api/engagement-interactions`, `/api/data/:schemaId/:id/engagements/*`) serve from local storage.
- **Live Mode** (`NEXT_PUBLIC_DEMO_MODE=false`): Proxies requests to external backends. Data CRUD uses `URL_DATA_CRUD`. Engagement APIs use `URL_ENGAGEMENTS_CRUD` when set, otherwise fall back to `URL_DATA_CRUD` (same backend can serve both).

Routes automatically detect the mode and handle proxying/fallback logic accordingly.

## Conclusion

This dynamic CRUD architecture provides a robust, scalable foundation for managing any type of entity in your application. By following domain-driven design principles and leveraging schema-based generation, you can focus on business logic instead of boilerplate code.

The comprehensive route system covers:
- ✅ Dynamic entity management (CRUD operations)
- ✅ Schema management and configuration
- ✅ Relations and graph visualization
- ✅ Authentication and authorization
- ✅ Chat and AI capabilities
- ✅ Dashboard and analytics
- ✅ Media and asset management
- ✅ Integration management
- ✅ Builder tools and configuration

All routes are automatically generated based on schema definitions, ensuring consistency and reducing boilerplate code across the application.
