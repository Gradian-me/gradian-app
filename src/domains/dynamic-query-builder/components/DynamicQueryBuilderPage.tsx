'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PanelRightClose, PanelRightOpen, Layers, ExternalLink } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { GraphDesignerWrapper } from '@/domains/graph-designer';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';
import { useSchemas as useSchemaSummaries } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { DynamicQueryGroupingDialog } from './DynamicQueryGroupingDialog';
import { graphToPatterns, patternsToGraph } from '../utils/graph-pattern-convert';
import type {
  DynamicQueryColumnDef,
  DynamicQueryConfig,
  DynamicQueryPagination,
} from '../types';

const DEFAULT_PAGINATION: DynamicQueryPagination = {
  limit: 100,
  offset: 0,
  strategy: 'offset',
};

const MAX_GRAPH_NODES = 200;

function parseMetadata(metadata: unknown): Partial<DynamicQueryConfig> | null {
  if (metadata == null) return null;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as Partial<DynamicQueryConfig>;
    } catch {
      return null;
    }
  }
  if (typeof metadata === 'object' && metadata !== null) {
    return metadata as Partial<DynamicQueryConfig>;
  }
  return null;
}

/** Catches graph render errors so the page does not fully crash */
class GraphErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[DynamicQueryBuilder] Graph error:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export interface DynamicQueryBuilderPageProps {
  /** For edit mode: full entity from GET /api/data/dynamic-queries/[id] */
  initialEntity?: Record<string, unknown> | null;
  /** Called after successful create (with new id) or save */
  onSaveSuccess?: (id: string) => void;
}

