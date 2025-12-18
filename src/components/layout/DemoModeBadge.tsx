'use client';

import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { Badge } from '@/components/ui/badge';

export function DemoModeBadge() {
  if (DEMO_MODE) {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 border-orange-500/50 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-500/30"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        <span className="text-xs font-medium">DEMO</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1.5 border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/30"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="text-xs font-medium">LIVE</span>
    </Badge>
  );
}

