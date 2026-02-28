'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Undo2, Redo2, Lock, Unlock, Eraser, Download, RotateCcw, Maximize2, ImagePlus, ImageMinus, Circle, Square, RectangleHorizontal, Triangle, Hexagon, Octagon, Trash2, MessageSquarePlus } from 'lucide-react';
import { cn } from '../../../shared/utils';
import { ButtonMinimal } from './ButtonMinimal';
import { ColorPicker } from './ColorPicker';
import { ConfirmationMessage } from './ConfirmationMessage';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { useUserStore } from '@/stores/user.store';
import { errorTextClasses } from '../utils/field-styles';
import {
  resizeImageToMaxWidth,
  isAcceptedBackgroundImageType,
  ACCEPTED_BACKGROUND_IMAGE_TYPES,
} from '@/gradian-ui/shared/utils/image-utils';
import { ulid } from 'ulid';
import type { CanvasAnnotation } from '@/gradian-ui/communication/annotations';
import { ListInput } from './ListInput';

// Tailwind 500 hex map for stroke color (ColorPicker uses id like 'emerald', 'violet')
const TAILWIND_ID_TO_HEX: Record<string, string> = {
  rose: '#f43f5e',
  pink: '#ec4899',
  fuchsia: '#d946ef',
  purple: '#a855f7',
  violet: '#8b5cf6',
  indigo: '#6366f1',
  blue: '#3b82f6',
  sky: '#0ea5e9',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981',
  green: '#22c55e',
  lime: '#84cc16',
  yellow: '#eab308',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  stone: '#78716c',
  neutral: '#737373',
  zinc: '#71717a',
  gray: '#6b7280',
  slate: '#64748b',
};

const DEFAULT_PEN_COLOR = '#000000';
const CANVAS_BG_LIGHT = '#ffffff';
const MAX_HISTORY = 50;
const ERASER_HIT_THRESHOLD = 35; // px distance (display coords) to consider a stroke "hit"
const CANVAS_HEIGHT_MIN = 260;
const CANVAS_HEIGHT_MAX = 420;
const CANVAS_ASPECT = 0.6;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const BACKGROUND_IMAGE_MARGIN = 12;
const BACKGROUND_RESIZE_MAX_WIDTH = 1920;
const DEFAULT_SHAPE_SIZE = 80;
const SHAPE_HANDLE_SIZE = 8;

export type ShapeType = 'circle' | 'square' | 'rectangle' | 'triangle' | 'hexagon' | 'octagon';

export interface PadShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  createdBy: string | null;
}

export interface SignaturePadConfig {
  name?: string;
  label?: string;
  required?: boolean;
  validation?: { required?: boolean };
  enableLock?: boolean;
  enableExportPng?: boolean;
  enableChangeColor?: boolean;
  enableEraser?: boolean;
  enableRawData?: boolean;
  exportWithBackground?: boolean;
  enableUserBaseLog?: boolean;
  enableBackgroundImage?: boolean;
  enableAnnotations?: boolean;
  enableShapes?: boolean;
  readonly?: boolean;
  behavior?: { readOnly?: boolean };
}

/** Extended value when enableBackgroundImage, enableAnnotations, or enableShapes is used. */
export interface SignaturePadValue {
  signatureDataUrl?: string | null;
  backgroundDataUrl?: string | null;
  shapes?: PadShape[];
  annotations?: CanvasAnnotation[];
}

export interface SignaturePadProps {
  config?: SignaturePadConfig;
  value?: string | SignaturePadValue | null;
  onChange?: (value: string | SignaturePadValue | null) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  enableLock?: boolean;
  enableExportPng?: boolean;
  enableChangeColor?: boolean;
  enableEraser?: boolean;
  enableRawData?: boolean;
  exportWithBackground?: boolean;
  enableUserBaseLog?: boolean;
  enableBackgroundImage?: boolean;
  enableAnnotations?: boolean;
  enableShapes?: boolean;
}

type PointGroup = import('signature_pad').PointGroup;

/** Shape of a single point from signature_pad (matches point.d.ts; package does not export BasicPoint) */
interface BasicPoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

/** Point with ISO timestamp for queryable logs */
export interface PointWithTimeISO extends BasicPoint {
  timeISO: string;
}

/** Raw data payload: points only, or with userId/loggedAt when enableUserBaseLog */
export type RawDataPayload =
  | PointWithTimeISO[]
  | { userId: string; loggedAt: string; points: PointWithTimeISO[] };

function buildRawPayload(
  data: PointGroup[],
  options: { enableUserBaseLog: boolean; userId: string | null }
): RawDataPayload {
  const points: PointWithTimeISO[] = data.flatMap((g) =>
    (g.points ?? []).map((p) => ({
      x: p.x,
      y: p.y,
      pressure: p.pressure,
      time: p.time,
      timeISO: new Date(p.time).toISOString(),
    }))
  );
  if (options.enableUserBaseLog) {
    return {
      userId: options.userId ?? '',
      loggedAt: new Date().toISOString(),
      points,
    };
  }
  return points;
}

