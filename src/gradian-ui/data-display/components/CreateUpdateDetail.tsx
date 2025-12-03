// CreateUpdateDetail Component
// Displays Created/Updated information in an attractive, minimal way
// Also provides utility functions to normalize createdAt/updatedAt dates

"use client";

import React from 'react';
import { formatCreatedLabel, formatRelativeTime, formatFullDate } from '@/gradian-ui/shared/utils/date-utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '../utils';
import { AvatarUser, UserData } from './AvatarUser';

// User object type (can be enriched with full user data in demo mode)
type UserValue =
  | string
  | { id: string; label?: string }
  | {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    username?: string;
    email?: string;
    [key: string]: any;
  }
  | null
  | undefined;

export interface CreateUpdateDetailProps {
  createdAt?: string | Date | null;
  createdBy?: UserValue;
  updatedAt?: string | Date | null;
  updatedBy?: UserValue;
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
  showLabels?: boolean;
  avatarType?: 'user' | 'default';
}

/**
 * Normalizes createdAt and updatedAt dates.
 * If they are the same, returns only createdAt (updatedAt will be null).
 * Otherwise, returns both as-is.
 */
export const normalizeCreateUpdateDates = ({
  createdAt,
  updatedAt,
}: {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}): {
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
} => {
  // If either is missing, return as-is
  if (!createdAt || !updatedAt) {
    return { createdAt: createdAt || null, updatedAt: updatedAt || null };
  }

  // Convert both to Date objects for comparison
  const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const updatedDate = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  // Check if dates are the same (compare timestamps)
  const createdTime = createdDate.getTime();
  const updatedTime = updatedDate.getTime();

  // If they're the same, only return createdAt
  if (createdTime === updatedTime) {
    return {
      createdAt,
      updatedAt: null,
    };
  }

  // Otherwise return both
  return { createdAt, updatedAt };
};

/**
 * Hook to normalize create/update dates
 */
export const useCreateUpdateDetail = ({
  createdAt,
  updatedAt,
}: {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}) => {
  return React.useMemo(
    () => normalizeCreateUpdateDates({ createdAt, updatedAt }),
    [createdAt, updatedAt]
  );
};

/**
 * Formats a user value to display name
 */
const formatUserName = (user: UserValue): string | null => {
  if (!user) return null;
  if (typeof user === 'string') return user;

  // Check if it's a full user object with firstName/lastName
  if (typeof user === 'object' && 'firstName' in user) {
    const firstName = user.firstName || '';
    const lastName = ('lastName' in user ? user.lastName : '') || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    // Fallback to other fields - check if property exists before accessing
    if ('username' in user && user.username) return String(user.username);
    if ('email' in user && user.email) return String(user.email);
    if ('label' in user && user.label) return String(user.label);
  }

  // Check if it's a simple object with label
  if (typeof user === 'object' && 'label' in user) {
    return user.label || null;
  }

  return null;
};

/**
 * Gets avatar URL from user object
 */
const getUserAvatarUrl = (user: UserValue): string | null => {
  if (!user || typeof user !== 'object') return null;
  if ('avatarUrl' in user && user.avatarUrl) {
    return String(user.avatarUrl);
  }
  return null;
};

/**
 * Gets initials from user object
 */
const getUserInitials = (user: UserValue): string => {
  if (!user) return '?';

  if (typeof user === 'string') {
    return getInitials(user);
  }

  if (typeof user === 'object') {
    // Try firstName + lastName
    if ('firstName' in user || 'lastName' in user) {
      const firstName = ('firstName' in user ? user.firstName : '') || '';
      const lastName = ('lastName' in user ? user.lastName : '') || '';
      if (firstName || lastName) {
        return getInitials(`${firstName} ${lastName}`.trim());
      }
    }

    // Fallback to other fields - check if property exists before accessing
    if ('username' in user && user.username) return getInitials(String(user.username));
    if ('email' in user && user.email) return getInitials(String(user.email));
    if ('label' in user && user.label) return getInitials(String(user.label));
    if ('name' in user && user.name) return getInitials(String(user.name));
  }

  return '?';
};

/**
 * Converts UserValue to UserData format for AvatarUser
 */
const convertToUserData = (user: UserValue): UserData | null => {
  if (!user) return null;
  if (typeof user === 'string') {
    return { username: user, email: user };
  }
  if (typeof user === 'object') {
    return {
      ...user,
      id: 'id' in user ? user.id : undefined,
      firstName: 'firstName' in user ? user.firstName : undefined,
      lastName: 'lastName' in user ? user.lastName : undefined,
      username: 'username' in user ? user.username : undefined,
      email: 'email' in user ? user.email : undefined,
      company: 'company' in user ? user.company : undefined,
      postTitle: 'postTitle' in user ? user.postTitle : undefined,
      avatarUrl: 'avatarUrl' in user ? user.avatarUrl : undefined,
    };
  }
  return null;
};

/**
 * CreateUpdateDetail Component (also exported as EntityMetadata for backward compatibility)
 * Displays Created/Updated information in an attractive, minimal way
 */
