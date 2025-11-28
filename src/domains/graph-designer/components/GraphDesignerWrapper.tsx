'use client';

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { MainLayout } from '@/components/layout/main-layout';
import { useSchemas as useSchemaSummaries } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { FormModal } from '@/gradian-ui/form-builder';
import { ConfirmationMessage, PopupPicker } from '@/gradian-ui/form-builder/form-elements';
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

  // Custom hooks
  const { handleSave } = useGraphActions(graph);
  const { selectedNodeId, activeNodeForForm, setSelectedNodeId, setActiveNodeForForm, handleNodeClick, handleEditNode, clearSelection } = useNodeSelection();
  const { pickerState, openPicker, closePicker, handleSelect } = useNodePicker(updateNode);
  const { deleteConfirmation, openDeleteConfirmation, closeDeleteConfirmation, confirmDelete } = useGraphDeletion(removeNode, removeEdge);
  const { handleDropOnCanvas, handleDragOverCanvas, handleAddSchema } = useSchemaDragDrop({
    schemas,
    addNode,
    onNodeAdded: (node) => setSelectedNodeId(node.id),
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

  const canUndo = false;
  const canRedo = false;

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
  const activeEntityId = (activeNodeForForm?.payload as any)?.id as string | undefined;
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
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-400 bg-gradient-to-b from-background via-muted/40 to-background dark:border-gray-700"
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
            onGroupSelection={() => {}}
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

      {activeSchemaId && (
        <FormModal
          key={`${activeSchemaId}-${activeEntityId ?? 'new'}`}
          schemaId={activeSchemaId}
          entityId={activeEntityId}
          mode={activeFormMode}
          onSuccess={(data) => {
            if (!activeNodeForForm) return;
            const entityId = (data as any)?.id ?? activeEntityId;
            const updatedNode: GraphNodeData = {
              ...activeNodeForForm,
              incomplete: false,
              payload: {
                ...(activeNodeForForm.payload ?? {}),
                ...(data ?? {}),
                id: entityId,
              },
            };
            updateNode(updatedNode);
            setActiveNodeForForm(updatedNode);
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
        />
      )}
    </MainLayout>
  );
}



