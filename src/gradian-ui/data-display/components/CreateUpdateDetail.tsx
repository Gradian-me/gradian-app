// CreateUpdateDetail Component
// Displays Created/Updated information in an attractive, minimal way
// Also provides utility functions to normalize createdAt/updatedAt dates

"use client";

import React from 'react';
import { formatCreatedLabel, formatRelativeTime, formatFullDate, isLocaleRTL } from '@/gradian-ui/shared/utils/date-utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useLanguageStore } from '@/stores/language.store';
import { cn } from '@/gradian-ui/shared/utils';
import { getT, getDefaultLanguage, resolveDisplayLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '../utils';
import { AvatarUser, UserData } from './AvatarUser';

// User object type (can be enriched with full user data in demo mode)
type UserObject =
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
type UserValue = UserObject | UserObject[];

/** Normalize user value - if array (from relation), use first element to avoid [object Object] display */
const normalizeUserValue = (user: UserValue): UserObject => {
  if (user == null) return user;
  if (Array.isArray(user) && user.length > 0) return user[0];
  return user as UserObject;
};

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
 * Formats a user value to display name, resolving translations by language
 */
const formatUserName = (user: UserObject, lang?: string, defaultLang?: string): string | null => {
  if (!user) return null;
  if (typeof user === 'string') return user;
  const l = lang ?? getDefaultLanguage();
  const d = defaultLang ?? getDefaultLanguage();

  // Check if it's a full user object with firstName/lastName (may have translations)
  if (typeof user === 'object' && ('firstName' in user || 'lastName' in user)) {
    const firstName = resolveDisplayLabel((user as any).firstName, l, d);
    const lastName = resolveDisplayLabel((user as any).lastName, l, d);
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
  }

  // Resolve label/name/username/email - may be translation arrays
  if (typeof user === 'object') {
    const label = resolveDisplayLabel((user as any).label, l, d);
    if (label) return label;
    const name = resolveDisplayLabel((user as any).name, l, d);
    if (name) return name;
    const username = resolveDisplayLabel((user as any).username, l, d);
    if (username) return username;
    const email = resolveDisplayLabel((user as any).email, l, d);
    if (email) return email;
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
 * Gets initials from user object (resolves translations for display)
 */
const getUserInitials = (user: UserObject, lang?: string, defaultLang?: string): string => {
  if (!user) return '?';
  const l = lang ?? getDefaultLanguage();
  const d = defaultLang ?? getDefaultLanguage();

  if (typeof user === 'string') {
    return getInitials(user, l);
  }

  if (typeof user === 'object') {
    if ('firstName' in user || 'lastName' in user) {
      const firstName = resolveDisplayLabel((user as any).firstName, l, d);
      const lastName = resolveDisplayLabel((user as any).lastName, l, d);
      if (firstName || lastName) return getInitials(`${firstName} ${lastName}`.trim(), l);
    }
    const label = resolveDisplayLabel((user as any).label, l, d);
    if (label) return getInitials(label, l);
    const name = resolveDisplayLabel((user as any).name, l, d);
    if (name) return getInitials(name, l);
    const username = resolveDisplayLabel((user as any).username, l, d);
    if (username) return getInitials(username, l);
    const email = resolveDisplayLabel((user as any).email, l, d);
    if (email) return getInitials(email, l);
  }

  return '?';
};

/**
 * Converts UserValue to UserData format for AvatarUser.
 * Resolves translation arrays/objects to strings so initials and display names are correct.
 */
const convertToUserData = (
  user: UserValue,
  language?: string,
  defaultLang?: string
): UserData | null => {
  if (!user) return null;
  const lang = language ?? 'en';
  const defaultL = defaultLang ?? getDefaultLanguage();
  const resolve = (v: unknown) =>
    typeof v === 'string' ? v : resolveDisplayLabel(v, lang, defaultL) ?? '';

  if (typeof user === 'string') {
    return { username: user, email: user };
  }
  if (typeof user === 'object') {
    return {
      id: 'id' in user ? user.id : undefined,
      avatarUrl: 'avatarUrl' in user ? user.avatarUrl : undefined,
      firstName: resolve('firstName' in user ? user.firstName : undefined),
      lastName: resolve('lastName' in user ? user.lastName : undefined),
      username: resolve('username' in user ? user.username : undefined),
      email: resolve('email' in user ? user.email : undefined),
      company: resolve('company' in user ? user.company : undefined),
      postTitle: resolve('postTitle' in user ? user.postTitle : undefined),
      label: resolve('label' in user ? user.label : undefined),
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

  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();
  const localeCode = language || undefined;
  const labelCreated = getT(TRANSLATION_KEYS.LABEL_CREATED, language, defaultLang);
  const labelUpdated = getT(TRANSLATION_KEYS.LABEL_UPDATED, language, defaultLang);
  const labelCreatedBy = getT(TRANSLATION_KEYS.LABEL_CREATED_BY, language, defaultLang);
  const labelUpdatedBy = getT(TRANSLATION_KEYS.LABEL_UPDATED_BY, language, defaultLang);

  const hasCreated = Boolean(normalizedCreatedAt);
  const hasUpdated = Boolean(normalizedUpdatedAt);
  const hasAnyMetadata = hasCreated || hasUpdated;

  if (!hasAnyMetadata) return null;

  const createdLabel = normalizedCreatedAt ? formatCreatedLabel(normalizedCreatedAt, localeCode) : null;
  const createdFullDate = normalizedCreatedAt ? formatFullDate(normalizedCreatedAt, localeCode) : null;
  const normalizedCreatedBy = normalizeUserValue(createdBy);
  const createdByName = formatUserName(normalizedCreatedBy, language, defaultLang);
  const createdByAvatarUrl = getUserAvatarUrl(normalizedCreatedBy);
  const createdByInitials = getUserInitials(normalizedCreatedBy, language, defaultLang);
  const updatedLabel = normalizedUpdatedAt ? formatRelativeTime(normalizedUpdatedAt, { addSuffix: true, localeCode }) : null;
  const updatedFullDate = normalizedUpdatedAt ? formatFullDate(normalizedUpdatedAt, localeCode) : null;
  const normalizedUpdatedBy = normalizeUserValue(updatedBy);
  const updatedByName = formatUserName(normalizedUpdatedBy, language, defaultLang);
  const updatedByAvatarUrl = getUserAvatarUrl(normalizedUpdatedBy);
  const updatedByInitials = getUserInitials(normalizedUpdatedBy, language, defaultLang);

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
                          user={convertToUserData(normalizedCreatedBy, language, defaultLang)}
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
                className="z-100"
                avoidCollisions={true}
                collisionPadding={8}
                dir={isLocaleRTL(localeCode) ? 'rtl' : undefined}
              >
                <span>
                  {createdByName ? `${labelCreatedBy} ${createdByName}` : labelCreated}
                  {createdFullDate ? ` ${createdFullDate}` : createdLabel?.tooltip ? ` ${createdLabel.tooltip}` : ''}
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
                          user={convertToUserData(normalizedUpdatedBy, language, defaultLang)}
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
                className="z-100"
                avoidCollisions={true}
                collisionPadding={8}
                dir={isLocaleRTL(localeCode) ? 'rtl' : undefined}
              >
                <span>
                  {updatedByName ? `${labelUpdatedBy} ${updatedByName}` : labelUpdated}
                  {updatedFullDate ? ` ${updatedFullDate}` : ''}
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
                    <span className="font-medium">{labelCreated}</span>
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
                  className="z-100"
                  avoidCollisions={true}
                  collisionPadding={8}
                  dir={isLocaleRTL(localeCode) ? 'rtl' : undefined}
                >
                  <span>
                    {createdByName ? `${labelCreatedBy} ${createdByName}` : labelCreated}
                    {createdFullDate ? ` ${createdFullDate}` : createdLabel?.tooltip ? ` ${createdLabel.tooltip}` : ''}
                  </span>
                </TooltipContent>
              </Tooltip>
              {createdByName && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                    <AvatarUser
                      user={convertToUserData(normalizedCreatedBy, language, defaultLang)}
                      avatarType={avatarType}
                      size="md"
                      showDialog={avatarType === 'user'}
                    />
                    <span>{createdByName}</span>
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
                    <span className="font-medium">{labelUpdated}</span>
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
                  className="z-100"
                  avoidCollisions={true}
                  collisionPadding={8}
                  dir={isLocaleRTL(localeCode) ? 'rtl' : undefined}
                >
                  <span>
                    {updatedByName ? `${labelUpdatedBy} ${updatedByName}` : labelUpdated}
                    {updatedFullDate ? ` ${updatedFullDate}` : ''}
                  </span>
                </TooltipContent>
              </Tooltip>
              {updatedByName && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                    <AvatarUser
                      user={convertToUserData(normalizedUpdatedBy, language, defaultLang)}
                      avatarType={avatarType}
                      size="md"
                      showDialog={avatarType === 'user'}
                    />
                    <span>{updatedByName}</span>
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
                        user={convertToUserData(normalizedCreatedBy, language, defaultLang)}
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
                  className="z-100"
              avoidCollisions={true}
              collisionPadding={8}
              dir={isLocaleRTL(localeCode) ? 'rtl' : undefined}
            >
              <span>
                {createdByName ? `${labelCreatedBy} ${createdByName}` : labelCreated}
                {createdFullDate ? ` ${createdFullDate}` : createdLabel?.title ? ` ${createdLabel.title}` : ''}
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
                        user={convertToUserData(normalizedUpdatedBy, language, defaultLang)}
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
                  className="z-100"
              avoidCollisions={true}
              collisionPadding={8}
              dir={isLocaleRTL(localeCode) ? 'rtl' : undefined}
            >
              <span>
                {updatedByName ? `${labelUpdatedBy} ${updatedByName}` : labelUpdated}
                {updatedFullDate ? ` ${updatedFullDate}` : ''}
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
