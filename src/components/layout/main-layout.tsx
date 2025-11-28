'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, PanelLeftOpen, PencilRuler, Plus } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import { GoToTop, Header, ModeToggle } from '@/gradian-ui/layout';
import { Sidebar } from '@/gradian-ui/layout/sidebar';
import dynamic from 'next/dynamic';

// Dynamically import PageActionButtons to avoid SSR issues with HTMLCanvasElement
const PageActionButtons = dynamic(
  () => import('@/gradian-ui/layout/components/PageActionButtons').then(mod => ({ default: mod.PageActionButtons })),
  { ssr: false }
);
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CompanySelector } from './CompanySelector';
import { useCompanyStore } from '@/stores/company.store';
import { NotificationsDropdown } from './NotificationsDropdown';
import { UserProfileSelector } from './UserProfileSelector';
import { DemoModeBadge } from './DemoModeBadge';
import type { HeaderConfig } from '@/gradian-ui/layout/header';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useTheme } from 'next-themes';
import { useDialogContext } from '@/gradian-ui/shared/contexts/DialogContext';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string | React.ReactNode;
  icon?: string;
  showActionButtons?: boolean;
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreateClick?: () => void;
  editSchemaPath?: string;
  isAdmin?: boolean;
  navigationSchemas?: FormSchema[];
}

const DESKTOP_BREAKPOINT = 768;
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 280;
const SIDEBAR_STATE_KEY = 'gradian-sidebar-collapsed';

// Track if this is the first mount across all route changes
let hasMountedBefore = false;
// Track if sidebar state has been hydrated (persists across route changes)
let sidebarStateHydrated = false;
// Track the last known sidebar width across route changes
let lastSidebarWidth: number | null = null;

const getSidebarWidth = (isDesktop: boolean, isCollapsed: boolean) => {
  if (!isDesktop) {
    return 0;
  }
  return isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
};

const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
  return stored === 'true';
};

