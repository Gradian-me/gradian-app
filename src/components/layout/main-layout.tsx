'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, PanelLeftOpen, PanelRightOpen, PencilRuler, Plus } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import { GoToTop, Header } from '@/gradian-ui/layout';
import { Sidebar } from '@/gradian-ui/layout/sidebar';
import { EndLine } from '@/gradian-ui/layout/end-line/components/EndLine';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import dynamic from 'next/dynamic';

// Dynamically import PageActionButtons to avoid SSR issues with HTMLCanvasElement
const PageActionButtons = dynamic(
  () => import('@/gradian-ui/layout/components/PageActionButtons').then(mod => ({ default: mod.PageActionButtons })),
  { ssr: false }
);
// Dynamically import NotificationsDropdown to avoid prerender "Cannot access before initialization" (bundle/cycle)
const NotificationsDropdown = dynamic(
  () => import('@/components/layout/NotificationsDropdown').then(mod => ({ default: mod.NotificationsDropdown })),
  { ssr: false }
);
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CompanySelector } from './CompanySelector';
import { TenantSelector } from './TenantSelector';
import { OrganizationSettings } from './OrganizationSettings';
import { useCompanyStore } from '@/stores/company.store';
import { UserProfileSelector } from './UserProfileSelector';
import { DemoModeBadge } from './DemoModeBadge';
import { DEMO_MODE, ENABLE_NOTIFICATION, ENABLE_BUILDER } from '@/gradian-ui/shared/configs/env-config';
import type { HeaderConfig } from '@/gradian-ui/layout/header';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useTheme } from 'next-themes';
import { useDialogContext } from '@/gradian-ui/shared/contexts/DialogContext';
import { cn } from '@/gradian-ui/shared/utils';
import { useLayoutContext, LayoutProvider } from '@/gradian-ui/layout/contexts/LayoutContext';
import { useLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage, getT, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string | React.ReactNode;
  icon?: string;
  showActionButtons?: boolean;
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreateClick?: () => void;
  editSchemaPath?: string;
  isAdmin?: boolean;
  navigationSchemas?: FormSchema[];
  customHeaderActions?: React.ReactNode;
  showEndLine?: boolean;
  hidePadding?: boolean;
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

function MainLayoutContent(initialProps: MainLayoutProps) {
  const {
    children,
    title: titleProp,
    subtitle: subtitleProp,
    icon: iconProp,
    showActionButtons: showActionButtonsProp,
    showCreateButton: showCreateButtonProp,
    createButtonText: createButtonTextProp = 'Create',
    onCreateClick: onCreateClickProp,
    editSchemaPath: editSchemaPathProp,
    isAdmin: isAdminProp,
    navigationSchemas: navigationSchemasProp,
    customHeaderActions: customHeaderActionsProp,
    showEndLine: showEndLineProp,
    hidePadding: hidePaddingProp,
  } = initialProps;

  const { layoutProps: contextProps } = useLayoutProps();

  const title = (titleProp ?? contextProps.title) ?? '';
  const subtitle = subtitleProp ?? contextProps.subtitle;
  const icon = iconProp ?? contextProps.icon;
  const showActionButtons = showActionButtonsProp ?? contextProps.showActionButtons ?? true;
  const showCreateButton = showCreateButtonProp ?? contextProps.showCreateButton ?? false;
  const createButtonText = createButtonTextProp ?? contextProps.createButtonText ?? 'Create';
  const onCreateClick = onCreateClickProp ?? contextProps.onCreateClick;
  const editSchemaPath = editSchemaPathProp ?? contextProps.editSchemaPath;
  const isAdmin = isAdminProp ?? contextProps.isAdmin ?? false;
  const navigationSchemas = navigationSchemasProp ?? contextProps.navigationSchemas;
  const customHeaderActions = customHeaderActionsProp ?? contextProps.customHeaderActions;
  const showEndLine = showEndLineProp ?? contextProps.showEndLine ?? true;
  const hidePadding = hidePaddingProp ?? contextProps.hidePadding ?? false;

  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  // SECURITY: Default to 'light' to ensure consistent server/client rendering
  // The UserProfileSelector will handle theme switching after mount
  const profileTheme: 'light' | 'dark' = 'light';
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
  
  // Debug: Log ENABLE_NOTIFICATION value (only in development)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[MainLayout] ENABLE_NOTIFICATION:', ENABLE_NOTIFICATION);
      console.log('[MainLayout] NEXT_PUBLIC_ENABLE_NOTIFICATION:', process.env.NEXT_PUBLIC_ENABLE_NOTIFICATION);
    }
  }, []);
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
  const { isMaximized, setTitle, setIcon } = useLayoutContext();
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const rtl = isRTL(language || 'en');
  const pageTitle = title ? `${title} | Gradian` : 'Gradian';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);

  // Update layout context with title and icon
  useEffect(() => {
    setTitle(title);
    setIcon(icon);
  }, [title, icon, setTitle, setIcon]);

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

  const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false);

  useEffect(() => {
    const prevWidth = prevSidebarWidthRef.current;
    const shouldAnimate = prevWidth !== null && prevWidth !== sidebarWidth;
    setShouldAnimateSidebar(shouldAnimate);
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

    const handlePopState = () => {
      // If there are open dialogs (e.g. form modal with unsaved changes), intercept back on both mobile and desktop
      if (hasOpenDialogs()) {
        // Push state so we stay on the current page (cancel the back navigation)
        window.history.pushState({ dialogOpen: true }, '', window.location.href);
        closeAllDialogs(); // This runs each dialog's onClose (e.g. form modal shows unsaved confirm)
        return;
      }

      // On mobile we pushed state when first dialog opened; on desktop we don't push, so back normally navigates.
      // No dialogs open: allow normal back navigation.
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [closeAllDialogs, hasOpenDialogs]);

  const toggleSidebar = useCallback(() => {
    startTransition(() => {
      setIsSidebarCollapsed((collapsed) => !collapsed);
    });
  }, []);

  const toggleMobileMenu = useCallback(() => {
    startTransition(() => {
      setIsMobileMenuOpen((prev) => !prev);
    });
  }, []);

  const closeMobileMenu = useCallback(() => {
    startTransition(() => {
      setIsMobileMenuOpen(false);
    });
  }, []);

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

  const handleNotificationClick = useCallback(() => {
    router.push('/notifications');
  }, [router]);

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
        {rtl ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
      </Button>
      <div className="flex flex-col min-w-0 flex-1">
        <motion.div
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex items-center gap-2 min-w-0"
        >
          {icon && (
            <motion.div
              initial={{ opacity: 0, rotate: -180, scale: 0 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.1,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <IconRenderer
                iconName={icon}
                className="h-5 w-5 md:h-6 md:w-6 text-violet-600 dark:text-violet-300 shrink-0"
              />
            </motion.div>
          )}
          <motion.h2
            dir="auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0 leading-relaxed"
          >
            {title}
          </motion.h2>
          {isAdmin && editSchemaPath && ENABLE_BUILDER && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onMouseDown={handleEditSchemaMouseDown}
                    onClick={handleEditSchemaClick}
                    className="hidden md:inline-flex h-8 w-8 p-0 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                    aria-label="Edit schema"
                  >
                    <PencilRuler className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getT(TRANSLATION_KEYS.TOOLTIP_EDIT_SCHEMA, language, defaultLang)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </motion.div>
        {subtitle && (
          <motion.div
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="text-sm direction-auto text-start text-violet-600 dark:text-violet-400 mt-0.5 hidden lg:block truncate min-w-0 leading-relaxed"
          >
            {subtitle}
          </motion.div>
        )}
      </div>
    </div>
  );

  const headerActionsContent = (
    <div className="flex items-center gap-2">
      {customHeaderActions && (
        <div className="hidden lg:flex items-center">
          {customHeaderActions}
        </div>
      )}
      <TooltipProvider delayDuration={200}>
        <div className="hidden lg:flex items-center space-x-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DemoModeBadge />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{DEMO_MODE ? getT(TRANSLATION_KEYS.LABEL_DEMO_MODE, language, defaultLang) : getT(TRANSLATION_KEYS.LABEL_LIVE_MODE, language, defaultLang)}</p>
            </TooltipContent>
          </Tooltip>
          {/* Organization settings button that wraps tenant & company selection */}
          <OrganizationSettings />
          <Tooltip key="user-profile-tooltip" open={isUserMenuOpen ? false : undefined}>
            <TooltipTrigger asChild>
              <UserProfileSelector
                theme={profileTheme}
                onMenuOpenChange={setIsUserMenuOpen}
                config={{
                  layout: {
                    variant: 'dropdown',
                    size: 'sm',
                    showAvatar: true,
                    showName: true,
                    showEmail: false,
                    showRole: false,
                    showStatus: false,
                    fullWidth: false,
                    popoverPlacement: 'auto',
                  },
                  styling: {
                    variant: 'minimal',
                    theme: profileTheme,
                    rounded: true,
                  },
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>User Profile</p>
            </TooltipContent>
          </Tooltip>
          {ENABLE_NOTIFICATION ? (
            <Tooltip key="notifications-tooltip" open={isNotificationsDropdownOpen ? false : undefined}>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <NotificationsDropdown 
                    initialCount={5} 
                    onOpenChange={setIsNotificationsDropdownOpen}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </TooltipProvider>
      <div className="flex lg:hidden items-center space-x-2">
        {customHeaderActions && (
          <div className="flex items-center me-2">
            {customHeaderActions}
          </div>
        )}
        <DemoModeBadge />
        {ENABLE_NOTIFICATION && (
          <NotificationsDropdown initialCount={5} />
        )}
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

  return (
    <div
      className="flex h-screen bg-gray-50 dark:bg-gray-950 relative"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {/* Desktop Sidebar - Fixed Position (left in LTR, right in RTL) */}
      {/* Keep sidebar mounted but hidden when maximized to preserve state */}
      <div 
        className={cn(
          "fixed top-0 h-full z-30",
          rtl ? "right-0" : "left-0",
          isMaximized ? "hidden" : "hidden md:block"
        )}
        key="sidebar-container" // Stable key to prevent remounting
      >
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={toggleSidebar}
          company={selectedCompany ? {
            name: selectedCompany.name,
            abbreviation: selectedCompany.abbreviation,
            id: selectedCompany.id
          } : undefined}
          navigationSchemas={navigationSchemas}
          isRtl={rtl}
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
            
            {/* Mobile Sidebar (slides from left in LTR, from right in RTL) */}
            <motion.div
              initial={rtl ? { x: 280 } : { x: -280 }}
              animate={{ x: 0 }}
              exit={rtl ? { x: 280 } : { x: -280 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn(
                "fixed top-0 h-full w-80 bg-gray-950 text-white z-50 md:hidden",
                rtl ? "right-0" : "left-0"
              )}
            >
              <Sidebar 
                isCollapsed={false} 
                onToggle={toggleMobileMenu} 
                isMobile={true}
                onNavigate={closeMobileMenu}
                company={selectedCompany ? {
                  name: selectedCompany.name,
                  abbreviation: selectedCompany.abbreviation,
                  id: selectedCompany.id
                } : undefined}
                navigationSchemas={navigationSchemas}
                isRtl={rtl}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Main Content - Margin opposite to sidebar (left in LTR, right in RTL) */}
      <motion.div
        key={rtl ? 'main-rtl' : 'main-ltr'}
        className="flex-1 flex flex-col min-h-0"
        initial={
          isMaximized
            ? { marginLeft: 0, marginRight: 0 }
            : rtl
              ? { marginRight: sidebarWidth, marginLeft: 0 }
              : { marginLeft: sidebarWidth }
        }
        animate={
          isMaximized
            ? { marginLeft: 0, marginRight: 0 }
            : rtl
              ? { marginRight: sidebarWidth, marginLeft: 0 }
              : { marginLeft: sidebarWidth }
        }
        transition={{ 
          duration: shouldAnimateSidebar ? 0.3 : 0,
          ease: "easeOut" 
        }}
        style={isMaximized ? { width: '100%', minWidth: 0 } : mainContentStyle}
      >
        {/* Header */}
        {!isMaximized && (
          <Header
            config={headerConfig}
            brandContent={headerBrandContent}
            actionsContent={headerActionsContent}
            className="bg-white/90 border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700 backdrop-blur-sm"
          />
        )}

        {/* Page Action Buttons - Top of page */}
        {showActionButtons && (
          <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <PageActionButtons />
          </div>
        )}

        {/* Page Content */}
        {/* Use stable key for chat pages to prevent remounting when chat-id changes */}
        <motion.main
          key={(pathname === '/chat' || pathname?.startsWith('/chat/')) ? '/chat' : pathname}
          initial={!hasMountedBefore ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "flex-1 overflow-y-auto bg-slate-100 dark:bg-gray-900",
            hidePadding ? "p-0" : "p-2 md:p-4 lg:p-6"
          )}
          data-scroll-container="main-content"
        >
          <div className="max-w-9xl mx-auto w-full h-full">
            {children}
            {showEndLine && <EndLine />}
          </div>
        </motion.main>
        
        {/* Go to Top Button */}
        <GoToTop scrollContainerSelector="[data-scroll-container='main-content']" threshold={100} />
      </motion.div>
    </div>
  );
}

export function MainLayout(props: MainLayoutProps) {
  return (
    <LayoutProvider>
      <MainLayoutContent {...props} />
    </LayoutProvider>
  );
}
