# 🏗️ Graph Management Architecture

## System Architecture Overview

The Graph Management System follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ GraphToolbar │  │ GraphCanvas  │  │ GraphSidebar │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                      Orchestration Layer                           │
│                    GraphDesignerWrapper                            │
│  - State Coordination                                             │
│  - Event Handling                                                 │
│  - Modal Management                                               │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                        Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ useGraphStore│  │useNodePicker │  │useNodeSelect  │          │
│  │              │  │              │  │              │          │
│  │ - CRUD Ops   │  │ - Entity Link│  │ - Selection  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                         Utility Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Node Utils   │  │ Edge Utils   │  │ Style Utils  │           │
│  │ - Extract    │  │ - Validate   │  │ - Update     │           │
│  │ - Transform  │  │ - Create     │  │ - Refresh    │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                       Persistence Layer                            │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │ IndexedDB    │  │ Server API   │                              │
│  │ (Auto-save)  │  │ (Manual save)│                              │
│  └──────────────┘  └──────────────┘                              │
└────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Node Creation Flow

```
User Action: Drag schema from sidebar
    │
    ▼
GraphSidebar (useSchemaDragDrop)
    │
    ▼
GraphDesignerWrapper.handleAddSchema()
    │
    ▼
useGraphStore.addNode()
    │
    ├─► State Update (React)
    │
    ├─► IndexedDB Save (graph-db.ts)
    │
    └─► GraphCanvas receives new node
        │
        ▼
    Cytoscape.js renders node
        │
        ▼
    Node auto-selected
```

### 2. Edge Creation Flow

```
User Action: Enable edge mode → Drag from node A to node B
    │
    ▼
GraphToolbar (edgeModeEnabled = true)
    │
    ▼
GraphCanvas (edgehandles plugin enabled)
    │
    ├─► eh.enable()
    ├─► eh.enableDrawMode()
    │
    ▼
User drags from source node
    │
    ▼
Edgehandles plugin tracks drag
    │
    ▼
User drops on target node
    │
    ▼
setupEdgehandlesEvents handles 'ehcomplete'
    │
    ├─► extractNodeDataFromElement(source)
    ├─► extractNodeDataFromElement(target)
    ├─► validateEdgeCreation()
    │
    ▼
useGraphStore.addEdge()
    │
    ├─► State Update
    ├─► IndexedDB Save
    │
    └─► GraphCanvas renders edge
        │
        ▼
    Edge mode auto-disabled
```

### 3. Node Editing Flow

```
User Action: Right-click node → Edit
    │
    ▼
GraphCanvas (context menu)
    │
    ▼
GraphDesignerWrapper.handleNodeContextAction('edit')
    │
    ├─► setActiveNodeForForm(node)
    │
    ▼
FormModal opens
    │
    ├─► If node.nodeId exists: Load entity data
    ├─► If no nodeId: Create new entity
    │
    ▼
User submits form
    │
    ▼
FormModal.onSuccess()
    │
    ├─► Extract title from response
    ├─► Update node.nodeId
    ├─► Set node.incomplete = false
    │
    ▼
useGraphStore.updateNode()
    │
    ├─► State Update
    ├─► IndexedDB Save
    │
    └─► GraphCanvas updates node
        │
        ├─► Title updated
        ├─► Style updated (incomplete → complete)
        └─► Tooltip updated
```

## Data Structures

### Graph State Structure

```typescript
GraphRecord {
  id: string                    // Graph ID (ULID)
  name?: string                 // Graph name
  layout: GraphLayout           // Current layout
  createdAt: string             // ISO timestamp
  updatedAt: string             // ISO timestamp
  nodes: GraphNodeData[]        // All nodes
  edges: GraphEdgeData[]        // All edges
}
```

### Node Data Structure

```typescript
GraphNodeData {
  id: string                    // Graph node ID (ULID)
  schemaId: string             // Schema ID or "parent"
  nodeId?: string              // Entity ID (optional, only when linked)
  title?: string               // Display title
  incomplete: boolean          // Completion status
  parentId?: string | null    // Parent node ID (for compound nodes)
  payload?: Record<string, unknown> // Additional data
}
```

### Edge Data Structure

```typescript
GraphEdgeData {
  id: string                    // Edge ID (ULID)
  source: string                // Source node ID
  target: string                // Target node ID
  sourceSchema: string          // Source schema
  sourceId: string             // Source node ID (duplicate)
  targetSchema: string         // Target schema
  targetId: string             // Target node ID (duplicate)
  relationTypeId: string       // Relation type
}
```

