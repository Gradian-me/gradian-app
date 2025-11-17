// Profile Dropdown Component

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { ProfileDropdownProps } from '../types';
import { cn } from '../../../shared/utils';
import { Settings, User, LogOut, ChevronDown, Key } from 'lucide-react';
import { useDialogBackHandler } from '@/gradian-ui/shared/contexts/DialogContext';

const DROPDOWN_Z_INDEX = 2147483000;

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  profiles,
  currentProfile,
  onProfileSelect,
  onProfileCreate,
  onProfileEdit,
  onProfileDelete,
  onChangePassword,
  config,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPlacement, setPanelPlacement] = useState<'top' | 'bottom'>('bottom');

  // Register dropdown for back button handling on mobile
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  useDialogBackHandler(isOpen, handleClose, 'dropdown', 'profile-dropdown');

  const {
    layout = { variant: 'dropdown' },
  } = config;
  const fullWidth = layout.fullWidth ?? false;
  const desiredPlacement = layout.popoverPlacement ?? 'auto';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const dropdownClasses = cn(
    'relative',
    className
  );

  const isDarkTheme = (config.styling?.theme || 'light') === 'dark';

  const panelBaseClasses = 'absolute rounded-xl shadow-lg border transition-all duration-200 z-[9999]';
  const panelThemeClasses = isDarkTheme
    ? 'bg-gray-900 border-gray-700 text-gray-100'
    : 'bg-white border-gray-100 text-gray-900';
  const panelPlacementClasses = 'opacity-0 invisible transform scale-95';

  const panelClasses = cn(
    panelBaseClasses,
    panelThemeClasses,
    panelPlacementClasses,
    isOpen && 'opacity-100 visible transform scale-100'
  );

  const avatarClasses = cn(
    'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium',
    'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
    isDarkTheme ? 'ring-2 ring-gray-800 shadow-md' : 'ring-2 ring-white dark:ring-gray-00 shadow-sm'
  );

  const menuItemClasses = cn(
    'flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150',
    isDarkTheme
      ? 'text-gray-200 hover:bg-gray-800'
      : 'text-gray-700 hover:bg-gray-50'
  );

  const menuIconClasses = cn('h-4 w-4', isDarkTheme ? 'text-gray-400' : 'text-gray-400');

  useLayoutEffect(() => {
    if (!isOpen || desiredPlacement === 'bottom') {
      if (desiredPlacement === 'bottom') {
        setPanelPlacement('bottom');
      }
      return;
    }

    if (desiredPlacement === 'top') {
      setPanelPlacement('top');
      return;
    }

    const dropdownEl = dropdownRef.current;
    const panelEl = panelRef.current;
    if (!dropdownEl || !panelEl) {
      return;
    }

    const dropdownRect = dropdownEl.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - dropdownRect.bottom;
    const spaceAbove = dropdownRect.top;
    const panelHeight = panelRect.height;

    if (spaceBelow < panelHeight && spaceAbove > spaceBelow) {
      setPanelPlacement('top');
    } else {
      setPanelPlacement('bottom');
    }
  }, [isOpen, desiredPlacement]);

  return (
    <div className={dropdownClasses} ref={dropdownRef} {...props}>
      <button
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (!nextOpen) {
            setPanelPlacement('bottom');
          }
        }}
        className={cn(
          'flex items-center gap-2 h-10 px-3 rounded-xl transition-all duration-200 text-sm justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          layout.fullWidth ? 'w-full' : 'w-auto',
          isDarkTheme
            ? 'border border-violet-300/60 bg-gray-900 text-violet-200 hover:bg-gray-800 focus-visible:ring-violet-500 focus-visible:ring-offset-gray-900'
            : 'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 focus-visible:ring-violet-500 focus-visible:ring-offset-white'
        )}
        style={{ width: fullWidth ? '100%' : undefined }}
        aria-label="User menu"
      >
        <div className="flex flex-row items-center gap-2">
          {layout.showAvatar !== false && (
            <div className={avatarClasses}>
              {currentProfile?.avatar ? (
                <img
                  src={currentProfile.avatar}
                  alt={currentProfile?.name || 'User'}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span>{currentProfile?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
          )}

          {layout.showName !== false && (
            <span className={cn(
              'text-sm font-medium',
              isDarkTheme ? 'text-gray-100' : 'text-gray-900 dark:text-gray-300'
            )}>
              {currentProfile?.name || 'User'}
              {currentProfile?.lastname ? ` ${currentProfile.lastname}` : ''}
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform duration-200',
          isDarkTheme ? 'text-gray-400' : 'text-gray-400',
          isOpen && 'transform rotate-180'
        )} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={panelClasses}
          style={{
            width: fullWidth ? '100%' : undefined,
            minWidth: fullWidth ? undefined : '14rem',
            right: fullWidth ? 0 : 0,
            left: fullWidth ? 0 : undefined,
            maxWidth: fullWidth ? '100%' : 'min(24rem, calc(100vw - 1rem))',
            top: panelPlacement === 'bottom' ? '100%' : 'auto',
            bottom: panelPlacement === 'top' ? '100%' : 'auto',
            marginTop: panelPlacement === 'bottom' ? '0.5rem' : undefined,
            marginBottom: panelPlacement === 'top' ? '0.5rem' : undefined,
            zIndex: DROPDOWN_Z_INDEX,
          }}
          ref={panelRef}
        >
          {/* User Info Header */}
          {currentProfile && (
            <div className={cn(
              'px-4 py-3 border-b',
              isDarkTheme ? 'border-gray-800' : 'border-gray-100'
            )}>
              <div className="flex items-center gap-3">
                <div className={avatarClasses}>
                  {currentProfile.avatar ? (
                    <img
                      src={currentProfile.avatar}
                      alt={currentProfile.name || 'User'}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{currentProfile.name?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    isDarkTheme ? 'text-gray-100' : 'text-gray-900'
                  )}>
                    {currentProfile.name || 'User'}
                    {currentProfile.lastname ? ` ${currentProfile.lastname}` : ''}
                  </p>
                  {layout.showEmail && currentProfile.email && (
                    <p className={cn(
                      'text-xs truncate',
                      isDarkTheme ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      {currentProfile.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-1.5">
            {/* Profile */}
            <div
              onClick={() => {
                if (currentProfile) {
                  onProfileSelect?.(currentProfile);
                }
                setIsOpen(false);
              }}
              className={menuItemClasses}
            >
              <User className={menuIconClasses} />
              <span>Profile</span>
            </div>

            {/* Change Password */}
            {onChangePassword && (
              <div
                onClick={() => {
                  onChangePassword();
                  setIsOpen(false);
                }}
                className={menuItemClasses}
              >
                <Key className={menuIconClasses} />
                <span>Change Password</span>
              </div>
            )}

            {/* Settings */}
            <div
              onClick={() => {
                if (currentProfile) {
                  onProfileEdit?.(currentProfile);
                }
                setIsOpen(false);
              }}
              className={menuItemClasses}
            >
              <Settings className={menuIconClasses} />
              <span>Settings</span>
            </div>

            {/* Divider */}
            <div className={cn(
              'my-1 border-t',
              isDarkTheme ? 'border-gray-800' : 'border-gray-100'
            )} />

            {/* Logout */}
            <div
              onClick={() => {
                onProfileDelete?.(currentProfile!);
                setIsOpen(false);
              }}
              className={cn(
                menuItemClasses,
                isDarkTheme ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'
              )}
            >
              <LogOut className={cn('h-4 w-4', isDarkTheme ? 'text-red-400' : '')} />
              <span>Logout</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ProfileDropdown.displayName = 'ProfileDropdown';
