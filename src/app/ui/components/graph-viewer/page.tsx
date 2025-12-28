'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Info } from 'lucide-react';
import { CardWrapper, CardHeader, CardTitle, CardContent } from '@/gradian-ui/data-display/card/components/CardWrapper';
import { formatKeyToLabel, formatValueForDisplay } from '@/gradian-ui/shared/utils/text-utils';

export interface NodeType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface RelationType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface Schema {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  nodeTypes?: NodeType[];
  relationTypes?: RelationType[];
  schemas?: Schema[];
}

// Single consolidated JSON object for pharmaceutical root cause analysis
// This structure can be easily read and used in real-life scenarios
const GRAPH_DATA: GraphData = {
  schemas: [
    { id: 'deviation', label: 'Deviation', color: 'red', icon: 'AlertTriangle' },
    { id: 'cause', label: 'Cause', color: 'blue', icon: 'Search' },
    { id: 'action', label: 'Action', color: 'green', icon: 'CheckCircle' },
  ],
  nodeTypes: [
    { id: 'deviation', label: 'Deviation', color: 'red', icon: 'AlertTriangle' },
    { id: 'cause-man', label: 'Man', color: 'blue', icon: 'User' },
    { id: 'cause-machine', label: 'Machine', color: 'orange', icon: 'Cog' },
    { id: 'cause-method', label: 'Method', color: 'green', icon: 'FileText' },
    { id: 'action-immediate', label: 'Immediate Action', color: 'rose', icon: 'Zap' },
    { id: 'action-corrective', label: 'Corrective Action', color: 'amber', icon: 'Wrench' },
    { id: 'action-preventive', label: 'Preventive Action', color: 'emerald', icon: 'Shield' },
  ],
  relationTypes: [
    { id: 'causes', label: 'Causes', color: 'red', icon: 'ArrowRight' },
    { id: 'affects', label: 'Affects', color: 'blue', icon: 'ArrowRight' },
    { id: 'triggers', label: 'Triggers', color: 'orange', icon: 'ArrowRight' },
    { id: 'exacerbates', label: 'Exacerbates', color: 'rose', icon: 'ArrowRight' },
    { id: 'contributes-to', label: 'Contributes To', color: 'violet', icon: 'ArrowRight' },
  ],
  nodes: [
    {
      id: 'dv-2025-0198',
      schemaId: 'deviation',
      title: 'DV-2025-0198: Product Quality Deviation',
      incomplete: false,
      parentId: null,
      payload: {
        deviationNumber: 'DV-2025-0198',
        severity: 'Critical',
        status: 'Under Investigation',
        dateIdentified: '2025-01-15',
        investigationPeriod: '6 months',
        nodeTypeId: 'deviation',
      },
    },
    // Man (Human) Causes - can affect each other
    {
      id: 'man-1',
      schemaId: 'cause',
      title: 'Operator Error - Incorrect Parameter Entry',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'man',
        nodeTypeId: 'cause-man',
        category: 'Human Error',
        impact: 'High',
        dateFound: '2025-01-20',
      },
    },
    {
      id: 'man-2',
      schemaId: 'cause',
      title: 'Insufficient Training on New Equipment',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'man',
        nodeTypeId: 'cause-man',
        category: 'Training Gap',
        impact: 'Medium',
        dateFound: '2025-01-22',
      },
    },
    {
      id: 'man-3',
      schemaId: 'cause',
      title: 'Supervisor Oversight Failure',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'man',
        nodeTypeId: 'cause-man',
        category: 'Management',
        impact: 'Medium',
        dateFound: '2025-01-25',
      },
    },
    // Machine Causes - can affect each other
    {
      id: 'machine-1',
      schemaId: 'cause',
      title: 'Mixer Unit A - Calibration Drift',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'machine',
        nodeTypeId: 'cause-machine',
        category: 'Equipment Failure',
        impact: 'High',
        dateFound: '2025-01-18',
      },
    },
    {
      id: 'machine-2',
      schemaId: 'cause',
      title: 'Temperature Control System Malfunction',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'machine',
        nodeTypeId: 'cause-machine',
        category: 'Equipment Failure',
        impact: 'High',
        dateFound: '2025-01-19',
      },
    },
    {
      id: 'machine-3',
      schemaId: 'cause',
      title: 'Inadequate Preventive Maintenance',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'machine',
        nodeTypeId: 'cause-machine',
        category: 'Maintenance',
        impact: 'Medium',
        dateFound: '2025-01-21',
      },
    },
    // Method Causes - can affect each other
    {
      id: 'method-1',
      schemaId: 'cause',
      title: 'Inadequate Cleaning Procedure (SOP-045)',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'method',
        nodeTypeId: 'cause-method',
        category: 'Process Deficiency',
        impact: 'High',
        dateFound: '2025-01-23',
      },
    },
    {
      id: 'method-2',
      schemaId: 'cause',
      title: 'Missing Validation Step in Batch Record',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'method',
        nodeTypeId: 'cause-method',
        category: 'Documentation Gap',
        impact: 'Medium',
        dateFound: '2025-01-24',
      },
    },
    {
      id: 'method-3',
      schemaId: 'cause',
      title: 'Insufficient Quality Control Checks',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'method',
        nodeTypeId: 'cause-method',
        category: 'Process Control',
        impact: 'Medium',
        dateFound: '2025-01-26',
      },
    },
    // Actions Taken (all come OUT of DV)
    {
      id: 'action-1',
      schemaId: 'action',
      title: 'Immediate Batch Recall',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'immediate',
        nodeTypeId: 'action-immediate',
        category: 'Recall',
        dateCompleted: '2025-01-20',
        status: 'Completed',
      },
    },
    {
      id: 'action-2',
      schemaId: 'action',
      title: 'Equipment Maintenance & Calibration',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'corrective',
        nodeTypeId: 'action-corrective',
        category: 'Equipment',
        dateCompleted: '2025-02-05',
        status: 'Completed',
      },
    },
    {
      id: 'action-3',
      schemaId: 'action',
      title: 'Enhanced Cleaning SOP Implementation',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'preventive',
        nodeTypeId: 'action-preventive',
        category: 'Process',
        dateCompleted: '2025-02-15',
        status: 'Completed',
      },
    },
    {
      id: 'action-4',
      schemaId: 'action',
      title: 'Operator Training Program',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'preventive',
        nodeTypeId: 'action-preventive',
        category: 'Training',
        dateCompleted: '2025-03-01',
        status: 'Completed',
      },
    },
    {
      id: 'action-5',
      schemaId: 'action',
      title: 'Environmental Monitoring Upgrade',
      incomplete: false,
      parentId: null,
      payload: {
        type: 'preventive',
        nodeTypeId: 'action-preventive',
        category: 'Equipment',
        dateCompleted: '2025-03-20',
        status: 'Completed',
      },
    },
  ],
  edges: [
    // Man causes can affect each other
    {
      id: 'edge-man-1',
      source: 'man-1',
      target: 'man-2',
      sourceSchema: 'cause',
      sourceId: 'man-1',
      targetSchema: 'cause',
      targetId: 'man-2',
      relationTypeId: 'affects',
    },
    {
      id: 'edge-man-2',
      source: 'man-2',
      target: 'man-3',
      sourceSchema: 'cause',
      sourceId: 'man-2',
      targetSchema: 'cause',
      targetId: 'man-3',
      relationTypeId: 'affects',
    },
    // Machine causes can affect each other
    {
      id: 'edge-machine-1',
      source: 'machine-1',
      target: 'machine-2',
      sourceSchema: 'cause',
      sourceId: 'machine-1',
      targetSchema: 'cause',
      targetId: 'machine-2',
      relationTypeId: 'affects',
    },
    {
      id: 'edge-machine-2',
      source: 'machine-3',
      target: 'machine-1',
      sourceSchema: 'cause',
      sourceId: 'machine-3',
      targetSchema: 'cause',
      targetId: 'machine-1',
      relationTypeId: 'contributes-to',
    },
    // Method causes can affect each other
    {
      id: 'edge-method-1',
      source: 'method-1',
      target: 'method-2',
      sourceSchema: 'cause',
      sourceId: 'method-1',
      targetSchema: 'cause',
      targetId: 'method-2',
      relationTypeId: 'affects',
    },
    {
      id: 'edge-method-2',
      source: 'method-2',
      target: 'method-3',
      sourceSchema: 'cause',
      sourceId: 'method-2',
      targetSchema: 'cause',
      targetId: 'method-3',
      relationTypeId: 'affects',
    },
    // Cross-category interactions
    {
      id: 'edge-cross-1',
      source: 'man-1',
      target: 'machine-1',
      sourceSchema: 'cause',
      sourceId: 'man-1',
      targetSchema: 'cause',
      targetId: 'machine-1',
      relationTypeId: 'exacerbates',
    },
    {
      id: 'edge-cross-2',
      source: 'machine-2',
      target: 'method-1',
      sourceSchema: 'cause',
      sourceId: 'machine-2',
      targetSchema: 'cause',
      targetId: 'method-1',
      relationTypeId: 'exacerbates',
    },
    // All causes flow INTO the DV
    {
      id: 'edge-dv-1',
      source: 'man-1',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'man-1',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-2',
      source: 'man-2',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'man-2',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-3',
      source: 'man-3',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'man-3',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-4',
      source: 'machine-1',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'machine-1',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-5',
      source: 'machine-2',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'machine-2',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-6',
      source: 'machine-3',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'machine-3',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-7',
      source: 'method-1',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'method-1',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-8',
      source: 'method-2',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'method-2',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    {
      id: 'edge-dv-9',
      source: 'method-3',
      target: 'dv-2025-0198',
      sourceSchema: 'cause',
      sourceId: 'method-3',
      targetSchema: 'deviation',
      targetId: 'dv-2025-0198',
      relationTypeId: 'causes',
    },
    // Actions flow OUT of the DV (DV triggers actions)
    {
      id: 'edge-action-1',
      source: 'dv-2025-0198',
      target: 'action-1',
      sourceSchema: 'deviation',
      sourceId: 'dv-2025-0198',
      targetSchema: 'action',
      targetId: 'action-1',
      relationTypeId: 'triggers',
    },
    {
      id: 'edge-action-2',
      source: 'dv-2025-0198',
      target: 'action-2',
      sourceSchema: 'deviation',
      sourceId: 'dv-2025-0198',
      targetSchema: 'action',
      targetId: 'action-2',
      relationTypeId: 'triggers',
    },
    {
      id: 'edge-action-3',
      source: 'dv-2025-0198',
      target: 'action-3',
      sourceSchema: 'deviation',
      sourceId: 'dv-2025-0198',
      targetSchema: 'action',
      targetId: 'action-3',
      relationTypeId: 'triggers',
    },
    {
      id: 'edge-action-4',
      source: 'dv-2025-0198',
      target: 'action-4',
      sourceSchema: 'deviation',
      sourceId: 'dv-2025-0198',
      targetSchema: 'action',
      targetId: 'action-4',
      relationTypeId: 'triggers',
    },
    {
      id: 'edge-action-5',
      source: 'dv-2025-0198',
      target: 'action-5',
      sourceSchema: 'deviation',
      sourceId: 'dv-2025-0198',
      targetSchema: 'action',
      targetId: 'action-5',
      relationTypeId: 'triggers',
    },
  ],
};

