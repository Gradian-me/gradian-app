'use client';

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import type { ProfileSection, UserProfileEntityType, EntityTypeLabel } from '../types';
import { formatProfileFieldValue } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Share2 } from 'lucide-react';
import { resolveLocalizedField, isRTL } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';

const DEFAULT_INNER_GRADIENT = 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)';

const ANIMATION_CONFIG = {
  INITIAL_DURATION: 1200,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 180
} as const;

const clamp = (v: number, min = 0, max = 100): number => Math.min(Math.max(v, min), max);
const round = (v: number, precision = 3): number => parseFloat(v.toFixed(precision));
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number): number =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

const KEYFRAMES_ID = 'pc-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes pc-holo-bg {
      0% { background-position: 0 var(--background-y), 0 0, center; }
      100% { background-position: 0 var(--background-y), 90% 90%, center; }
    }
    @keyframes pc-holo-shine-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.72; }
    }
    @keyframes pc-holo-glow-pulse {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

const SECTION_IDS_IN_CARD = ['basic-info', 'professional-info', 'activity'];

/** Badge variant names that match API entityType.color */
const BADGE_VARIANT_KEYS = [
  'default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info', 'gradient',
  'muted', 'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
] as const;
type BadgeVariantKey = (typeof BADGE_VARIANT_KEYS)[number];

function resolveEntityTypeLabel(label: EntityTypeLabel, language: string): string {
  if (typeof label === 'string') return label.trim();
  return resolveLocalizedField(label, language, 'en');
}

function entityTypeColorToVariant(color: string | undefined): BadgeVariantKey {
  if (!color) return 'secondary';
  const lower = color.toLowerCase();
  return BADGE_VARIANT_KEYS.includes(lower as BadgeVariantKey) ? (lower as BadgeVariantKey) : 'secondary';
}

export interface ProfileCardHologramProps {
  avatarUrl?: string;
  iconUrl?: string;
  grainUrl?: string;
  innerGradient?: string;
  behindGlowEnabled?: boolean;
  behindGlowColor?: string;
  behindGlowSize?: string;
  className?: string;
  enableTilt?: boolean;
  enableMobileTilt?: boolean;
  mobileTiltSensitivity?: number;
  miniAvatarUrl?: string;
  name?: string;
  title?: string;
  handle?: string;
  status?: string;
  email?: string;
  contactText?: string;
  shareText?: string;
  showUserInfo?: boolean;
  showGyroDebug?: boolean;
  sections?: ProfileSection[];
  entityType?: UserProfileEntityType[];
  onContactClick?: () => void;
  onShareClick?: () => void;
}

interface TiltEngine {
  setImmediate: (x: number, y: number) => void;
  setTarget: (x: number, y: number) => void;
  toCenter: () => void;
  beginInitial: (durationMs: number) => void;
  getCurrent: () => { x: number; y: number; tx: number; ty: number };
  cancel: () => void;
}

const DEFAULT_AVATAR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle fill='%23444' cx='50' cy='50' r='50'/%3E%3C/svg%3E";

/** True when device likely has a gyro and we're in a mobile-like context (touch or narrow). */
function isMobileWithGyroAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const narrow = typeof window.innerWidth === 'number' && window.innerWidth < 1024;
  return !!(hasTouch || narrow);
}

/** iOS 13+ requires user gesture to request device motion/orientation permission. */
function isOrientationPermissionRequired(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } };
  return typeof w.DeviceOrientationEvent?.requestPermission === 'function';
}

type WindowWithMotion = Window & {
  DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
  DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
};

