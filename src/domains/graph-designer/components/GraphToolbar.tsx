'use client';

import React, { useEffect, useState } from 'react';
import {
  Group,
  MousePointer2,
  MousePointerSquareDashed,
  Route,
  Undo2,
  Redo2,
  Sidebar as SidebarIcon,
  Save,
  LayoutTemplate,
  ImageDown,
  RotateCcw,
  RefreshCw,
  ArrowDown,
  ArrowRight,
  Network,
  TreePine,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GraphLayout } from '../types';

// Layout configuration with icons and display names
const LAYOUT_CONFIG: Record<GraphLayout, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
  dagre: { name: 'Top-Down', icon: ArrowDown },
  'dagre-lr': { name: 'Left-Right', icon: ArrowRight },
  cose: { name: 'Force-Directed', icon: Network },
  breadthfirst: { name: 'Breadth-First', icon: TreePine },
};

interface GraphToolbarProps {
  layout: GraphLayout;
  onLayoutChange: (layout: GraphLayout) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  multiSelectEnabled: boolean;
  onToggleMultiSelect: () => void;
  edgeModeEnabled: boolean;
  onToggleEdgeMode: () => void;
  onGroupSelection: () => void;
  onExportPng: () => void;
  onSave: () => void;
  onReset: () => void;
  onRefreshLayout: () => void;
}

export function GraphToolbar(props: GraphToolbarProps) {
  const {
    layout,
    onLayoutChange,
    sidebarVisible,
    onToggleSidebar,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    multiSelectEnabled,
    onToggleMultiSelect,
    edgeModeEnabled,
    onToggleEdgeMode,
    onGroupSelection,
    onExportPng,
    onSave,
    onReset,
    onRefreshLayout,
  } = props;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Render a minimal non-interactive shell on the server to avoid Radix Select hydration ID mismatches
    return (
      <div className="flex items-center gap-2 border-b border-gray-400 dark:border-gray-700 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" disabled>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="h-7 w-40 rounded-lg bg-muted" />
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-gray-400 dark:border-gray-700 px-3 py-2">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSidebar}
          title={sidebarVisible ? 'Hide schema panel' : 'Show schema panel'}
        >
          <SidebarIcon
            className={`h-4 w-4 transition-transform ${
              sidebarVisible ? '' : '-scale-x-100'
            }`}
          />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Button
          variant={multiSelectEnabled ? 'default' : 'outline'}
          size="icon"
          onClick={onToggleMultiSelect}
          title="Toggle multi-select (useful on mobile)"
        >
          {multiSelectEnabled ? <MousePointerSquareDashed className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
        </Button>
        <Button
          variant={edgeModeEnabled ? 'default' : 'outline'}
          size="icon"
          onClick={onToggleEdgeMode}
          title="Toggle edge creation mode"
        >
          <Route className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onGroupSelection}
          title="Group selected nodes"
        >
          <Group className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/50">
        <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
        <Select
          value={layout}
          onValueChange={(value) => onLayoutChange(value as GraphLayout)}
        >
          <SelectTrigger className="h-8 w-36 text-xs border-0 bg-transparent shadow-none focus:ring-0">
            <SelectValue placeholder="Layout">
              <div className="flex items-center gap-2">
                {(() => {
                  const config = LAYOUT_CONFIG[layout];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{config.name}</span>
                    </>
                  );
                })()}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LAYOUT_CONFIG).map(([value, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{config.name}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onRefreshLayout}
          title="Refresh layout (re-apply current layout)"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onExportPng} title="Export as PNG">
          <ImageDown className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onReset} title="Reset Graph">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="default" size="icon" onClick={onSave} title="Save Graph">
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


