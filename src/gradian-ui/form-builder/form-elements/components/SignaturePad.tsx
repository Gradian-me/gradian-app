'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Undo2, Redo2, Lock, Unlock, Eraser, Download, RotateCcw, Maximize2 } from 'lucide-react';
import { cn } from '../../../shared/utils';
import { ButtonMinimal } from './ButtonMinimal';
import { ColorPicker } from './ColorPicker';
import { ConfirmationMessage } from './ConfirmationMessage';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { useUserStore } from '@/stores/user.store';
import { errorTextClasses } from '../utils/field-styles';

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
  readonly?: boolean;
  behavior?: { readOnly?: boolean };
}

export interface SignaturePadProps {
  config?: SignaturePadConfig;
  value?: string | null;
  onChange?: (value: string | null) => void;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<InstanceType<typeof import('signature_pad').default> | null>(null);
  const userId = useUserStore((s) => s.user?.id ?? null);

  const mergedConfig = { ...config, ...(config as any)?.componentTypeConfig };
  const enableLock = enableLockProp ?? mergedConfig.enableLock ?? false;
  const enableExportPng = enableExportPngProp ?? mergedConfig.enableExportPng ?? false;
  const enableChangeColor = enableChangeColorProp ?? mergedConfig.enableChangeColor ?? false;
  const enableEraser = enableEraserProp ?? mergedConfig.enableEraser ?? false;
  const enableRawData = enableRawDataProp ?? (mergedConfig as any)?.enableRawData ?? false;
  const exportWithBackground = exportWithBackgroundProp ?? (mergedConfig as any)?.exportWithBackground ?? false;
  const enableUserBaseLog = enableUserBaseLogProp ?? (mergedConfig as any)?.enableUserBaseLog ?? false;

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
  const resizeRef = useRef<() => void>(() => {});
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

  /** Redo stack: each entry is one stroke (single PointGroup) that was undone */
  const redoStackRef = useRef<PointGroup[][]>([]);
  const lastValueRef = useRef<string | null>(null);
  const valueRef = useRef<string | null | undefined>(undefined);
  valueRef.current = value ?? null;
  const emitValueRef = useRef<() => void>(() => {});
  const pushHistoryRef = useRef<() => void>(() => {});

  const strokeHex = TAILWIND_ID_TO_HEX[strokeColorId] ?? DEFAULT_PEN_COLOR;
  const locked = isLocked;
  const isDrawingEnabled = !disabled && !readOnly && !locked;
  const isDisabledOrReadOnly = disabled || readOnly;

  const emitValue = useCallback(() => {
    if (!padRef.current || !onChange) return;
    if (padRef.current.isEmpty()) {
      setHasContent(false);
      setRawPoints([]);
      onChange(null);
    } else {
      setHasContent(true);
      try {
        const dataUrl = padRef.current.toDataURL('image/png');
        lastValueRef.current = dataUrl;
        onChange(dataUrl);
        if (enableRawData) {
          const data = padRef.current.toData();
          setRawPoints(buildRawPayload(data, { enableUserBaseLog, userId }));
        }
      } catch {
        onChange(null);
      }
    }
    onBlur?.();
  }, [onChange, onBlur, enableRawData, enableUserBaseLog, userId]);

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
        const zoom = zoomLevelRef.current || 1;
        const width = container.offsetWidth;
        const baseHeight = Math.min(
          CANVAS_HEIGHT_MAX,
          Math.max(CANVAS_HEIGHT_MIN, width * CANVAS_ASPECT)
        );

        // Physically resize the canvas according to zoom so pointer
        // coordinates stay calibrated with the drawing surface.
        canvas.width = width * ratio * zoom;
        canvas.height = baseHeight * ratio * zoom;
        canvas.style.width = `${width * zoom}px`;
        canvas.style.height = `${baseHeight * zoom}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(ratio * zoom, 0, 0, ratio * zoom, 0, 0);
        }
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

      resizeRef.current = resize;
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

  // Recalculate canvas size when zoom changes so drawing coordinates
  // remain accurate even after zooming.
  useEffect(() => {
    if (!isMounted) return;
    resizeRef.current();
  }, [zoomLevel, isMounted]);

  // Sync value prop -> canvas (initial load or external change)
  useEffect(() => {
    if (!padRef.current || !isMounted) return;
    if (value && typeof value === 'string' && value.startsWith('data:image')) {
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

  // Enable/disable pad: drawing when not disabled/locked/eraser; eraser and pinch handle their own
  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    const allowed = isDrawingEnabled && !isEraserMode;
    drawingAllowedRef.current = allowed;
    if (allowed) {
      pad.on();
    } else {
      pad.off();
    }
  }, [isDrawingEnabled, isEraserMode]);

  // Zoom: wheel always zooms when cursor is over viewport
  useEffect(() => {
    if (!isMounted) return;
    const onWheel = (e: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport || !viewport.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      setZoomLevel((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev * (e.deltaY > 0 ? 0.9 : 1.1))));
      const pad = padRef.current;
      const canDraw = !disabled && !readOnly && !locked && !isEraserMode;
      drawingAllowedRef.current = canDraw;
      if (pad) {
        if (canDraw) pad.on();
        else pad.off();
      }
    };
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', onWheel, { capture: true });
  }, [isMounted]);

  // Pinch-to-zoom + pan (two-finger touch): disable drawing during pinch, restore after
  useEffect(() => {
    if (!isMounted) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const getTouchDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const getTouchCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !viewport.contains(e.target as Node)) return;
      const pad = padRef.current;
      if (pad) pad.off();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const center = getTouchCenter(t1, t2);
      pinchRef.current = {
        distance: getTouchDistance(t1, t2),
        centerX: center.x,
        centerY: center.y,
        zoomLevel: zoomLevelRef.current,
        panX: panXRef.current,
        panY: panYRef.current,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const pinch = pinchRef.current;
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const distance = getTouchDistance(t1, t2);
      const center = getTouchCenter(t1, t2);
      const scale = distance / pinch.distance;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch.zoomLevel * scale));
      setZoomLevel(newZoom);
      setPanX(pinch.panX + (center.x - pinch.centerX));
      setPanY(pinch.panY + (center.y - pinch.centerY));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
        const pad = padRef.current;
        const canDraw = !disabled && !readOnly && !locked && !isEraserMode;
        drawingAllowedRef.current = canDraw;
        if (pad) {
          if (canDraw) pad.on();
          else pad.off();
        }
      }
    };

    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd, { passive: true });
    viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchEnd);
    };
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

  const handleExportPng = () => {
    const pad = padRef.current;
    if (!pad || !enableExportPng) return;
    try {
      let dataUrl: string;
      if (exportWithBackground) {
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
    onChange?.(null);
    setShowResetConfirm(false);
    onBlur?.();
  }, [onChange, onBlur]);

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
        <div className={cn('p-2', isEraserMode && 'cursor-crosshair')}>
          <div
            ref={viewportRef}
            className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
            style={{ minHeight: CANVAS_HEIGHT_MAX }}
          >
            <div
              style={{
                transform: `translate(${panX}px,${panY}px)`,
                transformOrigin: '0 0',
              }}
              className="inline-block will-change-transform"
            >
              <canvas
                ref={canvasRef}
                className={cn(
                  'touch-none block w-full rounded-lg border-0',
                  isEraserMode && 'cursor-crosshair'
                )}
                style={{ background: CANVAS_BG_LIGHT }}
                onFocus={onFocus}
                aria-label="Signature"
              />
            </div>
          </div>
        </div>
      </div>
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
