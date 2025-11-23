// Header Component

import React, { useState } from 'react';
import { HeaderProps } from '../types';
import { HeaderBrand } from './HeaderBrand';
import { HeaderNavigation } from './HeaderNavigation';
import { HeaderActions } from './HeaderActions';
import { HeaderMobileMenu } from './HeaderMobileMenu';
import { cn } from '../../../shared/utils';

export const Header: React.FC<HeaderProps> = ({
  config,
  user,
  onUserAction,
  onMenuClick,
  className,
  brandContent,
  navigationContent,
  actionsContent,
  ...props
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    title,
    logo,
    navigation,
    actions,
    styling,
    responsive,
  } = config;

  const headerClasses = cn(
    'w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
    styling?.variant === 'minimal' && 'border-none',
    styling?.variant === 'elevated' && 'shadow-md',
    styling?.variant === 'transparent' && 'bg-transparent border-none',
    styling?.size === 'sm' && 'h-12',
    styling?.size === 'md' && 'h-16',
    styling?.size === 'lg' && 'h-20',
    styling?.sticky && 'sticky top-0',
    styling?.fixed && 'fixed top-0 left-0 right-0',
    className
  );

  const containerClasses = cn(
    'flex items-center justify-between h-full px-4',
    styling?.size === 'sm' && 'px-3',
    styling?.size === 'lg' && 'px-6'
  );

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={headerClasses}
        style={{ zIndex: styling?.zIndex }}
        {...props}
      >
        <div className={containerClasses}>
          {/* Brand */}
          {brandContent ?? (
            <HeaderBrand
              logo={logo}
              title={title}
            />
          )}

          {/* Desktop Navigation */}
          {navigationContent ??
            (navigation && !responsive?.mobileMenu && (
              <HeaderNavigation
                items={navigation.items}
                variant={navigation.variant}
                onItemClick={onMenuClick}
              />
            ))}

          {/* Actions */}
          {actionsContent ??
            (actions && (
              <HeaderActions
                actions={actions}
                user={user}
                onAction={(action, data) => {
                  if (action === 'mobile-menu-toggle') {
                    handleMobileMenuToggle();
                  } else {
                    onUserAction?.(action);
                  }
                }}
              />
            ))}

          {/* Mobile Menu Button */}
          {responsive?.mobileMenu && !actionsContent && (
            <button
              onClick={handleMobileMenuToggle}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {responsive?.mobileMenu && (
        <HeaderMobileMenu
          isOpen={isMobileMenuOpen}
          onClose={handleMobileMenuClose}
          navigation={navigation?.items || []}
          user={user}
          onItemClick={onMenuClick}
          onUserAction={onUserAction}
        />
      )}
    </>
  );
};

Header.displayName = 'Header';
