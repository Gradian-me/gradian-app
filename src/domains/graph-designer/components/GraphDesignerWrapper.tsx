'use client';

/* eslint-disable react-hooks/preserve-manual-memoization -- Controlled-mode callbacks read from ref and call parent onGraphChange; compiler cannot preserve this pattern. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ulid } from 'ulid';
import { toast } from 'sonner';

import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { useSchemas as useSchemaSummaries } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { useTenantStore } from '@/stores/tenant.store';
import { FormModal } from '@/gradian-ui/form-builder';
import { ConfirmationMessage, PopupPicker } from '@/gradian-ui/form-builder/form-elements';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
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
import type { GraphLayout, GraphNodeData, GraphEdgeData } from '../types';
import { exportGraphAsPng } from '../utils/graph-export';
import { createEdgeData } from '../utils/edge-handling';
import type { ExtraNodeContextAction } from '../utils/node-context-menu';

export interface GraphDesignerWrapperProps {
  /**
   * Enable view-only mode (hides sidebar, editing controls, etc.)
   */
  viewMode?: boolean;
  /**
   * Graph data to display (optional, if not provided uses store data).
   * When used together with onGraphChange, the graph is controlled by the parent.
   */
  graphData?: { nodes: GraphNodeData[]; edges: GraphEdgeData[] };
  /**
   * Called when the graph changes (add/remove node or edge, reorder, etc.).
   * When provided together with graphData, the wrapper operates in controlled mode.
   */
  onGraphChange?: (nodes: GraphNodeData[], edges: GraphEdgeData[]) => void;
  /**
   * Extra actions to show in the node context menu (e.g. "Configure columns").
   */
  extraNodeContextActions?: ExtraNodeContextAction[];
  /**
   * When true, do not wrap in MainLayout (no app header/sidebar). Use when embedding inside another page (e.g. Dynamic Query Builder).
   */
  embedMode?: boolean;
  /**
   * When true, hide Select/Edit in node context menu and hide Save in toolbar (e.g. Dynamic Query Builder uses its own save).
   */
  hideSelectEditAndSave?: boolean;
}

