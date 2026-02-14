'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/gradian-ui/shared/utils';
import { getInitials } from '@/gradian-ui/form-builder/form-elements/utils/avatar-utils';
import { getAvatarUrlFromUsername } from '@/gradian-ui/shared/utils/avatar-url';
import { formatReadAt } from '../utils/date-utils';
import type { DiscussionParticipant } from '../types';

export interface AvatarGroupProps {
  participants: DiscussionParticipant[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  participants,
  maxDisplay = 4,
  size = 'md',
  className,
}) => {
  const displayList = participants.slice(0, maxDisplay);
  if (displayList.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex -space-x-2 hover:space-x-1 transition-all duration-300 ease-in-out',
          className
        )}
      >
        {displayList.map((p, idx) => {
          const name = p.name ?? p.userId;
          const fallback = p.fallback ?? getInitials(name);
          const tooltipText = p.readAt
            ? `${name} – Read ${formatReadAt(p.readAt)}`
            : name;

          return (
            <Tooltip key={`${p.userId}-${idx}`}>
              <TooltipTrigger asChild>
                <Avatar
                  className={cn(
                    'border border-gray-200 dark:border-gray-600 transition-all duration-300 ease-in-out cursor-default',
                    sizeClasses[size]
                  )}
                >
                  {p.avatarUrl && (
                    <AvatarImage src={p.avatarUrl} alt={name} />
                  )}
                  <AvatarFallback className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                    {fallback}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

AvatarGroup.displayName = 'AvatarGroup';
