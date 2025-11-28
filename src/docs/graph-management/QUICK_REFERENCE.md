# ⚡ Graph Management Quick Reference

> **Quick lookup guide for common operations and patterns**

---

## 🎯 Common Operations

### Creating a Node

```typescript
const node = addNode({
  schemaId: 'users',
  title: 'John Doe',
  payload: { id: 'entity-123' }
});
```

### Creating an Edge

```typescript
const validation = validateEdgeCreation(source, target, edges);
if (validation.valid) {
  const edge = addEdge({ source, target, relationTypeId: 'relation-default' });
}
```

### Updating a Node

```typescript
updateNode({
  ...node,
  title: 'Updated Title',
  incomplete: false,
  nodeId: 'entity-123'
});
```

### Deleting a Node

```typescript
removeNode(nodeId);
// Automatically removes connected edges
```

### Grouping Nodes

```typescript
// Select multiple nodes first
const selectedIds = Array.from(selectedNodeIds);
if (selectedIds.length > 1) {
  handleGroupSelection(); // Creates parent node
}
```

---

## 🔧 Utility Functions

### Node Utilities

```typescript
// Extract node data from Cytoscape element
const node = extractNodeDataFromElement(element);

// Get node type display name
const type = getNodeType(node, schemas); // "User", "Parent", etc.

// Convert to Cytoscape format
const cytoscapeData = nodeDataToCytoscapeData(node, type);

// Get incomplete status
const incompleteValue = getIncompleteValue(node); // 0 or 1
```

### Edge Utilities

```typescript
// Validate edge creation
const validation = validateEdgeCreation(source, target, edges);
if (!validation.valid) {
  console.error(validation.error);
}

// Check if edge exists
const exists = edgeExists(sourceId, targetId, edges);

// Get connected edges
const connected = getConnectedEdges(nodeId, edges);
const outgoing = getOutgoingEdges(nodeId, edges);
const incoming = getIncomingEdges(nodeId, edges);
```

### Style Utilities

```typescript
// Update all node styles
updateNodeStyles(cy);

// Update styles after layout
updateStylesAfterLayout(cy, layoutInstance);
```

---

## 📝 Component Props

### GraphCanvas Props

```typescript
<GraphCanvas
  nodes={nodes}
  edges={edges}
  layout={layout}
  onNodeClick={handleNodeClick}
  onBackgroundClick={handleBackgroundClick}
  onNodeContextAction={handleNodeContextAction}
  onEdgeContextAction={handleEdgeContextAction}
  edgeModeEnabled={edgeModeEnabled}
  onEdgeCreated={handleEdgeCreated}
  selectedNodeId={selectedNodeId}
  selectedNodeIds={selectedNodeIds}
  multiSelectEnabled={multiSelectEnabled}
  schemas={schemas}
/>
```

### GraphToolbar Props

```typescript
<GraphToolbar
  onSave={handleSave}
  layout={layout}
  onLayoutChange={setLayout}
  multiSelectEnabled={multiSelectEnabled}
  onMultiSelectToggle={setMultiSelectEnabled}
  edgeModeEnabled={edgeModeEnabled}
  onEdgeModeToggle={setEdgeModeEnabled}
  canGroup={selectedNodeIds.size > 1}
  onGroup={handleGroupSelection}
/>
```

---

## 🎨 Styling Reference

### Node Styles

| State | Border Color | Border Style | Background |
|-------|-------------|--------------|------------|
| Default | `#8b5cf6` (violet-500) | solid | `#f9f5ff` (violet-50) |
| Parent | `#cbd5e1` (slate-300) | dashed | transparent |
| Incomplete | `#f97316` (orange-500) | dashed | `#fff7ed` (orange-50) |
| Selected | `#ef4444` (red-500) | solid | `#f9f5ff` (violet-50) |

### Edge Styles

| State | Color | Arrow Color |
|-------|-------|-------------|
| Default | `#6366f1` (indigo-500) | `#06b6d4` (cyan-500) |
| Selected | `#f97316` (orange-500) | `#f97316` (orange-500) |

---

## 🔍 Validation Rules

### Edge Validation

- ❌ No self-loops (source !== target)
- ❌ No duplicate edges
- ✅ Source and target must exist
- ✅ Schema consistency required

### Node Validation

- ❌ No duplicate `nodeId` values
- ✅ `schemaId` must be valid
- ✅ `id` must be unique ULID

---

## 📦 Storage Structure

