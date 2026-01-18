# HAS_FIELD_VALUE Relations Flow

This document describes how `fieldId` and `relationTypeId: "HAS_FIELD_VALUE"` are handled in the system.

## Example Relation

```json
{
  "id": "01KE4NYEQWP6RFBHX5R7WAHY65",
  "sourceSchema": "app-permissions",
  "sourceId": "01KE4KZBHWTJPYC96EKDFFNZC1",
  "targetSchema": "dynamic-queries",
  "targetId": "01KDT7XAH1V7CKTPKZFA5VC6H3",
  "relationTypeId": "HAS_FIELD_VALUE",
  "fieldId": "resource",
  "createdAt": "2026-01-04T14:17:58.267Z",
  "updatedAt": "2026-01-04T14:34:54.664Z"
}
```

## Flow Diagram

```mermaid
flowchart TD
    Start([User Submits Form]) --> CheckFields{Check Field Component}
    
    CheckFields -->|picker, select, checkbox-list, radio, toggle-group| ExtractFieldId[Extract fieldId:<br/>field.id || field.name]
    CheckFields -->|Other components| Skip[Skip - No HAS_FIELD_VALUE]
    
    ExtractFieldId --> GetFieldValue[Get field value from entity<br/>entity[fieldName]]
    GetFieldValue --> NormalizeValue{Normalize Value}
    
    NormalizeValue -->|Single value| WrapArray[Wrap in array]
    NormalizeValue -->|Already array| UseArray[Use as-is]
    NormalizeValue -->|null/undefined| EmptyArray[Empty array]
    
    WrapArray --> BuildTargets[Build target list]
    UseArray --> BuildTargets
    EmptyArray --> BuildTargets
    
    BuildTargets --> ResolveTarget{Resolve Target Schema}
    
    ResolveTarget -->|targetSchema defined| InternalSchema[Internal Schema Target]
    ResolveTarget -->|sourceUrl defined| ExternalURL[External URL → external_nodes]
    ResolveTarget -->|fieldOptions defined| FieldOptions[Field Options → external_nodes]
    
    InternalSchema --> CreateTargets[Create targets:<br/>targetSchema, targetId]
    ExternalURL --> CreateTargets
    FieldOptions --> CreateTargets
    
    CreateTargets --> UpsertRelations[upsertFieldValueRelations]
    
    UpsertRelations --> FindExisting[Find existing relations:<br/>sourceSchema, sourceId,<br/>relationTypeId: HAS_FIELD_VALUE,<br/>fieldId]
    
    FindExisting --> CompareTargets{Compare Targets}
    
    CompareTargets -->|Target still selected| MarkActive[Mark relation as active<br/>inactive: undefined]
    CompareTargets -->|Target removed| MarkInactive[Mark relation as inactive<br/>inactive: true]
    CompareTargets -->|New target| CreateNew[Create new relation with:<br/>- fieldId<br/>- relationTypeId: HAS_FIELD_VALUE<br/>- sourceSchema, sourceId<br/>- targetSchema, targetId]
    
    MarkActive --> SaveRelations[Save to all-data-relations.json]
    MarkInactive --> SaveRelations
    CreateNew --> SaveRelations
    
    SaveRelations --> EndCreate([Relations Created])
    
    %% Retrieval Flow
    StartRetrieve([Load Entity for Edit/Display]) --> FetchRelations[GET /api/relations?<br/>sourceSchema=X<br/>sourceId=Y<br/>relationTypeId=HAS_FIELD_VALUE<br/>resolveTargets=true]
    
    FetchRelations --> FilterByFieldId{Filter by fieldId?}
    FilterByFieldId -->|fieldId param provided| FilterRelations[Filter relations where<br/>r.fieldId === fieldId]
    FilterByFieldId -->|No fieldId param| AllRelations[Get all HAS_FIELD_VALUE relations]
    
    FilterRelations --> GroupByFieldId[Group relations by fieldId]
    AllRelations --> GroupByFieldId
    
    GroupByFieldId --> MatchFields[Match relations to form fields]
    
    MatchFields --> MatchStrategy1{Strategy 1:<br/>Direct fieldId match?}
    MatchStrategy1 -->|Match| UseRelations1[Use relations]
    MatchStrategy1 -->|No match| MatchStrategy2{Strategy 2:<br/>fieldId === field.name?}
    
    MatchStrategy2 -->|Match| UseRelations2[Use relations]
    MatchStrategy2 -->|No match| MatchStrategy3{Strategy 3:<br/>fieldId contains field.name?}
    
    MatchStrategy3 -->|Match| UseRelations3[Use relations]
    MatchStrategy3 -->|No match| MatchStrategy4{Strategy 4:<br/>fieldId ends with<br/>-fieldName or _fieldName?}
    
    MatchStrategy4 -->|Match| UseRelations4[Use relations]
    MatchStrategy4 -->|No match| NoRelations[No relations found<br/>Use entity stored values]
    
    UseRelations1 --> EnrichTargets[Enrich target data:<br/>- Fetch target entities<br/>- Extract label, icon, color<br/>- Include metadata if available]
    UseRelations2 --> EnrichTargets
    UseRelations3 --> EnrichTargets
    UseRelations4 --> EnrichTargets
    
    EnrichTargets --> CheckComponentType{Component Type?}
    
    CheckComponentType -->|picker, checkbox-list<br/>Multi-select| ArrayValue[Set field value as array:<br/>[{id, label, icon, color, metadata}, ...]]
    CheckComponentType -->|select, radio, toggle-group<br/>Single-select| SingleValue[Set field value as single:<br/>{id, label, icon, color, metadata}<br/>or null]
    
    ArrayValue --> PopulateForm[Populate form fields]
    SingleValue --> PopulateForm
    NoRelations --> PopulateForm
    
    PopulateForm --> EndRetrieve([Entity Ready for Display])
    
    %% Styling
    classDef creationFlow fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef retrievalFlow fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef decision fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    
    class Start,CheckFields,ExtractFieldId,GetFieldValue,NormalizeValue,WrapArray,UseArray,EmptyArray,BuildTargets,ResolveTarget,InternalSchema,ExternalURL,FieldOptions,CreateTargets,UpsertRelations,FindExisting,CompareTargets,MarkActive,MarkInactive,CreateNew,SaveRelations,EndCreate creationFlow
    class StartRetrieve,FetchRelations,FilterByFieldId,FilterRelations,AllRelations,GroupByFieldId,MatchFields,MatchStrategy1,MatchStrategy2,MatchStrategy3,MatchStrategy4,UseRelations1,UseRelations2,UseRelations3,UseRelations4,NoRelations,EnrichTargets,CheckComponentType,ArrayValue,SingleValue,PopulateForm,EndRetrieve retrievalFlow
    class CheckFields,NormalizeValue,ResolveTarget,CompareTargets,FilterByFieldId,MatchStrategy1,MatchStrategy2,MatchStrategy3,MatchStrategy4,CheckComponentType decision
    class ExtractFieldId,GetFieldValue,WrapArray,UseArray,EmptyArray,BuildTargets,CreateTargets,UpsertRelations,FindExisting,MarkActive,MarkInactive,CreateNew,SaveRelations,GroupByFieldId,EnrichTargets,PopulateForm process
```