/** Min distance from point (px,py) to segment (x1,y1)-(x2,y2) */
function minDistToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Find index of the stroke closest to (x, y) in display coords, within threshold; -1 if none */
function findStrokeIndexAt(data: PointGroup[], x: number, y: number, threshold: number): number {
  let bestIndex = -1;
  let bestDist = threshold;
  for (let i = 0; i < data.length; i++) {
    const points = data[i].points ?? [];
    for (let j = 0; j < points.length; j++) {
      const p = points[j];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
      if (j > 0) {
        const prev = points[j - 1];
        const segD = minDistToSegment(x, y, prev.x, prev.y, p.x, p.y);
        if (segD < bestDist) {
          bestDist = segD;
          bestIndex = i;
        }
      }
    }
  }
  return bestIndex;
}

/** Get polygon points for triangle (3), hexagon (6), octagon (8) centered at cx,cy with width/height. */
function getPolygonPoints(type: 'triangle' | 'hexagon' | 'octagon', cx: number, cy: number, w: number, h: number): string {
  const n = type === 'triangle' ? 3 : type === 'hexagon' ? 6 : 8;
  const rx = w / 2;
  const ry = h / 2;
  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    points.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }
  return points.join(' ');
}

/** Hit-test: is point (px,py) inside shape? */
function isPointInShape(shape: PadShape, px: number, py: number): boolean {
  const { x, y, width, height, type } = shape;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  if (type === 'circle') {
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  if (type === 'square' || type === 'rectangle') {
    return px >= x && px <= x + width && py >= y && py <= y + height;
  }
  if (type === 'triangle' || type === 'hexagon' || type === 'octagon') {
    const pts = getPolygonPoints(type, width / 2, height / 2, width, height).split(' ').map((s) => {
      const [a, b] = s.split(',').map(Number);
      return [x + a, y + b] as [number, number];
    });
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  return false;
}

/** Find shape at point (display coords); returns topmost shape id. */
function findShapeAt(shapes: PadShape[], px: number, py: number): string | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(shapes[i], px, py)) return shapes[i].id;
  }
  return null;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  disabled = false,
  required = false,
  className,
  enableLock: enableLockProp,
  enableExportPng: enableExportPngProp,
  enableChangeColor: enableChangeColorProp,
  enableEraser: enableEraserProp,
  enableRawData: enableRawDataProp,
  exportWithBackground: exportWithBackgroundProp,
  enableUserBaseLog: enableUserBaseLogProp,
  enableBackgroundImage: enableBackgroundImageProp = false,
  enableAnnotations: enableAnnotationsProp = false,
  enableShapes: enableShapesProp = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<InstanceType<typeof import('signature_pad').default> | null>(null);
  const userId = useUserStore((s) => s.user?.id ?? null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const shapesLayerRef = useRef<SVGSVGElement>(null);

  const mergedConfig = { ...config, ...(config as any)?.componentTypeConfig };
  const enableLock = enableLockProp ?? mergedConfig.enableLock ?? false;
  const enableExportPng = enableExportPngProp ?? mergedConfig.enableExportPng ?? false;
  const enableChangeColor = enableChangeColorProp ?? mergedConfig.enableChangeColor ?? false;
  const enableEraser = enableEraserProp ?? mergedConfig.enableEraser ?? false;
  const enableRawData = enableRawDataProp ?? (mergedConfig as any)?.enableRawData ?? false;
  const exportWithBackground = exportWithBackgroundProp ?? (mergedConfig as any)?.exportWithBackground ?? false;
  const enableUserBaseLog = enableUserBaseLogProp ?? (mergedConfig as any)?.enableUserBaseLog ?? false;
  const enableBackgroundImage = enableBackgroundImageProp ?? mergedConfig.enableBackgroundImage ?? false;
  const enableAnnotations = enableAnnotationsProp ?? mergedConfig.enableAnnotations ?? false;
  const enableShapes = enableShapesProp ?? mergedConfig.enableShapes ?? false;

  const readOnly = Boolean(
    (mergedConfig as any).readonly ?? mergedConfig.behavior?.readOnly ?? false
  );
  const isLockedRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [strokeColorId, setStrokeColorId] = useState<string>('slate');
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawingAllowedRef = useRef(false);
  const pinchRef = useRef<{
    distance: number;
    centerX: number;
    centerY: number;
    zoomLevel: number;
    panX: number;
    panY: number;
  } | null>(null);
  const zoomLevelRef = useRef(zoomLevel);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  zoomLevelRef.current = zoomLevel;
  panXRef.current = panX;
  panYRef.current = panY;
  const [isMounted, setIsMounted] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [historyLen, setHistoryLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);
  const [rawPoints, setRawPoints] = useState<RawDataPayload>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string | null>(null);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [shapes, setShapes] = useState<PadShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [shapeMenuShapeId, setShapeMenuShapeId] = useState<string | null>(null);
  const [activeShapeType, setActiveShapeType] = useState<ShapeType | null>(null);
  const [canvasAnnotations, setCanvasAnnotations] = useState<CanvasAnnotation[]>([]);
  const dragStartRef = useRef<{ x: number; y: number; shapeId: string; isHandle: boolean } | null>(null);

  /** Redo stack: each entry is one stroke (single PointGroup) that was undone */
  const redoStackRef = useRef<PointGroup[][]>([]);
  const lastValueRef = useRef<string | null>(null);
  const valueRef = useRef<string | null | undefined>(undefined);
  valueRef.current =
    value == null
      ? null
      : typeof value === 'string'
        ? value
        : (value as SignaturePadValue).signatureDataUrl ?? null;
  const emitValueRef = useRef<() => void>(() => {});
  const pushHistoryRef = useRef<() => void>(() => {});

  const strokeHex = TAILWIND_ID_TO_HEX[strokeColorId] ?? DEFAULT_PEN_COLOR;
  const locked = isLocked;
  const isDrawingEnabled = !disabled && !readOnly && !locked;
  const isDisabledOrReadOnly = disabled || readOnly;

  const useExtendedValue = enableBackgroundImage || enableAnnotations || enableShapes;

  const emitExtendedValue = useCallback(
    (overrides?: { shapes?: PadShape[]; annotations?: CanvasAnnotation[]; backgroundDataUrl?: string | null }) => {
      if (!useExtendedValue || !onChange) return;
      const sig = lastValueRef.current;
      const s = overrides?.shapes ?? shapes;
      const a = overrides?.annotations ?? canvasAnnotations;
      const bg = overrides?.backgroundDataUrl !== undefined ? overrides.backgroundDataUrl : backgroundDataUrl;
      const hasExtras = (enableBackgroundImage && bg) || (enableShapes && s.length > 0) || (enableAnnotations && a.length > 0);
      if (!sig && !hasExtras) onChange(null);
      else
        onChange({
          signatureDataUrl: sig ?? undefined,
          ...(enableBackgroundImage && bg != null && { backgroundDataUrl: bg }),
          ...(enableShapes && s.length > 0 && { shapes: [...s] }),
          ...(enableAnnotations && a.length > 0 && { annotations: [...a] }),
        });
    },
    [useExtendedValue, onChange, enableBackgroundImage, enableAnnotations, enableShapes, shapes, canvasAnnotations, backgroundDataUrl]
  );

  const emitValue = useCallback(() => {
    if (!padRef.current || !onChange) return;
    try {
      const dataUrl = padRef.current.isEmpty() ? null : padRef.current.toDataURL('image/png');
      lastValueRef.current = dataUrl;
      setHasContent(!padRef.current.isEmpty());
      if (enableRawData && !padRef.current.isEmpty()) {
        const data = padRef.current.toData();
        setRawPoints(buildRawPayload(data, { enableUserBaseLog, userId }));
      } else if (padRef.current.isEmpty()) {
        setRawPoints([]);
      }
      if (useExtendedValue) {
        const hasExtras = (enableBackgroundImage && backgroundDataUrl) || (enableShapes && shapes.length > 0) || (enableAnnotations && canvasAnnotations.length > 0);
        if (!dataUrl && !hasExtras) {
          onChange(null);
        } else {
          onChange({
            signatureDataUrl: dataUrl ?? undefined,
            ...(enableBackgroundImage && backgroundDataUrl != null && { backgroundDataUrl }),
            ...(enableShapes && shapes.length > 0 && { shapes: [...shapes] }),
            ...(enableAnnotations && canvasAnnotations.length > 0 && { annotations: [...canvasAnnotations] }),
          });
        }
      } else {
        onChange(dataUrl);
      }
    } catch {
      onChange(useExtendedValue ? null : null);
    }
    onBlur?.();
  }, [onChange, onBlur, enableRawData, enableUserBaseLog, userId, useExtendedValue, enableBackgroundImage, enableAnnotations, enableShapes, backgroundDataUrl, shapes, canvasAnnotations]);

  const pushHistory = useCallback(() => {
    if (!padRef.current) return;
    const data = padRef.current.toData();
    setHistoryLen(data.length);
    redoStackRef.current = [];
    setRedoLen(0);
  }, []);

  const applyData = useCallback((pointGroups: PointGroup[]) => {
    if (!padRef.current) return;
    padRef.current.fromData(pointGroups, { clear: true });
  }, []);

  const handleUndo = useCallback(() => {
    if (!isDrawingEnabled || !padRef.current) return;
    const data = padRef.current.toData();
    if (data.length === 0) return;
    const lastStroke = data.pop()!;
    redoStackRef.current.push([lastStroke]);
    applyData(data);
    setHistoryLen(data.length);
    setRedoLen(redoStackRef.current.length);
    if (data.length === 0) {
      setHasContent(false);
      setRawPoints([]);
      onChange?.(null);
    } else {
      setHasContent(true);
      try {
        const url = padRef.current.toDataURL('image/png');
        lastValueRef.current = url;
        onChange?.(url);
        if (enableRawData) {
          setRawPoints(buildRawPayload(data, { enableUserBaseLog, userId }));
        }
      } catch {
        onChange?.(null);
      }
    }
    onBlur?.();
  }, [isDrawingEnabled, applyData, onChange, onBlur, enableRawData, enableUserBaseLog, userId]);

  const handleRedo = useCallback(() => {
    if (!isDrawingEnabled || !padRef.current) return;
    const redo = redoStackRef.current;
    if (redo.length === 0) return;
    const data = padRef.current.toData();
    const oneStroke = redo.pop()!;
    data.push(oneStroke[0]);
    applyData(data);
    setHistoryLen(data.length);
    setRedoLen(redo.length);
    setHasContent(true);
    try {
      const url = padRef.current.toDataURL('image/png');
      lastValueRef.current = url;
      onChange?.(url);
      if (enableRawData) {
        setRawPoints(buildRawPayload(data, { enableUserBaseLog, userId }));
      }
    } catch {
      onChange?.(null);
    }
    onBlur?.();
  }, [isDrawingEnabled, applyData, onChange, onBlur, enableRawData, enableUserBaseLog, userId]);

  const canUndo = isDrawingEnabled && historyLen > 0;
  const canRedo = isDrawingEnabled && redoLen > 0;

  emitValueRef.current = emitValue;
  pushHistoryRef.current = pushHistory;

  // Initialize signature_pad on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !canvasRef.current || !containerRef.current) return;

    let SignaturePadClass: typeof import('signature_pad').default;
    const init = async () => {
      const mod = await import('signature_pad');
      SignaturePadClass = mod.default;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const pad = new SignaturePadClass(canvas, {
        backgroundColor: CANVAS_BG_LIGHT,
        penColor: strokeHex,
        minWidth: 1,
        maxWidth: 2.5,
        throttle: 8,
      });
      padRef.current = pad;

      const resize = () => {
        if (!container || !canvas || !padRef.current) return;
        const currentData = padRef.current.toData();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = container.offsetWidth;
        const height = Math.min(CANVAS_HEIGHT_MAX, Math.max(CANVAS_HEIGHT_MIN, width * CANVAS_ASPECT));
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(ratio, ratio);
        padRef.current.clear();
        if (currentData.length > 0) {
          padRef.current.fromData(currentData, { clear: true });
        } else {
          const v = lastValueRef.current;
          if (v && typeof v === 'string' && v.startsWith('data:image')) {
            padRef.current.fromDataURL(v).catch(() => {});
          }
        }
      };
      const ro = new ResizeObserver(resize);
      ro.observe(container);
      resize();

      const initialValue = valueRef.current;
      if (initialValue && typeof initialValue === 'string' && initialValue.startsWith('data:image')) {
        lastValueRef.current = initialValue;
        setHasContent(true);
        pad.fromDataURL(initialValue).catch(() => {});
      }

      const handleEnd = () => {
        if (!padRef.current) return;
        pushHistoryRef.current();
        emitValueRef.current();
      };

      pad.addEventListener('endStroke', handleEnd);

      return () => {
        ro.disconnect();
        pad.removeEventListener('endStroke', handleEnd);
        pad.off();
        padRef.current = null;
      };
    };

    let cleanup: (() => void) | undefined;
    init().then((c) => { cleanup = c; });

    return () => {
      cleanup?.();
    };
  }, [isMounted]);

  // Sync value prop -> canvas and extended state (initial load or external change)
  useEffect(() => {
    if (!padRef.current || !isMounted) return;
    const val = value;
    if (val != null && typeof val === 'object' && 'signatureDataUrl' in val) {
      const v = val as SignaturePadValue;
      if (v.signatureDataUrl && typeof v.signatureDataUrl === 'string' && v.signatureDataUrl.startsWith('data:image')) {
        lastValueRef.current = v.signatureDataUrl;
        setHasContent(true);
        padRef.current.fromDataURL(v.signatureDataUrl).catch(() => {});
      } else {
        lastValueRef.current = null;
        setHasContent(false);
        padRef.current.clear();
      }
      if (v.backgroundDataUrl != null) setBackgroundDataUrl(v.backgroundDataUrl);
      if (Array.isArray(v.shapes)) setShapes(v.shapes);
      if (Array.isArray(v.annotations)) setCanvasAnnotations(v.annotations);
    } else if (value && typeof value === 'string' && value.startsWith('data:image')) {
      lastValueRef.current = value;
      setHasContent(true);
      padRef.current.fromDataURL(value).catch(() => {});
    } else if (!value || value === '') {
      lastValueRef.current = null;
      setHasContent(false);
      setHistoryLen(0);
      setRedoLen(0);
      setRawPoints([]);
      padRef.current.clear();
      redoStackRef.current = [];
    }
  }, [value, isMounted]);

  // Enable/disable pad: drawing when not disabled/locked/eraser and no shape tool active
  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    const allowed = isDrawingEnabled && !isEraserMode && !activeShapeType;
    drawingAllowedRef.current = allowed;
    if (allowed) {
      pad.on();
    } else {
      pad.off();
    }
  }, [isDrawingEnabled, isEraserMode, activeShapeType]);

  // Zoom & pinch-pan are temporarily disabled to avoid coordinate
  // misalignment issues. The state is kept for future refinement.
  useEffect(() => {
    return;
  }, [isMounted]);

  // Apply pen color (eraser mode uses click-to-remove, not drawing)
  useEffect(() => {
    if (!padRef.current) return;
    padRef.current.penColor = strokeHex;
    padRef.current.compositeOperation = 'source-over';
  }, [strokeHex]);

  // Eraser mode: click on canvas to remove the stroke under the pointer
  useEffect(() => {
    if (!isEraserMode || !isDrawingEnabled || !canvasRef.current || !padRef.current) return;
    const canvas = canvasRef.current;

    const handlePointerUp = (e: PointerEvent) => {
      if (!padRef.current || !canvasRef.current || e.target !== canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      // signature_pad stores points as (clientX - rect.left, clientY - rect.top) = display coords
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const data = padRef.current.toData();
      const index = findStrokeIndexAt(data, x, y, ERASER_HIT_THRESHOLD);
      if (index >= 0) {
        const next = data.filter((_, i) => i !== index);
        padRef.current.fromData(next, { clear: true });
        setHistoryLen(next.length);
        redoStackRef.current = [];
        setRedoLen(0);
        if (next.length === 0) {
          setHasContent(false);
          setRawPoints([]);
          setIsEraserMode(false);
          setPanX(0);
          setPanY(0);
          setZoomLevel(1);
          onChange?.(null);
        } else {
          setHasContent(true);
          try {
            const url = padRef.current.toDataURL('image/png');
            lastValueRef.current = url;
            onChange?.(url);
            if (enableRawData) {
              setRawPoints(buildRawPayload(next, { enableUserBaseLog, userId }));
            }
          } catch {
            onChange?.(null);
          }
        }
        onBlur?.();
      }
    };

    canvas.addEventListener('pointerup', handlePointerUp);
    return () => canvas.removeEventListener('pointerup', handlePointerUp);
  }, [isEraserMode, isDrawingEnabled, enableRawData, enableUserBaseLog, userId, onChange, onBlur]);

  const handleLockToggle = () => {
    if (!enableLock || disabled || readOnly) return;
    setIsLocked((prev) => !prev);
    isLockedRef.current = !isLockedRef.current;
    onBlur?.();
  };

  const handleExportPng = useCallback(() => {
    const pad = padRef.current;
    const canvasEl = canvasRef.current;
    if (!pad || !canvasEl || !enableExportPng) return;
    const doExport = async () => {
      try {
        let dataUrl: string;
        if (exportWithBackground && backgroundDataUrl) {
          const w = canvasEl.width;
          const h = canvasEl.height;
          const off = document.createElement('canvas');
          off.width = w;
          off.height = h;
          const ctx = off.getContext('2d');
          if (!ctx) return;
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const ratio = window.devicePixelRatio || 1;
              const margin = BACKGROUND_IMAGE_MARGIN * ratio;
              const dw = w - 2 * margin;
              const dh = h - 2 * margin;
              if (dw > 0 && dh > 0) ctx.drawImage(img, margin, margin, dw, dh);
              resolve();
            };
            img.onerror = reject;
            img.src = backgroundDataUrl;
          });
          ctx.drawImage(canvasEl, 0, 0);
          dataUrl = off.toDataURL('image/png');
        } else if (exportWithBackground) {
          dataUrl = pad.toDataURL('image/png');
        } else {
          const data = pad.toData();
          const oldBg = pad.backgroundColor;
          pad.backgroundColor = 'rgba(0,0,0,0)';
          pad.clear();
          pad.fromData(data, { clear: true });
          dataUrl = pad.toDataURL('image/png');
          pad.backgroundColor = oldBg;
          pad.clear();
          pad.fromData(data, { clear: true });
        }
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `signature-${Date.now()}.png`;
        a.click();
      } catch {
        // no-op
      }
    };
    doExport();
  }, [enableExportPng, exportWithBackground, backgroundDataUrl]);

  const handleColorChange = (colorId: string) => {
    setStrokeColorId(colorId);
    if (isEraserMode) setIsEraserMode(false);
  };

  const handleResetClick = () => {
    if (!isDrawingEnabled) return;
    setShowResetConfirm(true);
  };

  const handleResetConfirm = useCallback(() => {
    if (!padRef.current) return;
    padRef.current.clear();
    redoStackRef.current = [];
    lastValueRef.current = null;
    setHistoryLen(0);
    setRedoLen(0);
    setHasContent(false);
    setRawPoints([]);
    setIsEraserMode(false);
    setPanX(0);
    setPanY(0);
    setZoomLevel(1);
    if (useExtendedValue) {
      setShapes([]);
      setCanvasAnnotations([]);
      setBackgroundDataUrl(null);
      setSelectedShapeId(null);
      setShapeMenuShapeId(null);
      setActiveShapeType(null);
      onChange?.(null);
    } else {
      onChange?.(null);
    }
    setShowResetConfirm(false);
    onBlur?.();
  }, [onChange, onBlur, useExtendedValue]);

  const handleBackgroundImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !isAcceptedBackgroundImageType(file)) return;
      setIsBackgroundLoading(true);
      try {
        const result = await resizeImageToMaxWidth(file, {
          maxWidth: BACKGROUND_RESIZE_MAX_WIDTH,
          quality: 0.88,
        });
        setBackgroundDataUrl(result.dataUrl);
        queueMicrotask(() => emitExtendedValue());
        onBlur?.();
      } catch {
        // ignore
      } finally {
        setIsBackgroundLoading(false);
      }
    },
    [onBlur, emitExtendedValue]
  );

  const handleRemoveBackground = useCallback(() => {
    setBackgroundDataUrl(null);
    queueMicrotask(() => emitExtendedValue());
    onBlur?.();
  }, [onBlur, emitExtendedValue]);

  const addShapeAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!activeShapeType || !containerRef.current || !userId) return;
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const canvasRect = canvasEl.getBoundingClientRect();
      const x = clientX - canvasRect.left - DEFAULT_SHAPE_SIZE / 2;
      const y = clientY - canvasRect.top - DEFAULT_SHAPE_SIZE / 2;
      const size = DEFAULT_SHAPE_SIZE;
      const newShape: PadShape = {
        id: ulid(),
        type: activeShapeType,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: activeShapeType === 'rectangle' ? size * 1.5 : size,
        height: size,
        fill: TAILWIND_ID_TO_HEX[strokeColorId] ?? DEFAULT_PEN_COLOR,
        stroke: '#374151',
        createdBy: userId,
      };
      setShapes((prev) => {
        const next = [...prev, newShape];
        queueMicrotask(() => emitExtendedValue());
        return next;
      });
      setSelectedShapeId(newShape.id);
      // After placing a shape, return to drawing mode so pen works as before
      setActiveShapeType(null);
      onBlur?.();
    },
    [activeShapeType, userId, strokeColorId, onBlur, emitExtendedValue]
  );

  const updateShapeColor = useCallback(
    (shapeId: string, fill: string, stroke: string) => {
      setShapes((prev) => {
        const next = prev.map((s) => (s.id === shapeId ? { ...s, fill, stroke } : s));
        queueMicrotask(() => emitExtendedValue());
        return next;
      });
      setShapeMenuShapeId(null);
      onBlur?.();
    },
    [onBlur, emitExtendedValue]
  );

  const deleteShape = useCallback(
    (shapeId: string) => {
      setShapes((prev) => {
        const next = prev.filter((s) => s.id !== shapeId);
        queueMicrotask(() => emitExtendedValue());
        return next;
      });
      setCanvasAnnotations((prev) => {
        const next = prev.filter((a) => a.shapeId !== shapeId);
        queueMicrotask(() => emitExtendedValue());
        return next;
      });
      if (selectedShapeId === shapeId) setSelectedShapeId(null);
      setShapeMenuShapeId(null);
      onBlur?.();
    },
    [selectedShapeId, onBlur, emitExtendedValue]
  );

  const canEditShape = useCallback(
    (shape: PadShape) => !readOnly && !disabled && (shape.createdBy == null || shape.createdBy === userId),
    [readOnly, disabled, userId]
  );

  const SHAPE_BUTTONS: { type: ShapeType; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'circle', icon: Circle },
    { type: 'square', icon: Square },
    { type: 'rectangle', icon: RectangleHorizontal },
    { type: 'triangle', icon: Triangle },
    { type: 'hexagon', icon: Hexagon },
    { type: 'octagon', icon: Octagon },
  ];

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={containerRef}
        className={cn(
          'rounded-xl border bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 overflow-hidden',
          isDisabledOrReadOnly && 'opacity-70 pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between gap-1.5 p-2 border-b border-gray-100 dark:border-gray-800 flex-wrap">
          <div className="flex items-center gap-1">
            <ButtonMinimal
              icon={Undo2}
              title="Undo"
              color="gray"
              size="md"
              className="min-h-[36px] min-w-[36px] p-1.5"
              onClick={handleUndo}
              disabled={!canUndo}
            />
            <ButtonMinimal
              icon={Redo2}
              title="Redo"
              color="gray"
              size="md"
              className="min-h-[36px] min-w-[36px] p-1.5"
              onClick={handleRedo}
              disabled={!canRedo}
            />
            {enableLock && (
              <ButtonMinimal
                icon={locked ? Lock : Unlock}
                title={locked ? 'Unlock signature' : 'Lock signature'}
                color={locked ? 'orange' : 'gray'}
                size="md"
                className="min-h-[36px] min-w-[36px] p-1.5"
                onClick={handleLockToggle}
                disabled={disabled || readOnly}
              />
            )}
            {enableEraser && (
              <ButtonMinimal
                icon={Eraser}
                title={isEraserMode ? 'Pen' : 'Eraser'}
                color={isEraserMode ? 'violet' : 'gray'}
                size="md"
                className="min-h-[36px] min-w-[36px] p-1.5"
                onClick={() => isDrawingEnabled && setIsEraserMode((p) => !p)}
                disabled={!isDrawingEnabled}
              />
            )}
            <ButtonMinimal
              icon={Maximize2}
              title="Fit"
              color="gray"
              size="md"
              className="min-h-[36px] min-w-[36px] p-1.5"
              onClick={() => {
                setPanX(0);
                setPanY(0);
                setZoomLevel(1);
                const pad = padRef.current;
                const canDraw = !disabled && !readOnly && !locked && !isEraserMode;
                drawingAllowedRef.current = canDraw;
                if (pad) {
                  if (canDraw) pad.on();
                  else pad.off();
                }
              }}
            />
            {enableBackgroundImage && (
              <>
                <input
                  ref={backgroundInputRef}
                  type="file"
                  accept={ACCEPTED_BACKGROUND_IMAGE_TYPES.join(',')}
                  className="hidden"
                  aria-label="Upload background image"
                  onChange={handleBackgroundImageChange}
                />
                <ButtonMinimal
                  icon={ImagePlus}
                  title={backgroundDataUrl ? 'Change background' : 'Add background image'}
                  color={backgroundDataUrl ? 'green' : 'gray'}
                  size="md"
                  className="min-h-[36px] min-w-[36px] p-1.5"
                  onClick={() => backgroundInputRef.current?.click()}
                  disabled={isBackgroundLoading || isDisabledOrReadOnly}
                />
                {backgroundDataUrl && (
                  <ButtonMinimal
                    icon={ImageMinus}
                    title="Remove background"
                    color="gray"
                    size="md"
                    className="min-h-[36px] min-w-[36px] p-1.5"
                    onClick={handleRemoveBackground}
                    disabled={isDisabledOrReadOnly}
                  />
                )}
              </>
            )}
            {enableExportPng && (
              <ButtonMinimal
                icon={Download}
                title="Export PNG"
                color="gray"
                size="md"
                className="min-h-[36px] min-w-[36px] p-1.5"
                onClick={handleExportPng}
                disabled={!hasContent}
              />
            )}
            {enableShapes &&
              SHAPE_BUTTONS.map(({ type, icon: Icon }) => (
                <ButtonMinimal
                  key={type}
                  icon={Icon}
                  title={`Add ${type}`}
                  color={activeShapeType === type ? 'violet' : 'gray'}
                  size="md"
                  className="min-h-[36px] min-w-[36px] p-1.5"
                  onClick={() => setActiveShapeType((t) => (t === type ? null : type))}
                  disabled={isDisabledOrReadOnly}
                />
              ))}
            <ButtonMinimal
              icon={RotateCcw}
              title="Clear all"
              color="gray"
              size="md"
              className="min-h-[36px] min-w-[36px] p-1.5"
              onClick={handleResetClick}
              disabled={!isDrawingEnabled || !hasContent}
            />
          </div>
          {enableChangeColor && isDrawingEnabled && (
            <div className="w-32 min-h-[40px]">
              {isMounted ? (
                <ColorPicker
                  config={{
                    name: `${(config?.name ?? 'signature')}-color`,
                    options: Object.keys(TAILWIND_ID_TO_HEX).map((id) => ({
                      id,
                      label: id.charAt(0).toUpperCase() + id.slice(1),
                      color: `bg-${id}-500`,
                    })),
                  }}
                  value={strokeColorId}
                  onChange={handleColorChange}
                  disabled={!isDrawingEnabled}
                />
              ) : null}
            </div>
          )}
        </div>
        {enableShapes && selectedShapeId && (() => {
          const shape = shapes.find((s) => s.id === selectedShapeId);
          if (!shape || !canEditShape(shape)) return null;
          return (
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Shape selected</span>
              <div className="flex items-center gap-1">
                {Object.entries(TAILWIND_ID_TO_HEX).slice(0, 8).map(([id, hex]) => (
                  <button
                    key={id}
                    type="button"
                    className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110"
                    style={{ backgroundColor: hex }}
                    title={id}
                    onClick={() => updateShapeColor(shape.id, hex, shape.stroke)}
                  />
                ))}
              </div>
              <ButtonMinimal
                icon={Trash2}
                title="Delete shape"
                color="red"
                size="sm"
                onClick={() => deleteShape(shape.id)}
              />
              {enableAnnotations && (
                <ButtonMinimal
                  icon={MessageSquarePlus}
                  title="Add annotation to shape"
                  color="gray"
                  size="sm"
                  onClick={() => {
                    const label = prompt('Annotation text:');
                    if (label?.trim()) {
                      setCanvasAnnotations((prev) => [
                        ...prev,
                        { id: ulid(), label: label.trim(), shapeId: shape.id, createdBy: userId ?? undefined },
                      ]);
                      setShapeMenuShapeId(null);
                    }
                  }}
                />
              )}
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ml-1"
                onClick={() => { setSelectedShapeId(null); setShapeMenuShapeId(null); }}
              >
                Deselect
              </button>
            </div>
          );
        })()}
        <div className={cn('p-2', isEraserMode && 'cursor-crosshair')}>
          <div
            ref={viewportRef}
            className={cn(
              'overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 relative'
            )}
            style={{
              minHeight: CANVAS_HEIGHT_MAX,
              padding: enableBackgroundImage ? BACKGROUND_IMAGE_MARGIN : 0,
            }}
          >
            <div
              style={{
                transform: `translate(${panX}px,${panY}px)`,
                transformOrigin: '0 0',
              }}
              className="inline-block will-change-transform relative z-10"
            >
              <div className="relative w-full">
                <canvas
                  ref={canvasRef}
                  className={cn(
                    'touch-none block w-full rounded-lg border-0',
                    isEraserMode && 'cursor-crosshair',
                    activeShapeType && 'cursor-crosshair'
                  )}
                  style={{
                    backgroundColor: CANVAS_BG_LIGHT,
                    backgroundImage: backgroundDataUrl ? `url(${backgroundDataUrl})` : undefined,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                  onFocus={onFocus}
                  aria-label="Signature"
                  onClick={(e) => {
                    // When a shape tool is active, clicking the canvas adds a shape (no drawing)
                    if (enableShapes && activeShapeType && canvasRef.current) {
                      addShapeAt(e.clientX, e.clientY);
                    }
                  }}
                />
                {enableShapes && (
                  <svg
                    ref={shapesLayerRef}
                    className="absolute inset-0 w-full h-full rounded-lg"
                    // Do NOT block pointer events to the canvas when no shape tool is active
                    style={{ pointerEvents: activeShapeType ? 'auto' : 'none' }}
                  >
                    <rect x={0} y={0} width="100%" height="100%" fill="transparent" pointerEvents="none" />
                    {shapes.map((shape) => {
                      const isSelected = selectedShapeId === shape.id;
                      const canEdit = canEditShape(shape);
                      const cx = shape.x + shape.width / 2;
                      const cy = shape.y + shape.height / 2;
                      return (
                        <g
                          key={shape.id}
                          pointerEvents={canEdit ? 'auto' : 'none'}
                          style={{ cursor: canEdit ? 'pointer' : 'default' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEdit) {
                              setSelectedShapeId(shape.id);
                              setShapeMenuShapeId(shape.id);
                            }
                          }}
                        >
                          {shape.type === 'circle' && (
                            <ellipse
                              cx={cx}
                              cy={cy}
                              rx={shape.width / 2}
                              ry={shape.height / 2}
                              fill={shape.fill}
                              stroke={shape.stroke}
                              strokeWidth={2}
                            />
                          )}
                          {shape.type === 'square' && (
                            <rect
                              x={shape.x}
                              y={shape.y}
                              width={shape.width}
                              height={shape.height}
                              fill={shape.fill}
                              stroke={shape.stroke}
                              strokeWidth={2}
                            />
                          )}
                          {shape.type === 'rectangle' && (
                            <rect
                              x={shape.x}
                              y={shape.y}
                              width={shape.width}
                              height={shape.height}
                              fill={shape.fill}
                              stroke={shape.stroke}
                              strokeWidth={2}
                            />
                          )}
                          {(shape.type === 'triangle' || shape.type === 'hexagon' || shape.type === 'octagon') && (
                            <polygon
                              points={getPolygonPoints(shape.type, shape.width / 2, shape.height / 2, shape.width, shape.height)
                                .split(' ')
                                .map((p) => {
                                  const [a, b] = p.split(',').map(Number);
                                  return `${shape.x + a},${shape.y + b}`;
                                })
                                .join(' ')}
                              fill={shape.fill}
                              stroke={shape.stroke}
                              strokeWidth={2}
                            />
                          )}
                          {isSelected && canEdit && (
                            <rect
                              x={shape.x - 2}
                              y={shape.y - 2}
                              width={shape.width + 4}
                              height={shape.height + 4}
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth={2}
                              strokeDasharray="4 2"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {enableAnnotations && (
        <div className="mt-3 p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Annotations</h4>
          <ListInput
            value={canvasAnnotations.map((a) => ({ id: a.id, label: a.label }))}
            onChange={(items) => {
              const byId = new Map(canvasAnnotations.map((a) => [a.id, a]));
              const next = items.map((item) => {
                const existing = byId.get(item.id);
                return {
                  id: item.id,
                  label: item.label,
                  shapeId: existing?.shapeId,
                  createdBy: existing?.createdBy ?? userId ?? undefined,
                };
              });
              setCanvasAnnotations(next);
              queueMicrotask(() => emitExtendedValue({ annotations: next }));
              onBlur?.();
            }}
            placeholder="Enter annotation..."
            addButtonText="Add Annotation"
          />
        </div>
      )}
      {enableRawData && (
        <div className="mt-2">
          <CodeViewer
            code={
              (Array.isArray(rawPoints) ? rawPoints.length : rawPoints.points.length) > 0
                ? JSON.stringify(rawPoints, null, 2)
                : enableUserBaseLog
                  ? JSON.stringify({ userId: userId ?? '', loggedAt: '', points: [] }, null, 2)
                  : '[]'
            }
            programmingLanguage="json"
            title="Raw data"
            initialLineNumbers={15}
          />
        </div>
      )}
      {error && <p className={cn(errorTextClasses, 'mt-1')}>{error}</p>}
      <ConfirmationMessage
        isOpen={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Clear signature"
        message="This will remove the entire signature. This cannot be undone."
        variant="destructive"
        showSwipe
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => setShowResetConfirm(false),
          },
          {
            label: 'Clear',
            variant: 'destructive',
            action: handleResetConfirm,
          },
        ]}
      />
    </div>
  );
};

SignaturePad.displayName = 'SignaturePad';