export function MainLayout({ 
  children, 
  title,
  subtitle,
  icon,
  showActionButtons = true,
  showCreateButton = false, 
  createButtonText = "Create",
  onCreateClick,
  editSchemaPath,
  isAdmin = false,
  navigationSchemas,
}: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const profileTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  // Initialize sidebar state from localStorage if available, otherwise default to collapsed
  // This prevents the flash of collapsed sidebar when navigating
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && sidebarStateHydrated) {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
      return stored === 'true';
    }
    return true; // Default for SSR
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount] = useState(3);
  const [isDesktop, setIsDesktop] = useState(false);
  // Always start with collapsed width to match SSR (prevents hydration mismatch)
  // Use previous width if available to prevent animation on route change
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      if (lastSidebarWidth !== null) {
        return lastSidebarWidth;
      }
      if (sidebarStateHydrated) {
        const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
        const shouldBeCollapsed = stored === 'true';
        const isDesktopNow = window.innerWidth >= DESKTOP_BREAKPOINT;
        return getSidebarWidth(isDesktopNow, shouldBeCollapsed);
      }
    }
    return getSidebarWidth(false, true);
  });
  const prevSidebarWidthRef = useRef<number | null>(sidebarWidth);
  const { selectedCompany } = useCompanyStore();
  const { closeAllDialogs, hasOpenDialogs, registerDialog, unregisterDialog } = useDialogContext();
  const pageTitle = title ? `${title} | Gradian App` : 'Gradian App';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previousTitle = document.title;
    document.title = pageTitle;
    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);

  // Hydrate sidebar state from localStorage after mount (prevents hydration mismatch)
  // Only do this once across all route changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sidebarStateHydrated) return; // Already hydrated, skip
    
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    const shouldBeCollapsed = stored === 'true';
    setIsSidebarCollapsed(shouldBeCollapsed);
    sidebarStateHydrated = true;
    
    // Also set initial sidebar width based on hydrated state
    const isDesktopNow = window.innerWidth >= DESKTOP_BREAKPOINT;
    const initialWidth = getSidebarWidth(isDesktopNow, shouldBeCollapsed);
    setSidebarWidth(initialWidth);
    prevSidebarWidthRef.current = initialWidth;
    lastSidebarWidth = initialWidth;
  }, []);

  // Check if we're on desktop (only on resize, not on every render)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkDesktop = () => {
      const isDesktopNow = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop((prev) => {
        if (prev !== isDesktopNow) {
          return isDesktopNow;
        }
        return prev;
      });
    };
    // Set initial desktop state
    const isDesktopInitial = window.innerWidth >= DESKTOP_BREAKPOINT;
    setIsDesktop(isDesktopInitial);
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Update sidebar width only when desktop state or collapsed state actually changes
  useEffect(() => {
    const nextSidebarWidth = getSidebarWidth(isDesktop, isSidebarCollapsed);
    setSidebarWidth((currentWidth) => {
      // Only update if width actually changed
      if (currentWidth !== nextSidebarWidth) {
        lastSidebarWidth = nextSidebarWidth;
        return nextSidebarWidth;
      }
      return currentWidth;
    });
  }, [isDesktop, isSidebarCollapsed]);

  useEffect(() => {
    prevSidebarWidthRef.current = sidebarWidth;
    if (typeof window !== 'undefined') {
      lastSidebarWidth = sidebarWidth;
    }
  }, [sidebarWidth]);

  // Mark that we've mounted (after first render)
  useEffect(() => {
    hasMountedBefore = true;
  }, []);

  // Memoize the main content style to prevent recalculation on every render
  const mainContentStyle = useMemo(() => ({
    width: `calc(100% - ${sidebarWidth}px)`,
    minWidth: 0,
  }), [sidebarWidth]);

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed]);

  // Handle browser back button on mobile - close dialogs/dropdowns first
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      // Check if we're on mobile
      const isMobile = window.innerWidth < DESKTOP_BREAKPOINT;
      if (!isMobile) {
        return; // Allow normal back navigation on desktop
      }

      // If there are open dialogs/dropdowns, close them and prevent navigation
      if (hasOpenDialogs()) {
        // Push a new state to prevent navigation
        window.history.pushState({ dialogOpen: true }, '', window.location.href);
        // Close all dialogs
        closeAllDialogs();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [closeAllDialogs, hasOpenDialogs]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Register mobile menu as a dialog for back button handling
  useEffect(() => {
    const menuId = 'mobile-sidebar-menu';
    
    if (isMobileMenuOpen) {
      registerDialog(menuId, 'sidebar', toggleMobileMenu);
      return () => {
        unregisterDialog(menuId);
      };
    } else {
      unregisterDialog(menuId);
    }
  }, [isMobileMenuOpen, registerDialog, unregisterDialog, toggleMobileMenu]);

  const handleNotificationClick = () => {
    window.location.href = '/notifications';
  };

  const handleEditSchemaMouseDown = (e: React.MouseEvent) => {
    // Middle click (button 1) should open schema builder in new tab
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      // Extract schema ID from editSchemaPath or from current pathname
      let schemaId: string | undefined;
      
      if (editSchemaPath) {
        // Extract schema ID from editSchemaPath (format: /builder/schemas/[schema-id])
        schemaId = editSchemaPath.replace('/builder/schemas/', '');
      } else if (pathname) {
        // Fallback: extract schema ID from current pathname (format: /page/[schema-id])
        const match = pathname.match(/^\/page\/([^/]+)/);
        if (match) {
          schemaId = match[1];
        }
      }
      
      // Open builder path in new tab
      if (schemaId) {
        window.open(`/builder/schemas/${schemaId}`, '_blank');
      }
    }
  };

  const handleEditSchemaClick = (e: React.MouseEvent) => {
    // Ctrl/Cmd + click should open schema builder in new tab (same as middle-click)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      // Extract schema ID from editSchemaPath or from current pathname
      let schemaId: string | undefined;
      
      if (editSchemaPath) {
        // Extract schema ID from editSchemaPath (format: /builder/schemas/[schema-id])
        schemaId = editSchemaPath.replace('/builder/schemas/', '');
      } else if (pathname) {
        // Fallback: extract schema ID from current pathname (format: /page/[schema-id])
        const match = pathname.match(/^\/page\/([^/]+)/);
        if (match) {
          schemaId = match[1];
        }
      }
      
      // Open builder path in new tab
      if (schemaId) {
        window.open(`/builder/schemas/${schemaId}`, '_blank');
      }
      return;
    }
    // Regular click - navigate to builder
    if (editSchemaPath) {
      router.push(editSchemaPath);
    }
  };

  const headerConfig: HeaderConfig = {
    id: 'main-layout-header',
    name: 'main-layout-header',
    title,
    styling: {
      variant: 'default',
      size: 'md',
    },
  };

  const headerBrandContent = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMobileMenu}
        className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
        aria-label="Toggle sidebar"
      >
        <PanelLeftOpen className="h-5 w-5" />
      </Button>
      <div className="flex flex-col min-w-0 flex-1">
        <motion.div
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex items-center gap-2 min-w-0"
        >
          {icon && (
            <IconRenderer
              iconName={icon}
              className="h-5 w-5 md:h-6 md:w-6 text-violet-600 dark:text-violet-300 shrink-0"
            />
          )}
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0">
            {title}
          </h1>
          {isAdmin && editSchemaPath && (
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={handleEditSchemaMouseDown}
              onClick={handleEditSchemaClick}
              className="hidden md:inline-flex h-8 w-8 p-0 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
              aria-label="Edit schema"
              title="Edit schema (Middle-click to view page in new tab)"
            >
              <PencilRuler className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 hidden lg:block"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );

  const headerActionsContent = (
    <div className="flex items-center gap-2">
      <div className="hidden lg:flex items-center space-x-4">
        <DemoModeBadge />
        <CompanySelector />
        <ModeToggle />
        <NotificationsDropdown initialCount={5} />
        <UserProfileSelector theme={profileTheme} />
      </div>
      <div className="flex lg:hidden items-center space-x-2">
        <DemoModeBadge />
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={handleNotificationClick}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {notificationCount}
            </Badge>
          )}
        </Button>
        {showCreateButton && (
          <Button
            onClick={onCreateClick}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            aria-label={createButtonText}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const shouldAnimateSidebar = prevSidebarWidthRef.current !== null && prevSidebarWidthRef.current !== sidebarWidth;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 relative">
      {/* Desktop Sidebar - Fixed Position */}
      <div className="hidden md:block fixed left-0 top-0 h-full z-30">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={toggleSidebar}
          company={selectedCompany ? {
            name: selectedCompany.name,
            abbreviation: selectedCompany.abbreviation,
            id: selectedCompany.id
          } : undefined}
          navigationSchemas={navigationSchemas}
        />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 0.8, backdropFilter: 'blur(10px)' }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={toggleMobileMenu}
            />
            
            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed left-0 top-0 h-full w-80 bg-gray-950 text-white z-50 md:hidden"
            >
              <Sidebar 
                isCollapsed={false} 
                onToggle={toggleMobileMenu} 
                isMobile={true}
                company={selectedCompany ? {
                  name: selectedCompany.name,
                  abbreviation: selectedCompany.abbreviation,
                  id: selectedCompany.id
                } : undefined}
                navigationSchemas={navigationSchemas}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Main Content - Adjust margin based on sidebar width */}
      <motion.div 
        className="flex-1 flex flex-col min-h-0"
        initial={{ marginLeft: sidebarWidth }}
        animate={{ 
          marginLeft: sidebarWidth
        }}
        transition={{ 
          duration: shouldAnimateSidebar ? 0.3 : 0,
          ease: "easeOut" 
        }}
        style={mainContentStyle}
      >
        {/* Header */}
        <Header
          config={headerConfig}
          brandContent={headerBrandContent}
          actionsContent={headerActionsContent}
          className="bg-white/90 border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700 backdrop-blur-sm"
        />

        {/* Page Action Buttons - Top of page */}
        {showActionButtons && (
          <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <PageActionButtons />
          </div>
        )}

        {/* Page Content */}
        <motion.main
          key={pathname}
          initial={!hasMountedBefore ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-6 bg-gray-50 dark:bg-gray-900"
          data-scroll-container="main-content"
        >
          <div className="max-w-9xl mx-auto w-full h-full">
            {children}
          </div>
        </motion.main>
        
        {/* Go to Top Button */}
        <GoToTop scrollContainerSelector="[data-scroll-container='main-content']" threshold={100} />
      </motion.div>
    </div>
  );
}
