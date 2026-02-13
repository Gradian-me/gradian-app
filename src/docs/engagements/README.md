# Engagements Documentation

Documentation for the **Engagements** domain: engagement groups, engagements (notifications, discussions, stickies, todos), and engagement interactions.

## Contents

| Document | Description |
|----------|-------------|
| [ENGAGEMENT_APIS_NESTJS.md](./ENGAGEMENT_APIS_NESTJS.md) | **NestJS backend implementation guide** – Full API specification for implementing engagement groups, engagements (by type and by id), engagement count, engagement interactions, and record-scoped engagements/count in a NestJS backend. Includes domain types, query/body parameters, response shapes, business logic, localization, security, and an implementation checklist. |

## Quick reference

- **Engagement groups**: CRUD at `/api/engagement-groups` (with optional reference filters; soft delete).
- **Engagements by type**: List/create at `/api/engagements/notifications`, `/discussion`, `/sticky`, `/todo`; count at `/api/engagements/notifications/count`.
- **Single engagement**: GET/PUT/DELETE at `/api/engagements/:id`.
- **Interactions**: List/upsert at `/api/engagement-interactions`; GET/PUT at `/api/engagement-interactions/:id`.
- **Record-scoped**: List/create at `/api/data/:schemaId/:id/engagements/:engagementType`; count at `.../engagements/:engagementType/count`.

All routes use the standard envelope: `{ success, data?, error?, message? }` and require authentication.
