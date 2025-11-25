'use client';

import { cn } from '@/gradian-ui/shared/utils';
import { Button } from '@/components/ui/button';
import { LayoutList, PanelsTopLeft } from 'lucide-react';
import { HealthCardViewMode } from './ServiceCardsList';

export interface HealthViewToggleProps {
  value: HealthCardViewMode;
  onChange: (mode: HealthCardViewMode) => void;
  className?: string;
}

const viewOptions: Array<{
  id: HealthCardViewMode;
  label: string;
  description: string;
  icon: typeof PanelsTopLeft;
}> = [
  {
    id: 'wide',
    label: 'Detailed View',
    description: 'Show full metrics and component checks',
    icon: PanelsTopLeft,
  },
  {
    id: 'compact',
    label: 'Minimal View',
    description: 'Focus on status and quick actions',
    icon: LayoutList,
  },
];

export function HealthViewToggle({ value, onChange, className }: HealthViewToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        className
      )}
    >
      {viewOptions.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.id;
        return (
          <Button
            key={option.id}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'gap-1.5',
              isActive && 'shadow-sm'
            )}
            onClick={() => onChange(option.id)}
            title={option.description}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

HealthViewToggle.displayName = 'HealthViewToggle';

