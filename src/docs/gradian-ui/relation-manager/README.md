# Relation Manager

A domain module within Gradian UI for managing relation types in the application.

## Overview

The Relation Manager provides functionality to create, read, update, and delete relation types. Relation types define relationships between entities in the application, such as "HAS_INQUIRY_ITEM" which links inquiries to Tender Items.

## Features

- **CRUD Operations**: Full create, read, update, and delete functionality for relation types
- **Form Builder**: Intuitive form interface for managing relation type properties
- **Visual Editing**: Color picker and icon selection for visual customization
- **Search & Filter**: Built-in search functionality to find relation types quickly
- **Validation**: Client-side validation for required fields

## Structure

```
relation-manager/
├── components/           # React components
│   ├── RelationTypeForm.tsx      # Form for editing relation types
│   ├── RelationTypeEditor.tsx    # Main editor component
│   └── index.ts                  # Component exports
├── hooks/                # React hooks
│   └── useRelationManager.ts     # Main hook for state management
├── types/                # TypeScript types
│   └── index.ts                  # Type definitions
├── index.ts              # Main export file
└── README.md             # This file
```

## Usage

### Basic Import

```typescript
import { 
  RelationType, 
  useRelationManager,
  RelationTypeForm,
  RelationTypeEditor 
} from '@/gradian-ui/relation-manager';
```

### Relation Type Interface

```typescript
interface RelationType {
  id: string;              // Unique identifier (e.g., "HAS_INQUIRY_ITEM")
  label: string;           // Display name (e.g., "Has Inquiry Item")
  description: string;     // Detailed description
  color: string;           // Hex color code (e.g., "#4E79A7")
  icon: string;            // Icon name from Lucide React (e.g., "Basket")
}
```

### Using the Hook

```typescript
import { useRelationManager } from '@/gradian-ui/relation-manager';

function MyComponent() {
  const { state, actions } = useRelationManager({
    apiBaseUrl: '/api/relation-types'
  });

  useEffect(() => {
    actions.loadRelationType('HAS_INQUIRY_ITEM');
  }, []);

  return (
    <div>
      {state.loading && <Loader />}
      {state.relationType && (
        <RelationTypeForm 
          relationType={state.relationType}
          onChange={actions.updateRelationType}
        />
      )}
      <button onClick={() => actions.saveRelationType(state.relationType!)}>
        Save
      </button>
    </div>
  );
}
```

### Using the Editor Component

```typescript
import { RelationTypeEditor } from '@/gradian-ui/relation-manager';

function EditPage() {
  return (
    <RelationTypeEditor
      relationTypeId="HAS_INQUIRY_ITEM"
      onBack={() => router.push('/builder/relation-types')}
    />
  );
}
```

## API Routes

The relation types are managed through RESTful API routes:

- `GET /api/relation-types` - Get all relation types
- `GET /api/relation-types/:id` - Get a specific relation type
- `POST /api/relation-types` - Create a new relation type
- `PUT /api/relation-types/:id` - Update a relation type
- `DELETE /api/relation-types/:id` - Delete a relation type

## Data Storage

Relation types are stored in `data/all-relation-types.json` as JSON. The API routes provide caching and file-based persistence.

## Example

```json
{
  "id": "HAS_INQUIRY_ITEM",
  "label": "Has Inquiry Item",
  "description": "An inquiry contains one or more Tender Items.",
  "color": "#4E79A7",
  "icon": "Basket"
}
```

## Pages

- `/builder/relation-types` - List all relation types
- `/builder/relation-types/:id` - Edit a specific relation type

## Integration

This module follows the same patterns as the schema-manager, providing a consistent developer experience across Gradian UI.