### IndexedDB

```typescript
// graphs table
{
  id: string,
  name?: string,
  layout: GraphLayout,
  createdAt: string,
  updatedAt: string,
  nodes: Array<{ id, title?, schemaId, nodeId?, incomplete? }>,
  edges: Array<{ id, title? }>
}

// graphNodes table (full data)
GraphNodeData[]

// graphEdges table (full data)
GraphEdgeData[]
```

### Server Storage

```
graphs.json          → Simplified graph metadata
all-data.json        → Full node data
all-data-relations.json → Full edge data
```

---

## 🐛 Common Issues & Solutions

### Issue: Styles not updating

**Solution:**
```typescript
updateNodeStyles(cy);
```

### Issue: Edge creation not working

**Checklist:**
- ✅ `edgeModeEnabled={true}`
- ✅ `handleNodes: 'node'` in config
- ✅ `events: 'yes'` in node style
- ✅ `eh.enable()` before `eh.enableDrawMode()`

### Issue: Tooltip not hiding

**Solution:**
```typescript
// Ensure cleanup
useEffect(() => {
  const manager = new NodeTooltipManager(cy, schemas);
  manager.setupEventHandlers();
  return () => manager.destroy();
}, []);
```

### Issue: Duplicate nodeId

**Solution:**
```typescript
// Validate before selection
const isDuplicate = nodes.some(n => n.nodeId === selectedId);
if (isDuplicate) {
  toast.error('This entity is already linked to another node');
  return;
}
```

---

## 🎯 Event Handlers

### Node Click

```typescript
const handleNodeClick = (node: GraphNodeData, isMultiSelect: boolean) => {
  if (isMultiSelect) {
    // Add to selection
    setSelectedNodeIds(prev => new Set([...prev, node.id]));
  } else {
    // Replace selection
    setSelectedNodeId(node.id);
  }
};
```

### Edge Creation

```typescript
const handleEdgeCreated = (source: GraphNodeData, target: GraphNodeData) => {
  const validation = validateEdgeCreation(source, target, edges);
  if (validation.valid) {
    addEdge({ source, target });
    setEdgeModeEnabled(false); // Auto-disable
  }
};
```

### Context Menu

```typescript
const handleNodeContextAction = (
  action: 'edit' | 'delete' | 'select',
  node: GraphNodeData
) => {
  switch (action) {
    case 'edit':
      setActiveNodeForForm(node);
      break;
    case 'delete':
      removeNode(node.id);
      break;
    case 'select':
      openPicker(node);
      break;
  }
};
```

---

## 🔄 State Updates

### Batch Updates

```typescript
// ✅ Good: Batch multiple changes
setGraphElements(newNodes, newEdges);

// ❌ Bad: Multiple separate updates
addNode(node1);
addNode(node2);
addEdge(edge1);
```

### Auto-Save

```typescript
// All mutations auto-save to IndexedDB
addNode(...);      // → Auto-save
removeNode(...);  // → Auto-save
addEdge(...);      // → Auto-save
updateNode(...);   // → Auto-save
```

### Manual Save

```typescript
// Save to server
const handleSave = async () => {
  if (!graph) return;
  
  const method = graph.id ? 'PUT' : 'POST';
  const url = graph.id 
    ? `/api/graph/${graph.id}`
    : '/api/graph';
  
  await fetch(url, {
    method,
    body: JSON.stringify(graph)
  });
};
```

---

## 📚 Layout Options

```typescript
type GraphLayout = 'dagre' | 'dagre-lr' | 'cose' | 'breadthfirst';

// dagre: Top-to-bottom hierarchical
// dagre-lr: Left-to-right hierarchical
// cose: Force-directed (Cose-Bilkent)
// breadthfirst: Breadth-first tree
```

---

## 🎨 Context Menu Configuration

```typescript
const menuConfig = createNodeContextMenu(onNodeContextAction);
// Options:
// - outsideMenuCancel: true
// - adaptativeNodeSpotlightRadius: true
// - Custom icons and styling
```

---

## 🔗 Related Files

- **Types:** `src/domains/graph-designer/types.ts`
- **Store:** `src/domains/graph-designer/hooks/useGraphStore.ts`
- **Canvas:** `src/domains/graph-designer/components/GraphCanvas.tsx`
- **Wrapper:** `src/domains/graph-designer/components/GraphDesignerWrapper.tsx`

---

**Last Updated:** 2025-01-28