const ProfileCardHologramComponent: React.FC<ProfileCardHologramProps> = ({
  avatarUrl = DEFAULT_AVATAR_PLACEHOLDER,
  iconUrl = '/logo/Gradian_Pattern.png',
  grainUrl = '',
  innerGradient,
  behindGlowEnabled = true,
  behindGlowColor,
  behindGlowSize,
  className = '',
  enableTilt = true,
  enableMobileTilt = true,
  mobileTiltSensitivity = 7,
  miniAvatarUrl,
  name = '',
  title = '',
  handle = '',
  status = 'Online',
  email,
  contactText = 'Contact',
  shareText = 'Share',
  showUserInfo = true,
  showGyroDebug = false,
  sections = [],
  entityType = [],
  onContactClick,
  onShareClick
}) => {
  const language = useLanguageStore((state) => state.language || 'en');
  const rtl = isRTL(language);
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const enterTimerRef = useRef<number | null>(null);
  const leaveRafRef = useRef<number | null>(null);
  const gyroSmoothRef = useRef<{ beta: number; gamma: number } | null>(null);
  const gyroListenerAddedRef = useRef(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [pointerOver, setPointerOver] = useState(false);
  const [mainAvatarError, setMainAvatarError] = useState(false);
  const [miniAvatarError, setMiniAvatarError] = useState(false);

  const hasValidAvatarUrl = useCallback((url: string | undefined) => {
    return Boolean(url && url.trim() && url !== DEFAULT_AVATAR_PLACEHOLDER);
  }, []);
  const showMainAvatar = hasValidAvatarUrl(avatarUrl) && !mainAvatarError;
  const showMiniAvatar = (hasValidAvatarUrl(miniAvatarUrl) || hasValidAvatarUrl(avatarUrl)) && !miniAvatarError;

  const gyroDebugRef = useRef<{
    beta?: number;
    gamma?: number;
    smoothBeta?: number;
    smoothGamma?: number;
    x?: number;
    y?: number;
    currentX?: number;
    currentY?: number;
    targetX?: number;
    targetY?: number;
  }>({});
  const [gyroDebugDisplay, setGyroDebugDisplay] = useState<typeof gyroDebugRef.current>({});
  const enableGyroRef = useRef<() => void>(() => {});

  /** Tilt divisors: mobile uses 2.5/2 for stronger tilt, desktop 5/4. */
  const tiltDivisorRef = useRef({ divX: 5, divY: 4 });
  useEffect(() => {
    const mql = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;
    if (!mql) return;
    const update = (): void => {
      const mobile = mql.matches;
      tiltDivisorRef.current = mobile ? { divX: 4, divY: 3 } : { divX: 5, divY: 4 };
    };
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const GYRO_SMOOTH = 0.18;

  const tiltEngine = useMemo<TiltEngine | null>(() => {
    if (!enableTilt) return null;

    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x: number, y: number): void => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties: Record<string, string> = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / tiltDivisorRef.current.divX))}deg`,
        '--rotate-y': `${round(centerY / tiltDivisorRef.current.divY)}deg`
      };

      for (const [k, v] of Object.entries(properties)) wrap.style.setProperty(k, v);
    };

    const step = (ts: number): void => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = (): void => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x: number, y: number): void {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x: number, y: number): void {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter(): void {
        const shell = shellRef.current;
        if (!shell) return;
        this.setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      },
      beginInitial(durationMs: number): void {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent(): { x: number; y: number; tx: number; ty: number } {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel(): void {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      }
    };
  }, [enableTilt]);

  const getOffsets = (evt: PointerEvent, el: HTMLElement): { x: number; y: number } => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const handlePointerMove = useCallback(
    (event: PointerEvent): void => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;
      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerEnter = useCallback(
    (event: PointerEvent): void => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      setPointerOver(true);
      shell.classList.add('active');
      shell.classList.add('entering');
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        shell.classList.remove('entering');
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerLeave = useCallback((): void => {
    const shell = shellRef.current;
    if (!shell || !tiltEngine) return;

    setPointerOver(false);
    tiltEngine.toCenter();

    const checkSettle = (): void => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      const settled = Math.hypot(tx - x, ty - y) < 0.6;
      if (settled) {
        shell.classList.remove('active');
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(checkSettle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(checkSettle);
  }, [tiltEngine]);

  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent): void => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      const { beta, gamma } = event;
      if (beta == null || gamma == null) return;

      let smooth = gyroSmoothRef.current;
      if (smooth == null) {
        smooth = { beta, gamma };
        gyroSmoothRef.current = smooth;
      } else {
        smooth.beta = smooth.beta + GYRO_SMOOTH * (beta - smooth.beta);
        smooth.gamma = smooth.gamma + GYRO_SMOOTH * (gamma - smooth.gamma);
      }

      const centerX = shell.clientWidth / 2;
      const centerY = shell.clientHeight / 2;
      const x = clamp(centerX + smooth.gamma * mobileTiltSensitivity, 0, shell.clientWidth);
      const y = clamp(
        centerY + (smooth.beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * mobileTiltSensitivity,
        0,
        shell.clientHeight
      );

      if (DEMO_MODE && gyroDebugRef.current) {
        gyroDebugRef.current.beta = beta;
        gyroDebugRef.current.gamma = gamma;
        gyroDebugRef.current.smoothBeta = smooth.beta;
        gyroDebugRef.current.smoothGamma = smooth.gamma;
        gyroDebugRef.current.x = x;
        gyroDebugRef.current.y = y;
      }

      tiltEngine.setTarget(x, y);
    },
    [tiltEngine, mobileTiltSensitivity]
  );

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return;

    const shell = shellRef.current;
    if (!shell) return;

    const pointerMoveHandler = handlePointerMove as EventListener;
    const pointerEnterHandler = handlePointerEnter as EventListener;
    const pointerLeaveHandler = handlePointerLeave as EventListener;
    const deviceOrientationHandler = handleDeviceOrientation as EventListener;

    shell.addEventListener('pointerenter', pointerEnterHandler);
    shell.addEventListener('pointermove', pointerMoveHandler);
    shell.addEventListener('pointerleave', pointerLeaveHandler);

    const mobileWithGyro = isMobileWithGyroAvailable();
    const needsPermission = isOrientationPermissionRequired();
    const secureContext = typeof location !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost');

    const addGyroListener = (): void => {
      if (gyroListenerAddedRef.current) return;
      gyroListenerAddedRef.current = true;
      window.addEventListener('deviceorientation', deviceOrientationHandler);
      setGyroActive(true);
    };

    const enableGyroOnGesture = (): void => {
      if (!enableMobileTilt || !mobileWithGyro || !secureContext) return;
      if (gyroListenerAddedRef.current) return;

      if (needsPermission) {
        const win = window as WindowWithMotion;
        const orientationPromise = win.DeviceOrientationEvent?.requestPermission?.();
        const motionPromise = win.DeviceMotionEvent?.requestPermission?.();
        const promises: Promise<string>[] = [];
        if (orientationPromise) promises.push(orientationPromise);
        if (motionPromise) promises.push(motionPromise);
        if (promises.length === 0) {
          addGyroListener();
          return;
        }
        Promise.all(promises)
          .then((results) => {
            if (results.every((s) => s === 'granted')) addGyroListener();
          })
          .catch(() => {
            gyroListenerAddedRef.current = false;
          });
      } else {
        addGyroListener();
      }
    };

    // On Android (and other non-iOS): enable gyro immediately so tilt works without a tap
    if (enableMobileTilt && mobileWithGyro && secureContext && !needsPermission) {
      addGyroListener();
    }

    shell.addEventListener('click', enableGyroOnGesture);
    shell.addEventListener('touchstart', enableGyroOnGesture, { passive: true });

    enableGyroRef.current = enableGyroOnGesture;

    const initialX = (shell.clientWidth || 0) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
    tiltEngine.setImmediate(initialX, initialY);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);

    return () => {
      shell.removeEventListener('pointerenter', pointerEnterHandler);
      shell.removeEventListener('pointermove', pointerMoveHandler);
      shell.removeEventListener('pointerleave', pointerLeaveHandler);
      shell.removeEventListener('click', enableGyroOnGesture);
      shell.removeEventListener('touchstart', enableGyroOnGesture);
      window.removeEventListener('deviceorientation', deviceOrientationHandler);
      setGyroActive(false);
      gyroSmoothRef.current = null;
      gyroListenerAddedRef.current = false;
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      shell.classList.remove('entering');
    };
  }, [
    enableTilt,
    enableMobileTilt,
    tiltEngine,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
    handleDeviceOrientation
  ]);

  useEffect(() => {
    if (!DEMO_MODE || !tiltEngine) return;
    const interval = setInterval(() => {
      const curr = tiltEngine.getCurrent();
      setGyroDebugDisplay({
        ...gyroDebugRef.current,
        currentX: curr.x,
        currentY: curr.y,
        targetX: curr.tx,
        targetY: curr.ty
      });
    }, 300);
    return () => clearInterval(interval);
  }, [tiltEngine]);

  const gyroAvailability =
    typeof window !== 'undefined'
      ? {
          mobileWithGyro: isMobileWithGyroAvailable(),
          needsPermission: isOrientationPermissionRequired(),
          secureContext: location.protocol === 'https:' || location.hostname === 'localhost'
        }
      : { mobileWithGyro: false, needsPermission: false, secureContext: false };

  const cardRadius = '30px';

  const cardStyle = useMemo(
    () => {
      const active = pointerOver || gyroActive;
      return {
        '--icon': iconUrl ? `url(${iconUrl})` : 'none',
        '--grain': grainUrl ? `url(${grainUrl})` : 'none',
        '--inner-gradient': innerGradient ?? DEFAULT_INNER_GRADIENT,
        '--behind-glow-color': behindGlowColor ?? 'rgba(125, 190, 255, 0.67)',
        '--behind-glow-size': behindGlowSize ?? '50%',
        '--pointer-x': '50%',
        '--pointer-y': '50%',
        '--pointer-from-center': '0',
        '--pointer-from-top': '0.5',
        '--pointer-from-left': '0.5',
        '--card-opacity': active ? '1' : '0',
        '--rotate-x': '0deg',
        '--rotate-y': '0deg',
        '--background-x': '50%',
        '--background-y': '50%',
        '--card-radius': cardRadius,
        '--sunpillar-1': 'hsl(2, 100%, 73%)',
        '--sunpillar-2': 'hsl(53, 100%, 69%)',
        '--sunpillar-3': 'hsl(93, 100%, 69%)',
        '--sunpillar-4': 'hsl(176, 100%, 76%)',
        '--sunpillar-5': 'hsl(228, 100%, 74%)',
        '--sunpillar-6': 'hsl(283, 100%, 73%)',
        '--sunpillar-clr-1': 'var(--sunpillar-1)',
        '--sunpillar-clr-2': 'var(--sunpillar-2)',
        '--sunpillar-clr-3': 'var(--sunpillar-3)',
        '--sunpillar-clr-4': 'var(--sunpillar-4)',
        '--sunpillar-clr-5': 'var(--sunpillar-5)',
        '--sunpillar-clr-6': 'var(--sunpillar-6)'
      };
    },
    [iconUrl, grainUrl, innerGradient, behindGlowColor, behindGlowSize, cardRadius, pointerOver, gyroActive]
  );

  const handleContactClick = useCallback((): void => {
    if (onContactClick) {
      onContactClick();
    } else if (email && typeof window !== 'undefined') {
      window.location.href = `mailto:${email}`;
    }
  }, [onContactClick, email]);

  const handleShareClick = useCallback((): void => {
    onShareClick?.();
  }, [onShareClick]);

  const displayName = name || 'User';

  const cardSections = useMemo(
    () => sections.filter(s => SECTION_IDS_IN_CARD.includes(s.id)),
    [sections]
  );

  const shineStyle: React.CSSProperties = {
    maskImage: iconUrl ? `url(${iconUrl})` : 'none',
    maskMode: 'luminance',
    maskRepeat: 'repeat',
    maskSize: '120%',
    maskPosition: 'top calc(200% - (var(--background-y) * 5)) left calc(100% - var(--background-x))',
    filter: 'brightness(0.72) contrast(1.38) saturate(0.5)',
    animation: 'pc-holo-bg 10s linear infinite, pc-holo-shine-pulse 6s ease-in-out infinite',
    animationPlayState: 'running',
    mixBlendMode: 'color-dodge',
    transform: 'translate3d(0, 0, 1px)',
    overflow: 'hidden',
    zIndex: 3,
    background: 'transparent',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        var(--sunpillar-clr-1) 5%,
        var(--sunpillar-clr-2) 10%,
        var(--sunpillar-clr-3) 15%,
        var(--sunpillar-clr-4) 20%,
        var(--sunpillar-clr-5) 25%,
        var(--sunpillar-clr-6) 30%,
        var(--sunpillar-clr-1) 35%
      ),
      repeating-linear-gradient(
        -45deg,
        #0e152e 0%,
        hsl(180, 10%, 60%) 3.8%,
        hsl(180, 29%, 66%) 4.5%,
        hsl(180, 10%, 60%) 5.2%,
        #0e152e 10%,
        #0e152e 12%
      ),
      radial-gradient(
        farthest-corner circle at var(--pointer-x) var(--pointer-y),
        hsla(0, 0%, 0%, 0.08) 12%,
        hsla(0, 0%, 0%, 0.14) 20%,
        hsla(0, 0%, 0%, 0.22) 120%
      )
    `.replace(/\s+/g, ' '),
    gridArea: '1 / -1',
    borderRadius: cardRadius,
    pointerEvents: 'none'
  };

  const iconHologramGlowStyle: React.CSSProperties = iconUrl
    ? {
        maskImage: `url(${iconUrl})`,
        maskMode: 'luminance',
        maskRepeat: 'repeat',
        maskSize: '120%',
        maskPosition: 'top calc(200% - (var(--background-y) * 5)) left calc(100% - var(--background-x))',
        background: `radial-gradient(
          ellipse 80% 80% at var(--pointer-x) var(--pointer-y),
          hsla(190, 90%, 75%, 0.45) 0%,
          hsla(280, 80%, 70%, 0.35) 35%,
          hsla(340, 85%, 72%, 0.2) 60%,
          transparent 85%
        )`,
        mixBlendMode: 'screen',
        filter: 'blur(0.5px)',
        opacity: 0.4,
        animation: 'pc-holo-glow-pulse 5s ease-in-out infinite',
        transform: 'translate3d(0, 0, 1.05px)',
        overflow: 'hidden',
        zIndex: 3.5,
        gridArea: '1 / -1',
        borderRadius: cardRadius,
        pointerEvents: 'none'
      }
    : { display: 'none' };

  const glareStyle: React.CSSProperties = {
    transform: 'translate3d(0, 0, 1.1px)',
    overflow: 'hidden',
    backgroundImage: `radial-gradient(
      farthest-corner circle at var(--pointer-x) var(--pointer-y),
      hsl(248, 25%, 80%) 12%,
      hsla(207, 40%, 30%, 0.8) 90%
    )`,
    mixBlendMode: 'overlay',
    filter: 'brightness(0.8) contrast(1.2)',
    zIndex: 4,
    gridArea: '1 / -1',
    borderRadius: cardRadius,
    pointerEvents: 'none'
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        ref={wrapRef}
        className={`relative touch-none select-none ${className}`.trim()}
        style={{ perspective: '500px', transform: 'translate3d(0, 0, 0.1px)', ...cardStyle } as React.CSSProperties}
      >
      {behindGlowEnabled && (
        <div
          className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-200 ease-out select-none"
          style={{
            background: `radial-gradient(circle at var(--pointer-x) var(--pointer-y), var(--behind-glow-color) 0%, transparent var(--behind-glow-size))`,
            filter: 'blur(50px) saturate(1.1)',
            opacity: 'calc(0.5 + 0.4 * var(--card-opacity))'
          }}
        />
      )}
      <div ref={shellRef} className="relative z-1 group select-none">
        <section
          className="grid relative overflow-hidden select-none"
          style={{
            height: '80svh',
            maxHeight: '540px',
            aspectRatio: '0.718',
            borderRadius: cardRadius,
            backgroundBlendMode: 'color-dodge, normal, normal, normal',
            boxShadow:
              'rgba(0, 0, 0, 0.8) calc((var(--pointer-from-left) * 10px) - 3px) calc((var(--pointer-from-top) * 20px) - 6px) 20px -5px',
            transition: gyroActive || pointerOver ? 'transform 180ms ease-out' : 'transform 1s ease',
            transform:
              gyroActive || pointerOver
                ? 'translateZ(0) rotateX(var(--rotate-y)) rotateY(var(--rotate-x))'
                : 'translateZ(0) rotateX(0deg) rotateY(0deg)',
            background: 'rgba(0, 0, 0, 0.9)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: gyroActive || pointerOver ? 'transform' : 'auto',
            isolation: 'isolate'
          }}
        >
          <div
            className="absolute inset-0 select-none"
            style={{
              backgroundImage: 'var(--inner-gradient)',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              borderRadius: cardRadius,
              display: 'grid',
              gridArea: '1 / -1',
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d'
            }}
          >
            <div style={shineStyle} />
            <div style={iconHologramGlowStyle} />
            <div style={glareStyle} />
            <div
              className="overflow-visible"
              style={{
                mixBlendMode: 'luminosity',
                transform: 'translateZ(2px)',
                gridArea: '1 / -1',
                borderRadius: cardRadius,
                pointerEvents: 'none',
                backfaceVisibility: 'visible',
                WebkitBackfaceVisibility: 'visible'
              }}
            >
              {showMainAvatar && (
                <img
                  className="
                    absolute 
                    bottom-30 
                    shadow-2xl 
                    transition-transform 
                    duration-[120ms] 
                    end-6
                    rounded-2xl
                    ease-out
                    w-32 lg:w-38
                  "
                  style={{
                    backfaceVisibility: 'visible',
                    WebkitBackfaceVisibility: 'visible',
                    transform: 'translateZ(0.5px)',
                    imageRendering: 'auto'
                  }}
                  src={avatarUrl}
                  alt={`${displayName} avatar`}
                  loading="lazy"
                  onError={() => setMainAvatarError(true)}
                />
              )}
              {showUserInfo && (
                <div
                  className="absolute z-2 flex items-center justify-between backdrop-blur-[8px] border border-white/10 pointer-events-none select-none"
                  style={
                    {
                      '--ui-inset': '20px',
                      '--ui-radius-bias': '6px',
                      bottom: 'var(--ui-inset)',
                      left: 'var(--ui-inset)',
                      right: 'var(--ui-inset)',
                      background: 'rgba(255, 255, 255, 0.16)',
                      borderRadius: 'calc(max(0px, var(--card-radius) - var(--ui-inset) + var(--ui-radius-bias)))',
                      padding: '12px 14px'
                    } as React.CSSProperties
                  }
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {showMiniAvatar && (
                      <div
                        className="rounded-full overflow-hidden border border-white/10 shrink-0"
                        style={{ width: '48px', height: '48px' }}
                      >
                        <img
                          className="w-full h-full object-cover rounded-full"
                          src={miniAvatarUrl || avatarUrl}
                          alt={`${displayName} mini avatar`}
                          loading="lazy"
                          style={{
                            display: 'block',
                            gridArea: 'auto',
                            borderRadius: '50%',
                            pointerEvents: 'auto',
                            imageRendering: 'auto',
                            backfaceVisibility: 'visible'
                          }}
                          onError={() => setMiniAvatarError(true)}
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <p className="text-md font-semibold text-white/90">{displayName}</p>
                      {entityType.length > 0 && (
                        <Badge
                          variant={entityTypeColorToVariant(entityType[0].color)}
                          className="w-fit text-[0.65rem] border-white/20 !bg-white/10 !text-white hover:!bg-white/15"
                        >
                          {resolveEntityTypeLabel(entityType[0].label, language)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(onContactClick ?? email) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleContactClick}
                        className="h-10 w-10 rounded-xl !border !border-white/20 !bg-black/20 !text-white hover:!bg-black/30 hover:!border-white/30 [&_svg]:h-4 [&_svg]:w-4"
                        aria-label={contactText}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    {onShareClick && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleShareClick}
                        className="h-10 w-10 rounded-xl !border !border-white/20 !bg-black/20 !text-white hover:!bg-black/30 hover:!border-white/30 [&_svg]:h-4 [&_svg]:w-4"
                        aria-label={shareText}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div
              className="max-h-full overflow-hidden text-center relative z-5 flex flex-col select-none"
              style={{
                transform:
                  'translate3d(calc(var(--pointer-from-left) * -6px + 3px), calc(var(--pointer-from-top) * -6px + 3px), 1px)',
                gridArea: '1 / -1',
                borderRadius: cardRadius,
                pointerEvents: 'none',
                backfaceVisibility: 'visible',
                WebkitBackfaceVisibility: 'visible',
                WebkitFontSmoothing: 'antialiased'
              }}
            >
              <div
                className="w-full flex flex-col shrink-0 gap-2"
                style={{
                  top: '3em',
                  display: 'flex',
                  gridArea: 'auto',
                  containerType: 'inline-size',
                  containerName: 'name-container'
                }}
              >
                <h3
                  className="font-semibold m-0 whitespace-nowrap min-w-0 overflow-hidden text-ellipsis"
                  style={{
                    fontSize: 'clamp(0.8rem, min(8cqw, min(4svh, 2em)), min(4svh, 2em))',
                    backgroundImage: 'linear-gradient(to bottom, #fff, #6f6fbe)',
                    backgroundSize: '1em 1.5em',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    display: 'block',
                    gridArea: 'auto',
                    borderRadius: '0',
                    pointerEvents: 'auto'
                  }}
                >
                  {name || '—'}
                </h3>
                <p
                  className="font-semibold whitespace-nowrap mx-auto w-min"
                  style={{
                    position: 'relative',
                    top: '-12px',
                    fontSize: '1.4rem',
                    margin: '0 auto',
                    backgroundImage: 'linear-gradient(to bottom, #fff, #4a4ac0)',
                    backgroundSize: '1em 1.5em',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    display: 'block',
                    gridArea: 'auto',
                    borderRadius: '0',
                    pointerEvents: 'auto'
                  }}
                >
                  {title || '—'}
                </p>
              </div>
              {cardSections.length > 0 && (
                <div
                  className="flex-1 min-h-0 overflow-y-auto px-4 text-start"
                  style={{
                    maxHeight: 'calc(100% - 10em)',
                    pointerEvents: 'auto'
                  }}
                >
                  <div className="space-y-4 py-2">
                    {cardSections.map(section => (
                      <div key={section.id} className="space-y-1">
                        <div
                          className="w-fit text-sm uppercase tracking-wider text-white/90 border-b border-white/10 pb-2"
                        >
                          {section.title}
                        </div>
                        <div className="space-y-0.5">
                          {section.fields.map(field => (
                            <div key={field.id} className="flex flex-wrap gap-x-2 text-sm text-white/90">
                              <span className="text-white/90 shrink-0">{field.label}:</span>
                              <span className="min-w-0 break-words text-md font-semibold">
                                {formatProfileFieldValue(field, { language })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        {/* Overlay for correct button hit-testing: not 3D-transformed so clicks align with visible buttons */}
        {showUserInfo && (
          <div className="absolute inset-0 z-10 pointer-events-none select-none">
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-between pointer-events-none"
              style={
                {
                  '--ui-inset': '20px',
                  bottom: 'var(--ui-inset)',
                  left: 'var(--ui-inset)',
                  right: 'var(--ui-inset)',
                  padding: '12px 14px'
                } as React.CSSProperties
              }
            >
              <div className="flex-1 min-w-0" aria-hidden="true" />
              <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
                {(onContactClick ?? email) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleContactClick}
                    className="h-10 w-10 rounded-xl !border !border-white/20 !bg-black/20 !text-white hover:!bg-black/30 hover:!border-white/30 [&_svg]:h-4 [&_svg]:w-4"
                    aria-label={contactText}
                    style={{ opacity: 0, pointerEvents: 'auto' }}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
                {onShareClick && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleShareClick}
                    className="h-10 w-10 rounded-xl !border !border-white/20 !bg-black/20 !text-white hover:!bg-black/30 hover:!border-white/30 [&_svg]:h-4 [&_svg]:w-4"
                    aria-label={shareText}
                    style={{ opacity: 0, pointerEvents: 'auto' }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      {DEMO_MODE && showGyroDebug && (
        <div
          className="rounded-lg border border-violet-500/40 bg-violet-950/80 px-3 py-2 font-mono text-xs text-violet-200 shadow-lg"
          aria-live="polite"
        >
          <div className="font-semibold text-violet-300 mb-1">Gyro</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span>β: {gyroDebugDisplay.beta != null ? gyroDebugDisplay.beta.toFixed(1) : '—'}</span>
            <span>γ: {gyroDebugDisplay.gamma != null ? gyroDebugDisplay.gamma.toFixed(1) : '—'}</span>
            <span>βs: {gyroDebugDisplay.smoothBeta != null ? gyroDebugDisplay.smoothBeta.toFixed(1) : '—'}</span>
            <span>γs: {gyroDebugDisplay.smoothGamma != null ? gyroDebugDisplay.smoothGamma.toFixed(1) : '—'}</span>
            <span>x: {gyroDebugDisplay.x != null ? Math.round(gyroDebugDisplay.x) : '—'}</span>
            <span>y: {gyroDebugDisplay.y != null ? Math.round(gyroDebugDisplay.y) : '—'}</span>
            <span>curr: {gyroDebugDisplay.currentX != null && gyroDebugDisplay.currentY != null ? `${Math.round(gyroDebugDisplay.currentX)},${Math.round(gyroDebugDisplay.currentY)}` : '—'}</span>
            <span>tgt: {gyroDebugDisplay.targetX != null && gyroDebugDisplay.targetY != null ? `${Math.round(gyroDebugDisplay.targetX)},${Math.round(gyroDebugDisplay.targetY)}` : '—'}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-violet-400">
              {gyroActive ? '🟢 gyro active' : '⚪ gyro off'}
            </span>
            {!gyroActive && (
              <>
                <span className="text-violet-500/80">
                  HTTPS: {gyroAvailability.secureContext ? '✓' : '✗'} · Mobile: {gyroAvailability.mobileWithGyro ? '✓' : '✗'}
                  {gyroAvailability.needsPermission ? ' · iOS' : ''}
                </span>
                {!gyroAvailability.secureContext ? (
                  <span className="text-amber-300/90" title="Browsers only allow motion/orientation over HTTPS or localhost">
                    Use HTTPS (e.g. ngrok or next --experimental-https) for gyro
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => enableGyroRef.current()}
                    className="rounded bg-violet-600 px-2 py-1 text-violet-100 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    Enable gyro
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProfileCardHologram = React.memo(ProfileCardHologramComponent);
ProfileCardHologram.displayName = 'ProfileCardHologram';
