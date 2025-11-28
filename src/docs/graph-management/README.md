# 📊 Graph Management System Documentation

> **A comprehensive guide to the Graph Designer architecture, components, and utilities**

---

## 📑 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Components](#core-components)
- [Hooks](#hooks)
- [Utilities](#utilities)
- [Data Flow](#data-flow)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

---

## 🎯 Overview

The Graph Management System is a powerful, interactive graph visualization and editing tool built with **Cytoscape.js**. It provides:

- ✨ **Interactive Node & Edge Creation** - Drag-and-drop nodes, draw edges visually
- 🎨 **Multiple Layout Algorithms** - Dagre, Cose-Bilkent, Breadthfirst
- 💾 **Auto-Persistence** - Automatic IndexedDB saving with manual server sync
- 🔄 **Multi-Selection** - Select multiple nodes with Ctrl/Cmd or toggle mode
- 📦 **Node Grouping** - Create compound nodes (parent-child relationships)
- 🎯 **Entity Linking** - Link graph nodes to actual data entities
- ✅ **Validation** - Comprehensive edge and node validation
- 🎭 **Context Menus** - Rich right-click interactions

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GraphDesignerWrapper                      │
│  (Main Orchestrator - State Management & Event Handling)    │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────────┬─────────────────┐
    │                 │                  │                 │
┌───▼────┐    ┌──────▼──────┐    ┌─────▼──────┐   ┌──────▼──────┐
│ Graph  │    │  Graph      │    │  Graph     │   │  Graph     │
│ Canvas │    │  Toolbar    │    │  Sidebar   │   │  Store     │
│        │    │             │    │            │   │  (Hook)    │
└───┬────┘    └─────────────┘    └────────────┘   └──────┬─────┘
    │                                                      │
    │  ┌──────────────────────────────────────────────┐  │
    │  │         Cytoscape.js Core                     │  │
    │  │  - Rendering Engine                           │  │
    │  │  - Layout Algorithms                         │  │
    │  │  - Event System                              │  │
    │  └──────────────────────────────────────────────┘  │
    │                                                      │
┌───▼──────────────────────────────────────────────────────▼────┐
│                    Utility Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Node Utils   │  │ Edge Utils   │  │ Style Utils  │         │
│  │ - Extract    │  │ - Validate   │  │ - Update     │         │
│  │ - Transform  │  │ - Create     │  │ - Refresh    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
GraphDesignerWrapper
├── GraphToolbar (Controls: Save, Layout, Multi-select, Edge Mode, Group)
├── GraphCanvas (Cytoscape.js rendering & interactions)
│   ├── Node Context Menu
│   ├── Edge Context Menu
│   ├── Edgehandles Plugin
│   └── Tooltip Manager
└── GraphSidebar (Schema list for drag-and-drop)
```

### Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Hook (useGraphStore, useNodeSelection, etc.)
    ↓
State Update (React State)
    ↓
IndexedDB Auto-Save (graph-db.ts)
    ↓
Cytoscape.js Sync (GraphCanvas)
    ↓
Visual Update
```

---

## 🧩 Core Components

### 1. `GraphDesignerWrapper`

**Location:** `src/domains/graph-designer/components/GraphDesignerWrapper.tsx`

**Purpose:** Main orchestrator component that manages all graph state and coordinates between child components.

**Key Responsibilities:**
- Manages graph state via `useGraphStore`
- Handles node/edge creation, deletion, updates
- Coordinates form modals for node editing
- Manages popup picker for entity selection
- Handles node grouping (compound nodes)
- Validates duplicate `nodeId` values
- Manages selection state

**Props:** None (self-contained)

**Key Methods:**
- `handleNodeContextAction()` - Handles edit/delete/select from context menu
- `handleEdgeContextAction()` - Handles edge deletion
- `handleGroupSelection()` - Creates parent node and groups selected nodes
- `handleSave()` - Saves graph to server (POST/PUT)

---

### 2. `GraphCanvas`

**Location:** `src/domains/graph-designer/components/GraphCanvas.tsx`

**Purpose:** Core rendering component using Cytoscape.js for graph visualization.

**Key Features:**
- Renders nodes and edges with custom styling
- Handles node/edge interactions (click, hover, drag)
- Manages multi-selection
- Integrates edgehandles plugin for edge drawing
- Shows tooltips on node hover
- Context menus for nodes and edges

**Props:**
```typescript
interface GraphCanvasProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  layout: GraphLayout;
  onNodeClick?: (node: GraphNodeData, isMultiSelect: boolean) => void;
  onBackgroundClick?: () => void;
  onNodeContextAction?: (action: 'edit' | 'delete' | 'select', node: GraphNodeData) => void;
  onEdgeContextAction?: (action: 'delete', edge: GraphEdgeData) => void;
  edgeModeEnabled?: boolean;
  onEdgeCreated?: (source: GraphNodeData, target: GraphNodeData) => void;
  selectedNodeId?: string | null;
  selectedNodeIds?: Set<string>;
  multiSelectEnabled?: boolean;
  schemas?: Array<{ id: string; singular_name?: string; plural_name?: string }>;
}
```

**Exposed Handle:**
```typescript
interface GraphCanvasHandle {
  getInstance: () => Core | null;
  runLayout: (layout: GraphLayout) => void;
  exportPng: () => string | null;
}
```

---

### 3. `GraphToolbar`

**Location:** `src/domains/graph-designer/components/GraphToolbar.tsx`

**Purpose:** Provides control buttons for graph operations.

**Features:**
- Save button (triggers server sync)
- Layout selector (dagre, dagre-lr, cose, breadthfirst)
- Multi-select toggle
- Edge mode toggle
- Group selected nodes button (enabled when 2+ nodes selected)

---

### 4. `GraphSidebar`

**Location:** `src/domains/graph-designer/components/GraphSidebar.tsx`

**Purpose:** Displays available schemas for drag-and-drop node creation.

**Features:**
- Lists all available schemas
- Drag-and-drop to canvas to create nodes
- Uses `useSchemaDragDrop` hook

---

## 🪝 Hooks

### `useGraphStore`

**Location:** `src/domains/graph-designer/hooks/useGraphStore.ts`

**Purpose:** Core state management hook for graph data.

**Returns:**
```typescript
interface UseGraphStoreResult {
  graph: GraphRecord | null;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  createNewGraph: () => void;
  addNode: (input: { schemaId: string; title?: string; payload?: Record<string, unknown> }) => GraphNodeData | null;
  removeNode: (nodeId: string) => void;
  addEdge: (input: { source: GraphNodeData; target: GraphNodeData; relationTypeId?: string }) => GraphEdgeData | null;
  removeEdge: (edgeId: string) => void;
  updateNode: (node: GraphNodeData) => void;
  updateEdge: (edge: GraphEdgeData) => void;
  setGraphElements: (nodes: GraphNodeData[], edges: GraphEdgeData[]) => void;
}
```

**Auto-Save:** All mutations automatically save to IndexedDB via `saveGraphRecord()`.

---

### `useNodeSelection`

**Location:** `src/domains/graph-designer/hooks/useNodeSelection.ts`

**Purpose:** Manages node selection state (single and multi-select).

**Features:**
- Tracks selected node IDs
- Handles multi-select toggle
- Provides selection state to components

---

### `useNodePicker`

**Location:** `src/domains/graph-designer/hooks/useNodePicker.ts`

**Purpose:** Manages the popup picker for selecting entities to link to nodes.

**Features:**
- Opens/closes picker modal
- Handles entity selection
- Validates duplicate `nodeId` values
- Updates node with selected entity ID

---

### `useSchemaDragDrop`

**Location:** `src/domains/graph-designer/hooks/useSchemaDragDrop.ts`

**Purpose:** Handles drag-and-drop of schemas from sidebar to canvas.

**Features:**
- Creates nodes when schema is dropped on canvas
- Calculates drop position
- Auto-selects newly created nodes

---

### `useGraphActions`

**Location:** `src/domains/graph-designer/hooks/useGraphActions.ts`

**Purpose:** Provides high-level graph operations (save, load, export).

---

### `useGraphDeletion`

**Location:** `src/domains/graph-designer/hooks/useGraphDeletion.ts`

**Purpose:** Handles graph deletion operations.

---

### `useGraphReset`

**Location:** `src/domains/graph-designer/hooks/useGraphReset.ts`

**Purpose:** Handles graph reset/clear operations.

---

## 🛠️ Utilities

### Node Utilities

#### `node-data-extractor.ts`

**Purpose:** Utilities for extracting and transforming node data.

**Exports:**
- `extractNodeDataFromElement(element)` - Extracts `GraphNodeData` from Cytoscape element
- `getNodeType(nodeData, schemas)` - Gets display type name (schema name or "Parent")
- `nodeDataToCytoscapeData(node, nodeType)` - Converts to Cytoscape format
- `getIncompleteValue(node)` - Calculates incomplete status (0 = complete, 1 = incomplete)

**Example:**
```typescript
const node = extractNodeDataFromElement(cyElement);
const nodeType = getNodeType(node, schemas); // "User", "Parent", etc.
const cytoscapeData = nodeDataToCytoscapeData(node, nodeType);
```

---

#### `node-tooltip.ts`

**Purpose:** Manages node type tooltip display.

**Class:** `NodeTooltipManager`

**Methods:**
- `show(nodeType, x, y)` - Shows tooltip at position
- `hide()` - Hides tooltip
- `updatePosition(x, y)` - Updates tooltip position
- `setupEventHandlers()` - Sets up hover event handlers
- `updateSchemas(schemas)` - Updates schema list for type resolution
- `destroy()` - Cleans up tooltip element

---

#### `node-context-menu.ts`

**Purpose:** Configuration for node context menu.

**Exports:**
- `extractNodeData(element)` - Helper to extract node data
- `createNodeContextMenu(onNodeContextAction)` - Returns menu configuration

**Menu Actions:**
- **Edit** - Opens form modal to edit node entity
- **Select** - Opens popup picker to link entity
- **Delete** - Removes node from graph

---

### Edge Utilities

#### `edge-handling.ts`

**Purpose:** Edge creation, validation, and data management.

**Exports:**
- `createEdgeData(input, edgeId)` - Creates new edge with proper data structure
- `validateEdgeCreation(source, target, existingEdges)` - Validates edge can be created
- `edgeExists(sourceId, targetId, edges)` - Checks if edge exists
- `getConnectedEdges(nodeId, edges)` - Gets all edges connected to a node
- `getOutgoingEdges(nodeId, edges)` - Gets outgoing edges
- `getIncomingEdges(nodeId, edges)` - Gets incoming edges
- `validateEdgeData(edge, nodes)` - Validates edge data consistency
- `normalizeEdgeData(edge)` - Normalizes edge data

**Validation Rules:**
- No self-loops (source !== target)
- No duplicate edges
- Source and target nodes must exist
- Schema consistency checks

---

#### `edgehandles-events.ts`

**Purpose:** Sets up edgehandles plugin event handlers.

**Exports:**
- `setupEdgehandlesEvents(cy, config)` - Sets up all event handlers and returns cleanup function

**Events Handled:**
- `ehcomplete` - Edge creation completed
- `ehstart` - Edge creation started
- `ehhoverover` - Hovering over target node
- `ehpreviewon/off` - Preview edge shown/hidden
- `ehcancel` - Edge creation cancelled
- `ehstop` - Edge creation stopped
- `ehdrawon/off` - Draw mode enabled/disabled

---

#### `edge-context-menu.ts`

**Purpose:** Configuration for edge context menu.

**Exports:**
- `extractEdgeData(element)` - Helper to extract edge data
- `createEdgeContextMenu(onEdgeContextAction)` - Returns menu configuration

**Menu Actions:**
- **Delete** - Removes edge from graph

---

### Style Utilities

#### `cytoscape-styles.ts`

**Purpose:** Utilities for managing Cytoscape styles.

**Exports:**
- `updateNodeStyles(cy)` - Forces style recalculation for all nodes
- `updateStylesAfterLayout(cy, layoutInstance)` - Updates styles after layout completes

**Usage:**
```typescript
// After updating node data
updateNodeStyles(cy);

// After layout animation
updateStylesAfterLayout(cy, layoutInstance);
```

---

### Storage Utilities

#### `graph-db.ts`

**Purpose:** IndexedDB operations for graph persistence.

**Exports:**
- `saveGraphRecord(graph)` - Saves graph to IndexedDB
- `loadGraphRecord(graphId)` - Loads graph from IndexedDB
- `getAllGraphRecords()` - Gets all saved graphs
- `deleteGraphRecord(graphId)` - Deletes graph from IndexedDB

**Storage Structure:**
```typescript
interface StoredGraphRecord {
  id: string;
  name?: string;
  layout: GraphLayout;
  createdAt: string;
  updatedAt: string;
  nodes: Array<{
    id: string;
    title?: string;
    schemaId?: string;
    nodeId?: string;      // Entity ID (optional)
    incomplete?: boolean; // Only if true
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}
```

---

### Validation Utilities

#### `graph-validation.ts`

**Purpose:** Graph-wide validation logic.

**Exports:**
- `validateGraph(graph)` - Validates entire graph structure
- Checks for duplicate `nodeId` values
- Validates node/edge references
- Checks for orphaned edges

---

### Layout Utilities

#### `layouts.ts`

**Purpose:** Cytoscape layout configurations.

**Exports:**
- `LAYOUTS` - Object mapping layout names to Cytoscape layout configs

**Available Layouts:**
- `dagre` - Hierarchical top-to-bottom
- `dagre-lr` - Hierarchical left-to-right
- `cose` - Force-directed (Cose-Bilkent)
- `breadthfirst` - Breadth-first tree layout

---

### Export Utilities

#### `graph-export.ts`

**Purpose:** Graph export functionality (PNG, JSON, etc.).

---

## 📊 Data Flow

### Node Creation Flow

```
1. User drags schema from sidebar
   ↓
2. useSchemaDragDrop detects drop
   ↓
3. useGraphStore.addNode() called
   ↓
4. Node added to state
   ↓
5. IndexedDB auto-saved (graph-db.ts)
   ↓
6. GraphCanvas receives new node
   ↓
7. Cytoscape.js renders node
   ↓
8. Node auto-selected
```

### Edge Creation Flow

```
1. User enables edge mode (toolbar button)
   ↓
2. Edgehandles plugin enabled
   ↓
3. User drags from source node
   ↓
4. User drops on target node
   ↓
5. setupEdgehandlesEvents handles 'ehcomplete'
   ↓
6. validateEdgeCreation() checks validity
   ↓
7. useGraphStore.addEdge() called
   ↓
8. Edge added to state
   ↓
9. IndexedDB auto-saved
   ↓
10. GraphCanvas renders edge
   ↓
11. Edge mode auto-disabled
```

### Save Flow

```
1. User clicks Save button
   ↓
2. GraphDesignerWrapper.handleSave() called
   ↓
3. Check if graph has ID
   ↓
4. If no ID: POST /api/graph
   If has ID: PUT /api/graph/[graphId]
   ↓
5. Server saves:
   - graphs.json (simplified graph data)
   - all-data.json (full node data)
   - all-data-relations.json (full edge data)
   ↓
6. Response includes graph ID
   ↓
7. Graph state updated with ID
```

---

## 📚 API Reference

### Types

#### `GraphNodeData`

```typescript
interface GraphNodeData {
  id: string;                    // Graph node ID (ULID)
  schemaId: string;              // Schema ID or "parent"
  nodeId?: string;              // Entity ID (optional, only when linked)
  title?: string;               // Display title
  incomplete: boolean;          // Whether node is incomplete
  parentId?: string | null;     // Parent node ID (for compound nodes)
  payload?: Record<string, unknown>; // Additional data
}
```

#### `GraphEdgeData`

```typescript
interface GraphEdgeData {
  id: string;                    // Edge ID (ULID)
  source: string;                // Source node ID
  target: string;                // Target node ID
  sourceSchema: string;          // Source node schema
  sourceId: string;              // Source node ID (duplicate of source)
  targetSchema: string;          // Target node schema
  targetId: string;              // Target node ID (duplicate of target)
  relationTypeId: string;        // Relation type identifier
}
```

#### `GraphRecord`

```typescript
interface GraphRecord {
  id: string;                    // Graph ID (ULID)
  name?: string;                 // Graph name
  layout: GraphLayout;           // Current layout
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  nodes: GraphNodeData[];        // All nodes
  edges: GraphEdgeData[];         // All edges
}
```

---

## 🎨 Styling

### Node Styles

**Default Node:**
- Background: `#f9f5ff` (violet-50)
- Border: `#8b5cf6` (violet-500), 2px
- Shape: `round-rectangle`
- Size: 76x46px

**Parent Node:**
- Background: Transparent
- Border: `#cbd5e1` (slate-300), 1px dashed
- Minimal styling

**Incomplete Node:**
- Border: `#f97316` (orange-500), 3px dashed
- Background: `#fff7ed` (orange-50)

**Selected Node:**
- Border: `#ef4444` (red-500), 3px solid

### Edge Styles

**Default Edge:**
- Color: `#6366f1` (indigo-500)
- Arrow: `#06b6d4` (cyan-500)
- Width: 2px
- Style: Bezier curve

**Selected Edge:**
- Color: `#f97316` (orange-500)

---

## ✅ Best Practices

### 1. Node Creation

```typescript
// ✅ Good: Use useGraphStore.addNode()
const node = addNode({
  schemaId: 'users',
  title: 'John Doe',
  payload: { id: 'entity-123' }
});

// ❌ Bad: Directly manipulating state
setGraph(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
```

### 2. Edge Validation

```typescript
// ✅ Good: Always validate before creating
const validation = validateEdgeCreation(source, target, edges);
if (!validation.valid) {
  toast.error(validation.error);
  return;
}
addEdge({ source, target });

// ❌ Bad: Creating without validation
addEdge({ source, target }); // May create duplicates or self-loops
```

### 3. Style Updates

```typescript
// ✅ Good: Use utility functions
updateNodeStyles(cy);
updateStylesAfterLayout(cy, layoutInstance);

// ❌ Bad: Manual style updates
cy.style().update();
cy.nodes().forEach(n => n.style());
```

### 4. Data Extraction

```typescript
// ✅ Good: Use utility functions
const node = extractNodeDataFromElement(element);
const nodeType = getNodeType(node, schemas);

// ❌ Bad: Manual extraction
const node = {
  id: element.data('id'),
  schemaId: element.data('schemaId'),
  // ... more manual extraction
};
```

### 5. Event Cleanup

```typescript
// ✅ Good: Always clean up event handlers
useEffect(() => {
  const cleanup = setupEdgehandlesEvents(cy, config);
  return cleanup; // Cleanup on unmount
}, []);

// ❌ Bad: No cleanup
cy.on('ehcomplete', handler); // Memory leak!
```

---

## 🔧 Configuration

### Edgehandles Plugin

```typescript
const eh = cy.edgehandles({
  handleNodes: 'node',        // All nodes can be handles
  hoverDelay: 150,            // Hover delay in ms
  snap: true,                 // Enable snap-to-target
  snapThreshold: 50,         // Snap distance in pixels
  snapFrequency: 15,          // Snap checks per second
  noEdgeEventsInDraw: true,   // Disable edge events during draw
  disableBrowserGestures: true, // Disable browser gestures
});
```

### Context Menu

```typescript
const menuConfig = createNodeContextMenu(onNodeContextAction);
// Includes:
// - outsideMenuCancel: true (close on outside click)
// - adaptativeNodeSpotlightRadius: true (adapt to node size)
// - Custom styling with icons
```

---

## 🐛 Troubleshooting

### Issue: Styles not updating after node change

**Solution:** Use `updateNodeStyles(cy)` after data changes.

### Issue: Edge creation not working

**Check:**
1. Edge mode enabled? (`edgeModeEnabled={true}`)
2. `handleNodes: 'node'` in edgehandles config?
3. `events: 'yes'` in node style?
4. `eh.enable()` called before `eh.enableDrawMode()`?

### Issue: Tooltip not hiding

**Solution:** Ensure `NodeTooltipManager.setupEventHandlers()` is called and `destroy()` is called on cleanup.

### Issue: Duplicate nodeId validation

**Check:**
1. `useNodePicker` validates before selection
2. `FormModal` validates before save
3. `graph-validation.ts` checks entire graph

---

## 📝 Changelog

### Recent Updates

- ✅ Extracted edge-handling functions to separate utilities
- ✅ Created modular component-based architecture
- ✅ Added `outsideMenuCancel` and `adaptativeNodeSpotlightRadius` to context menus
- ✅ Improved tooltip management with `NodeTooltipManager` class
- ✅ Enhanced style update utilities
- ✅ Added comprehensive validation for duplicate `nodeId` values

---

## 📖 Additional Resources

- [Cytoscape.js Documentation](https://js.cytoscape.org/)
- [Cytoscape Edgehandles Plugin](https://github.com/cytoscape/cytoscape.js-edgehandles)
- [Cytoscape Context Menu Plugin](https://github.com/cytoscape/cytoscape.js-cxtmenu)

---

**Last Updated:** 2025-01-28  
**Version:** 1.0.0  
**Maintainer:** Graph Designer Team

