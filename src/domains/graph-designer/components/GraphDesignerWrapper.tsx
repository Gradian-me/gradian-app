'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ulid } from 'ulid';
import { toast } from 'sonner';

import { MainLayout } from '@/components/layout/main-layout';
import { useSchemas as useSchemaSummaries } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { FormModal } from '@/gradian-ui/form-builder';
import { ConfirmationMessage, PopupPicker } from '@/gradian-ui/form-builder/form-elements';
import { getValueByRole } from '@/gradian-ui/data-display/utils';
import { getPrimaryDisplayString, hasDisplayValue } from '@/gradian-ui/data-display/utils/value-display';
import { useGraphStore } from '../hooks/useGraphStore';
import { useGraphActions } from '../hooks/useGraphActions';
import { useGraphReset } from '../hooks/useGraphReset';
import { useNodeSelection } from '../hooks/useNodeSelection';
import { useNodePicker } from '../hooks/useNodePicker';
import { useGraphDeletion } from '../hooks/useGraphDeletion';
import { useSchemaDragDrop } from '../hooks/useSchemaDragDrop';
import { GraphSidebar } from './GraphSidebar';
import { GraphToolbar } from './GraphToolbar';
import { GraphCanvas, GraphCanvasHandle } from './GraphCanvas';
import type { GraphLayout, GraphNodeData } from '../types';
import { exportGraphAsPng } from '../utils/graph-export';

