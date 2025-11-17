'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NameInput, Select } from '@/gradian-ui/form-builder/form-elements';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { Save } from 'lucide-react';

interface Integration {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lastSynced: string;
  targetRoute: string;
  targetMethod?: 'GET' | 'POST';
  sourceRoute?: string;
  sourceMethod?: 'GET' | 'POST';
  sourceDataPath?: string;
}

interface ConfigureIntegrationFormProps {
  integrationId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  onSubmitRef?: (submitFn: () => void) => void;
  onSavingChange?: (saving: boolean) => void;
  hideActions?: boolean;
}

// Helper function to generate ID from title
function generateIdFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function ConfigureIntegrationForm({ 
  integrationId, 
  onSuccess,
  onCancel,
  onSubmitRef,
  onSavingChange,
  hideActions = false
}: ConfigureIntegrationFormProps) {
  const isEdit = !!integrationId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [isIdCustomized, setIsIdCustomized] = useState(false);
  const [formData, setFormData] = useState<Partial<Integration>>({
    id: '',
    title: '',
    description: '',
    icon: 'Settings',
    color: '#8B5CF6',
    lastSynced: '',
    targetRoute: '',
    targetMethod: 'GET',
    sourceRoute: '',
    sourceMethod: 'GET',
    sourceDataPath: '',
  });
  const formDataRef = useRef(formData);
  
  // Keep ref in sync with state
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Auto-generate ID from title when title changes (only if not customized)
  useEffect(() => {
    if (!isEdit && !isIdCustomized && formData.title) {
      const generatedId = generateIdFromTitle(formData.title);
      if (generatedId) {
        setFormData(prev => ({ ...prev, id: generatedId }));
      }
    }
  }, [formData.title, isIdCustomized, isEdit]);

  useEffect(() => {
    if (isEdit && integrationId) {
      const fetchIntegration = async () => {
        try {
          const response = await apiRequest<Integration[]>('/api/integrations', {
            method: 'GET',
          });
          
          if (response.success && response.data) {
            const integration = response.data.find(i => i.id === integrationId);
            if (integration) {
              setFormData(integration);
              setIsIdCustomized(true); // In edit mode, ID is always considered customized
            }
          }
        } catch (error) {
          console.error('Error fetching integration:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchIntegration();
    } else {
      setLoading(false);
    }
  }, [integrationId, isEdit]);

  // Create config for NameInput - must be before any early returns
  const idInputConfig = useMemo(() => ({
    id: 'integration-id',
    name: 'id',
    label: 'Integration ID',
    required: true,
  }), []);

  // Notify parent of saving state changes
  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(saving);
    }
  }, [saving, onSavingChange]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const currentFormData = formDataRef.current;
    setSaving(true);

    try {
      if (isEdit) {
        // Update existing integration
        const response = await apiRequest<Integration>('/api/integrations', {
          method: 'PUT',
          body: currentFormData,
        });

        if (response.success) {
          onSuccess?.();
        } else {
          alert(`Failed to update integration: ${response.error}`);
        }
      } else {
        // Create new integration
        const newIntegration = {
          ...currentFormData,
          targetRoute: currentFormData.targetRoute || `/integrations/sync?id=${currentFormData.id}`,
          targetMethod: currentFormData.targetMethod || 'GET',
          sourceMethod: currentFormData.sourceMethod || 'GET',
        };

        const response = await apiRequest<Integration>('/api/integrations', {
          method: 'POST',
          body: newIntegration,
        });

        if (response.success) {
          onSuccess?.();
        } else {
          alert(`Failed to create integration: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving integration:', error);
      alert('An error occurred while saving the integration');
    } finally {
      setSaving(false);
    }
  }, [isEdit, onSuccess]);

  // Expose submit handler to parent
  useEffect(() => {
    if (onSubmitRef) {
      onSubmitRef(() => handleSubmit());
    }
    // Only re-run when handleSubmit changes, not onSubmitRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSubmit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <NameInput
          config={idInputConfig}
          value={formData.id || ''}
          onChange={(value) => {
            setFormData({ ...formData, id: value });
            setIsIdCustomized(true);
          }}
          placeholder="e.g., email-templates"
          required
          disabled={isEdit}
          isCustomizable={!isEdit}
          customMode={isIdCustomized}
          onCustomModeChange={(custom) => {
            setIsIdCustomized(custom);
            if (!custom && formData.title) {
              // When switching back to auto-mode, regenerate from title
              const generatedId = generateIdFromTitle(formData.title);
              if (generatedId) {
                setFormData(prev => ({ ...prev, id: generatedId }));
              }
            }
          }}
          defaultCustomMode={isEdit}
        />
        <p className="text-xs text-gray-500">Unique identifier for this integration (auto-generated from title)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Email Templates"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the integration"
          required
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Input
            id="icon"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="e.g., Mail, Database"
          />
          <p className="text-xs text-gray-500">Lucide icon name</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
          <p className="text-xs text-gray-500">Theme color for the integration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="targetRoute">Target Route *</Label>
          <Input
            id="targetRoute"
            value={formData.targetRoute}
            onChange={(e) => setFormData({ ...formData, targetRoute: e.target.value })}
            placeholder="http://example.com/api/sync or /api/sync"
            required
          />
          <p className="text-xs text-gray-500">The endpoint to call for syncing</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetMethod">Target Method *</Label>
          <Select
            config={{
              id: 'targetMethod',
              name: 'targetMethod',
            }}
            value={formData.targetMethod || 'GET'}
            onValueChange={(value) => setFormData({ ...formData, targetMethod: value as 'GET' | 'POST' })}
            options={[
              { id: 'GET', label: 'GET', icon: 'Download' },
              { id: 'POST', label: 'POST', icon: 'Upload' },
            ]}
            placeholder="Select method"
          />
          <p className="text-xs text-gray-500">HTTP method for target route</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="sourceRoute">Source Route (Optional)</Label>
          <Input
            id="sourceRoute"
            value={formData.sourceRoute || ''}
            onChange={(e) => setFormData({ ...formData, sourceRoute: e.target.value })}
            placeholder="http://example.com/api/data"
          />
          <p className="text-xs text-gray-500">If provided, fetch data from this route first</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourceMethod">Source Method</Label>
          <Select
            config={{
              id: 'sourceMethod',
              name: 'sourceMethod',
            }}
            value={formData.sourceMethod || 'GET'}
            onValueChange={(value) => setFormData({ ...formData, sourceMethod: value as 'GET' | 'POST' })}
            options={[
              { id: 'GET', label: 'GET', icon: 'Download' },
              { id: 'POST', label: 'POST', icon: 'Upload' },
            ]}
            placeholder="Select method"
            disabled={!formData.sourceRoute}
          />
          <p className="text-xs text-gray-500">HTTP method for source route</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sourceDataPath">Source Data Path (Optional)</Label>
        <Input
          id="sourceDataPath"
          value={formData.sourceDataPath || ''}
          onChange={(e) => setFormData({ ...formData, sourceDataPath: e.target.value })}
          placeholder="results or data.items"
        />
        <p className="text-xs text-gray-500">JSON path to extract data from source response (e.g., "results", "data.items")</p>
      </div>

      {!hideActions && (
        <div className="flex justify-end space-x-2 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      )}
    </form>
  );
}

