# Engagement APIs – NestJS Backend Implementation Guide

This document specifies all engagement-related API routes for implementation in a NestJS backend. It covers **engagement groups**, **engagements** (by type: notification, discussion, sticky, todo), **engagement interactions**, and **record-scoped engagements** (per schema/instance).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Domain Model & Types](#2-domain-model--types)
3. [Common Standards](#3-common-standards)
4. [Engagement Groups API](#4-engagement-groups-api)
5. [Engagements API (by type)](#5-engagements-api-by-type)
6. [Engagement by ID API](#6-engagement-by-id-api)
7. [Engagement Count API](#7-engagement-count-api)
8. [Engagement Interactions API](#8-engagement-interactions-api)
9. [Record-Scoped Engagements API](#9-record-scoped-engagements-api)
10. [Record-Scoped Engagement Count API](#10-record-scoped-engagement-count-api)
11. [Localization](#11-localization)
12. [Security & Validation](#12-security--validation)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. Overview

### Purpose

- **Engagement groups**: Containers for engagements tied to a reference (e.g. schema + instance), or global (no reference).
- **Engagements**: Items of type `notification` | `discussion` | `sticky` | `todo` with message, metadata, priority, and interaction type.
- **Engagement interactions**: Per-user state (read/ack) for engagements (e.g. `isRead`, `readAt`, `outputType`).

### Base Paths

| Base path | Description |
|-----------|-------------|
| `/api/engagement-groups` | CRUD for engagement groups |
| `/api/engagements/notifications` | List/create notifications (global or filtered) |
| `/api/engagements/discussion` | Same for discussion |
| `/api/engagements/sticky` | Same for sticky |
| `/api/engagements/todo` | Same for todo |
| `/api/engagements/notifications/count` | Count (e.g. unread) for notifications |
| `/api/engagements/:id` | Get/update/delete a single engagement |
| `/api/engagement-interactions` | List/create (upsert) interactions |
| `/api/engagement-interactions/:id` | Get/update one interaction |
| `/api/data/:schemaId/:id/engagements/:engagementType` | List/create engagements for a record |
| `/api/data/:schemaId/:id/engagements/:engagementType/count` | Count for a record’s engagement type |

### Response Format

All endpoints return the same envelope:

```typescript
{
  success: boolean;
  data?: T | T[];   // single resource or array
  error?: string;   // present when success === false
  message?: string; // optional human-readable success message
}
```

Use HTTP status: `200` (GET/PUT/DELETE success), `201` (POST create), `400` (validation), `401` (unauthorized), `404` (not found), `500` (server error).

---

## 2. Domain Model & Types

### TypeScript / NestJS DTOs

```typescript
// EngagementType – literal union
export type EngagementType = 'notification' | 'discussion' | 'sticky' | 'todo';

export type EngagementDisplayType = 'success' | 'info' | 'warning' | 'error';
export type EngagementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EngagementInteractionType = 'canRead' | 'needsAcknowledgement';
export type EngagementOutputType = 'approved' | 'rejected';

export interface EngagementGroup {
  id: string;
  referenceSchemaId?: string;
  referenceInstanceId?: string;
  title?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;   // ISO 8601
  updatedAt?: string;
  owners?: string[];
  members?: string[];
  viewers?: string[];
  deletedBy?: string;
  deletedAt?: string;  // set for soft delete
}

export interface Engagement {
  id: string;
  engagementGroupId?: string | null;
  engagementType: EngagementType;
  message: string;
  metadata?: Record<string, unknown>;
  priority?: EngagementPriority;
  type?: EngagementDisplayType;  // display variant (success/info/warning/error)
  interactionType: EngagementInteractionType;
  reactions?: unknown[];
  hashtags?: string[];
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  deletedAt?: string;
}

export interface EngagementInteraction {
  id: string;
  engagementId: string;
  userId: string;
  isRead: boolean;
  readAt?: string;
  dueDate?: string;
  interactedAt?: string;
  outputType?: EngagementOutputType;
  comment?: string;
}

/** Response shape when listing engagements with current user's interaction */
export interface EngagementWithInteraction extends Engagement {
  interaction?: EngagementInteraction | null;
}
```

### Validation Constants

- **EngagementType**: `['notification', 'discussion', 'sticky', 'todo']`
- **EngagementPriority**: `['low', 'medium', 'high', 'urgent']`
- **EngagementDisplayType**: `['success', 'info', 'warning', 'error']`
- **EngagementInteractionType**: `['canRead', 'needsAcknowledgement']`
- **EngagementOutputType**: `['approved', 'rejected']`

---

## 3. Common Standards

- **Auth**: All routes require authentication (e.g. JWT). Return `401` if missing/invalid.
- **Soft delete**: Engagement groups and engagements use `deletedAt` (and optionally `deletedBy`). List/GET endpoints must exclude soft-deleted records unless explicitly requested.
- **IDs**: Use URL path for resource id; support optional client-provided `id` in POST body for groups/engagements; otherwise generate (e.g. `eg-{timestamp}-{random}`, `e-{timestamp}-{random}`).
- **Locale**: Optional `Accept-Language` or query `locale` for translated `message`/`error` (see [Localization](#11-localization)).

---

## 4. Engagement Groups API

### GET `/api/engagement-groups`

List engagement groups (excluding soft-deleted).

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceSchemaId` | string | No | Filter by reference schema id |
| `referenceInstanceId` | string | No | Filter by reference instance id |

**Response** `200`

```json
{
  "success": true,
  "data": [ { "id": "...", "referenceSchemaId": "...", ... } ],
  "message": "Retrieved N engagement group(s)"
}
```

**Business logic**

- Load groups, filter out where `deletedAt` is set.
- If `referenceSchemaId` provided, filter by it; if `referenceInstanceId` provided, filter by it.
- Return array and optional translated message.

---

### POST `/api/engagement-groups`

Create an engagement group.

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | No | If omitted, server generates |
| referenceSchemaId | string | No | |
| referenceInstanceId | string | No | |
| title | string | No | |
| description | string | No | |
| createdBy | string | No | |
| createdAt | string | No | ISO 8601; default now |
| owners | string[] | No | Default [] |
| members | string[] | No | Default [] |
| viewers | string[] | No | Default [] |

**Response** `201`

```json
{
  "success": true,
  "data": { "id": "eg-...", ... },
  "message": "Engagement group created successfully"
}
```

---

### GET `/api/engagement-groups/:id`

Get one engagement group by id (exclude soft-deleted).

**Response** `200` – `data` is the group object.  
**Response** `404` – group not found or soft-deleted.

---

### PUT `/api/engagement-groups/:id`

Update an engagement group (only non-deleted).

**Body (JSON)** – any of: `title`, `description`, `owners`, `members`, `viewers`, `referenceSchemaId`, `referenceInstanceId`.  
Set `updatedAt` to current time.

**Response** `200` – `data` is updated group, `message` optional.  
**Response** `404` – group not found or soft-deleted.

---

### DELETE `/api/engagement-groups/:id`

Soft-delete an engagement group.

**Body (JSON)** – optional: `{ "deletedBy": "userId" }`.

**Response** `200` – `message` only (e.g. "Engagement group deleted successfully").  
**Response** `404` – group not found.

---

## 5. Engagements API (by type)

Same pattern for:

- `/api/engagements/notifications`
- `/api/engagements/discussion`
- `/api/engagements/sticky`
- `/api/engagements/todo`

Each route is bound to one `engagementType`.

### GET `/api/engagements/{notifications|discussion|sticky|todo}`

List engagements of that type (excluding soft-deleted). Optionally attach current user’s interaction when `currentUserId` is provided.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| currentUserId | string | No | If set, enrich each engagement with `interaction` for this user |
| engagementGroupId | string | No | Filter by group id |
| referenceSchemaId | string | No | Resolve group by reference and filter |
| referenceInstanceId | string | No | Same |
| search | string | No | Search in message and metadata.title |
| priority | string | No | One of EngagementPriority |
| type | string | No | One of EngagementDisplayType |
| sourceType | string | No | `createdByMe` \| `assignedToMe` (with currentUserId) |

**Response** `200`

```json
{
  "success": true,
  "data": [ { "id": "...", "message": "...", "interaction": { "isRead": true, ... } | null } ],
  "message": "Retrieved N notification(s)" // or discussion(s)/sticky(s)/todo(s)
}
```

**Business logic**

- List engagements: filter by `engagementType`, optional `engagementGroupId`, optional reference (schema + instance → group id), optional `search`, `priority`, `type`, `sourceType` (with currentUserId).
- Sort by `createdAt` descending.
- If `currentUserId` present, for each engagement load the interaction for that user and attach as `interaction` (or null). Return `EngagementWithInteraction[]`.

---

### POST `/api/engagements/{notifications|discussion|sticky|todo}`

Create an engagement of the fixed type. For notifications, `engagementGroupId` is typically null (global). For discussion/sticky/todo, body may include `engagementGroupId`.

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | No | Server-generated if omitted |
| message | string | Yes | Stored as-is; default "" if missing |
| metadata | object | No | Arbitrary key-value |
| priority | EngagementPriority | No | |
| type | EngagementDisplayType | No | |
| interactionType | EngagementInteractionType | No | Default `canRead` |
| reactions | array | No | |
| hashtags | string[] | No | |
| createdBy | string | No | |
| engagementGroupId | string | No | For discussion/sticky/todo |

**Response** `201`

```json
{
  "success": true,
  "data": { "id": "e-...", "engagementType": "notification", ... },
  "message": "Notification created successfully" // or Discussion/Sticky/Todo
}
```

**Validation**

- `priority` must be in `['low','medium','high','urgent']` if present.
- `type` must be in `['success','info','warning','error']` if present.
- `interactionType` must be in `['canRead','needsAcknowledgement']` if present; default `canRead`.

---

## 6. Engagement by ID API

### GET `/api/engagements/:id`

Return one engagement by id (exclude soft-deleted). No interaction enrichment.

**Response** `200` – `data` is the engagement.  
**Response** `404` – not found.

---

### PUT `/api/engagements/:id`

Update an engagement (only non-deleted).

**Body (JSON)** – any of: `message`, `metadata`, `priority`, `type`, `interactionType`, `reactions`, `hashtags`, `engagementGroupId`, `updatedBy`.  
Set `updatedAt` to now.

**Response** `200` – `data` updated engagement, `message` optional.  
**Response** `404` – not found.

---

### DELETE `/api/engagements/:id`

Soft-delete an engagement.

**Body (JSON)** – optional: `{ "deletedBy": "userId" }`. Set `deletedAt` (and optionally `deletedBy`).

**Response** `200` – `message` only.  
**Response** `404` – not found.

---

## 7. Engagement Count API

### GET `/api/engagements/notifications/count`

Return count of notifications matching filters. Used for badges without loading full list. When `currentUserId` and `isRead` are provided, count only engagements where the user’s interaction matches `isRead`.

**Query parameters**

Same as list (e.g. `engagementGroupId`, `referenceSchemaId`, `referenceInstanceId`, `search`, `priority`, `type`, `sourceType`), plus:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| currentUserId | string | No | Required for isRead filtering |
| isRead | string | No | `"true"` \| `"false"` – filter by user’s read state |

**Response** `200`

```json
{
  "success": true,
  "data": 5,
  "message": "Count: 5"
}
```

**Business logic**

- Reuse same listing filters as GET list (by type), then:
  - If `currentUserId` and `isRead` are set: resolve interactions for current user, filter engagements where `interaction.isRead === isRead`, return that count.
  - Else: return total count of filtered list.

---

## 8. Engagement Interactions API

### GET `/api/engagement-interactions`

List interactions. Require at least one of `engagementId` or `engagementIds` or effective “current user” so that results are scoped.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes* | User id (or derive from auth) |
| engagementId | string | No | Single engagement id |
| engagementIds | string | No | Comma-separated list of engagement ids |

\* If omitted, return `400` with message like "userId or current user required".

**Response** `200`

```json
{
  "success": true,
  "data": [ { "id": "...", "engagementId": "...", "userId": "...", "isRead": true, ... } ],
  "message": "Retrieved N interaction(s)"
}
```

**Business logic**

- If `engagementIds`: split by comma, trim, filter empty; return interactions for those engagements and the given userId.
- Else if `engagementId`: return interactions for that engagement and userId.
- Else: return all interactions for the userId.

---

### POST `/api/engagement-interactions`

Create or upsert an interaction (by engagementId + userId).

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| engagementId | string | Yes | |
| userId | string | Yes | |
| isRead | boolean | No | |
| readAt | string | No | ISO 8601 |
| interactedAt | string | No | ISO 8601 |
| outputType | EngagementOutputType | No | `approved` \| `rejected` |
| comment | string | No | |
| dueDate | string | No | |

**Response** `201`

```json
{
  "success": true,
  "data": { "id": "...", "engagementId": "...", "userId": "...", ... },
  "message": "Interaction created successfully"
}
```

**Response** `400` – missing `engagementId` or `userId` (e.g. "engagementId and userId are required").

**Business logic**

- Upsert: find interaction by (engagementId, userId); if exists update provided fields, else create. Return the saved interaction.

---

### GET `/api/engagement-interactions/:id`

Get one interaction by id.

**Response** `200` – `data` is the interaction.  
**Response** `404` – not found.

---

### PUT `/api/engagement-interactions/:id`

Update an interaction.

**Body (JSON)** – any of: `isRead`, `readAt`, `interactedAt`, `outputType`, `comment`, `dueDate`.

**Response** `200` – `data` updated interaction, `message` optional.  
**Response** `404` – not found.

---

## 9. Record-Scoped Engagements API

These routes are scoped to a specific record: `schemaId` + instance `id`, and optionally an engagement type. They use an engagement group per (schemaId, instanceId): get-or-create the group, then list/create engagements for that group.

### GET `/api/data/:schemaId/:id/engagements/:engagementType`

List engagements for the record’s group and the given type. Path `:engagementType` must be one of: `notification`, `discussion`, `sticky`, `todo`.

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| schemaId | string | Reference schema id |
| id | string | Reference instance id |
| engagementType | string | One of: notification, discussion, sticky, todo |

**Response** `200`

```json
{
  "success": true,
  "data": [ { "id": "...", "message": "...", ... } ],
  "message": "Retrieved N notification(s)" // or discussion(s)/sticky(s)/todo(s)
}
```

If there is no group for (schemaId, id), return `data: []` and message "Retrieved 0 …".

**Response** `404` – invalid `engagementType` (e.g. "Invalid engagement type: X. Must be one of notification, discussion, sticky, todo").

**Business logic**

- Resolve group by (schemaId, id). If no group, return empty array.
- List engagements with `engagementType` and `engagementGroupId === group.id`. No interaction enrichment in this route (unless you extend with currentUserId query param).

---

### POST `/api/data/:schemaId/:id/engagements/:engagementType`

Create an engagement of the given type for this record. Get-or-create the engagement group for (schemaId, id).

**Path parameters** – same as GET.

**Body (JSON)** – same as [POST engagements by type](#post-apiengagementsnotificationsdiscussionstickytodo); may include `createdBy`. Server sets `engagementGroupId` to the get-or-create group id.

**Response** `201`

```json
{
  "success": true,
  "data": { "id": "e-...", "engagementGroupId": "eg-...", ... },
  "message": "Notification created successfully" // or Discussion/Sticky/Todo
}
```

**Response** `404` – invalid `engagementType`.

**Business logic**

- Get or create group for (schemaId, id) (e.g. using createdBy for group creation).
- Create engagement with that group id and the path’s engagementType.

---

## 10. Record-Scoped Engagement Count API

### GET `/api/data/:schemaId/:id/engagements/:engagementType/count`

Return count of engagements for the record’s group and type. Optional filter by current user’s read state.

**Path parameters** – same as [Record-Scoped Engagements](#9-record-scoped-engagements-api).

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| currentUserId | string | No |
| isRead | string | No | `"true"` \| `"false"` |

**Response** `200`

```json
{
  "success": true,
  "data": 3,
  "message": "Count: 3"
}
```

If no group for (schemaId, id), return `data: 0`, `message`: "Count: 0".

**Response** `404` – invalid `engagementType`.

**Business logic**

- Resolve group; if none, return 0.
- Count engagements by type and group; if currentUserId and isRead provided, filter by user interaction isRead as in [Engagement Count API](#7-engagement-count-api).

---

## 11. Localization

- **Request**: Prefer locale from query `locale` (e.g. `en`, `fa`), else `Accept-Language` header. Parse to a single language code.
- **Response**: Use that locale to resolve `message` and `error` from a translation map (e.g. key-based). Placeholders like `{{count}}`, `{{id}}`, `{{type}}`, `{{value}}` can be replaced in the translated string.
- **Keys**: Maintain keys for at least: retrieved count messages, created/updated/deleted success, not found, fetch/create/update/delete failed, invalid type, count label, user/id required, interaction messages. See front-end constants (e.g. `API_ENGAGEMENT_*`) for key names.

---

## 12. Security & Validation

- **Authentication**: Protect all routes; return 401 when token is missing or invalid.
- **Authorization**: Apply tenant/user scoping where applicable (e.g. filter groups/engagements by tenant or visibility).
- **Input validation**:
  - Validate path params (schemaId, id, engagementType, numeric ids where applicable).
  - Validate query params (enum values for type, priority, sourceType, isRead).
  - Validate body (required fields, enum values, string length limits) and sanitize to avoid injection.
- **IDs**: Do not expose internal sequence ids if different from public id; use same id format as front (e.g. `eg-*`, `e-*`) for consistency.
- **Soft delete**: Never return deleted groups/engagements in list/GET unless a dedicated “deleted” view is required.

---

## 13. Implementation Checklist

- [ ] **Engagement groups**: GET list (with optional reference filters), POST, GET by id, PUT, DELETE (soft).
- [ ] **Engagements by type**: GET list (with filters + optional currentUserId enrichment), POST create for `notifications`, `discussion`, `sticky`, `todo`.
- [ ] **Engagements by id**: GET, PUT, DELETE (soft).
- [ ] **Notifications count**: GET with optional currentUserId + isRead → count.
- [ ] **Engagement interactions**: GET list (userId + engagementId/engagementIds), POST upsert, GET by id, PUT.
- [ ] **Record-scoped**: GET/POST `/api/data/:schemaId/:id/engagements/:engagementType` (get-or-create group, list/create).
- [ ] **Record-scoped count**: GET `/api/data/:schemaId/:id/engagements/:engagementType/count` with optional currentUserId, isRead.
- [ ] **Response envelope**: success, data, error, message on all routes.
- [ ] **Status codes**: 200, 201, 400, 401, 404, 500.
- [ ] **Validation**: Enums for type/priority/sourceType/isRead; required body/query fields.
- [ ] **Localization**: Optional locale, translated message/error.
- [ ] **Soft delete**: Groups and engagements use deletedAt/deletedBy; list/GET exclude deleted.

This completes the specification for implementing the engagement APIs in NestJS.
