# Graph API: External Nodes Handling

This document describes how external nodes are handled in the `/api/graph` endpoint.

## Overview

External nodes represent data from external sources (APIs, field options, etc.) that are referenced in relations but don't belong to internal schemas. They are stored in `data/all-data.json` under the `external_nodes` key and have the schema ID `external_nodes`.

## External Node Structure

External nodes follow this structure:

```typescript
interface ExternalNode {
  id: string;              // Unique identifier (often from external source)
  label?: string;           // Display label
  color?: string;           // Color for visualization
  icon?: string;            // Icon name (Lucide icon)
  sourceUrl: string;        // Source identifier (e.g., "field-options:users:authentication-type")
  extraPayload?: any;       // Additional metadata from external source
}
```

## Storage Location

External nodes are stored in:
- **File**: `data/all-data.json`
- **Key**: `external_nodes` (array of ExternalNode objects)
- **Schema ID**: `external_nodes`

## How External Nodes Are Used

### 1. In Relations

External nodes are commonly used as **targets** in `HAS_FIELD_VALUE` relations:

```json
{
  "id": "01KE4BXSPSKP464XAMA1H9PSJ0",
  "sourceSchema": "user-roles",
  "sourceId": "01KB9YC60QXPW8XNMTE151YCY0",
  "targetSchema": "external_nodes",
  "targetId": "VENDOR",
  "relationTypeId": "HAS_FIELD_VALUE",
  "fieldId": "user-role-type",
  "createdAt": "2026-01-04T11:22:50.968Z",
  "updatedAt": "2026-01-04T11:41:29.682Z"
}
```

### 2. Common Use Cases

- **Field Options**: When a picker field uses `fieldOptions` instead of `targetSchema`, the selected values are stored as external nodes
- **External API Data**: Data fetched from external APIs that needs to be referenced in relations
- **Dynamic Values**: Values that don't belong to any specific schema but need to be tracked

## Graph API Behavior

### Node Inclusion

External nodes are included in the graph response when:

1. **Schema Filtering**:
   - If `includedSchemaIds` is provided and includes `"external_nodes"`, external nodes are included
   - If `excludedSchemaIds` includes `"external_nodes"`, they are excluded
   - If no schema filters are provided, external nodes are included by default

2. **Tenant Filtering**:
   - External nodes are **global** and not filtered by tenant
   - The `external_nodes` schema has `applyToAllTenants: true` by default
   - When tenant filters are applied, external nodes are still included

3. **Company Filtering**:
   - External nodes are **global** and not filtered by company
   - They don't have `relatedCompanies` metadata
   - Company filters don't affect external nodes

4. **HAS_FIELD_VALUE Edge Targets**:
   - When a `HAS_FIELD_VALUE` edge references an external node as its target, that external node is **automatically included** in the nodes array, even if it wouldn't normally pass filters
   - This ensures picker field values are visible in the graph

### Edge Inclusion

Edges referencing external nodes are included when:

1. **Source/Target Visibility**:
   - For regular edges: Both source and target schemas must be visible
   - For `HAS_FIELD_VALUE` edges: Only source schema must be visible (target can be `external_nodes`)

2. **Node Existence**:
   - Both source and target nodes must exist in the filtered nodes array
   - External nodes referenced by `HAS_FIELD_VALUE` edges are automatically added to the nodes array

3. **Inactive Relations**:
   - Inactive relations (`inactive: true`) are excluded

## Example Request

```bash
GET /api/graph?tenantIds=01KBFBD109G6CYRT7RA04TMMXC&companyIds=01K94V8K0RJS7D9K43F2VBTSVG
```

### Response Structure

```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "VENDOR",
        "label": "Vendor",
        "icon": "Building",
        "color": "#3b82f6",
        "sourceUrl": "field-options:user-roles:user-role-type",
        "schemaId": "external_nodes"
      },
      {
        "id": "01KB9YC60QXPW8XNMTE151YCY0",
        "title": "Admin Role",
        "schemaId": "user-roles"
      }
    ],
    "edges": [
      {
        "id": "01KE4BXSPSKP464XAMA1H9PSJ0",
        "sourceId": "01KB9YC60QXPW8XNMTE151YCY0",
        "targetId": "VENDOR",
        "sourceSchema": "user-roles",
        "targetSchema": "external_nodes",
        "relationTypeId": "HAS_FIELD_VALUE",
        "fieldId": "user-role-type",
        "createdAt": "2026-01-04T11:22:50.968Z",
        "updatedAt": "2026-01-04T11:41:29.682Z"
      }
    ]
  },
  "message": "Retrieved 2 nodes and 1 edges"
}
```