export function DynamicQueryBuilderPage({
  initialEntity,
  onSaveSuccess,
}: DynamicQueryBuilderPageProps) {
  const router = useRouter();
  const BackIcon = useBackIcon();
  const isEditMode = !!initialEntity?.id;
  const { schemas } = useSchemaSummaries({ summary: false });

  const parsed = useMemo(() => {
    if (!initialEntity?.metadata) {
      return {
        columns: [] as DynamicQueryColumnDef[],
        nodes: [] as GraphNodeData[],
        edges: [] as GraphEdgeData[],
        applyRBAC: false,
        pagination: DEFAULT_PAGINATION,
      };
    }
    const meta = parseMetadata(initialEntity.metadata);
    if (!meta) {
      return {
        columns: [] as DynamicQueryColumnDef[],
        nodes: [] as GraphNodeData[],
        edges: [] as GraphEdgeData[],
        applyRBAC: false,
        pagination: DEFAULT_PAGINATION,
      };
    }
    const columns = Array.isArray(meta.columns) ? meta.columns : [];
    const patterns = Array.isArray(meta.patterns) ? meta.patterns : [];
    const { nodes, edges } = patternsToGraph(patterns, schemas);
    return {
      columns,
      nodes,
      edges,
      applyRBAC: !!meta.applyRBAC,
      pagination:
        meta.pagination && typeof meta.pagination === 'object'
          ? {
              limit: Number(meta.pagination.limit) || 100,
              offset: Number(meta.pagination.offset) || 0,
              strategy: (meta.pagination.strategy === 'cursor' ? 'cursor' : 'offset') as DynamicQueryPagination['strategy'],
            }
          : DEFAULT_PAGINATION,
    };
  }, [initialEntity, schemas]);

  const [name, setName] = useState<string>(
    (initialEntity?.name as string) ?? 'New Dynamic Query'
  );
  const [description, setDescription] = useState<string>(
    (initialEntity?.description as string) ?? ''
  );
  const [columns, setColumns] = useState<DynamicQueryColumnDef[]>(parsed.columns);
  const [nodes, setNodes] = useState<GraphNodeData[]>(parsed.nodes);
  const [edges, setEdges] = useState<GraphEdgeData[]>(parsed.edges);
  const [applyRBAC, setApplyRBAC] = useState(parsed.applyRBAC);
  const [pagination, setPagination] = useState<DynamicQueryPagination>(parsed.pagination);
  const [openColumnsDialogTab, setOpenColumnsDialogTab] = useState<'select' | 'grouping' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsDescription, setSaveAsDescription] = useState('');
  const [saveAsSaving, setSaveAsSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [graphReady, setGraphReady] = useState(false);

  // Defer mounting the graph so the page shell paints first (avoids long block and crash on heavy init)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const frameId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => setGraphReady(true), 0);
    });
    return () => {
      cancelAnimationFrame(frameId);
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  // Sync state when initialEntity is loaded (e.g. after fetch in parent)
  useEffect(() => {
    if (!initialEntity?.metadata) return;
    const meta = parseMetadata(initialEntity.metadata);
    if (!meta) return;
    setName((initialEntity.name as string) ?? 'New Dynamic Query');
    setDescription((initialEntity.description as string) ?? '');
    setColumns(Array.isArray(meta.columns) ? meta.columns : []);
    const pats = Array.isArray(meta.patterns) ? meta.patterns : [];
    const { nodes: n, edges: e } = patternsToGraph(pats, schemas);
    setNodes(n);
    setEdges(e);
    setApplyRBAC(!!meta.applyRBAC);
    setPagination(
      meta.pagination && typeof meta.pagination === 'object'
        ? {
            limit: Number(meta.pagination.limit) || 100,
            offset: Number(meta.pagination.offset) || 0,
            strategy: meta.pagination.strategy === 'cursor' ? 'cursor' : 'offset',
          }
        : DEFAULT_PAGINATION
    );
  }, [initialEntity, schemas]);

  const groupingCount = useMemo(
    () => columns.filter((c) => c.groupOrder !== undefined && c.groupOrder >= 0).length,
    [columns]
  );

  const handleGraphChange = useCallback((newNodes: GraphNodeData[], newEdges: GraphEdgeData[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const patterns = graphToPatterns(nodes, edges, { edgeOptional: true });
      const metadata: DynamicQueryConfig = {
        columns,
        patterns,
        applyRBAC,
        pagination,
      };

      if (isEditMode && initialEntity?.id) {
        const body = {
          ...initialEntity,
          name: name.trim() || (initialEntity.name as string),
          description: description.trim(),
          metadata,
        };
        const res = await fetch(`/api/data/dynamic-queries/${String(initialEntity.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText || 'Failed to save');
        }
        toast.success('Saved');
        onSaveSuccess?.(String(initialEntity.id));
      } else {
        const body = {
          name: name.trim() || 'New Dynamic Query',
          description: description.trim(),
          metadata,
        };
        const res = await fetch('/api/data/dynamic-queries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText || 'Failed to create');
        }
        const data = await res.json();
        const newId = data?.data?.id ?? data?.id;
        if (newId) {
          toast.success('Created');
          onSaveSuccess?.(String(newId));
          router.push(`/builder/dynamic-query-builder/${newId}`);
        } else {
          toast.success('Created');
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [
    isEditMode,
    initialEntity,
    name,
    description,
    columns,
    nodes,
    edges,
    applyRBAC,
    pagination,
    onSaveSuccess,
    router,
  ]);

  const openSaveAsDialog = useCallback(() => {
    setSaveAsName(name ? `${name} (copy)` : 'New Dynamic Query');
    setSaveAsDescription(description);
    setSaveAsOpen(true);
  }, [name, description]);

  const handleSaveAs = useCallback(async () => {
    setSaveAsSaving(true);
    try {
      const patterns = graphToPatterns(nodes, edges, { edgeOptional: true });
      const metadata: DynamicQueryConfig = {
        columns,
        patterns,
        applyRBAC,
        pagination,
      };
      const body = {
        name: saveAsName.trim() || 'New Dynamic Query',
        description: saveAsDescription.trim(),
        metadata,
      };
      const res = await fetch('/api/data/dynamic-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || 'Failed to save as');
      }
      const data = await res.json();
      const newId = data?.data?.id ?? data?.id;
      if (!newId) throw new Error('No id returned');
      toast.success('Saved as new query');
      setSaveAsOpen(false);
      onSaveSuccess?.(String(newId));
      router.push(`/builder/dynamic-query-builder/${newId}`);
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        window.open(`${origin}/dynamic-query/${newId}`, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save as failed');
    } finally {
      setSaveAsSaving(false);
    }
  }, [
    nodes,
    edges,
    columns,
    applyRBAC,
    pagination,
    saveAsName,
    saveAsDescription,
    onSaveSuccess,
    router,
  ]);

  const extraNodeContextActions = useMemo(
    () => [
      {
        label: 'Configure columns',
        action: () => setOpenColumnsDialogTab('select'),
      },
    ],
    []
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link href="/builder">
            <BackIcon className="h-4 w-4" />
            Builder
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{name || 'Dynamic Query Builder'}</h1>
          {description ? (
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Design patterns and columns</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const id = initialEntity?.id as string | undefined;
            if (id && typeof window !== 'undefined') {
              const origin = window.location.origin;
              window.open(`${origin}/dynamic-query/${id}`, '_blank', 'noopener,noreferrer');
            }
          }}
          disabled={!initialEntity?.id}
          className="shrink-0 gap-1"
          title={initialEntity?.id ? 'Preview results in new tab' : 'Save query to preview'}
        >
          <ExternalLink className="h-4 w-4" />
          Preview
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsOpen((o) => !o)}
          className="shrink-0 gap-1"
          title={settingsOpen ? 'Hide settings' : 'Show settings'}
        >
          {settingsOpen ? (
            <>
              <PanelRightClose className="h-4 w-4" />
              Settings
            </>
          ) : (
            <>
              <PanelRightOpen className="h-4 w-4" />
              Settings
            </>
          )}
        </Button>
      </header>
      <div className="relative flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-400 bg-background dark:border-gray-700">
          {!graphReady ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                <p className="text-sm">Loading graph...</p>
              </div>
            </div>
          ) : nodes.length > MAX_GRAPH_NODES ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <p className="text-sm font-medium">Graph too large</p>
              <p className="text-xs">
                This query has {nodes.length} nodes. Display is limited to {MAX_GRAPH_NODES} for performance.
              </p>
            </div>
          ) : (
            <GraphErrorBoundary
              fallback={
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                  <p className="text-sm font-medium">Graph failed to load</p>
                  <p className="text-xs">Try refreshing the page or opening a different query.</p>
                </div>
              }
            >
              <GraphDesignerWrapper
                graphData={{ nodes, edges }}
                onGraphChange={handleGraphChange}
                embedMode
                hideSelectEditAndSave
              />
            </GraphErrorBoundary>
          )}
        </div>
        {settingsOpen && (
          <div className="w-80 shrink-0 space-y-4 overflow-y-auto rounded-lg border border-gray-400 bg-muted/30 p-4 dark:border-gray-700">
            <div className="space-y-2">
              <Label htmlFor="dq-name">Name</Label>
              <Input
                id="dq-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Query name"
              />
            </div>
          <div className="space-y-2">
            <Label htmlFor="dq-desc">Description</Label>
            <Input
              id="dq-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dq-rbac">Apply RBAC</Label>
            <Switch
              id="dq-rbac"
              checked={applyRBAC}
              onCheckedChange={setApplyRBAC}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setOpenColumnsDialogTab('select')}
          >
            <Layers className="h-4 w-4" />
            Select columns
            {columns.length > 0 && (
              <Badge variant="secondary" className="ml-1 shrink-0">
                {columns.length}
              </Badge>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setOpenColumnsDialogTab('grouping')}
          >
            <Layers className="h-4 w-4" />
            Grouping
            {groupingCount > 0 && (
              <Badge variant="secondary" className="ml-1 shrink-0">
                {groupingCount}
              </Badge>
            )}
          </Button>
          <div className="space-y-2">
            <Label>Pagination</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={pagination.limit}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v >= 1)
                      setPagination((p) => ({ ...p, limit: v }));
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Offset</Label>
                <Input
                  type="number"
                  min={0}
                  value={pagination.offset}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v >= 0)
                      setPagination((p) => ({ ...p, offset: v }));
                  }}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Strategy</Label>
              <Select
                value={pagination.strategy}
                onValueChange={(value: 'offset' | 'cursor') =>
                  setPagination((p) => ({ ...p, strategy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offset">Offset</SelectItem>
                  <SelectItem value="cursor">Cursor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditMode ? 'Save' : 'Create'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={openSaveAsDialog}
            disabled={saving}
          >
            Save as
          </Button>
          </div>
        )}
      </div>

      <DynamicQueryGroupingDialog
        open={openColumnsDialogTab !== null}
        onOpenChange={(open) => !open && setOpenColumnsDialogTab(null)}
        initialTab={openColumnsDialogTab === null ? 'select' : openColumnsDialogTab}
        nodes={nodes}
        schemas={schemas}
        columns={columns}
        onChange={setColumns}
      />

      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent className="!max-w-[42rem] w-[42rem]">
          <DialogHeader>
            <DialogTitle>Save as</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="save-as-name">Title</Label>
              <Input
                id="save-as-name"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="New Dynamic Query"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="save-as-description">Description</Label>
              <Input
                id="save-as-description"
                value={saveAsDescription}
                onChange={(e) => setSaveAsDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveAsOpen(false)}
              disabled={saveAsSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveAs} disabled={saveAsSaving}>
              {saveAsSaving ? 'Saving...' : 'Save as new'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
