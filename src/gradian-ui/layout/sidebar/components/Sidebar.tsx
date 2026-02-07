'use client';

import React, { useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../shared/utils';
import { SidebarProps } from '../types';
import { defaultSidebarConfig } from '../configs';
import { SidebarHeader } from './SidebarHeader';
import { CompanySelector } from '@/components/layout/CompanySelector';
import { UserProfileSelector } from '@/components/layout/UserProfileSelector';
import { SidebarNavigationMenu } from './SidebarNavigationMenu';
import { APP_VERSION } from '../../../shared/constants/app-version';

const SidebarComponent: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  isMobile = false,
  config = defaultSidebarConfig,
  navigationItems: _navigationItems,
  user: _user,
  company,
  className,
  navigationSchemas,
  isRtl = false,
}) => {
  const width = isMobile ? 320 : (isCollapsed ? config.styling?.collapsedWidth || 80 : config.styling?.expandedWidth || 280);
  const prevWidthRef = useRef<number>(width);
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  // Only animate if width actually changed
  useEffect(() => {
    const prevWidth = prevWidthRef.current;
    setShouldAnimate(prevWidth !== width);
    prevWidthRef.current = width;
  }, [width]);

  const showUserControls = (!isCollapsed || isMobile);

  return (
    <motion.div
      initial={false}
      animate={{ width }}
      transition={{
        duration: shouldAnimate ? 0.3 : 0,
        ease: "easeOut"
      }}
      className={cn(
        "relative h-full bg-gray-900 text-white flex flex-col",
        className
      )}
      style={{
        ...(!isMobile ? { borderInlineEnd: '1px solid rgb(31 41 55)' } : {}),
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      <SidebarHeader
        brand={config.brand}
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        onToggle={onToggle}
        isRtl={isRtl}
      />

      {/* Company Selector */}
      {(!isCollapsed || isMobile) && (
        <div className="px-4 py-3 border-b border-gray-800 sm:block lg:hidden">
          <CompanySelector variant="dark" fullWidth showLogo="sidebar-avatar" />
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <SidebarNavigationMenu
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          navigationSchemas={navigationSchemas}
        />
      </div>

      {/* User Profile / Mode Toggle */}
      {showUserControls && (
        <div className="mt-auto border-t border-gray-800 p-4 sm:block lg:hidden">
          <div className="flex items-center gap-3 overflow-hidden">
            <UserProfileSelector
              className="flex-1 min-w-0"
              theme="dark"
              config={{
                layout: {
                  variant: 'dropdown',
                  size: 'sm',
                  showAvatar: true,
                  showName: true,
                  showEmail: false,
                  showRole: false,
                  showStatus: false,
                  fullWidth: true,
                  popoverPlacement: 'auto',
                },
                styling: {
                  variant: 'minimal',
                  theme: 'dark',
                  rounded: true,
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Version Footer */}
      {(!isCollapsed || isMobile) && (
        <div className="border-t border-gray-800 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">v{APP_VERSION}</p>
        </div>
      )}
    </motion.div>
  );
};

SidebarComponent.displayName = 'Sidebar';
export const Sidebar = memo(SidebarComponent);