// Helper function to get initial data (for backward compatibility)
const getInitialData = (): GraphData => GRAPH_DATA;

export default function GraphViewerPage() {
  const initialData = useMemo(() => getInitialData(), []);
  
  // Compute initial graph data (from localStorage if available, otherwise use default)
  const getInitialGraphData = useCallback((): GraphData => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('graph-viewer-data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && 
              Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
            // Clear the stored data after reading it
            window.localStorage.removeItem('graph-viewer-data');
            return {
              nodes: parsed.nodes as GraphNodeData[],
              edges: parsed.edges as GraphEdgeData[],
              nodeTypes: parsed.nodeTypes || initialData.nodeTypes,
              relationTypes: parsed.relationTypes || initialData.relationTypes,
              schemas: parsed.schemas || initialData.schemas,
            };
          }
        }
      } catch (error) {
        console.warn('Failed to load graph data from localStorage:', error);
        // Clear invalid data
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('graph-viewer-data');
        }
      }
    }
    return initialData;
  }, [initialData]);
  
  const initialGraphData = useMemo(() => getInitialGraphData(), [getInitialGraphData]);
  
  const [graphData, setGraphData] = useState<GraphData>(initialGraphData);
  const [jsonCode, setJsonCode] = useState(() => 
    JSON.stringify(initialGraphData, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedNodePayload, setSelectedNodePayload] = useState<{ node: GraphNodeData; payload: any } | null>(null);

  const handleJsonChange = useCallback((newCode: string) => {
    setJsonCode(newCode);
    try {
      const parsed = JSON.parse(newCode);
      if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.edges && Array.isArray(parsed.edges)) {
        setGraphData({
          nodes: parsed.nodes as GraphNodeData[],
          edges: parsed.edges as GraphEdgeData[],
          nodeTypes: parsed.nodeTypes || initialData.nodeTypes,
          relationTypes: parsed.relationTypes || initialData.relationTypes,
          schemas: parsed.schemas || initialData.schemas,
        });
        setJsonError(null);
      } else {
        setJsonError('Invalid format: must have "nodes" and "edges" arrays');
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  }, [initialData]);

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;

  const handleNodeClick = useCallback((node: GraphNodeData) => {
    if (node.payload && Object.keys(node.payload).length > 0) {
      setSelectedNodePayload({ node, payload: node.payload });
    }
  }, []);
    
  return (
    <MainLayout
      title="Graph Viewer"
      subtitle="Pharmaceutical Root Cause Analysis - Deviation DV-2025-0198"
      icon="Network"
    >
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-full overflow-x-hidden">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Graph Viewer
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Visualize and edit your graph data. You can modify the JSON below to update the graph visualization in real-time.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Total Nodes</div>
              <div className="text-gray-600 dark:text-gray-400">{nodeCount}</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Total Edges</div>
              <div className="text-gray-600 dark:text-gray-400">{edgeCount}</div>
            </div>
          </div>
        </div>

        {/* JSON Editor - Above Graph */}
        <div className="space-y-4 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Graph Data (JSON)
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Edit the JSON below to modify the graph. Changes will be reflected in real-time.
            </p>
          </div>
          {jsonError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Error:</strong> {jsonError}
              </p>
            </div>
          )}
          <div className="w-full space-y-2">
            <textarea
              value={jsonCode}
              onChange={(e) => setJsonCode(e.target.value)}
              className="w-full h-64 p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Paste your graph JSON data here..."
              spellCheck={false}
            />
            <div className="flex justify-end">
              <button
                onClick={() => handleJsonChange(jsonCode)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
              >
                Refresh Graph
              </button>
            </div>
          </div>
        </div>

        {/* Graph Viewer */}
        <div className="space-y-4 w-full overflow-hidden">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Graph Visualization
          </h3>
          <div className="w-full h-[400px] md:h-[600px] lg:h-[700px] min-h-[400px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <GraphViewer
              data={{
                nodes: graphData.nodes,
                edges: graphData.edges,
                nodeTypes: graphData.nodeTypes,
                relationTypes: graphData.relationTypes,
                schemas: graphData.schemas,
              }}
              height="100%"
              onNodeClick={handleNodeClick}
            />
          </div>
        </div>
      </div>

      {/* Node Payload Dialog */}
      <Dialog open={!!selectedNodePayload} onOpenChange={(open) => !open && setSelectedNodePayload(null)}>
        <DialogContent className="w-full h-full lg:max-w-4xl lg:max-h-[90vh] lg:h-auto overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Node Details: {selectedNodePayload?.node.title}
            </DialogTitle>
          </DialogHeader>
          {selectedNodePayload && (
            <div className="space-y-4 mt-4">
              <CardWrapper
                config={{
                  id: 'node-payload',
                  name: 'Payload Data',
                  styling: {
                    variant: 'default',
                    size: 'md'
                  }
                }}
                className="h-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-200">
                    Payload Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedNodePayload.payload).map(([key, value]) => {
                      const label = formatKeyToLabel(key);
                      const formatted = formatValueForDisplay(value);
                      // Make full width if: complex object/array, or display text is longer than 80 characters
                      const isLongText = formatted.display.length > 80;
                      const isComplex = formatted.isComplex;
                      const shouldSpanFullWidth = isComplex || isLongText;
                      
                      return (
                        <div
                          key={key}
                          className={`space-y-1 ${shouldSpanFullWidth ? 'md:col-span-2' : ''}`}
                        >
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {label}
                          </label>
                          <div className="text-sm text-gray-900 dark:text-gray-200 overflow-wrap-anywhere wrap-break-word">
                            {formatted.isComplex ? (
                              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : (
                              <span className="break-words">{formatted.display}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CardWrapper>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

