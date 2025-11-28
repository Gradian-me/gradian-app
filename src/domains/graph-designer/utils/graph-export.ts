import type { GraphCanvasHandle } from '../components/GraphCanvas';
import type { GraphRecord } from '../types';

export function exportGraphAsPng(
  canvasHandle: GraphCanvasHandle | null,
  graph: GraphRecord | null
): void {
  const dataUrl = canvasHandle?.exportPng();
  if (!dataUrl) return;

  const id = graph?.id ?? 'preview';
  const filename = `Gradian_Graph_${id}.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.setAttribute('download', filename);
  link.click();
}

