/**
 * Settings Hook
 * React hook for managing user settings
 * Waits for user store to have userId (e.g. after rehydration) before loading to avoid "userId is required" when logged in.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserSettings, SettingsUpdate } from '../types';
import { SettingsService } from '../services/settings.service';
import { useUserStore } from '@/stores/user.store';

interface UseSettingsOptions {
  userId?: string;
  autoLoad?: boolean;
}

interface UseSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: SettingsUpdate) => Promise<UserSettings>;
  resetSettings: () => Promise<UserSettings>;
  refreshSettings: () => Promise<void>;
}

/** Delay before showing "please log in" when userId is still null (allows store rehydration). */
const USER_ID_WAIT_MS = 2000;

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const { userId: optionsUserId, autoLoad = true } = options;
  const storeUserId = useUserStore((state) => state.user?.id ?? null);
  const effectiveUserId = optionsUserId ?? storeUserId ?? null;

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettings = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      setLoading(true);
      setError(null);
      const userSettings = await SettingsService.getSettings(effectiveUserId);
      setSettings(userSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  // Load when we have a userId; otherwise wait for store rehydration or show message after delay
  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }
    if (effectiveUserId) {
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
      }
      loadSettings();
      return;
    }
    setLoading(true);
    setError(null);
    waitTimeoutRef.current = setTimeout(() => {
      waitTimeoutRef.current = null;
      setLoading(false);
      setError('Please log in to view settings.');
    }, USER_ID_WAIT_MS);
    return () => {
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
      }
    };
  }, [autoLoad, effectiveUserId, loadSettings]);

  const updateSettings = useCallback(async (updates: SettingsUpdate): Promise<UserSettings> => {
    if (!effectiveUserId) {
      const errMsg = 'Please log in to update settings.';
      setError(errMsg);
      throw new Error(errMsg);
    }
    try {
      setError(null);
      const updatedSettings = await SettingsService.updateSettings(updates, effectiveUserId);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      console.error('Error updating settings:', err);
      throw err;
    }
  }, [effectiveUserId]);

  const resetSettings = useCallback(async (): Promise<UserSettings> => {
    if (!effectiveUserId) {
      const errMsg = 'Please log in to reset settings.';
      setError(errMsg);
      throw new Error(errMsg);
    }
    try {
      setError(null);
      const defaultSettings = await SettingsService.resetSettings(effectiveUserId);
      setSettings(defaultSettings);
      return defaultSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
      console.error('Error resetting settings:', err);
      throw err;
    }
  }, [effectiveUserId]);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    refreshSettings,
  };
}