## Key Components

### 1. Field ID Extraction
- **Location**: `field-value-relations.util.ts:188`
- **Logic**: `fieldId = field.id || fieldName`
- **Purpose**: Identifies which form field the relation belongs to

### 2. Relation Creation
- **Function**: `syncHasFieldValueRelationsForEntity()`
- **Location**: `field-value-relations.util.ts:168-340`
- **Process**:
  1. Find all relation-supporting fields (picker, select, checkbox-list, radio, toggle-group)
  2. Extract fieldId for each field
  3. Normalize field values to array format
  4. Resolve target schema (internal, external URL, or field options)
  5. Build target list
  6. Call `upsertFieldValueRelations()` with fieldId

### 3. Relation Storage
- **Function**: `upsertFieldValueRelations()`
- **Location**: `relations-storage.util.ts:95-173`
- **Key Logic**:
  - Finds existing relations by: `sourceSchema`, `sourceId`, `relationTypeId`, `fieldId`
  - Marks removed targets as `inactive: true`
  - Creates new relations for new targets
  - All relations include `fieldId` for matching

### 4. Relation Retrieval
- **API Endpoint**: `GET /api/relations`
- **Location**: `api/relations/route.ts:37-265`
- **Query Parameters**:
  - `sourceSchema`, `sourceId`: Filter by source entity
  - `relationTypeId: HAS_FIELD_VALUE`: Filter by relation type
  - `fieldId`: Optional filter by specific field
  - `resolveTargets: true`: Enrich with target data (label, icon, color)

