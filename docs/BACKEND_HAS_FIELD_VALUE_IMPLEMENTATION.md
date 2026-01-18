# Backend Implementation Guide: HAS_FIELD_VALUE Relations

This document shows the exact code logic your backend needs to implement to handle `HAS_FIELD_VALUE` relations when entities are created or updated.

## Overview

When a picker/select field is saved, you need to create relations with:
- `relationTypeId: "HAS_FIELD_VALUE"`
- `fieldId: "field-name"` (the field identifier)
- `sourceSchema`, `sourceId` (the entity being saved)
- `targetSchema`, `targetId` (the selected value)

## Step-by-Step Implementation

### 1. Identify Fields That Support Relations

Only these field components support `HAS_FIELD_VALUE` relations:
- `picker` (multi-select)
- `popup-picker`
- `select` (single-select)
- `checkbox-list` (multi-select)
- `radio` (single-select)
- `toggle-group` (single-select)

**Code Logic:**
```typescript
function shouldCreateFieldValueRelations(field: any): boolean {
  const component = field.component;
  const supportedComponents = [
    'picker',
    'popup-picker',
    'popuppicker',
    'popup-picker-input',
    'pickerinput',
    'select',
    'checkbox-list',
    'checkboxlist',
    'checkbox_list',
    'radio',
    'radio-group',
    'radiogroup',
    'toggle-group',
    'togglegroup',
  ];
  return supportedComponents.includes(component) && field.name;
}
```

### 2. Main Function: Sync Relations for Entity

This is the main function that creates relations. Call this **after** the entity is successfully created/updated:

```typescript
async function syncHasFieldValueRelationsForEntity(params: {
  schemaId: string;
  entity: any; // The saved entity with field values
}): Promise<DataRelation[]> {
  const { schemaId, entity } = params;

  if (!entity || !entity.id) {
    return [];
  }

  // Get the schema to access field definitions
  const schema = await getSchemaById(schemaId);
  const relations: DataRelation[] = [];

  // Find all fields that support HAS_FIELD_VALUE relations
  const relationFields = (schema.fields || []).filter(
    (field) => shouldCreateFieldValueRelations(field),
  );

  // Process each relation-supporting field
  for (const field of relationFields) {
    const fieldName = field.name as string;
    const fieldId = field.id || fieldName; // Extract fieldId
    
    // Get the field's target schema (where the picker points to)
    const rawTargetSchemaId = field.targetSchema as string | undefined;
    const sourceUrl = field.sourceUrl as string | undefined; // External URL
    const fieldOptions = field.options as Array<{ 
      id?: string; 
      label?: string; 
      value?: string; 
      icon?: string; 
      color?: string 
    }> | undefined;

    // Resolve dynamic targetSchema (e.g., "{{formData.resourceType}}")
    // Replace template variables with actual values from entity
    const targetSchemaId = rawTargetSchemaId 
      ? replaceDynamicContext(rawTargetSchemaId, { formSchema: schema, formData: entity })
      : undefined;

    // Get the field value from the entity
    const rawValue = entity[fieldName];
    
    // Normalize value to array (handles both single and multi-select)
    let options: Array<any> = [];
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      options = [];
    } else if (Array.isArray(rawValue)) {
      options = rawValue; // Already an array
    } else {
      options = [rawValue]; // Single value - wrap in array
    }

    // Build target list for relations
    const targets: Array<{ targetSchema: string; targetId: string }> = [];

    for (const option of options) {
      if (option === null || option === undefined) continue;

      // Case 1: Internal schema-based picker (targetSchema is defined)
      if (targetSchemaId) {
        if (typeof option === 'string' || typeof option === 'number') {
          targets.push({
            targetSchema: targetSchemaId,
            targetId: String(option),
          });
        } else if (typeof option === 'object') {
          const id = option.id ?? option.value;
          if (id) {
            targets.push({
              targetSchema: targetSchemaId,
              targetId: String(id),
            });
          }
        }
      }
      // Case 2: External URL-based picker (sourceUrl is defined)
      else if (sourceUrl) {
        // Map to external_nodes schema
        if (typeof option === 'object') {
          // Create or get external node
          const externalNode = upsertExternalNodeFromOption({
            sourceUrl,
            option: {
              id: option.id,
              label: option.label,
              icon: option.icon,
              color: option.color,
              metadata: option.metadata,
            },
          });
          targets.push({
            targetSchema: 'external_nodes',
            targetId: externalNode.id,
          });
        } else {
          // Primitive value - create minimal external node
          const externalNode = upsertExternalNodeFromOption({
            sourceUrl,
            option: {
              id: option,
              label: String(option),
            },
          });
          targets.push({
            targetSchema: 'external_nodes',
            targetId: externalNode.id,
          });
        }
      }
      // Case 3: Field has static options (fieldOptions is defined)
      else if (fieldOptions && Array.isArray(fieldOptions) && fieldOptions.length > 0) {
        let optionId: string | undefined;
        
        if (typeof option === 'string' || typeof option === 'number') {
          const foundOption = fieldOptions.find(
            (opt) => opt.id === String(option) || opt.value === String(option)
          );
          optionId = foundOption?.id || foundOption?.value || String(option);
        } else if (typeof option === 'object' && option !== null) {
          optionId = option.id ?? option.value ?? String(option);
        }

        if (optionId) {
          // Create external node for static option
          const externalNode = upsertExternalNodeFromOption({
            sourceUrl: `field-options:${schemaId}:${fieldId}`,
            option: {
              id: optionId,
              label: foundOption?.label || optionId,
              icon: foundOption?.icon,
              color: foundOption?.color,
            },
          });
          targets.push({
            targetSchema: 'external_nodes',
            targetId: externalNode.id,
          });
        }
      }
    }

    // Create/update relations for this field
    if (targets.length > 0 || (targets.length === 0 && fieldId)) {
      const fieldRelations = upsertFieldValueRelations({
        sourceSchema: schemaId,
        sourceId: String(entity.id),
        relationTypeId: 'HAS_FIELD_VALUE',
        fieldId,
        targets,
      });
      relations.push(...fieldRelations);
    }
  }

  return relations;
}
```

