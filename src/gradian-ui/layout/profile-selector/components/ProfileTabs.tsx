// Profile Tabs Component

import React from 'react';
import { ProfileTabsProps } from '../types';
import { cn } from '../../../shared/utils';

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  profiles,
  currentProfile,
  onProfileSelect,
  onProfileCreate,
  onProfileEdit,
  onProfileDelete,
  config,
  className,
  ...props
}) => {
  return (
    <div className={cn('border-b border-gray-200', className)} {...props}>
      <nav className="-mb-px flex space-x-8">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onProfileSelect?.(profile)}
            className={cn(
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs transition-colors',
              currentProfile?.id === profile.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {profile.name}
          </button>
        ))}
      </nav>
    </div>
  );
};

ProfileTabs.displayName = 'ProfileTabs';
