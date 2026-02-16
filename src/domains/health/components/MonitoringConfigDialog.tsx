'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { IconBox, isHexColor, resolveIconBoxColor } from '@/gradian-ui/form-builder/form-elements';
import { HealthService } from '../types';

interface MonitoringConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  services: HealthService[];
  onToggleMonitoring: (serviceId: string, enabled: boolean) => Promise<void>;
}

export function MonitoringConfigDialog({
  isOpen,
  onClose,
  services,
  onToggleMonitoring,
}: MonitoringConfigDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Monitoring</DialogTitle>
          <DialogDescription>
            Enable or disable monitoring for each service. Inactive services will not be checked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <IconBox
                  name={service.icon}
                  variant="flat"
                  size="md"
                  {...(isHexColor(service.color)
                    ? { style: { backgroundColor: `${service.color}20`, color: service.color } }
                    : { color: resolveIconBoxColor(service.color || 'blue') })}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {service.serviceTitle}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {service.id}
                  </div>
                </div>
              </div>
              <Switch
                checked={service.monitoringEnabled !== false}
                onCheckedChange={(checked) => onToggleMonitoring(service.id, checked)}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
