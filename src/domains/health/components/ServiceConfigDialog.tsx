'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2, Settings, Mail } from 'lucide-react';
import { HealthService } from '../types';

interface ServiceConfigDialogProps {
  serviceId: string;
  service: HealthService | undefined;
  onClose: () => void;
  onEdit: (service: HealthService) => void;
  onDelete: (serviceId: string) => Promise<void>;
  onToggleMonitoring: (serviceId: string, enabled: boolean) => Promise<void>;
  onToggleTestUnhealthy?: (serviceId: string, enabled: boolean) => void;
  isDemoMode?: boolean;
  isTestUnhealthy?: boolean;
}

export function ServiceConfigDialog({
  serviceId,
  service,
  onClose,
  onEdit,
  onDelete,
  onToggleMonitoring,
  onToggleTestUnhealthy,
  isDemoMode = false,
  isTestUnhealthy = false,
}: ServiceConfigDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={!!service} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Service</DialogTitle>
          <DialogDescription>
            {service.serviceTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Monitoring</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Enable health checks for this service
              </div>
            </div>
            <Switch
              checked={service.monitoringEnabled !== false}
              onCheckedChange={(checked) => {
                onToggleMonitoring(service.id, checked);
                onClose();
              }}
            />
          </div>
          {isDemoMode && onToggleTestUnhealthy && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Test Unhealthy</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Simulate unhealthy status for testing
                </div>
              </div>
              <Switch
                checked={isTestUnhealthy}
                disabled={service.monitoringEnabled === false}
                onCheckedChange={(checked) => {
                  onToggleTestUnhealthy(service.id, checked);
                  onClose();
                }}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onEdit(service);
                onClose();
              }}
            >
              <Settings className="h-4 w-4 me-2" />
              Edit Service
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(service.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Service Details</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ID:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono">{service.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">API:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono text-xs truncate max-w-[200px]">
                  {service.healthApi}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status Path:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono">{service.healthyJsonPath}</span>
              </div>
            </div>
          </div>

          {(service.emailTo && service.emailTo.length > 0) || (service.emailCC && service.emailCC.length > 0) ? (
            <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/10">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Email Notifications
              </div>
              <div className="space-y-2 text-sm">
                {service.emailTo && service.emailTo.length > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">To:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {service.emailTo.map((email, index) => (
                        <span key={index} className="text-gray-900 dark:text-gray-100 font-mono text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded border">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {service.emailCC && service.emailCC.length > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">CC:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {service.emailCC.map((email, index) => (
                        <span key={index} className="text-gray-900 dark:text-gray-100 font-mono text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded border">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