### 5. Field Matching Strategies
- **Location**: `field-value-relations.util.ts:494-521` and `use-form-modal.ts:127-132`
- **Strategies** (in order):
  1. Direct `fieldId` match: `rel.fieldId === fieldId`
  2. Field name match: `rel.fieldId === fieldName`
  3. Field name mapping: Check if fieldId contains field name
  4. Partial matching: `fieldId.endsWith('-fieldName')` or `fieldId.includes(fieldName)`

### 6. Entity Enrichment
- **Function**: `enrichEntityPickerFieldsFromRelations()`
- **Location**: `field-value-relations.util.ts:347-630`
- **Process**:
  1. Fetch all HAS_FIELD_VALUE relations for entity
  2. Group by fieldId
  3. Match relations to fields using multiple strategies
  4. Enrich target data (fetch entities, extract label/icon/color)
  5. Set field values based on component type (single vs multi-select)

## Supported Field Components

- `picker` (multi-select)
- `popup-picker`
- `select` (single-select)
- `checkbox-list` (multi-select)
- `radio` (single-select)
- `toggle-group` (single-select)

## Relation Structure

```typescript
interface DataRelation {
  id: string;
  sourceSchema: string;      // Schema of the entity with the field
  sourceId: string;          // ID of the entity with the field
  targetSchema: string;      // Schema of the selected value
  targetId: string;          // ID of the selected value
  relationTypeId: "HAS_FIELD_VALUE";
  fieldId?: string;          // Field identifier (field.id || field.name)
  inactive?: boolean;        // Soft-delete flag
  createdAt?: string;
  updatedAt?: string;
}
```

## Use Cases

1. **Form Submission**: When a user selects values in a picker/select field, relations are created linking the entity to the selected values
2. **Form Edit**: When loading an entity for editing, relations are fetched and used to populate picker fields with full data (label, icon, color)
3. **Table Display**: Relations are used to enrich picker field values in table views
4. **Data Integrity**: Relations maintain referential integrity even when field values are removed from entities

## Backend Mode vs Demo Mode

### ⚠️ Important: Backend Mode Limitation

**Current Behavior:**
- **Demo Mode** (`isDemoModeEnabled() === true`): Frontend creates and manages `HAS_FIELD_VALUE` relations locally
- **Backend Mode** (`isDemoModeEnabled() === false`): Frontend proxies to backend and **DOES NOT** create `HAS_FIELD_VALUE` relations

**Code Locations:**
- `src/app/api/data/[schema-id]/route.ts:502` - Only syncs relations in demo mode
- `src/app/api/data/[schema-id]/[id]/route.ts:415` - Only syncs relations in demo mode

**Problem:**
If your backend doesn't handle `HAS_FIELD_VALUE` relations, picker fields won't work correctly in backend mode because:
1. Relations are not created when entities are saved
2. Relations are not available when loading entities for editing
3. Picker fields will appear empty or show only IDs without labels/icons

**Solutions:**

1. **Backend Should Handle Relations** (Recommended):
   - Backend must create `HAS_FIELD_VALUE` relations when entities are created/updated
   - Backend must support `fieldId` field in relation objects
   - Backend must return relations when queried: `GET /api/relations?relationTypeId=HAS_FIELD_VALUE&sourceSchema=X&sourceId=Y`
   - Backend must support `resolveTargets=true` parameter to enrich relations with target data

2. **Frontend Fallback** (Not Recommended):
   - Modify frontend to also create relations in backend mode
   - This requires syncing relations to backend or storing locally (may cause sync issues)

**Backend Requirements:**
- Accept `fieldId` in relation creation: `POST /api/relations` with body containing `fieldId`
- Filter by `fieldId` in queries: `GET /api/relations?fieldId=resource`
- Support `HAS_FIELD_VALUE` relation type
- Create relations automatically when picker fields are saved (or provide endpoint to sync relations)