### 3. Upsert Relations Function

This function creates new relations and marks old ones as inactive:

```typescript
function upsertFieldValueRelations(params: {
  sourceSchema: string;
  sourceId: string;
  relationTypeId: string;
  fieldId: string;
  targets: Array<{ targetSchema: string; targetId: string }>;
}): DataRelation[] {
  const { sourceSchema, sourceId, relationTypeId, fieldId, targets } = params;

  const now = new Date().toISOString();

  // Find existing relations for this field on this entity
  const existingForField = getAllRelations().filter(
    (r) =>
      r.sourceSchema === sourceSchema &&
      r.sourceId === sourceId &&
      r.relationTypeId === relationTypeId &&
      r.fieldId === fieldId,
  );

  // Create a key for comparing targets
  const targetKey = (t: { targetSchema: string; targetId: string }) => 
    `${t.targetSchema}::${t.targetId}`;
  const newTargetKeys = new Set(targets.map(targetKey));

  // Update existing relations: mark as inactive if no longer selected
  const updatedRelations = getAllRelations().map((relation) => {
    if (
      relation.sourceSchema === sourceSchema &&
      relation.sourceId === sourceId &&
      relation.relationTypeId === relationTypeId &&
      relation.fieldId === fieldId
    ) {
      const key = targetKey({ 
        targetSchema: relation.targetSchema, 
        targetId: relation.targetId 
      });
      const isStillSelected = newTargetKeys.has(key);

      return {
        ...relation,
        inactive: !isStillSelected ? true : undefined, // Mark inactive if removed
        updatedAt: now,
      };
    }
    return relation;
  });

  // Create relations for new targets that don't exist yet
  const existingKeys = new Set(
    existingForField.map((r) => 
      targetKey({ targetSchema: r.targetSchema, targetId: r.targetId })
    ),
  );

  const newRelations: DataRelation[] = targets
    .filter((t) => !existingKeys.has(targetKey(t)))
    .map((t) => ({
      id: generateId(), // Use your ID generation (ULID, UUID, etc.)
      sourceSchema,
      sourceId,
      targetSchema: t.targetSchema,
      targetId: t.targetId,
      relationTypeId,
      fieldId, // ⚠️ IMPORTANT: Include fieldId
      inactive: undefined,
      createdAt: now,
      updatedAt: now,
    }));

  // Save all relations (updated + new)
  const allRelations = [...updatedRelations, ...newRelations];
  saveAllRelations(allRelations);

  // Return only relations for this field
  return allRelations.filter(
    (r) =>
      r.sourceSchema === sourceSchema &&
      r.sourceId === sourceId &&
      r.relationTypeId === relationTypeId &&
      r.fieldId === fieldId,
  );
}
```

