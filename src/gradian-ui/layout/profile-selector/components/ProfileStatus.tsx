// Profile Status Component

import React from 'react';
import { ProfileStatusProps } from '../types';
import { cn } from '../../../shared/utils';

export const ProfileStatus: React.FC<ProfileStatusProps> = ({
  status,
  size = 'md',
  className,
  ...props
}) => {
  const statusClasses = cn(
    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
    size === 'sm' && 'px-1.5 py-0.5 text-xs',
    size === 'lg' && 'px-2.5 py-1.5 text-sm',
    status === 'active' && 'bg-green-100 text-green-800',
    status === 'inactive' && 'bg-gray-100 text-gray-800',
    status === 'pending' && 'bg-yellow-100 text-yellow-800',
    className
  );

  const dotClasses = cn(
    'w-2 h-2 rounded-full me-1.5',
    size === 'sm' && 'w-1.5 h-1.5 me-1',
    size === 'lg' && 'w-2.5 h-2.5 me-2',
    status === 'active' && 'bg-green-400',
    status === 'inactive' && 'bg-gray-400',
    status === 'pending' && 'bg-yellow-400'
  );

  return (
    <span className={statusClasses} {...props}>
      <span className={dotClasses} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

ProfileStatus.displayName = 'ProfileStatus';
