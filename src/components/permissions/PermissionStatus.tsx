'use client';

import React from 'react';
import { usePermission } from './hooks/usePermission';
import type { PermissionName } from './types';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface PermissionStatusProps {
  name: PermissionName;
  label?: string;
  className?: string;
}

/**
 * Simple component to display permission status
 */
export const PermissionStatusBadge: React.FC<PermissionStatusProps> = ({
  name,
  label,
  className,
}) => {
  const { status, isLoading, error, isSupported } = usePermission(name);

  if (!isSupported) {
    return (
      <div className={className}>
        <Badge variant="outline">Not Supported</Badge>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Badge variant="destructive">Error: {error}</Badge>
      </div>
    );
  }

  const displayLabel = label || name;
  const variant =
    status === 'granted'
      ? 'default'
      : status === 'denied'
      ? 'destructive'
      : 'secondary';

  return (
    <div className={className}>
      <Badge variant={variant}>
        {displayLabel}: {status || 'unknown'}
      </Badge>
    </div>
  );
};

