'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconInput, TagInput, NumberInput } from '@/gradian-ui/form-builder/form-elements';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Save, Mail } from 'lucide-react';
import { HealthService } from '../types';
import { Separator } from '@/components/ui/separator';

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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingService ? 'Edit Service' : 'New Service'}</DialogTitle>
          <DialogDescription>
            {editingService ? 'Update the health service configuration' : 'Create a new health service to monitor'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4 overflow-y-auto flex-1 pe-2">
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
              placeholder="/api/health"
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

          <Separator />

          {/* Email Notifications Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/10">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div>
                <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Email Notifications
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Configure email recipients for health alerts
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-to">To</Label>
                <TagInput
                  config={{
                    name: 'email-to',
                    label: '',
                    placeholder: 'Enter recipient email addresses...',
                  }}
                  value={formData.emailTo || []}
                  onChange={(emails) => onFormDataChange({ ...formData, emailTo: emails })}
                  validateEmail={true}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Primary recipients for health alert emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-cc">CC (Optional)</Label>
                <TagInput
                  config={{
                    name: 'email-cc',
                    label: '',
                    placeholder: 'Enter CC email addresses...',
                  }}
                  value={formData.emailCC || []}
                  onChange={(emails) => onFormDataChange({ ...formData, emailCC: emails })}
                  validateEmail={true}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Additional recipients to be copied on health alerts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fail-cycle-to-send-email">Failed Cycles to Send Email</Label>
                <NumberInput
                  config={{
                    name: 'fail-cycle-to-send-email',
                    label: '',
                    placeholder: '3',
                  }}
                  value={formData.failCycleToSendEmail ?? 3}
                  onChange={(value) => onFormDataChange({ ...formData, failCycleToSendEmail: value ? Number(value) : 3 })}
                  min={1}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Number of consecutive failed health checks before sending an email alert (default: 3)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-interval-minutes">Email Interval (Minutes)</Label>
                <NumberInput
                  config={{
                    name: 'email-interval-minutes',
                    label: '',
                    placeholder: '15',
                  }}
                  value={formData.emailIntervalMinutes ?? 15}
                  onChange={(value) => onFormDataChange({ ...formData, emailIntervalMinutes: value ? Number(value) : 15 })}
                  min={1}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Minimum minutes between email alerts for the same service (default: 15)
                </p>
              </div>
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
