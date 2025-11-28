'use client';

import { useCallback, useEffect, useState } from 'react';
import { ulid } from 'ulid';

import type { GraphEdgeData, GraphNodeData, GraphRecord } from '../types';
import { createEdgeData, validateEdgeCreation, normalizeEdgeData } from '../utils/edge-handling';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

export interface UseGraphStoreResult {
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

export function useGraphStore(): UseGraphStoreResult {
  const [graph, setGraph] = useState<GraphRecord | null>(null);

  const createNewGraph = useCallback(() => {
    const id = ulid();
    const now = new Date().toISOString();
    const newGraph: GraphRecord = {
      id,
      name: `Graph ${id.slice(-6)}`,
      layout: 'dagre',
      createdAt: now,
      updatedAt: now,
      nodes: [],
      edges: [],
    };
    setGraph(newGraph);
  }, []);

  useEffect(() => {
    if (!graph) {
      createNewGraph();
    }
  }, [createNewGraph, graph]);

  const setGraphElements = useCallback((nodes: GraphNodeData[], edges: GraphEdgeData[]) => {
    setGraph((current) =>
      current
        ? {
            ...current,
            nodes,
            edges,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);

  const addNode = useCallback(
    (input: { schemaId: string; title?: string; payload?: Record<string, unknown> }): GraphNodeData | null => {
      const node: GraphNodeData = {
        id: ulid(),
        schemaId: input.schemaId,
        title: input.title,
        incomplete: true,
        parentId: null,
        payload: input.payload ?? {},
      };

      setGraph((current) =>
        current
          ? {
              ...current,
              nodes: [...current.nodes, node],
              updatedAt: new Date().toISOString(),
            }
          : current,
      );

      return node;
    },
    [],
  );

  const removeNode = useCallback((nodeId: string) => {
    setGraph((current) =>
      current
        ? {
            ...current,
            nodes: current.nodes.filter((n) => n.id !== nodeId),
            edges: current.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);

  const addEdge = useCallback(
    (input: { source: GraphNodeData; target: GraphNodeData; relationTypeId?: string }): GraphEdgeData | null => {
      loggingCustom(LogType.GRAPH_LOG, 'info', `addEdge called: source=${input.source.id}, target=${input.target.id}`);
      let createdEdge: GraphEdgeData | null = null;

      setGraph((current) => {
        if (!current) {
          loggingCustom(LogType.GRAPH_LOG, 'warn', 'addEdge: graph is null');
          return current;
        }

        // Validate edge creation
        loggingCustom(LogType.GRAPH_LOG, 'debug', `addEdge: validating with ${current.edges.length} existing edges`);
        const validation = validateEdgeCreation(input.source, input.target, current.edges);
        if (!validation.valid) {
          loggingCustom(LogType.GRAPH_LOG, 'warn', `addEdge: validation failed - ${validation.error}`);
          return current;
        }

        // Create edge with proper data consistency
        const edge = createEdgeData(input, ulid());
        createdEdge = edge;
        loggingCustom(LogType.GRAPH_LOG, 'info', `addEdge: created edge with id=${edge.id}`);

        const newGraph = {
          ...current,
          edges: [...current.edges, edge],
          updatedAt: new Date().toISOString(),
        };
        loggingCustom(LogType.GRAPH_LOG, 'debug', `addEdge: graph updated, new edge count=${newGraph.edges.length}`);
        return newGraph;
      });

      return createdEdge;
    },
    [],
  );

  const removeEdge = useCallback((edgeId: string) => {
    setGraph((current) =>
      current
        ? {
            ...current,
            edges: current.edges.filter((e) => e.id !== edgeId),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);

  const updateNode = useCallback((node: GraphNodeData) => {
    setGraph((current) =>
      current
        ? {
            ...current,
            nodes: current.nodes.map((n) => (n.id === node.id ? node : n)),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);

  const updateEdge = useCallback((edge: GraphEdgeData) => {
    setGraph((current) =>
      current
        ? {
            ...current,
            // Normalize edge data to ensure consistency
            edges: current.edges.map((e) => (e.id === edge.id ? normalizeEdgeData(edge) : e)),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);

  return {
    graph,
    nodes: graph?.nodes ?? [],
    edges: graph?.edges ?? [],
    createNewGraph,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    updateNode,
    updateEdge,
    setGraphElements,
  };
}


