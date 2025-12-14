'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { useUserStore } from '@/stores/user.store';
import { useLanguageStore } from '@/stores/language.store';
import { useTheme } from 'next-themes';
import { ProfileSelectorConfig } from '@/gradian-ui/layout/profile-selector/types';
import { UserProfile } from '@/gradian-ui/shared/types';
import { ensureFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';
import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';

interface UserProfileSelectorProps {
  config?: Partial<ProfileSelectorConfig>;
  onProfileSelect?: (profile: UserProfile) => void;
  className?: string;
  theme?: 'light' | 'dark';
}

export function UserProfileSelector({
  config,
  onProfileSelect,
  className,
  theme,
}: UserProfileSelectorProps) {
  const user = useUserStore((state) => state.user);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const language = useLanguageStore((state) => state.language || 'en');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const computedVariant =
    theme ??
    (isMounted && resolvedTheme === 'dark'
      ? 'dark'
      : 'light');
  const isDarkVariant = computedVariant === 'dark';
  const fullWidth = config?.layout?.fullWidth ?? false;

  const firstName = useMemo(
    () => (user ? resolveLocalizedField(user.name, language, 'en') : ''),
    [user, language]
  );
  const lastName = useMemo(
    () => (user ? resolveLocalizedField(user.lastname, language, 'en') : ''),
    [user, language]
  );
  const displayName = useMemo(() => {
    if (!user) return '';
    const combined = `${firstName} ${lastName}`.trim();
    return combined || firstName || lastName || user.email || 'User';
  }, [user, firstName, lastName]);

  const initials = useMemo(() => {
    const source = displayName || user?.email || 'User';
    return source
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [displayName, user]);

  const triggerClasses = cn(
    'flex h-10 items-center space-x-2 rounded-xl border transition-colors outline-none ring-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
    isDarkVariant
      ? 'border-violet-300/60 bg-gray-900 text-violet-200 hover:bg-gray-800 focus-visible:ring-violet-500 focus-visible:ring-offset-gray-900'
      : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 focus-visible:ring-violet-500 focus-visible:ring-offset-white',
    fullWidth ? 'w-full justify-between' : '',
    className
  );

  const menuContentClasses = cn(
    'z-50 overflow-hidden rounded-xl border p-1 shadow-lg',
    fullWidth ? 'w-full' : 'min-w-56',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
    isDarkVariant ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
  );
  const separatorClasses = cn(
    '-mx-1 my-1 h-px',
    isDarkVariant ? 'bg-gray-700' : 'bg-gray-200'
  );
  const itemClasses = cn(
    'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors',
    isDarkVariant
      ? 'hover:bg-violet-500/10 focus:bg-violet-500/10 text-gray-200'
      : 'hover:bg-violet-50 focus:bg-violet-50 text-gray-800'
  );

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try {
      // Tokens are stored in httpOnly cookies, so they're automatically sent with the request
      const fingerprint = await ensureFingerprintCookie();

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(fingerprint ? { 'x-fingerprint': fingerprint } : {}),
        },
        body: JSON.stringify({
          deviceFingerprint: fingerprint ?? undefined,
        }),
        credentials: 'include', // Ensure cookies are sent
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear access token from memory
      authTokenManager.clearAccessToken();
      
      useUserStore.getState().clearUser();
      // Clean up any localStorage tokens if they exist (for migration purposes)
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        } catch (error) {
          // Ignore errors
        }
      }
      router.push('/authentication/login');
    }
  };

  // Check if user is logged in by checking the user store
  // Tokens are stored in httpOnly cookies, so we can't check them from JavaScript
  // The user store is set after successful login, so if user exists, they're authenticated
  if (!user) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 rounded-xl px-5 text-sm font-semibold"
        onClick={() => router.push('/authentication/login')}
      >
        Login
      </Button>
    );
  }

  const profilePayload: UserProfile = {
    id: user.id,
    name: displayName,
    email: user.email,
    avatar: user.avatar,
    role: user.role || 'user',
    permissions: [],
  };

  const dropdownActions = [
    {
      id: 'profile',
      label: 'Profile',
      description: 'View your profile',
      icon: UserIcon,
      action: () => {
        onProfileSelect?.(profilePayload);
        handleNavigate(`/profiles/${user.id}`);
      },
    },
    {
      id: 'settings',
      label: 'Account Settings',
      description: 'Manage your preferences',
      icon: Settings,
      action: () => handleNavigate('/settings'),
    },
    {
      id: 'password',
      label: 'Change Password',
      description: 'Update your credentials',
      icon: KeyRound,
      action: () => handleNavigate('/authentication/change-password'),
    },
  ];

  return (
    <DropdownMenuPrimitive.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuPrimitive.Trigger asChild className={fullWidth ? 'w-full' : undefined}>
        <Button
          variant="outline"
          size="sm"
          className={triggerClasses}
          ref={triggerRef}
          aria-label="Open user menu"
        >
          <Avatar
            className={cn(
              'h-8 w-8 border rounded-full bg-violet-100 text-violet-800 shrink-0',
              isDarkVariant ? 'border-gray-700' : 'border-gray-100'
            )}
          >
            {user.avatar ? (
              <AvatarImage
                src={user.avatar}
                alt={displayName}
              />
            ) : null}
            <AvatarFallback className="bg-violet-100 text-violet-800 text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'flex flex-col text-left leading-tight',
              fullWidth ? 'flex-1 overflow-hidden' : 'max-w-[140px] overflow-hidden'
            )}
          >
            <span className="text-sm font-semibold truncate" title={displayName}>
              {displayName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user.email}>
              {user.email}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              isDarkVariant ? 'text-gray-300' : 'text-gray-500',
              isMenuOpen && 'rotate-180'
            )}
          />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <AnimatePresence>
          {isMenuOpen && (
            <DropdownMenuPrimitive.Content forceMount asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={menuContentClasses}
                style={{
                  minWidth: triggerRef.current?.offsetWidth || undefined,
                  width: triggerRef.current?.offsetWidth || undefined,
                }}
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold truncate" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user.email}>
                    {user.email}
                  </p>
                </div>

                <DropdownMenuPrimitive.Separator className={separatorClasses} />

                {dropdownActions.map(({ id, label, description, icon: Icon, action }) => (
                  <DropdownMenuPrimitive.Item
                    key={id}
                    className={itemClasses}
                    onSelect={(event) => {
                      event.preventDefault();
                      action();
                    }}
                  >
                    <Icon className="me-3 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
                    </div>
                  </DropdownMenuPrimitive.Item>
                ))}

                <DropdownMenuPrimitive.Separator className={separatorClasses} />

                <DropdownMenuPrimitive.Item
                  className={cn(
                    itemClasses,
                    'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10'
                  )}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleLogout();
                  }}
                >
                  <LogOut className="me-3 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Logout</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Sign out of your account</span>
                  </div>
                </DropdownMenuPrimitive.Item>
              </motion.div>
            </DropdownMenuPrimitive.Content>
          )}
        </AnimatePresence>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

