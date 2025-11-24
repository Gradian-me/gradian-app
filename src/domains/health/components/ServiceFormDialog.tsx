'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconInput } from '@/gradian-ui/form-builder/form-elements';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Save } from 'lucide-react';
import { HealthService } from '../types';

interface ServiceFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingService: HealthService | null;
  formData: Partial<HealthService>;
  onFormDataChange: (data: Partial<HealthService>) => void;
  onSave: () => Promise<void>;
}

export function ServiceFormDialog({
  isOpen,
  onClose,
  editingService,
  formData,
  onFormDataChange,
  onSave,
}: ServiceFormDialogProps) {
  const handleSave = async () => {
    await onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingService ? 'Edit Service' : 'New Service'}</DialogTitle>
          <DialogDescription>
            {editingService ? 'Update the health service configuration' : 'Create a new health service to monitor'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="service-id" className="required">
              Service ID
            </Label>
            <Input
              id="service-id"
              value={formData.id || ''}
              onChange={(e) => onFormDataChange({ ...formData, id: e.target.value })}
              placeholder="gradian-app"
              disabled={!!editingService}
              className="font-mono"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Unique identifier for the service (cannot be changed after creation)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-title" className="required">
              Service Title
            </Label>
            <Input
              id="service-title"
              value={formData.serviceTitle || ''}
              onChange={(e) => onFormDataChange({ ...formData, serviceTitle: e.target.value })}
              placeholder="Gradian App"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-icon">Icon</Label>
              <IconInput
                config={{ name: 'service-icon', label: '' }}
                value={formData.icon || 'Activity'}
                onChange={(value) => onFormDataChange({ ...formData, icon: value })}
                placeholder="Activity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-color">Color</Label>
              <Select
                value={formData.color || 'blue'}
                onValueChange={(value) => onFormDataChange({ ...formData, color: value })}
              >
                <SelectTrigger id="service-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="indigo">Indigo</SelectItem>
                  <SelectItem value="cyan">Cyan</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="health-api" className="required">
              Health API URL
            </Label>
            <Input
              id="health-api"
              value={formData.healthApi || ''}
              onChange={(e) => onFormDataChange({ ...formData, healthApi: e.target.value })}
              placeholder="http://localhost:3000/api/health"
              type="url"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Full URL to the health check endpoint
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="healthy-json-path">Healthy JSON Path</Label>
            <Input
              id="healthy-json-path"
              value={formData.healthyJsonPath || 'status'}
              onChange={(e) => onFormDataChange({ ...formData, healthyJsonPath: e.target.value })}
              placeholder="status"
              className="font-mono"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              JSON path to check for health status (e.g., "status", "data.status")
            </p>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="monitoring-enabled">Monitoring Enabled</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enable health checks for this service
                </p>
              </div>
              <Switch
                id="monitoring-enabled"
                checked={formData.monitoringEnabled !== false}
                onCheckedChange={(checked) => onFormDataChange({ ...formData, monitoringEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Active</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Service is active and available
                </p>
              </div>
              <Switch
                id="is-active"
                checked={formData.isActive !== false}
                onCheckedChange={(checked) => onFormDataChange({ ...formData, isActive: checked })}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {editingService ? 'Update' : 'Create'} Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