### 4. Integration Point: After Entity Create/Update

Call the sync function **after** successfully creating or updating an entity:

```typescript
// After entity is created
async function createEntity(schemaId: string, entityData: any) {
  // 1. Create the entity
  const createdEntity = await yourDatabase.create(schemaId, entityData);
  
  // 2. Sync HAS_FIELD_VALUE relations
  if (createdEntity && createdEntity.id) {
    await syncHasFieldValueRelationsForEntity({
      schemaId,
      entity: createdEntity, // Entity with field values
    });
  }
  
  return createdEntity;
}

// After entity is updated
async function updateEntity(schemaId: string, entityId: string, entityData: any) {
  // 1. Update the entity
  const updatedEntity = await yourDatabase.update(schemaId, entityId, entityData);
  
  // 2. Sync HAS_FIELD_VALUE relations
  if (updatedEntity) {
    await syncHasFieldValueRelationsForEntity({
      schemaId,
      entity: updatedEntity, // Entity with updated field values
    });
  }
  
  return updatedEntity;
}
```

## Relation Object Structure

Each relation should have this structure:

```typescript
interface DataRelation {
  id: string;                    // Unique relation ID
  sourceSchema: string;          // Schema of the entity with the field
  sourceId: string;              // ID of the entity with the field
  targetSchema: string;          // Schema of the selected value
  targetId: string;              // ID of the selected value
  relationTypeId: "HAS_FIELD_VALUE"; // Always this value
  fieldId?: string;              // ⚠️ REQUIRED: Field identifier (field.id || field.name)
  inactive?: boolean;            // Soft-delete flag (true if relation was removed)
  createdAt?: string;            // ISO timestamp
  updatedAt?: string;            // ISO timestamp
}
```

## Example

Given this entity:
```json
{
  "id": "entity-123",
  "resource": ["query-1", "query-2"],  // Picker field
  "status": "active"                    // Regular field
}
```

And this schema field:
```json
{
  "id": "field-resource-id",
  "name": "resource",
  "component": "picker",
  "targetSchema": "dynamic-queries"
}
```

The function will create:
```json
[
  {
    "id": "rel-1",
    "sourceSchema": "app-permissions",
    "sourceId": "entity-123",
    "targetSchema": "dynamic-queries",
    "targetId": "query-1",
    "relationTypeId": "HAS_FIELD_VALUE",
    "fieldId": "field-resource-id"
  },
  {
    "id": "rel-2",
    "sourceSchema": "app-permissions",
    "sourceId": "entity-123",
    "targetSchema": "dynamic-queries",
    "targetId": "query-2",
    "relationTypeId": "HAS_FIELD_VALUE",
    "fieldId": "field-resource-id"
  }
]
```

## Key Points

1. **fieldId is critical**: Always include `fieldId` in relations (use `field.id || field.name`)
2. **Handle arrays**: Picker fields can have multiple values (array)
3. **Mark inactive**: When a value is removed, mark the relation as `inactive: true` instead of deleting
4. **Support three target types**:
   - Internal schema (`targetSchema` defined)
   - External URL (`sourceUrl` defined → map to `external_nodes`)
   - Static options (`fieldOptions` defined → map to `external_nodes`)
5. **Call after save**: Always call sync function after entity is successfully saved

## Testing

Test with:
- Single-select fields (select, radio, toggle-group)
- Multi-select fields (picker, checkbox-list)
- Empty/null values (should clear relations)
- Value changes (should update relations, mark old ones inactive)

