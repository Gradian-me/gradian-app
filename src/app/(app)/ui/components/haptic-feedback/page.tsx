'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import {
  triggerSelection,
  triggerNotification,
  triggerImpact,
  triggerAndroid,
} from '@/gradian-ui/shared/haptic-utils';

const androidPresets = [
  { key: 'Confirm', label: 'Confirm' },
  { key: 'Reject', label: 'Reject' },
  { key: 'Long_Press', label: 'Long press' },
  { key: 'Toggle_On', label: 'Toggle on' },
  { key: 'Toggle_Off', label: 'Toggle off' },
  { key: 'Clock_Tick', label: 'Clock tick' },
] as const;

export default function HapticFeedbackPage() {
  useSetLayoutProps({
    title: 'Haptic feedback',
    subtitle:
      'Test different haptic patterns for selection, notifications, impacts, and Android-specific feedback.',
    icon: 'Vibration',
  });

  const warningShownRef = React.useRef(false);

  const handleResult = (ok: boolean) => {
    if (ok || warningShownRef.current) return;
    warningShownRef.current = true;
    toast.warning('Haptic feedback is not available on this device or browser.', {
      description: 'Your device may not support the Vibration API, or it is disabled.',
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Selection
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A light tick used to confirm small selection changes.
            </p>
          </div>
          <Button
            onClick={() => {
              const ok = triggerSelection();
              handleResult(ok);
            }}
          >
            Selection
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notifications
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use these patterns for success, warning, or error states.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              const ok = triggerNotification('success');
              handleResult(ok);
            }}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const ok = triggerNotification('warning');
              handleResult(ok);
            }}
          >
            Warning
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const ok = triggerNotification('error');
              handleResult(ok);
            }}
          >
            Error
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Impact
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Simulate collisions between UI elements with different intensities.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ok = triggerImpact('light');
              handleResult(ok);
            }}
          >
            Light
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const ok = triggerImpact('medium');
              handleResult(ok);
            }}
          >
            Medium
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const ok = triggerImpact('heavy');
              handleResult(ok);
            }}
          >
            Heavy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ok = triggerImpact('rigid');
              handleResult(ok);
            }}
          >
            Rigid
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ok = triggerImpact('soft');
              handleResult(ok);
            }}
          >
            Soft
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Android presets
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Android-specific haptic patterns. On unsupported platforms these will
            safely fall back to no-op.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {androidPresets.map((preset) => (
            <Button
              key={preset.key}
              variant="outline"
              size="sm"
              onClick={() => {
                const ok = triggerAndroid(preset.key);
                handleResult(ok);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

