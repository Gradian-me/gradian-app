'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../shared/utils';
import { SidebarProps } from '../types';
import { defaultNavigationItems } from '../utils';
import { defaultSidebarConfig } from '../configs';
import { SidebarHeader } from './SidebarHeader';
import { CompanySelector } from '@/components/layout/CompanySelector';
import { SidebarNavigation } from './SidebarNavigation';
import { UserProfileSelector } from '@/components/layout/UserProfileSelector';
import { ModeToggle } from '../../mode-toggle/components/ModeToggle';

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  isMobile = false,
  config = defaultSidebarConfig,
  navigationItems = defaultNavigationItems,
  user: _user,
  company,
  className,
  navigationSchemas,
}) => {
  const width = isMobile ? 320 : (isCollapsed ? config.styling?.collapsedWidth || 80 : config.styling?.expandedWidth || 280);
  const prevWidthRef = useRef<number>(width);

  // Only animate if width actually changed
  useEffect(() => {
    prevWidthRef.current = width;
  }, [width]);

  const shouldAnimate = prevWidthRef.current !== width;

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
        !isMobile && "border-r border-gray-800",
        className
      )}
    >
      {/* Header */}
      <SidebarHeader
        brand={config.brand}
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        onToggle={onToggle}
      />

      {/* Company Selector */}
      {(!isCollapsed || isMobile) && (
        <div className="px-4 py-3 border-b border-gray-800 sm:block lg:hidden">
          <CompanySelector variant="dark" fullWidth showLogo="sidebar-avatar" />
        </div>
      )}

      {/* Navigation */}
      <SidebarNavigation
        items={navigationItems}
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        navigationSchemas={navigationSchemas}
      />

      {/* User Profile / Mode Toggle */}
      {(!isCollapsed || isMobile) && (
        <div className="mt-auto border-t border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <UserProfileSelector
              className={cn(
                "flex-1",
                isCollapsed && !isMobile ? "justify-center" : ""
              )}
              theme="dark"
              config={{
                layout: {
                  variant: 'dropdown',
                  size: isCollapsed && !isMobile ? 'sm' : 'md',
                  showAvatar: true,
                  showName: !isCollapsed || isMobile,
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
            <div className="shrink-0">
              <ModeToggle />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

Sidebar.displayName = 'Sidebar';

