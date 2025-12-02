// Entity Metadata Component
// Displays Created/Updated information in an attractive, minimal way

"use client";

import React from 'react';
import { formatCreatedLabel, formatRelativeTime, formatFullDate } from '@/gradian-ui/shared/utils/date-utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export interface EntityMetadataProps {
  createdAt?: string | Date | null;
  createdBy?: string | { id: string; label: string } | null;
  updatedAt?: string | Date | null;
  updatedBy?: string | { id: string; label: string } | null;
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
  showLabels?: boolean;
}

/**
 * Formats a user value (can be string or object with id/label)
 */
const formatUser = (user: string | { id: string; label: string } | null | undefined): string | null => {
  if (!user) return null;
  if (typeof user === 'string') return user;
  if (user.label) return user.label;
  return null;
};

export const EntityMetadata: React.FC<EntityMetadataProps> = ({
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  variant = 'compact',
  className,
  showLabels = false,
}) => {
  const hasCreated = Boolean(createdAt);
  const hasUpdated = Boolean(updatedAt);
  const hasAnyMetadata = hasCreated || hasUpdated;

  if (!hasAnyMetadata) return null;

  const createdLabel = createdAt ? formatCreatedLabel(createdAt) : null;
  const createdByLabel = formatUser(createdBy);
  const updatedLabel = updatedAt ? formatRelativeTime(updatedAt, { addSuffix: true }) : null;
  const updatedFullDate = updatedAt ? formatFullDate(updatedAt) : null;
  const updatedByLabel = formatUser(updatedBy);

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400', className)}>
          {hasCreated && createdLabel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <IconRenderer iconName="PlusCircle" className="h-3 w-3" />
                  <span>{createdLabel.display}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={8}
                className="z-[100]"
                avoidCollisions={true}
                collisionPadding={8}
              >
                <span>
                  Created {createdLabel.title}
                  {createdByLabel ? ` by ${createdByLabel}` : ''}
                </span>
              </TooltipContent>
            </Tooltip>
          )}
          {hasUpdated && updatedLabel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <IconRenderer iconName="Edit" className="h-3 w-3" />
                  <span>{updatedLabel}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={8}
                className="z-[100]"
                avoidCollisions={true}
                collisionPadding={8}
              >
                <span>
                  Updated {updatedFullDate}
                  {updatedByLabel ? ` by ${updatedByLabel}` : ''}
                </span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  if (variant === 'detailed') {
    return (
      <TooltipProvider>
        <div className={cn('space-y-1.5 text-xs', className)}>
          {hasCreated && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <IconRenderer iconName="PlusCircle" className="h-3 w-3 shrink-0" />
                    <span className="font-medium">Created</span>
                    {createdLabel && (
                      <span className="text-gray-500 dark:text-gray-500">
                        {createdLabel.display}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={8}
                  className="z-[100]"
                  avoidCollisions={true}
                  collisionPadding={8}
                >
                  <span>
                    Created {createdLabel?.title}
                    {createdByLabel ? ` by ${createdByLabel}` : ''}
                  </span>
                </TooltipContent>
              </Tooltip>
              {createdByLabel && (
                <span className="text-gray-400 dark:text-gray-500 truncate">by {createdByLabel}</span>
              )}
            </div>
          )}
          {hasUpdated && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <IconRenderer iconName="Edit" className="h-3 w-3 shrink-0" />
                    <span className="font-medium">Updated</span>
                    {updatedLabel && (
                      <span className="text-gray-500 dark:text-gray-500">
                        {updatedLabel}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={8}
                  className="z-[100]"
                  avoidCollisions={true}
                  collisionPadding={8}
                >
                  <span>
                    Updated {updatedFullDate}
                    {updatedByLabel ? ` by ${updatedByLabel}` : ''}
                  </span>
                </TooltipContent>
              </Tooltip>
              {updatedByLabel && (
                <span className="text-gray-400 dark:text-gray-500 truncate">by {updatedByLabel}</span>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Default: compact variant
  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400', className)}>
        {hasCreated && createdLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 group">
                <IconRenderer iconName="PlusCircle" className="h-3 w-3" />
                <span className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  {createdLabel.display}
                </span>
                {showLabels && createdByLabel && (
                  <span className="text-gray-400 dark:text-gray-500">by {createdByLabel}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={8}
              className="z-[100]"
              avoidCollisions={true}
              collisionPadding={8}
            >
              <span>
                Created {createdLabel.title}
                {createdByLabel ? ` by ${createdByLabel}` : ''}
              </span>
            </TooltipContent>
          </Tooltip>
        )}
        {hasUpdated && updatedLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 group">
                <IconRenderer iconName="Edit" className="h-3 w-3" />
                <span className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  {updatedLabel}
                </span>
                {showLabels && updatedByLabel && (
                  <span className="text-gray-400 dark:text-gray-500">by {updatedByLabel}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={8}
              className="z-[100]"
              avoidCollisions={true}
              collisionPadding={8}
            >
              <span>
                Updated {updatedFullDate}
                {updatedByLabel ? ` by ${updatedByLabel}` : ''}
              </span>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

EntityMetadata.displayName = 'EntityMetadata';