export function GraphDesignerWrapper() {
  const { schemas, isLoading, refetch } = useSchemaSummaries({ summary: true });
  const systemSchemas = useMemo(
    () =>
      schemas
        .filter((schema) => schema.isSystemSchema === true)
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [schemas],
  );

  const businessSchemas = useMemo(
    () =>
      schemas
        .filter((schema) => schema.isSystemSchema !== true)
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [schemas],
  );

  const { graph, nodes, edges, addNode, removeNode, removeEdge, addEdge, updateNode, setGraphElements, createNewGraph } = useGraphStore();

  const [layout, setLayout] = useState<GraphLayout>('dagre');
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [edgeModeEnabled, setEdgeModeEnabled] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const canvasHandleRef = useRef<GraphCanvasHandle | null>(null);
  const formJustSavedRef = useRef(false);
  const [formJustSaved, setFormJustSaved] = useState(false);
  const prevNodesIdsRef = useRef<string>(JSON.stringify(nodes.map(n => n.id).sort()));
  const prevEdgesIdsRef = useRef<string>(JSON.stringify(edges.map(e => e.id).sort()));

  // Custom hooks
  const { handleSave } = useGraphActions(graph);
  const { selectedNodeId, selectedNodeIds, activeNodeForForm, setSelectedNodeId, setActiveNodeForForm, handleNodeClick, handleEditNode, clearSelection } = useNodeSelection();
  const { pickerState, openPicker, closePicker, handleSelect } = useNodePicker(updateNode, nodes);
  const { deleteConfirmation, openDeleteConfirmation, closeDeleteConfirmation, confirmDelete } = useGraphDeletion(removeNode, removeEdge);
  const { handleDropOnCanvas, handleDragOverCanvas, handleAddSchema } = useSchemaDragDrop({
    schemas,
    addNode,
    onNodeAdded: (node) => {
      // Always select the newly added node
      // Use setTimeout to ensure the node is rendered in the canvas before selection
      setTimeout(() => {
        setSelectedNodeId(node.id);
      }, 0);
    },
  });

  const { handleReset: performReset } = useGraphReset({
    nodes,
    edges,
    createNewGraph,
    onReset: () => {
      clearSelection();
      setEdgeModeEnabled(false);
      setMultiSelectEnabled(false);
    },
  });

  const handleReset = () => {
    setShowResetConfirmation(true);
  };

  const confirmReset = () => {
    performReset();
    setShowResetConfirmation(false);
  };

  const handleExportPng = () => {
    exportGraphAsPng(canvasHandleRef.current, graph);
  };

  const handleRefreshLayout = () => {
    if (canvasHandleRef.current) {
      canvasHandleRef.current.runLayout(layout);
    }
  };

  // Re-apply layout after nodes or edges are added/changed
  useEffect(() => {
    const currentNodesIds = JSON.stringify(nodes.map(n => n.id).sort());
    const currentEdgesIds = JSON.stringify(edges.map(e => e.id).sort());
    
    const nodesChanged = prevNodesIdsRef.current !== currentNodesIds;
    const edgesChanged = prevEdgesIdsRef.current !== currentEdgesIds;
    
    // Update refs
    prevNodesIdsRef.current = currentNodesIds;
    prevEdgesIdsRef.current = currentEdgesIds;
    
    // If nodes or edges changed, trigger layout refresh after sync completes
    if ((nodesChanged || edgesChanged) && canvasHandleRef.current) {
      // Use requestAnimationFrame to ensure layout runs after the sync cycle completes
      // Double RAF ensures it runs after all React updates and Cytoscape sync
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (canvasHandleRef.current) {
            canvasHandleRef.current.runLayout(layout);
          }
        });
      });
    }
  }, [nodes, edges, layout]);

  const handleGroupSelection = () => {
    if (!selectedNodeIds || selectedNodeIds.size < 2 || !graph) return;
    
    // Create a parent node with schemaId "parent"
    const parentNodeId = ulid();
    const parentNode: GraphNodeData = {
      id: parentNodeId,
      schemaId: 'parent',
      // nodeId is not set for parent nodes (they're just grouping containers)
      title: `Group ${selectedNodeIds.size} nodes`,
      incomplete: true,
      parentId: null,
      payload: {},
    };
    
    // Update all selected nodes to have the parent node as their parent
    // Use setGraphElements to batch update all nodes at once
    const selectedNodeIdArray = Array.from(selectedNodeIds);
    const updatedNodes = nodes
      .map((node) => {
        if (selectedNodeIdArray.includes(node.id)) {
          return {
            ...node,
            parentId: parentNode.id,
          };
        }
        return node;
      })
      // Add the parent node to the array
      .concat([parentNode]);
    
    // Batch update all nodes at once
    setGraphElements(updatedNodes, edges);
    
    // Clear selection after grouping
    clearSelection();
  };

  const canUndo = false;
  const canRedo = false;
  const canGroupSelection = selectedNodeIds && selectedNodeIds.size >= 2;

  const sidebar = (
    <GraphSidebar
      systemSchemas={systemSchemas}
      businessSchemas={businessSchemas}
      loading={isLoading}
      refreshing={false}
      onRefresh={() => {
        void refetch();
      }}
      onAddSchema={handleAddSchema}
    />
  );

  const activeSchemaId = activeNodeForForm?.schemaId;
  // Use nodeId for editing (nodeId is the selected entity's ID from the picker)
  // Only use nodeId if it exists, is not empty, and is different from the node's own id
  // The node's id is the graph node ID, not the entity ID
  const nodeId = activeNodeForForm?.nodeId;
  const nodeIdIsValid = nodeId && 
    nodeId.trim() !== '' && 
    nodeId !== activeNodeForForm?.id; // Ensure nodeId is not the same as the node's graph ID
  const activeEntityId = nodeIdIsValid ? nodeId : undefined;
  const activeFormMode: 'create' | 'edit' = activeEntityId ? 'edit' : 'create';

  return (
    <MainLayout
      title="Graph Designer"
      icon="Workflow"
      subtitle="Design and manage data relationship graphs."
      showActionButtons={false}
    >
      <div className="flex h-[calc(100vh-6.5rem)] gap-4 overflow-hidden">
        <AnimatePresence initial={false}>
          {sidebarVisible && (
            <motion.div
              key="graph-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="w-80 h-full">
                {sidebar}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-400 bg-linear-to-b from-background via-muted/40 to-background dark:border-gray-700"
          onDragOver={handleDragOverCanvas}
          onDrop={handleDropOnCanvas}
        >
          <GraphToolbar
            layout={layout}
            onLayoutChange={setLayout}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible((prev) => !prev)}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => {}}
            onRedo={() => {}}
            multiSelectEnabled={multiSelectEnabled}
            onToggleMultiSelect={() => setMultiSelectEnabled((prev) => !prev)}
            edgeModeEnabled={edgeModeEnabled}
            onToggleEdgeMode={() => setEdgeModeEnabled((prev) => !prev)}
            canGroupSelection={canGroupSelection}
            onGroupSelection={handleGroupSelection}
            onExportPng={handleExportPng}
            onSave={handleSave}
            onReset={handleReset}
            onRefreshLayout={handleRefreshLayout}
          />
          <div className="flex-1">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              layout={layout}
              onNodeClick={handleNodeClick}
              onBackgroundClick={clearSelection}
              onElementsChange={setGraphElements}
              onReady={(handle) => {
                canvasHandleRef.current = handle;
              }}
              edgeModeEnabled={edgeModeEnabled}
              onEdgeCreated={(source, target) => {
                addEdge({ source, target });
              }}
              onEdgeModeDisable={() => {
                setEdgeModeEnabled(false);
              }}
              selectedNodeId={selectedNodeId}
              selectedNodeIds={selectedNodeIds}
              multiSelectEnabled={multiSelectEnabled}
              schemas={schemas}
              onNodeContextAction={(action, node) => {
                if (action === 'edit') {
                  handleEditNode(node);
                  return;
                }
                if (action === 'select') {
                  openPicker(node);
                  return;
                }
                if (action === 'delete') {
                  openDeleteConfirmation('node', node);
                }
              }}
              onEdgeContextAction={(action, edge) => {
                if (action === 'delete') {
                  openDeleteConfirmation('edge', edge);
                }
              }}
            />
          </div>
        </div>
      </div>

      {activeSchemaId && activeNodeForForm && !formJustSaved && (
        <FormModal
          key={`${activeSchemaId}-${activeEntityId ?? 'new'}-${activeNodeForForm.id}-${activeNodeForForm.nodeId ?? 'no-nodeid'}`}
          schemaId={activeSchemaId}
          entityId={activeEntityId} // Only pass entityId if nodeId exists (for edit mode)
          mode={activeFormMode} // 'create' if no nodeId, 'edit' if nodeId exists
          onSuccess={(data) => {
            if (!activeNodeForForm || !activeSchemaId) return;
            // Get the entity ID from the response
            // For POST (create): data.id is the newly created entity's ID
            // For PUT (edit): data.id should be the same as activeEntityId (nodeId)
            const entityId = (data as any)?.id;
            if (!entityId) {
              console.error('No entity ID returned from form submission');
              return;
            }
            
            // Get the schema to extract title field
            const schema = schemas.find((s) => s.id === activeSchemaId);
            
            // Extract title from entity data using the same logic as getEntityDisplayTitle in FormModal
            // This matches how the app extracts titles throughout the codebase
            const EXCLUDED_TITLE_ROLES = new Set(['code', 'subtitle', 'description']);
            let extractedTitle: string = '';
            
            if (schema) {
              // 1. Check if schema has a field with role='title'
              if (schema.fields?.some((field) => field.role === 'title')) {
                const titleByRole = getValueByRole(schema, data as any, 'title');
                if (typeof titleByRole === 'string' && titleByRole.trim() !== '') {
                  extractedTitle = titleByRole;
                }
              }
              
              // 2. If no title role, find first text field (excluding code, subtitle, description) sorted by order
              if (!extractedTitle) {
                const textFields = schema.fields
                  ?.filter(
                    (field) =>
                      field.component === 'text' &&
                      (!field.role || !EXCLUDED_TITLE_ROLES.has(field.role)) &&
                      hasDisplayValue((data as any)[field.name])
                  )
                  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                
                if (textFields && textFields.length > 0) {
                  const firstField = textFields[0];
                  const value = (data as any)[firstField.name];
                  const primary = getPrimaryDisplayString(value);
                  if (primary) {
                    extractedTitle = primary;
                  } else if (value !== null && value !== undefined) {
                    const stringValue = String(value).trim();
                    if (stringValue !== '') {
                      extractedTitle = stringValue;
                    }
                  }
                }
              }
            }
            
            // 3. Fallback to common fields or entityId
            if (!extractedTitle) {
              extractedTitle =
                (data as any).name ??
                (data as any).title ??
                (data as any).label ??
                String(entityId);
            }
            
            // Ensure title is not empty
            if (!extractedTitle || extractedTitle.trim() === '') {
              extractedTitle = String(entityId);
            }
            
            // Debug: log what we're getting (can be removed later)
            console.log('Node update after form save:', {
              nodeId: activeNodeForForm.id,
              entityId,
              extractedTitle,
              incomplete: false,
              hasTitleRole: schema?.fields?.some((field) => field.role === 'title'),
              dataKeys: Object.keys(data as any).slice(0, 10), // First 10 keys for debugging
            });
            
            // Check if this entity ID (nodeId) is already linked to another node in the graph
            const duplicateNode = nodes.find(
              (n) => n.nodeId === entityId && n.id !== activeNodeForForm.id
            );
            if (duplicateNode) {
              toast.error(
                `This entity is already linked to node "${duplicateNode.title || duplicateNode.id}". Each entity can only be linked once.`
              );
              return;
            }
            
            // Update the node with the entity data
            // nodeId is set to the entity ID (from POST response for new entities, or existing nodeId for edits)
            // incomplete is set to false to mark the node as complete
            // title is updated from the entity data
            const updatedNode: GraphNodeData = {
              id: activeNodeForForm.id, // Keep the graph node ID
              schemaId: activeNodeForForm.schemaId, // Keep schemaId
              nodeId: entityId, // Always set nodeId to the entity ID returned from the API
              title: extractedTitle, // Update title from entity data
              incomplete: false, // Mark as complete - this will update the style
              parentId: activeNodeForForm.parentId ?? null, // Keep parentId
              payload: {
                ...(activeNodeForForm.payload ?? {}),
                ...(data ?? {}),
                id: entityId,
              },
            };
            
            // Update the node in the graph store (this will trigger IndexedDB save)
            // This will update title, incomplete, nodeId, and payload
            updateNode(updatedNode);
            
            // Mark that form was just saved to prevent re-opening
            formJustSavedRef.current = true;
            setFormJustSaved(true);
            
            // Close the form immediately to prevent multiple opens
            // Clear activeNodeForForm synchronously to prevent re-opening
            setActiveNodeForForm(null);
            
            // Reset the flag after a short delay
            setTimeout(() => {
              formJustSavedRef.current = false;
              setFormJustSaved(false);
            }, 100);
          }}
          onClose={() => {
            setActiveNodeForForm(null);
          }}
        />
      )}

      <ConfirmationMessage
        isOpen={deleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteConfirmation();
        }}
        title={deleteConfirmation.type === 'node' ? 'Delete Node' : 'Delete Edge'}
        subtitle={
          deleteConfirmation.type === 'node'
            ? 'This will permanently remove the node and all its connected edges from the graph.'
            : 'This will permanently remove the edge from the graph.'
        }
        message={
          deleteConfirmation.type === 'node' && deleteConfirmation.item
            ? `Are you sure you want to delete the node "${(deleteConfirmation.item as GraphNodeData).title || deleteConfirmation.item.id}"?`
            : deleteConfirmation.type === 'edge'
            ? 'Are you sure you want to delete this edge?'
            : ''
        }
        variant="destructive"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: closeDeleteConfirmation,
          },
          {
            label: 'Delete',
            variant: 'destructive',
            icon: 'Trash2',
            action: confirmDelete,
          },
        ]}
      />

      <ConfirmationMessage
        isOpen={showResetConfirmation}
        onOpenChange={setShowResetConfirmation}
        title="Reset Graph"
        subtitle="This will permanently clear all nodes and edges from the current graph."
        message={`Are you sure you want to reset the graph? This action cannot be undone. You will lose all ${nodes.length} node(s) and ${edges.length} edge(s).`}
        variant="warning"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => setShowResetConfirmation(false),
          },
          {
            label: 'Reset Graph',
            variant: 'destructive',
            icon: 'RotateCcw',
            action: confirmReset,
          },
        ]}
      />

      {/* Popup Picker for selecting existing data */}
      {pickerState.schema && (
        <PopupPicker
          isOpen={pickerState.isOpen}
          onClose={closePicker}
          schemaId={pickerState.node?.schemaId || ''}
          schema={pickerState.schema}
          onSelect={handleSelect}
          title={`Select ${pickerState.schema.plural_name || pickerState.schema.singular_name || pickerState.node?.schemaId}`}
          description={`Choose an existing ${pickerState.schema.singular_name || 'item'} to replace the current node data`}
          canViewList={true}
          viewListUrl={`/page/${pickerState.node?.schemaId}`}
          allowMultiselect={false}
        />
      )}
    </MainLayout>
  );
}