## Special Handling for HAS_FIELD_VALUE Edges

The graph endpoint includes special logic for `HAS_FIELD_VALUE` edges that reference external nodes:

1. **Automatic Node Inclusion**: If a `HAS_FIELD_VALUE` edge has a source node in the filtered set and references an external node as the target, that external node is automatically added to the nodes array, even if it wouldn't normally pass filters.

2. **Tenant Visibility**: For `HAS_FIELD_VALUE` edges, only the source schema needs to be tenant-visible. The target schema (`external_nodes`) doesn't need to pass tenant visibility checks.

3. **Field ID Preservation**: The `fieldId` property is included in the edge data, which is essential for mapping picker field values back to their source form fields.

## Filtering External Nodes

### Include Only External Nodes

```bash
GET /api/graph?includedSchemaIds=external_nodes
```

### Exclude External Nodes

```bash
GET /api/graph?excludedSchemaIds=external_nodes
```

### Include External Nodes with Specific Schemas

```bash
GET /api/graph?includedSchemaIds=user-roles,external_nodes
```

## Implementation Details

### Node Building Process

1. **Initial Pass**: Build nodes from all schemas in `all-data.json`, including `external_nodes`
2. **HAS_FIELD_VALUE Pass**: For each `HAS_FIELD_VALUE` edge where the source node exists:
   - Check if target node (including external nodes) exists in filtered nodes
   - If not, add it to the nodes array (even if it doesn't pass filters)
3. **Edge Building**: Include edges where both source and target nodes exist

### Code Reference

The external nodes handling is implemented in:
- **Graph Endpoint**: `src/app/api/graph/route.ts`
- **External Nodes Utility**: `src/gradian-ui/shared/domain/utils/external-nodes.util.ts`
- **Relations API**: `src/app/api/relations/route.ts` (for reference on how external nodes are resolved)

## Best Practices

1. **Use External Nodes for**:
   - Field option values that don't belong to a schema
   - External API data that needs to be referenced
   - Dynamic values that change frequently

2. **Avoid Using External Nodes for**:
   - Data that should be managed as entities
   - Data that needs tenant/company scoping
   - Data that requires complex relationships

3. **Naming Conventions**:
   - Use descriptive `sourceUrl` values (e.g., `field-options:schema:field-name`)
   - Use consistent IDs that match the external source
   - Include meaningful labels for visualization

## Troubleshooting

### External Nodes Not Appearing

1. **Check Schema Filters**: Ensure `external_nodes` is not in `excludedSchemaIds`
2. **Check Relations**: Verify that relations referencing external nodes exist and are not inactive
3. **Check Source Nodes**: For `HAS_FIELD_VALUE` edges, ensure the source node exists in the filtered set

### External Nodes Missing from Edges

1. **Check Node Existence**: Both source and target nodes must exist in the nodes array
2. **Check Inactive Relations**: Inactive relations are excluded
3. **Check Tenant Visibility**: For `HAS_FIELD_VALUE` edges, only source schema visibility is checked

## Quick Reference

### Key Points

- **Schema ID**: `external_nodes`
- **Storage**: `data/all-data.json` → `external_nodes` array
- **Global Scope**: Not filtered by tenant or company
- **Common Use**: Targets in `HAS_FIELD_VALUE` relations
- **Auto-Inclusion**: Automatically included when referenced by `HAS_FIELD_VALUE` edges

### API Endpoints

- **Graph API**: `GET /api/graph` - Includes external nodes in response
- **Relations API**: `GET /api/relations?resolveTargets=true` - Resolves external node data
- **External Nodes Utility**: `getExternalNodes()` - Server-side utility function

### Common Patterns

```typescript
// External node structure
{
  id: "VENDOR",
  label: "Vendor",
  icon: "Building",
  color: "#3b82f6",
  sourceUrl: "field-options:user-roles:user-role-type",
  schemaId: "external_nodes"  // Added by graph API
}

// Relation referencing external node
{
  sourceSchema: "user-roles",
  sourceId: "01KB9YC60QXPW8XNMTE151YCY0",
  targetSchema: "external_nodes",
  targetId: "VENDOR",
  relationTypeId: "HAS_FIELD_VALUE",
  fieldId: "user-role-type"
}
```

## Related Documentation

- [HAS_FIELD_VALUE Relations Flow](./HAS_FIELD_VALUE_RELATIONS_FLOW.md)
- [Backend HAS_FIELD_VALUE Implementation](./BACKEND_HAS_FIELD_VALUE_IMPLEMENTATION.md)
- [Graph API Documentation](../src/docs/graph-management/README.md)

