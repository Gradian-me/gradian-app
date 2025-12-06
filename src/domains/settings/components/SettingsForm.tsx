/**
 * Settings Form Component
 * Reusable form component for settings
 */

'use client';

import { useState, useEffect } from 'react';
import { UserSettings, SettingsUpdate } from '../types';
import { useSettings } from '../hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';

interface SettingsFormProps {
  userId?: string;
  onSave?: (settings: UserSettings) => void;
  onCancel?: () => void;
  showSaveButton?: boolean;
  children?: (props: SettingsFormChildrenProps) => React.ReactNode;
}

export interface SettingsFormChildrenProps {
  settings: UserSettings;
  updateField: <K extends keyof SettingsUpdate>(
    section: K,
    field: string,
    value: any
  ) => void;
  loading: boolean;
  error: string | null;
}

export function SettingsForm({
  userId,
  onSave,
  onCancel,
  showSaveButton = true,
  children,
}: SettingsFormProps) {
  const { settings, loading, error, updateSettings } = useSettings({ userId });
  const [localSettings, setLocalSettings] = useState<Partial<UserSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const updateField = <K extends keyof SettingsUpdate>(
    section: K,
    field: string,
    value: any
  ) => {
    if (!settings) return;

    setLocalSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...settings[section],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      const updates: SettingsUpdate = {
        profile: localSettings.profile,
        notifications: localSettings.notifications,
        security: localSettings.security,
        appearance: localSettings.appearance,
        integrations: localSettings.integrations,
      };

      // Remove undefined values and empty objects
      Object.keys(updates).forEach((key) => {
        const sectionKey = key as keyof SettingsUpdate;
        if (updates[sectionKey] && Object.keys(updates[sectionKey] || {}).length === 0) {
          delete updates[sectionKey];
        }
      });

      const updatedSettings = await updateSettings(updates);
      if (updatedSettings) {
        setLocalSettings(updatedSettings);
        setHasChanges(false);

        if (onSave) {
          onSave(updatedSettings);
        }
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">No settings found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {children && children({ settings: localSettings as UserSettings, updateField, loading, error })}
      
      {showSaveButton && (
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || loading}
          >
            <Save className="h-4 w-4 me-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

