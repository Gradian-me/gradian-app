## Field Role Management

This document explains how **field roles** are defined and used across the Gradian app schema system. Field roles allow you to semantically tag fields (e.g. title, status, avatar) so that list cards, detail pages, and other UI components can render them consistently without hard‑coding field names.

---

## 1. Where field roles are defined

### 1.1 `FormField.role` (schema model)

The primary definition of field roles lives on the `FormField` type:

- **Location**: `src/gradian-ui/schema-manager/types/form-schema.ts`
- **Property**: `FormField.role`
- **Allowed values** (as of this version):
  - `title`
  - `subtitle`
  - `description`
  - `image`
  - `avatar`
  - `icon`
  - `rating`
  - `badge`
  - `status`
  - `email`
  - `location`
  - `tel`
  - `duedate`
  - `code`
  - `color`
  - `person`
  - `entityType`

The `role` field is optional and can be left undefined for fields that do not participate in role‑based rendering.

### 1.2 `FormField.sourceColumnRoles` (external source mapping)

For picker fields that load data from an external API (`sourceUrl`), there is an additional mapping:

- **Location**: `src/gradian-ui/schema-manager/types/form-schema.ts`
- **Property**: `FormField.sourceColumnRoles?: Array<{ column: string; role?: string }>`

This allows you to map columns from the external data source to semantic roles (e.g. map `singular_name` to `title`, `description` to `description`).

---

## 2. Central role option list (builder UI)

The schema builder uses a central, typed list of roles to power the “Role” dropdown for each field.

- **Location**: `src/gradian-ui/schema-manager/utils/builder-utils.ts`
- **Export**: `ROLES`

`ROLES` is an array of `{ value, label, description, icon? }` that maps each allowed role value to:

- A human‑readable **label** (e.g. “Title”)
- A short **description** (e.g. “Primary heading”)
- (Optionally) an **icon** identifier

Whenever you add or deprecate a role in `FormField.role`, you should also update the `ROLES` list to keep the builder UI in sync.

---

## 3. Where roles are set in the UI

Field roles are assigned via the field editor in the schema builder.

- **Location**: `src/gradian-ui/schema-manager/components/FieldEditorContent.tsx`
- **Control**: `Select` named `field-role`
- **Options source**: `[ { value: '', label: 'None' }, ...ROLES ]`

Changing the selection here sets `field.role` on the schema. When the schema is saved, the chosen role is persisted to the schema JSON.

---

## 4. How roles are consumed at runtime

Field roles are primarily used by:

1. **Generic field lookup helpers** (role → field(s) / value(s))
2. **Data display components** (cards, detail pages, etc.)

### 4.1 Helper functions: `getFieldsByRole` and `getValueByRole`

- **Location**: `src/gradian-ui/form-builder/form-elements/utils/field-resolver.ts`

Key utilities:

- `getFieldsByRole(schema, role)`  
  Returns all fields in a schema whose `field.role === role`, sorted by `order`.

- `getValueByRole(schema, data, role)` / `getSingleValueByRole` / `getArrayValuesByRole`  
  These functions:
  - Look up role‑tagged fields in the schema
  - Read the corresponding values from the `data` record
  - Normalize and join values into a display‑ready string or array
  - Special‑case some component types (e.g. `select`, `picker`) to resolve labels from options or related schemas

These helpers are the **main mapping layer** from “semantic role” → “concrete value(s) for a given record”.

### 4.2 Card rendering: `DynamicCardRenderer`

- **Location**: `src/gradian-ui/data-display/components/DynamicCardRenderer.tsx`

This component uses field roles to determine what to show in list cards:

- Status:
  - Locates a field where `field.role === 'status'`
  - Uses `getArrayValuesByRole` / `getSingleValueByRole` and option metadata (`field.options`) to determine badge label and color
- Badges:
  - Uses `getFieldsByRole(schema, 'badge')` to collect all badge‑role fields
  - Merges their values and options into a combined badge view
- Other roles:
  - Checks for the presence of roles like `rating`, `entityType`, `duedate`, `code`, `avatar`, `icon`, `color`, `person`
  - Controls whether corresponding UI elements (avatars, icons, due date chips, etc.) are rendered on the card