export const CreateUpdateDetail: React.FC<CreateUpdateDetailProps> = ({
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  variant = 'compact',
  className,
  showLabels = false,
  avatarType = 'default',
}) => {
  // Normalize dates - if createdAt and updatedAt are the same, only show createdAt
  const normalizedDates = normalizeCreateUpdateDates({ createdAt, updatedAt });
  const normalizedCreatedAt = normalizedDates.createdAt;
  const normalizedUpdatedAt = normalizedDates.updatedAt;

  const hasCreated = Boolean(normalizedCreatedAt);
  const hasUpdated = Boolean(normalizedUpdatedAt);
  const hasAnyMetadata = hasCreated || hasUpdated;

  if (!hasAnyMetadata) return null;

  const createdLabel = normalizedCreatedAt ? formatCreatedLabel(normalizedCreatedAt) : null;
  const createdFullDate = normalizedCreatedAt ? formatFullDate(normalizedCreatedAt) : null;
  const createdByName = formatUserName(createdBy);
  const createdByAvatarUrl = getUserAvatarUrl(createdBy);
  const createdByInitials = getUserInitials(createdBy);
  const updatedLabel = normalizedUpdatedAt ? formatRelativeTime(normalizedUpdatedAt, { addSuffix: true }) : null;
  const updatedFullDate = normalizedUpdatedAt ? formatFullDate(normalizedUpdatedAt) : null;
  const updatedByName = formatUserName(updatedBy);
  const updatedByAvatarUrl = getUserAvatarUrl(updatedBy);
  const updatedByInitials = getUserInitials(updatedBy);

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400', className)}>
          {hasCreated && createdLabel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <IconRenderer iconName="PlusCircle" className="h-3 w-3" />
                  <span>{createdLabel.display}</span>
                  {createdByName && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                      <div className="flex items-center gap-1.5">
                        <AvatarUser
                          user={convertToUserData(createdBy)}
                          avatarType={avatarType}
                          size="sm"
                          showDialog={avatarType === 'user'}
                        />
                        <span>{createdByName}</span>
                      </div>
                    </>
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
                  {createdByName ? `Created By ${createdByName}` : 'Created'}
                  {createdFullDate ? ` . ${createdFullDate}` : createdLabel?.title ? ` . ${createdLabel.title}` : ''}
                </span>
              </TooltipContent>
            </Tooltip>
          )}
          {hasUpdated && updatedLabel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <IconRenderer iconName="Edit" className="h-3 w-3" />
                  <span>{updatedLabel}</span>
                  {updatedByName && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                      <div className="flex items-center gap-1.5">
                        <AvatarUser
                          user={convertToUserData(updatedBy)}
                          avatarType={avatarType}
                          size="sm"
                          showDialog={avatarType === 'user'}
                        />
                        <span>{updatedByName}</span>
                      </div>
                    </>
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
                  {updatedByName ? `Updated By ${updatedByName}` : 'Updated'}
                  {updatedFullDate ? ` . ${updatedFullDate}` : ''}
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
                    {createdByName ? `Created By ${createdByName}` : 'Created'}
                    {createdFullDate ? ` . ${createdFullDate}` : createdLabel?.title ? ` . ${createdLabel.title}` : ''}
                  </span>
                </TooltipContent>
              </Tooltip>
              {createdByName && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                    <AvatarUser
                      user={convertToUserData(createdBy)}
                      avatarType={avatarType}
                      size="md"
                      showDialog={avatarType === 'user'}
                    />
                    <span>by {createdByName}</span>
                  </div>
                </>
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
                    {updatedByName ? `Updated By ${updatedByName}` : 'Updated'}
                    {updatedFullDate ? ` . ${updatedFullDate}` : ''}
                  </span>
                </TooltipContent>
              </Tooltip>
              {updatedByName && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                    <AvatarUser
                      user={convertToUserData(updatedBy)}
                      avatarType={avatarType}
                      size="md"
                      showDialog={avatarType === 'user'}
                    />
                    <span>by {updatedByName}</span>
                  </div>
                </>
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
                {createdByName && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <AvatarUser
                        user={convertToUserData(createdBy)}
                        avatarType={avatarType}
                        size="md"
                        showDialog={avatarType === 'user'}
                      />
                      <span>{createdByName}</span>
                    </div>
                  </>
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
                {createdByName ? `Created By ${createdByName}` : 'Created'}
                {createdFullDate ? ` . ${createdFullDate}` : createdLabel?.title ? ` . ${createdLabel.title}` : ''}
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
                {updatedByName && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <AvatarUser
                        user={convertToUserData(updatedBy)}
                        avatarType={avatarType}
                        size="md"
                        showDialog={avatarType === 'user'}
                      />
                      <span>{updatedByName}</span>
                    </div>
                  </>
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
                {updatedByName ? `Updated By ${updatedByName}` : 'Updated'}
                {updatedFullDate ? ` . ${updatedFullDate}` : ''}
              </span>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

CreateUpdateDetail.displayName = 'CreateUpdateDetail';

// Export as EntityMetadata for backward compatibility
export const EntityMetadata = CreateUpdateDetail;
EntityMetadata.displayName = 'EntityMetadata';
