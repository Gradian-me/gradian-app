// AvatarUser Component
// Displays user information; dialog shows ProfileCardHologram when user id is available

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/gradian-ui/shared/utils';
import { getInitials } from '../utils';
import { useLanguageStore } from '@/stores/language.store';
import { useUserProfile, userProfileToSections, ProfileCardHologram } from '@/gradian-ui/profile';
import { getDefaultLanguage } from '@/gradian-ui/shared/utils';
import { Loader2 } from 'lucide-react';

export interface UserData {
  company?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  postTitle?: string;
  id?: string;
  avatarUrl?: string;
  [key: string]: any;
}

export interface AvatarUserProps {
  user: UserData | null | undefined;
  avatarType?: 'user' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDialog?: boolean;
  children?: React.ReactNode;
}

/**
 * Formats user display name
 */
const formatUserName = (user: UserData | null | undefined): string => {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return user;

  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  if (user.username) return user.username;
  if (user.email) return user.email;
  if (user.label) return user.label;
  return 'Unknown';
};

/**
 * Gets user initials (pass lang for fa/ar semi-space between initials)
 */
const getUserInitials = (user: UserData | null | undefined, lang?: string): string => {
  if (!user) return '?';
  if (typeof user === 'string') return getInitials(user, lang);

  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName || lastName) {
    return getInitials(`${firstName} ${lastName}`.trim(), lang);
  }
  if (user.username) return getInitials(user.username, lang);
  if (user.email) return getInitials(user.email, lang);
  if (user.label) return getInitials(user.label, lang);
  return '?';
};

export const AvatarUser: React.FC<AvatarUserProps> = ({
  user,
  avatarType = 'default',
  size = 'md',
  className,
  showDialog = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();
  const userId = user?.id != null ? String(user.id) : '';

  // Fetch full profile when dialog is used (for ProfileCardHologram). Must be called unconditionally.
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(userId);

  if (!user) return null;

  const displayName = formatUserName(user);
  const initials = getUserInitials(user, language);
  const avatarUrl = user.avatarUrl;

  // Size classes for avatar
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  // Default avatar component
  const DefaultAvatar = (
    <Avatar className={cn(sizeClasses[size], className, 'border border-gray-100 dark:border-gray-600')}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={displayName} />
      )}
      <AvatarFallback className={cn(
        'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
        sizeClasses[size]
      )}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  // If avatarType is 'default' or showDialog is false, just return the avatar
  if (avatarType === 'default' || !showDialog) {
    return children || DefaultAvatar;
  }

  // User type with dialog
  return (
    <div
      data-avatar-user="true"
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      className="inline-block"
    >
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children || (
            <button
              type="button"
              className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 rounded-full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(true);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              {DefaultAvatar}
            </button>
          )}
        </DialogTrigger>
        <DialogContent className="w-full max-w-xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">{displayName} - User Details</DialogTitle>
          {!userId ? (
            <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-400">
              No user ID available to load profile.
            </div>
          ) : profileLoading ? (
            <div className="flex items-center justify-center min-h-[280px]">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
            </div>
          ) : profileError || !profile ? (
            <div className="p-6 text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Profile unavailable</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{profileError ?? 'Unable to load user profile'}</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden">
              <ProfileCardHologram
                avatarUrl={profile.avatar}
                name={profile.fullName}
                title={profile.jobTitle ?? profile.role}
                status={profile.availability ?? 'Online'}
                email={profile.email}
                entityType={profile.entityType}
                showUserInfo
                sections={userProfileToSections(profile, { language, defaultLang })}
                onContactClick={
                  profile.email
                    ? () => { window.location.href = `mailto:${profile.email}`; }
                    : undefined
                }
                onShareClick={
                  typeof navigator !== 'undefined' && typeof navigator.share === 'function' && profile
                    ? () => {
                        navigator.share({
                          title: profile.fullName,
                          text: profile.bio ?? `${profile.fullName} - ${profile.jobTitle ?? profile.role}`,
                          url: typeof window !== 'undefined' ? window.location.href : '',
                        }).catch(() => {});
                      }
                    : undefined
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

AvatarUser.displayName = 'AvatarUser';