export function GraphDesignerWrapper(props: GraphDesignerWrapperProps = {}) {
  const { viewMode = false, graphData, onGraphChange, extraNodeContextActions, embedMode = false, hideSelectEditAndSave = false } = props;
  const isControlled = !!(graphData && onGraphChange);

  useSetLayoutProps(
    embedMode
      ? {}
      : {
          title: 'Graph Designer',
          icon: 'Waypoints',
          subtitle: 'Design and manage data relationship graphs.',
          showActionButtons: false,
        }
  );

  const tenantId = useTenantStore((state) => state.getTenantId());
  const { schemas, isLoading, refetch } = useSchemaSummaries({ 
    summary: true,
    tenantIds: tenantId ? String(tenantId) : undefined,
  });
  const normalizeSchemaType = useCallback(
    (schema: any): 'system' | 'business' | 'action-form' =>
      schema?.schemaType ? schema.schemaType : schema?.isSystemSchema === true ? 'system' : 'business',
    [],
  );
  const systemSchemas = useMemo(
    () =>
      schemas
        .filter((schema) => normalizeSchemaType(schema) === 'system')
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [normalizeSchemaType, schemas],
  );

  const businessSchemas = useMemo(
    () =>
      schemas
        .filter((schema) => normalizeSchemaType(schema) === 'business')
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [normalizeSchemaType, schemas],
  );

  const { graph, nodes: storeNodes, edges: storeEdges, addNode, removeNode, removeEdge, addEdge, updateNode, setGraphElements, createNewGraph } = useGraphStore();

  // Use graphData if provided, otherwise use store data
  const nodes = graphData?.nodes ?? storeNodes;
  const edges = graphData?.edges ?? storeEdges;

  // Keep latest nodes/edges in ref for controlled-mode callbacks (avoid stale closure)
  const controlledGraphRef = useRef<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }>({ nodes: [], edges: [] });
  useEffect(() => {
    if (isControlled && graphData) {
      controlledGraphRef.current = { nodes: graphData.nodes, edges: graphData.edges };
    }
  }, [isControlled, graphData]);

  const addNodeControlled = useCallback(
    (input: { schemaId: string; title?: string; payload?: Record<string, unknown> }) => {
      const cur = controlledGraphRef.current;
      const node: GraphNodeData = {
        id: ulid(),
        schemaId: input.schemaId,
        nodeId: input.payload?.id as string | undefined,
        title: input.title,
        incomplete: true,
        parentId: null,
        payload: input.payload ?? {},
      };
      onGraphChange!([...cur.nodes, node], cur.edges);
      return node;
    },
    [onGraphChange]
  );

  const addEdgeControlled = useCallback(
    (input: { source: GraphNodeData; target: GraphNodeData; relationTypeId?: string }) => {
      const cur = controlledGraphRef.current;
      const edge = createEdgeData(input, ulid());
      onGraphChange!(cur.nodes, [...cur.edges, edge]);
      return edge;
    },
    [onGraphChange]
  );

  const removeNodeControlled = useCallback(
    (nodeId: string) => {
      const cur = controlledGraphRef.current;
      onGraphChange!(
        cur.nodes.filter((n) => n.id !== nodeId),
        cur.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [onGraphChange]
  );

  const removeEdgeControlled = useCallback(
    (edgeId: string) => {
      const cur = controlledGraphRef.current;
      onGraphChange!(cur.nodes, cur.edges.filter((e) => e.id !== edgeId));
    },
    [onGraphChange]
  );

  const updateNodeControlled = useCallback(
    (node: GraphNodeData) => {
      const cur = controlledGraphRef.current;
      onGraphChange!(
        cur.nodes.map((n) => (n.id === node.id ? node : n)),
        cur.edges
      );
    },
    [onGraphChange]
  );

  const setGraphElementsControlled = useCallback(
    (newNodes: GraphNodeData[], newEdges: GraphEdgeData[]) => {
      onGraphChange!(newNodes, newEdges);
    },
    [onGraphChange]
  );

  const addNodeEffective = isControlled ? addNodeControlled : addNode;
  const addEdgeEffective = isControlled ? addEdgeControlled : addEdge;
  const removeNodeEffective = isControlled ? removeNodeControlled : removeNode;
  const removeEdgeEffective = isControlled ? removeEdgeControlled : removeEdge;
  const updateNodeEffective = isControlled ? updateNodeControlled : updateNode;
  const setGraphElementsEffective = isControlled ? setGraphElementsControlled : setGraphElements;
  const createNewGraphEffective = useCallback(() => {
    if (isControlled && onGraphChange) onGraphChange([], []);
    else createNewGraph();
  }, [isControlled, onGraphChange, createNewGraph]);

  const [layout, setLayout] = useState<GraphLayout>('dagre');
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [edgeModeEnabled, setEdgeModeEnabled] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(!viewMode); // Hide sidebar in view mode
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();

  const canvasHandleRef = useRef<GraphCanvasHandle | null>(null);
  const formJustSavedRef = useRef(false);
  const [formJustSaved, setFormJustSaved] = useState(false);
  const prevNodesIdsRef = useRef<string>(JSON.stringify(nodes.map(n => n.id).sort()));
  const prevEdgesIdsRef = useRef<string>(JSON.stringify(edges.map(e => e.id).sort()));

  // Custom hooks
  const { handleSave } = useGraphActions(graph);
  const { selectedNodeId, selectedNodeIds, activeNodeForForm, setSelectedNodeId, setActiveNodeForForm, handleNodeClick, handleEditNode, clearSelection } = useNodeSelection();
  const { pickerState, openPicker, closePicker, handleSelect } = useNodePicker(updateNodeEffective, nodes);
  const { deleteConfirmation, openDeleteConfirmation, closeDeleteConfirmation, confirmDelete } = useGraphDeletion(removeNodeEffective, removeEdgeEffective);
  const { handleDropOnCanvas, handleDragOverCanvas, handleAddSchema } = useSchemaDragDrop({
    schemas,
    addNode: addNodeEffective,
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
    createNewGraph: createNewGraphEffective,
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

  const handleRefreshLayout = useCallback(() => {
    if (canvasHandleRef.current) {
      canvasHandleRef.current.runLayout(layout);
    }
  }, [layout]);

  // After sidebar (schemas panel) toggle, refresh layout so graph fits the new canvas size
  const SIDEBAR_ANIMATION_MS = 250;
  useEffect(() => {
    const t = setTimeout(() => {
      handleRefreshLayout();
    }, SIDEBAR_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [sidebarVisible, handleRefreshLayout]);

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
    setGraphElementsEffective(updatedNodes, edges);
    
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

  const graphContent = (
      <div className={embedMode ? 'flex h-full min-h-0 flex-1 gap-4 overflow-hidden' : 'flex h-[calc(100vh-6.5rem)] gap-4 overflow-hidden'}>
        <AnimatePresence initial={false}>
          {!viewMode && sidebarVisible && (
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
          className={`flex min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-b from-background via-muted/40 to-background ${embedMode ? '' : 'rounded-lg border border-gray-400 dark:border-gray-700'}`}
          onDragOver={viewMode ? undefined : handleDragOverCanvas}
          onDrop={viewMode ? undefined : handleDropOnCanvas}
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
            viewMode={viewMode}
            hideSave={hideSelectEditAndSave}
          />
          <div className="flex-1">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              layout={layout}
              onNodeClick={viewMode ? undefined : handleNodeClick}
              onBackgroundClick={viewMode ? undefined : clearSelection}
              onElementsChange={viewMode ? undefined : setGraphElementsEffective}
              onReady={(handle) => {
                canvasHandleRef.current = handle;
              }}
              edgeModeEnabled={viewMode ? false : edgeModeEnabled}
              onEdgeCreated={viewMode ? undefined : (source, target) => {
                addEdgeEffective({ source, target });
              }}
              onEdgeModeDisable={viewMode ? undefined : () => {
                setEdgeModeEnabled(false);
              }}
              selectedNodeId={selectedNodeId}
              selectedNodeIds={selectedNodeIds}
              multiSelectEnabled={multiSelectEnabled}
              schemas={schemas}
              onNodeContextAction={viewMode ? undefined : (action, node) => {
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
              onEdgeContextAction={viewMode ? undefined : (action, edge) => {
                if (action === 'delete') {
                  openDeleteConfirmation('edge', edge);
                  return;
                }
                if (action === 'toggleOptional') {
                  const newEdges = edges.map((e) =>
                    e.id === edge.id ? { ...e, optional: !e.optional } : e
                  );
                  setGraphElementsEffective(nodes, newEdges);
                }
              }}
              extraNodeContextActions={viewMode ? undefined : extraNodeContextActions}
              hideSelectAndEdit={hideSelectEditAndSave}
              readOnly={viewMode}
            />
          </div>
        </div>
      </div>
  );

  if (embedMode) {
    return (
      <>
        {graphContent}
        {!viewMode && activeSchemaId && activeNodeForForm && !formJustSaved && (
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

      {!viewMode && (
        <ConfirmationMessage
          isOpen={deleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteConfirmation();
        }}
        title={deleteConfirmation.type === 'node' ? [{ en: 'Delete Node' }, { fa: 'حذف گره' }, { ar: 'حذف العقدة' }, { es: 'Eliminar nodo' }, { fr: 'Supprimer le nœud' }, { de: 'Knoten löschen' }, { it: 'Elimina nodo' }, { ru: 'Удалить узел' }] : [{ en: 'Delete Edge' }, { fa: 'حذف یال' }, { ar: 'حذف الحافة' }, { es: 'Eliminar arista' }, { fr: 'Supprimer l\'arête' }, { de: 'Kante löschen' }, { it: 'Elimina bordo' }, { ru: 'Удалить ребро' }]}
        subtitle={deleteConfirmation.type === 'node' ? [{ en: 'This will permanently remove the node and all its connected edges from the graph.' }, { fa: 'گره و تمام یال‌های متصل به آن به طور دائمی از گراف حذف می‌شوند.' }, { ar: 'سيتم إزالة العقدة وجميع الحواف المتصلة بها بشكل دائم من الرسم البياني.' }, { es: 'Esto eliminará permanentemente el nodo y todas sus aristas conectadas del grafo.' }, { fr: 'Le nœud et toutes ses arêtes connectées seront définitivement supprimés du graphe.' }, { de: 'Der Knoten und alle verbundenen Kanten werden dauerhaft aus dem Graphen entfernt.' }, { it: 'Il nodo e tutti i bordi collegati verranno rimossi permanentemente dal grafico.' }, { ru: 'Узел и все связанные рёбра будут окончательно удалены из графа.' }] : [{ en: 'This will permanently remove the edge from the graph.' }, { fa: 'یال به طور دائمی از گراف حذف می‌شود.' }, { ar: 'سيتم إزالة الحافة بشكل دائم من الرسم البياني.' }, { es: 'Esto eliminará permanentemente la arista del grafo.' }, { fr: 'L\'arête sera définitivement supprimée du graphe.' }, { de: 'Die Kante wird dauerhaft aus dem Graphen entfernt.' }, { it: 'Il bordo verrà rimosso permanentemente dal grafico.' }, { ru: 'Ребро будет окончательно удалено из графа.' }]}
        message={deleteConfirmation.type === 'node' && deleteConfirmation.item ? `Are you sure you want to delete the node "${(deleteConfirmation.item as GraphNodeData).title || deleteConfirmation.item.id}"?` : deleteConfirmation.type === 'edge' ? [{ en: 'Are you sure you want to delete this edge?' }, { fa: 'آیا مطمئن هستید که می‌خواهید این یال را حذف کنید؟' }, { ar: 'هل أنت متأكد أنك تريد حذف هذه الحافة؟' }, { es: '¿Está seguro de que desea eliminar esta arista?' }, { fr: 'Voulez-vous vraiment supprimer cette arête ?' }, { de: 'Möchten Sie diese Kante wirklich löschen?' }, { it: 'Sei sicuro di voler eliminare questo bordo?' }, { ru: 'Вы уверены, что хотите удалить это ребро?' }] : ''}
        variant="destructive"
        buttons={[
          {
            label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
            variant: 'outline',
            action: closeDeleteConfirmation,
          },
          {
            label: getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang),
            variant: 'destructive',
            icon: 'Trash2',
            action: confirmDelete,
          },
        ]}
        />
      )}

      {!viewMode && (
        <ConfirmationMessage
          isOpen={showResetConfirmation}
        onOpenChange={setShowResetConfirmation}
        title={[{ en: 'Reset Graph' }, { fa: 'بازنشانی گراف' }, { ar: 'إعادة تعيين الرسم البياني' }, { es: 'Restablecer grafo' }, { fr: 'Réinitialiser le graphe' }, { de: 'Graph zurücksetzen' }, { it: 'Reimposta grafico' }, { ru: 'Сбросить граф' }]}
        subtitle={[{ en: 'This will permanently clear all nodes and edges from the current graph.' }, { fa: 'همه گره‌ها و یال‌ها به طور دائمی از گراف فعلی پاک می‌شوند.' }, { ar: 'سيؤدي هذا إلى مسح جميع العقد والحواف بشكل دائم من الرسم البياني الحالي.' }, { es: 'Esto borrará permanentemente todos los nodos y aristas del grafo actual.' }, { fr: 'Cela effacera définitivement tous les nœuds et arêtes du graphe actuel.' }, { de: 'Alle Knoten und Kanten werden dauerhaft aus dem aktuellen Graphen gelöscht.' }, { it: 'Tutti i nodi e i bordi verranno rimossi permanentemente dal grafico corrente.' }, { ru: 'Все узлы и рёбра будут окончательно удалены из текущего графа.' }]}
        message={[{ en: `Are you sure you want to reset the graph? This action cannot be undone. You will lose all ${nodes.length} node(s) and ${edges.length} edge(s).` }, { fa: `آیا مطمئن هستید که می‌خواهید گراف را بازنشانی کنید؟ این عمل قابل بازگشت نیست. ${nodes.length} گره و ${edges.length} یال از دست خواهند رفت.` }, { ar: `هل أنت متأكد أنك تريد إعادة تعيين الرسم البياني؟ لا يمكن التراجع عن هذا الإجراء. ستفقد ${nodes.length} عقدة و${edges.length} حافة.` }, { es: `¿Está seguro de que desea restablecer el grafo? Esta acción no se puede deshacer. Perderá ${nodes.length} nodo(s) y ${edges.length} arista(s).` }, { fr: `Voulez-vous vraiment réinitialiser le graphe ? Cette action est irréversible. Vous perdrez ${nodes.length} nœud(s) et ${edges.length} arête(s).` }, { de: `Möchten Sie den Graphen wirklich zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden. Sie verlieren ${nodes.length} Knoten und ${edges.length} Kanten.` }, { it: `Sei sicuro di voler reimpostare il grafico? Questa azione non può essere annullata. Perderai ${nodes.length} nodo/i e ${edges.length} bordo/i.` }, { ru: `Вы уверены, что хотите сбросить граф? Это действие нельзя отменить. Вы потеряете ${nodes.length} узл(ов) и ${edges.length} рёбер.` }]}
        variant="warning"
        buttons={[
          {
            label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
            variant: 'outline',
            action: () => setShowResetConfirmation(false),
          },
          {
            label: getT(TRANSLATION_KEYS.BUTTON_RESET_GRAPH, language, defaultLang),
            variant: 'destructive',
            icon: 'RotateCcw',
            action: confirmReset,
          },
        ]}
        />
      )}

      {/* Popup Picker for selecting existing data */}
      {!viewMode && pickerState.schema && (
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
    </>
    );
  }

  return (
    <>
      {graphContent}
      {!viewMode && activeSchemaId && activeNodeForForm && !formJustSaved && (
        <FormModal
          key={`${activeSchemaId}-${activeEntityId ?? 'new'}-${activeNodeForForm.id}-${activeNodeForForm.nodeId ?? 'no-nodeid'}`}
          schemaId={activeSchemaId}
          entityId={activeEntityId}
          mode={activeFormMode}
          onSuccess={(data) => {
            if (!activeNodeForForm || !activeSchemaId) return;
            const entityId = (data as any)?.id;
            if (!entityId) return;
            const schema = schemas.find((s) => s.id === activeSchemaId);
            const EXCLUDED_TITLE_ROLES = new Set(['code', 'subtitle', 'description']);
            let extractedTitle: string = '';
            if (schema) {
              if (schema.fields?.some((field) => field.role === 'title')) {
                const titleByRole = getValueByRole(schema, data as any, 'title');
                if (typeof titleByRole === 'string' && titleByRole.trim() !== '') extractedTitle = titleByRole;
              }
              if (!extractedTitle) {
                const textFields = schema.fields
                  ?.filter(
                    (field) =>
                      field.component === 'text' &&
                      (!field.role || !EXCLUDED_TITLE_ROLES.has(field.role)) &&
                      hasDisplayValue((data as any)[field.name])
                  )
                  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                if (textFields?.[0]) {
                  const value = (data as any)[textFields[0].name];
                  extractedTitle = getPrimaryDisplayString(value) || (value != null ? String(value).trim() : '') || '';
                }
              }
            }
            if (!extractedTitle) extractedTitle = (data as any).name ?? (data as any).title ?? (data as any).label ?? String(entityId);
            if (!extractedTitle?.trim()) extractedTitle = String(entityId);
            const duplicateNode = nodes.find((n) => n.nodeId === entityId && n.id !== activeNodeForForm.id);
            if (duplicateNode) {
              toast.error(`This entity is already linked to node "${duplicateNode.title || duplicateNode.id}".`);
              return;
            }
            const updatedNode: GraphNodeData = {
              id: activeNodeForForm.id,
              schemaId: activeNodeForForm.schemaId,
              nodeId: entityId,
              title: extractedTitle,
              incomplete: false,
              parentId: activeNodeForForm.parentId ?? null,
              payload: { ...(activeNodeForForm.payload ?? {}), ...(data ?? {}), id: entityId },
            };
            updateNode(updatedNode);
            formJustSavedRef.current = true;
            setFormJustSaved(true);
            setActiveNodeForForm(null);
            setTimeout(() => { formJustSavedRef.current = false; setFormJustSaved(false); }, 100);
          }}
          onClose={() => setActiveNodeForForm(null)}
        />
      )}
      {!viewMode && (
        <ConfirmationMessage
          isOpen={deleteConfirmation.isOpen}
          onOpenChange={(open) => { if (!open) closeDeleteConfirmation(); }}
          title={deleteConfirmation.type === 'node' ? [{ en: 'Delete Node' }, { fa: 'حذف گره' }, { ar: 'حذف العقدة' }, { es: 'Eliminar nodo' }, { fr: 'Supprimer le nœud' }, { de: 'Knoten löschen' }, { it: 'Elimina nodo' }, { ru: 'Удалить узел' }] : [{ en: 'Delete Edge' }, { fa: 'حذف یال' }, { ar: 'حذف الحافة' }, { es: 'Eliminar arista' }, { fr: 'Supprimer l\'arête' }, { de: 'Kante löschen' }, { it: 'Elimina bordo' }, { ru: 'Удалить ребро' }]}
          subtitle={deleteConfirmation.type === 'node' ? [{ en: 'This will permanently remove the node and all its connected edges from the graph.' }, { fa: 'گره و تمام یال‌های متصل به آن به طور دائمی از گراف حذف می‌شوند.' }, { ar: 'سيتم إزالة العقدة وجميع الحواف المتصلة بها بشكل دائم من الرسم البياني.' }, { es: 'Esto eliminará permanentemente el nodo y todas sus aristas conectadas del grafo.' }, { fr: 'Le nœud et toutes ses arêtes connectées seront définitivement supprimés du graphe.' }, { de: 'Der Knoten und alle verbundenen Kanten werden dauerhaft aus dem Graphen entfernt.' }, { it: 'Il nodo e tutti i bordi collegati verranno rimossi permanentemente dal grafico.' }, { ru: 'Узел и все связанные рёбра будут окончательно удалены из графа.' }] : [{ en: 'This will permanently remove the edge from the graph.' }, { fa: 'یال به طور دائمی از گراف حذف می‌شود.' }, { ar: 'سيتم إزالة الحافة بشكل دائم من الرسم البياني.' }, { es: 'Esto eliminará permanentemente la arista del grafo.' }, { fr: 'L\'arête sera définitivement supprimée du graphe.' }, { de: 'Die Kante wird dauerhaft aus dem Graphen entfernt.' }, { it: 'Il bordo verrà rimosso permanentemente dal grafico.' }, { ru: 'Ребро будет окончательно удалено из графа.' }]}
          message={deleteConfirmation.type === 'node' && deleteConfirmation.item ? `Are you sure you want to delete the node "${(deleteConfirmation.item as GraphNodeData).title || deleteConfirmation.item.id}"?` : deleteConfirmation.type === 'edge' ? [{ en: 'Are you sure you want to delete this edge?' }, { fa: 'آیا مطمئن هستید که می‌خواهید این یال را حذف کنید؟' }, { ar: 'هل أنت متأكد أنك تريد حذف هذه الحافة؟' }, { es: '¿Está seguro de que desea eliminar esta arista?' }, { fr: 'Voulez-vous vraiment supprimer cette arête ?' }, { de: 'Möchten Sie diese Kante wirklich löschen?' }, { it: 'Sei sicuro di voler eliminare questo bordo?' }, { ru: 'Вы уверены, что хотите удалить это ребро?' }] : ''}
          variant="destructive"
          buttons={[{ label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang), variant: 'outline', action: closeDeleteConfirmation }, { label: getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang), variant: 'destructive', icon: 'Trash2', action: confirmDelete }]}
        />
      )}
      {!viewMode && (
        <ConfirmationMessage
          isOpen={showResetConfirmation}
          onOpenChange={setShowResetConfirmation}
          title={[{ en: 'Reset Graph' }, { fa: 'بازنشانی گراف' }, { ar: 'إعادة تعيين الرسم البياني' }, { es: 'Restablecer grafo' }, { fr: 'Réinitialiser le graphe' }, { de: 'Graph zurücksetzen' }, { it: 'Reimposta grafico' }, { ru: 'Сбросить граф' }]}
          subtitle={[{ en: 'This will permanently clear all nodes and edges from the current graph.' }, { fa: 'همه گره‌ها و یال‌ها به طور دائمی از گراف فعلی پاک می‌شوند.' }, { ar: 'سيؤدي هذا إلى مسح جميع العقد والحواف بشكل دائم من الرسم البياني الحالي.' }, { es: 'Esto borrará permanentemente todos los nodos y aristas del grafo actual.' }, { fr: 'Cela effacera définitivement tous les nœuds et arêtes du graphe actuel.' }, { de: 'Alle Knoten und Kanten werden dauerhaft aus dem aktuellen Graphen gelöscht.' }, { it: 'Tutti i nodi e i bordi verranno rimossi permanentemente dal grafico corrente.' }, { ru: 'Все узлы и рёбра будут окончательно удалены из текущего графа.' }]}
          message={[{ en: `Are you sure you want to reset the graph? This action cannot be undone. You will lose all ${nodes.length} node(s) and ${edges.length} edge(s).` }, { fa: `آیا مطمئن هستید که می‌خواهید گراف را بازنشانی کنید؟ این عمل قابل بازگشت نیست. ${nodes.length} گره و ${edges.length} یال از دست خواهند رفت.` }, { ar: `هل أنت متأكد أنك تريد إعادة تعيين الرسم البياني؟ لا يمكن التراجع عن هذا الإجراء. ستفقد ${nodes.length} عقدة و${edges.length} حافة.` }, { es: `¿Está seguro de que desea restablecer el grafo? Esta acción no se puede deshacer. Perderá ${nodes.length} nodo(s) y ${edges.length} arista(s).` }, { fr: `Voulez-vous vraiment réinitialiser le graphe ? Cette action est irréversible. Vous perdrez ${nodes.length} nœud(s) et ${edges.length} arête(s).` }, { de: `Möchten Sie den Graphen wirklich zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden. Sie verlieren ${nodes.length} Knoten und ${edges.length} Kanten.` }, { it: `Sei sicuro di voler reimpostare il grafico? Questa azione non può essere annullata. Perderai ${nodes.length} nodo/i e ${edges.length} bordo/i.` }, { ru: `Вы уверены, что хотите сбросить граф? Это действие нельзя отменить. Вы потеряете ${nodes.length} узл(ов) и ${edges.length} рёбер.` }]}
          variant="warning"
          buttons={[{ label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang), variant: 'outline', action: () => setShowResetConfirmation(false) }, { label: getT(TRANSLATION_KEYS.BUTTON_RESET_GRAPH, language, defaultLang), variant: 'destructive', icon: 'RotateCcw', action: confirmReset }]}
        />
      )}
      {!viewMode && pickerState.schema && (
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
    </>
  );
}



