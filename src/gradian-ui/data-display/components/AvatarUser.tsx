// AvatarUser Component
// Displays user information in a beautiful dialog with avatar and metadata

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, Building2, User, Briefcase, AtSign } from 'lucide-react';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';
import { getInitials } from '../utils';

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
 * Gets user initials
 */
const getUserInitials = (user: UserData | null | undefined): string => {
  if (!user) return '?';
  if (typeof user === 'string') return getInitials(user);

  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName || lastName) {
    return getInitials(`${firstName} ${lastName}`.trim());
  }
  if (user.username) return getInitials(user.username);
  if (user.email) return getInitials(user.email);
  if (user.label) return getInitials(user.label);
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

  if (!user) return null;

  const displayName = formatUserName(user);
  const initials = getUserInitials(user);
  const avatarUrl = user.avatarUrl;
  const email = user.email;
  const company = user.company;
  const username = user.username;
  const postTitle = user.postTitle;

  // Size classes for avatar
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const dialogSizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (email && typeof email === 'string' && email.trim() !== '') {
      window.location.href = `mailto:${email.trim()}`;
    }
  };

  // Default avatar component
  const DefaultAvatar = (
    <Avatar className={cn(sizeClasses[size], className)}>
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/50">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                  backgroundSize: '24px 24px',
                }}
              />
            </div>

            <div className="relative p-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-6">
                <Avatar className={cn(
                  dialogSizeClasses.lg,
                  'border-4 border-white dark:border-gray-800 shadow-lg'
                )}>
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={displayName} />
                  )}
                  <AvatarFallback className={cn(
                    'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-3xl font-semibold',
                    dialogSizeClasses.lg
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h3 className="mt-4 text-xl font-bold text-violet-900 dark:text-violet-100">
                  {displayName}
                </h3>
                {postTitle && (
                  <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
                    {postTitle}
                  </p>
                )}
              </div>

              {/* User Details */}
              <div className="space-y-3">
                {email && (
                  <div className="flex items-center justify-between bg-white/60 dark:bg-gray-800/40 rounded-lg border border-violet-100 dark:border-violet-800/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0 p-3">
                      <div className="shrink-0 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-0.5">
                          Email
                        </div>
                        <div className="text-sm font-medium text-violet-900 dark:text-violet-100 truncate">
                          {email}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleEmail}
                      className="h-8 w-8 p-0 m-2 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/50 dark:hover:text-violet-400 shrink-0"
                      title="Send email"
                      aria-label="Send email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {username && (
                  <div className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-violet-100 dark:border-violet-800/50 p-3">
                    <div className="shrink-0 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-0.5">
                        Username
                      </div>
                      <div className="text-sm font-medium text-violet-900 dark:text-violet-100 truncate">
                        {username}
                      </div>
                    </div>
                  </div>
                )}

                {company && (
                  <div className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-violet-100 dark:border-violet-800/50 p-3">
                    <div className="shrink-0 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-0.5">
                        Company
                      </div>
                      <div className="text-sm font-medium text-violet-900 dark:text-violet-100 truncate">
                        {company}
                      </div>
                    </div>
                  </div>
                )}

                {postTitle && (
                  <div className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-violet-100 dark:border-violet-800/50 p-3">
                    <div className="shrink-0 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-0.5">
                        Position
                      </div>
                      <div className="text-sm font-medium text-violet-900 dark:text-violet-100 truncate">
                        {postTitle}
                      </div>
                    </div>
                  </div>
                )}

                {user.id && (
                  <div className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-violet-100 dark:border-violet-800/50 p-3">
                    <div className="shrink-0 p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                      <AtSign className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-0.5">
                        ID
                      </div>
                      <div className="text-sm font-mono text-violet-900 dark:text-violet-100 truncate">
                        {user.id}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

AvatarUser.displayName = 'AvatarUser';