## State Management

### React State (useGraphStore)

- **Location:** `hooks/useGraphStore.ts`
- **Purpose:** Centralized graph state management
- **Auto-save:** All mutations trigger IndexedDB save
- **Immutability:** All updates create new state objects

### IndexedDB Storage

- **Database:** `gradian-graph-designer`
- **Version:** 2
- **Tables:**
  - `graphs` - Graph metadata
  - `graphNodes` - Full node data
  - `graphEdges` - Full edge data

### Server Storage

- **Endpoint:** `/api/graph` (POST) or `/api/graph/[graphId]` (PUT)
- **Files:**
  - `graphs.json` - Simplified graph data
  - `all-data.json` - Full node data
  - `all-data-relations.json` - Full edge data

## Event System

### Cytoscape Events

**Node Events:**
- `tap` - Node click
- `mouseover` - Node hover (tooltip)
- `mouseout` - Node unhover
- `grab` - Node drag start

**Edge Events:**
- `tap` - Edge click

**Canvas Events:**
- `tap` - Background click (clear selection)

### Edgehandles Events

- `ehstart` - Edge creation started
- `ehcomplete` - Edge creation completed
- `ehcancel` - Edge creation cancelled
- `ehhoverover` - Hovering over target
- `ehpreviewon/off` - Preview edge shown/hidden
- `ehdrawon/off` - Draw mode enabled/disabled

### React Events

**Component Events:**
- `onNodeClick` - Node clicked
- `onBackgroundClick` - Background clicked
- `onNodeContextAction` - Context menu action
- `onEdgeContextAction` - Edge context menu action
- `onEdgeCreated` - Edge created via edgehandles

## Plugin Integration

### Cytoscape Plugins Used

1. **cytoscape-dagre** - Hierarchical layouts
2. **cytoscape-cose-bilkent** - Force-directed layout
3. **cytoscape-cxtmenu** - Context menus
4. **cytoscape-edgehandles** - Edge drawing

### Plugin Lifecycle

```typescript
// Initialization
cytoscape.use(dagre);
cytoscape.use(coseBilkent);
cytoscape.use(cxtmenu);
cytoscape.use(edgehandles);

// In GraphCanvas
const cy = cytoscape({ ... });
cy.cxtmenu(createNodeContextMenu(...));
const eh = cy.edgehandles({ ... });

// Cleanup
useEffect(() => {
  return () => {
    eh.destroy();
    cy.destroy();
  };
}, []);
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Rendering:** Nodes/edges only rendered when visible
2. **Batch Updates:** Multiple changes batched in single state update
3. **Style Caching:** Cytoscape caches computed styles
4. **Layout Animation:** Layouts run with animation for smooth transitions
5. **IndexedDB Indexing:** Indexed on `id` and `updatedAt` for fast queries

### Memory Management

- **Event Cleanup:** All event handlers properly cleaned up
- **Ref Management:** Refs used for non-reactive values
- **Tooltip Cleanup:** Tooltip element removed on unmount
- **Plugin Destruction:** All plugins destroyed on component unmount

## Security Considerations

### Validation Layers

1. **Client-side Validation:**
   - Edge creation validation
   - Duplicate `nodeId` checks
   - Graph structure validation

2. **Server-side Validation:**
   - API endpoint validation
   - Data integrity checks

### Data Sanitization

- All user input sanitized before storage
- ULID generation for IDs (prevents injection)
- Type checking on all data structures

## Testing Strategy

### Unit Tests

- Utility functions (extractors, validators)
- Hook logic (state management)
- Data transformations

### Integration Tests

- Component interactions
- Event handling
- State synchronization

### E2E Tests

- User workflows
- Drag-and-drop
- Edge creation
- Save/load operations

## Future Enhancements

### Planned Features

1. **Undo/Redo System**
   - History stack management
   - State snapshots

2. **Graph Templates**
   - Pre-built graph structures
   - Template library

3. **Collaborative Editing**
   - Real-time synchronization
   - Conflict resolution

4. **Advanced Layouts**
   - Custom layout algorithms
   - Layout presets

5. **Export Formats**
   - SVG export
   - PDF export
   - GraphML export

---

**Last Updated:** 2025-01-28