In short, the card renderer does **not** hard‑code field names; it reacts to roles defined in the schema.

### 4.3 Detail rendering: `DynamicDetailPageRenderer`

- **Location**: `src/gradian-ui/data-display/components/DynamicDetailPageRenderer.tsx`

The detail page renderer relies on schema metadata (including roles) and the same field resolver utilities to:

- Build the record header (typically using `title`, `subtitle`, `avatar`, `badge` roles)
- Determine status, entity type, and related indicators
- Render related tables and quick actions

While the role checks in this component are more distributed, the underlying pattern is the same: roles drive which fields are surfaced in the UI.

---

## 5. Common role semantics

Below is the intended semantic meaning for the main roles:

- **`title`**: Primary display name for the record (used as card title and detail header).
- **`subtitle`**: Secondary text under the title (e.g. ID, short descriptor).
- **`description`**: Longer descriptive text; may appear in subtitles or detail sections.
- **`status`**: Status indicator (e.g. `Open`, `In Progress`, `Closed`); usually rendered as a colored badge.
- **`badge`**: Generic badge values (categories, tags, classifications) shown on cards and sometimes headers.
- **`code`**: Short identifier (e.g. order number) often rendered as a visual badge.
- **`avatar`**: Avatar image field (URL or picker) used for record or person thumbnail.
- **`icon`**: Icon identifier for the record.
- **`rating`**: Numeric or star rating used in visual rating widgets.
- **`person`**: Person/assignee field, often rendered as avatar + name.
- **`entityType`**: Entity type within a group (paired with `schema.entityTypeGroup` configuration).
- **`duedate`**: Due date or deadline; used for countdowns or timeline views.
- **`email`, `tel`, `location`**: Contact/geo fields that may be rendered as clickable links or structured data.
- **`color`**: Tailwind color key that influences styling (e.g. avatar/badge color).

---

## 6. Configuration guidelines and best practices

### 6.1 Choosing roles

- Prefer **one `title`** field per schema. If multiple fields share the `title` role, they are concatenated; this should be intentional.
- Use `subtitle` for secondary identifiers (e.g. “Order #123” under the human‑friendly title).
- Use `badge` roles liberally for categorizations and tags that should be visually surfaced.
- Keep `status` mapping consistent with your status group/entity type configurations to avoid conflicting indicators.

### 6.2 Avoiding conflicts

- Avoid assigning the **same role to many unrelated fields**; it can make card and detail views noisy.
- If a field is for internal logic only (not meant for primary UX), leave `role` undefined.
- For external sources (`sourceUrl`), use `sourceColumnRoles` carefully so that the correct column drives the correct role (e.g. avoid mapping both `title` and `description` to the same column unless you truly want that).

### 6.3 Adding new roles

If you need a new role:

1. **Update the type**: add the new literal to `FormField['role']` in `form-schema.ts`.
2. **Update the role list**: add a new entry to `ROLES` in `builder-utils.ts` with `value`, `label`, and `description`.
3. **Implement usage** (optional but recommended):
   - Extend `field-resolver` helpers if the role needs special resolution behavior.
   - Update `DynamicCardRenderer` / `DynamicDetailPageRenderer` (or other consumers) to react to the new role where appropriate.

Ensure any new role has a clear, documented semantic meaning so it is applied consistently across schemas.

---

## 7. Security, performance, and maintainability notes

- **Security**:
  - Roles are metadata, not executable logic; they should not be built from untrusted runtime input.
  - Be careful when mapping external source columns with `sourceColumnRoles`; validate schemas and avoid blindly trusting external payloads.
- **Performance**:
  - Role lookup helpers (`getFieldsByRole`, `getValueByRole`, etc.) are linear in the number of fields per schema, which is acceptable for typical form sizes.
  - Prefer using these helpers over ad‑hoc scans to keep logic centralized and avoid duplicate work.
- **DRY / Maintainability**:
  - Always use shared utilities (e.g. `getFieldsByRole`, `getValueByRole`) when implementing new UI that depends on roles.
  - Avoid hard‑coding field names; rely on roles where possible so schema changes require minimal UI changes.
  - Keep this document updated whenever you add, remove, or significantly change roles or their semantics.


