'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { useEffect, useMemo, useRef, useState, useCallback, startTransition } from 'react';
import { ChevronDown, KeyRound, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { Badge as FormBadge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { useUserStore } from '@/stores/user.store';
import { useLanguageStore } from '@/stores/language.store';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/gradian-ui/form-builder/form-elements/components/LanguageSelector';
import { getT, getDefaultLanguage, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { ProfileSelectorConfig } from '@/gradian-ui/layout/profile-selector/types';
import { UserProfile } from '@/gradian-ui/shared/types';
import { AuthEventType, dispatchAuthEvent } from '@/gradian-ui/shared/utils/auth-events';

interface UserProfileSelectorProps {
  config?: Partial<ProfileSelectorConfig>;
  onProfileSelect?: (profile: UserProfile) => void;
  className?: string;
  theme?: 'light' | 'dark';
  onMenuOpenChange?: (open: boolean) => void; // Notify parent when profile menu opens/closes
}

export function UserProfileSelector({
  config,
  onProfileSelect,
  className,
  theme,
  onMenuOpenChange,
}: UserProfileSelectorProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const language = useLanguageStore((state) => state.language || 'en');
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const defaultLang = getDefaultLanguage();
  const { resolvedTheme } = useTheme();
  const isRTLLanguage = isRTL(language);

  // Access user store normally - but ensure we always render placeholder until mounted
  // This prevents hydration mismatch because server and client both render placeholder initially
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update trigger width when menu opens or trigger element changes
  useEffect(() => {
    if (isMenuOpen && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [isMenuOpen]);

  // Use theme prop if provided, otherwise default to light to avoid hydration mismatch
  // Only use resolvedTheme after mount to ensure server/client consistency
  // SECURITY: Always default to 'light' on server to ensure consistent hydration
  const computedVariant = theme ?? (isMounted ? (resolvedTheme === 'dark' ? 'dark' : 'light') : 'light');
  const isDarkVariant = computedVariant === 'dark';
  // Default to full width so the profile selector naturally fills sidebar width,
  // while still allowing callers to override via config.layout.fullWidth = false.
  const fullWidth = config?.layout?.fullWidth ?? true;

  // Only compute user-dependent values after mount to avoid hydration mismatch
  // Before mount, these will return empty/default values
  const firstName = useMemo(
    () => (isMounted && user ? resolveLocalizedField(user.name, language, 'en') : ''),
    [isMounted, user, language]
  );
  const lastName = useMemo(
    () => (isMounted && user ? resolveLocalizedField(user.lastname, language, 'en') : ''),
    [isMounted, user, language]
  );
  const displayName = useMemo(() => {
    if (!isMounted || !user) return '';
    const combined = `${firstName} ${lastName}`.trim();
    return combined || firstName || lastName || user.email || 'User';
  }, [isMounted, user, firstName, lastName]);

  const initials = useMemo(() => {
    if (!isMounted) return '--';
    const source = displayName || user?.email || 'User';
    return source
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [isMounted, displayName, user]);

  const isAdmin = isMounted && user?.role === 'admin';

  const triggerClasses = cn(
    'flex h-10 items-center rounded-xl border transition-colors outline-none ring-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
    isRTLLanguage ? 'space-x-reverse space-x-2' : 'space-x-2',
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
    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-100 dark:text-gray-900",
    isRTLLanguage ? 'direction-rtl' : 'direction-ltr'
  );
  const separatorClasses = cn(
    '-mx-1 my-1 h-px',
    isDarkVariant ? 'bg-gray-700' : 'bg-gray-200'
  );
  const itemClasses = cn(
    'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors',
    'hover:bg-violet-50 focus:bg-violet-50 text-gray-800 data-[highlighted]:bg-violet-100 dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10 dark:text-gray-100 dark:data-[highlighted]:bg-violet-500/15',
  );

  const handleNavigate = useCallback((path: string) => {
    setIsMenuOpen(false);
    // Use startTransition for non-urgent navigation
    startTransition(() => {
      router.push(path);
    });
  }, [router]);

  const handleLogout = useCallback(async () => {
    setIsMenuOpen(false);
    // Defer logout to avoid blocking interaction
    setTimeout(async () => {
      // Use centralized logout flow
      const { performLogout } = await import('@/gradian-ui/shared/utils/logout-flow');
      await performLogout('User requested logout', false);
    }, 0);
  }, []);

  // Always render the same structure to avoid hydration mismatch
  // When not mounted, render a disabled placeholder with the same structure as the mounted version
  // This ensures server and client render identical HTML structure
  // SECURITY: Use static classes to ensure server/client match
  if (!isMounted) {
    const placeholderClasses = cn(
      'flex h-10 items-center rounded-xl border transition-colors outline-none ring-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
      isRTLLanguage ? 'space-x-reverse space-x-2' : 'space-x-2',
      'border-violet-200 bg-white text-violet-700',
      fullWidth ? 'w-full justify-between' : ''
    );

    // Render a plain button without Radix UI to avoid hydration mismatch
    return (
      <div suppressHydrationWarning dir={isRTLLanguage ? 'rtl' : 'ltr'}>
        <button
          className={cn(placeholderClasses, 'cursor-not-allowed opacity-50')}
          aria-label="User profile"
          type="button"
          disabled
          suppressHydrationWarning
        >
          <Avatar
            className="h-8 w-8 border border-gray-100 rounded-full bg-violet-100 text-violet-800 shrink-0 m-0"
          >
            <AvatarFallback className="bg-violet-100 text-violet-800 text-xs">
              --
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'flex flex-col leading-tight text-start mx-2',
              fullWidth ? 'flex-1 overflow-hidden' : 'max-w-[140px] overflow-hidden'
            )}
          >
            <span className="text-gray-900 dark:text-gray-100 text-sm font-semibold truncate" suppressHydrationWarning>
              {getT(TRANSLATION_KEYS.PAGINATION_LOADING, language, defaultLang)}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-500 dark:text-gray-300" />
        </button>
      </div>
    );
  }

  // After mount, check for user and render accordingly
  // If no user, render nothing (global auth logic will handle redirects if needed)
  if (!user) {
    return null;
  }

  // At this point, TypeScript knows user is not null
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
      label: getT(TRANSLATION_KEYS.PROFILE_MENU_PROFILE, language, defaultLang),
      description: getT(TRANSLATION_KEYS.PROFILE_MENU_PROFILE_DESCRIPTION, language, defaultLang),
      icon: UserIcon,
      action: () => {
        onProfileSelect?.(profilePayload);
        handleNavigate(`/profiles/${user.id}`);
      },
    },
    {
      id: 'settings',
      label: getT(TRANSLATION_KEYS.PROFILE_MENU_ACCOUNT_SETTINGS, language, defaultLang),
      description: getT(TRANSLATION_KEYS.PROFILE_MENU_ACCOUNT_SETTINGS_DESCRIPTION, language, defaultLang),
      icon: Settings,
      action: () => handleNavigate('/settings'),
    },
    {
      id: 'password',
      label: getT(TRANSLATION_KEYS.PROFILE_MENU_CHANGE_PASSWORD, language, defaultLang),
      description: getT(TRANSLATION_KEYS.PROFILE_MENU_CHANGE_PASSWORD_DESCRIPTION, language, defaultLang),
      icon: KeyRound,
      action: () => handleNavigate('/authentication/change-password'),
    },
  ];

  return (
    <div suppressHydrationWarning dir={isRTLLanguage ? 'rtl' : 'ltr'}>
      <DropdownMenuPrimitive.Root
        open={isMenuOpen}
        onOpenChange={(open) => {
          setIsMenuOpen(open);
          onMenuOpenChange?.(open);
        }}
      >
        <DropdownMenuPrimitive.Trigger
          asChild
          className={fullWidth ? 'w-full' : undefined}
          suppressHydrationWarning
        >
          <Button
            variant="outline"
            size="sm"
            className={triggerClasses}
            ref={triggerRef}
            aria-label="Open user menu"
            type="button"
            suppressHydrationWarning
            id="user-profile-trigger"
          >
            <Avatar
              className={cn(
                'h-8 w-8 border rounded-full bg-violet-100 text-violet-800 shrink-0 m-0',
                isDarkVariant ? 'border-gray-700' : 'border-gray-100'
              )}
            >
              {user?.avatar ? (
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
                'flex flex-col leading-tight text-start mx-2',
                fullWidth ? 'flex-1 overflow-hidden' : 'max-w-[140px] overflow-hidden'
              )}
            >
              <span className="text-gray-900 dark:text-gray-100 text-sm font-semibold truncate" title={displayName}>
                {displayName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user?.email || ''}>
                {user?.email || ''}
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
                    minWidth: triggerWidth || undefined,
                    width: triggerWidth || undefined,
                  }}
                  dir={isRTLLanguage ? 'rtl' : 'ltr'}
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 dark:text-gray-100 text-sm font-semibold truncate" title={displayName}>
                        {displayName}
                      </p>
                      {isAdmin && (
                        <FormBadge
                          variant="outline"
                          size="sm"
                          color="violet"
                          tooltip={getT(TRANSLATION_KEYS.PROFILE_MENU_ADMIN_TOOLTIP, language, defaultLang)}
                          className="shrink-0"
                        >
                          {getT(TRANSLATION_KEYS.PROFILE_MENU_ADMIN_BADGE, language, defaultLang)}
                        </FormBadge>
                      )}
                    </div>
                    <p
                      className="text-xs text-gray-500 dark:text-gray-400 truncate"
                      title={user.email}
                    >
                      {user.email}
                    </p>
                    {Array.isArray(user?.entityType) && user.entityType.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {user.entityType.map((entity) => (
                          <FormBadge
                            key={entity.id}
                            variant="outline"
                            size="sm"
                            color={entity.color || 'gray'}
                            className="flex items-center gap-1"
                            tooltip={entity.label}
                          >
                            {entity.label}
                          </FormBadge>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <LanguageSelector
                        config={{ name: 'language', label: '' }}
                        value={language || undefined}
                        onChange={setLanguage}
                        className="w-full"
                      />
                    </div>
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
                      <Icon className={cn('h-4 w-4 me-3')} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {description}
                        </span>
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
                    <LogOut className={cn('h-4 w-4 me-3')} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{getT(TRANSLATION_KEYS.PROFILE_MENU_LOGOUT, language, defaultLang)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getT(TRANSLATION_KEYS.PROFILE_MENU_LOGOUT_DESCRIPTION, language, defaultLang)}
                      </span>
                    </div>
                  </DropdownMenuPrimitive.Item>
                </motion.div>
              </DropdownMenuPrimitive.Content>
            )}
          </AnimatePresence>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}

