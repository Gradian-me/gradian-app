'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AppWindow, Grid3X3, List, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IconBox } from '@/gradian-ui/form-builder/form-elements';
import { SearchBar } from '@/gradian-ui/data-display/components/SearchBar';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { useSchemas } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { FormSchema } from '@/gradian-ui/schema-manager/types';
import { getSchemaTranslatedPluralName, getSchemaTranslatedDescription } from '@/gradian-ui/schema-manager/utils/schema-utils';
import { UserWelcome } from '@/gradian-ui/layout/components/UserWelcome';
import { useUserStore } from '@/stores/user.store';
import { getDisplayNameFields, resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { cn } from '@/gradian-ui/shared/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantStore } from '@/stores/tenant.store';

type AppViewMode = 'grid' | 'list';

const getSchemaType = (schema: FormSchema): 'system' | 'business' | 'action-form' =>
  schema.schemaType ? schema.schemaType : schema.isSystemSchema ? 'system' : 'business';

interface AppListItemProps {
  schema: FormSchema;
  index: number;
  viewMode: AppViewMode;
  onOpen: (schema: FormSchema) => void;
  query: string;
}

const AppListItem: React.FC<AppListItemProps> = ({
  schema,
  index,
  viewMode,
  onOpen,
  query,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const animationDelay = Math.min(
    index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
    UI_PARAMS.CARD_INDEX_DELAY.MAX,
  );

  const schemaType = getSchemaType(schema);
  const isSystemSchema = schemaType === 'system';

  const isGrid = viewMode === 'grid';
  const isRtl =
    typeof language === 'string' &&
    ['ar', 'fa', 'he', 'ur'].some((rtlCode) => language.toLowerCase().startsWith(rtlCode));

  if (isGrid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
        whileHover={{
          scale: 1.015,
          transition: { type: 'spring', stiffness: 380, damping: 26 },
        }}
      >
        <Card className="group relative flex h-full flex-col overflow-hidden border border-violet-100/70 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40">
          <div
            className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.18) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
          <CardHeader className="relative z-10 flex-1 space-y-2 px-4 pb-2 pt-4 bg-transparent">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  {schema.icon && (
                    <IconRenderer
                      iconName={schema.icon}
                      className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300"
                    />
                  )}
                  <CardTitle className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                    {renderHighlightedText(
                      getSchemaTranslatedPluralName(schema, language, schema.plural_name ?? schema.singular_name ?? schema.id ?? ''),
                      query,
                      'bg-violet-100/70 text-violet-900 rounded px-0.5 dark:bg-violet-500/30 dark:text-violet-50'
                    )}
                  </CardTitle>
                </div>
                {(schema.description || schema.description_translations?.length) && (
                  <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    {renderHighlightedText(
                      getSchemaTranslatedDescription(schema, language, schema.description ?? ''),
                      query,
                      'bg-amber-100/70 text-amber-900 rounded px-0.5 dark:bg-amber-500/30 dark:text-amber-50'
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 flex items-center justify-between gap-3 px-4 pb-4 pt-0 bg-transparent border-0 !border-0 border-t-0">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <Badge
                variant="outline"
                className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100/70 hover:text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/30 dark:hover:text-violet-50"
              >
                {getT(TRANSLATION_KEYS.BADGE_APP, language, defaultLang)}
              </Badge>
              {isSystemSchema && (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/70 hover:text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/30 dark:hover:text-amber-50"
                >
                  {getT(TRANSLATION_KEYS.BADGE_SYSTEM, language, defaultLang)}
                </Badge>
              )}
            </div>
            <Button
              size="icon"
              className="h-8 w-8 rounded-full border border-violet-200/70 bg-white/80 text-violet-600 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md group-hover:-translate-y-0.5 dark:border-violet-500/50 dark:bg-gray-900/80 dark:text-violet-200 dark:hover:bg-violet-500/10"
              onClick={(e) => {
                // Middle-click (button === 1) or Ctrl/Cmd+click opens in new tab
                if (e.button === 1 || e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  window.open(`/page/${schema.id}`, '_blank', 'noopener,noreferrer');
                } else {
                  onOpen(schema);
                }
              }}
              onMouseDown={(e) => {
                // Handle middle-click (button === 1)
                if (e.button === 1) {
                  e.preventDefault();
                  window.open(`/page/${schema.id}`, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              {isRtl ? (
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // List view
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.99 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
      whileHover={{
        scale: 1.01,
        transition: { type: 'spring', stiffness: 380, damping: 26 },
      }}
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-violet-100/70 bg-gradient-to-r from-violet-50/70 via-white to-indigo-50/60 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.18) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="relative z-10 flex flex-1 items-center gap-3">
        {schema.icon && (
          <IconRenderer
            iconName={schema.icon}
            className="h-8 w-8 shrink-0 text-violet-600 dark:text-violet-300"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {renderHighlightedText(
                getSchemaTranslatedPluralName(schema, language, schema.plural_name ?? schema.singular_name ?? schema.id ?? ''),
                query,
                'bg-violet-100/70 text-violet-900 rounded px-0.5 dark:bg-violet-500/30 dark:text-violet-50'
              )}
            </h3>
            {isSystemSchema && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/70 hover:text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/30 dark:hover:text-amber-50"
              >
                {getT(TRANSLATION_KEYS.BADGE_SYSTEM, language, defaultLang)}
              </Badge>
            )}
          </div>
          {(schema.description || schema.description_translations?.length) && (
            <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
              {renderHighlightedText(
                getSchemaTranslatedDescription(schema, language, schema.description ?? ''),
                query,
                'bg-amber-100/70 text-amber-900 rounded px-0.5 dark:bg-amber-500/30 dark:text-amber-50'
              )}
            </p>
          )}
        </div>
      </div>
      <Button
        size="icon"
        className="relative z-10 h-8 w-8 rounded-full border border-violet-200/70 bg-white/80 text-violet-600 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md group-hover:-translate-y-0.5 dark:border-violet-500/50 dark:bg-gray-900/80 dark:text-violet-200 dark:hover:bg-violet-500/10"
        onClick={(e) => {
          // Middle-click (button === 1) or Ctrl/Cmd+click opens in new tab
          if (e.button === 1 || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            window.open(`/page/${schema.id}`, '_blank', 'noopener,noreferrer');
          } else {
            onOpen(schema);
          }
        }}
        onMouseDown={(e) => {
          // Handle middle-click (button === 1)
          if (e.button === 1) {
            e.preventDefault();
            window.open(`/page/${schema.id}`, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        {isRtl ? (
          <ChevronLeft className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </Button>
    </motion.div>
  );
};

// Skeleton component for grid view
const AppCardSkeleton: React.FC<{ index: number }> = ({ index }) => {
  const animationDelay = Math.min(
    index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
    UI_PARAMS.CARD_INDEX_DELAY.MAX,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
    >
      <Card className="group relative flex h-full flex-col overflow-hidden border border-violet-100/70 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/60 shadow-sm dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40">
        <CardHeader className="relative z-10 flex-1 space-y-2 px-4 pb-2 pt-4 bg-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="space-y-1.5 mt-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 flex items-center justify-between gap-3 px-4 pb-4 pt-0 bg-transparent border-0 !border-0 border-t-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Skeleton component for list view
const AppListSkeleton: React.FC<{ index: number }> = ({ index }) => {
  const animationDelay = Math.min(
    index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
    UI_PARAMS.CARD_INDEX_DELAY.MAX,
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.99 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-violet-100/70 bg-gradient-to-r from-violet-50/70 via-white to-indigo-50/60 p-4 shadow-sm dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40"
    >
      <div className="relative z-10 flex flex-1 items-center gap-3">
        <Skeleton className="h-8 w-8 rounded shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-3 w-64 mt-1" />
        </div>
      </div>
      <Skeleton className="relative z-10 h-8 w-8 rounded-full" />
    </motion.div>
  );
};

export function AppListWrapper() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const language = useLanguageStore((state) => state.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const tenantId = useTenantStore((state) => state.getTenantId());
  const selectedTenant = useTenantStore((state) => state.selectedTenant);
  // Check if tenant name is "local" - if so, show all apps
  const isLocalTenant = React.useMemo(() => {
    return Boolean(selectedTenant?.name?.toLowerCase() === 'local');
  }, [selectedTenant?.name]);
  const [isMounted, setIsMounted] = useState(false);
  
  // Ensure component is mounted before enabling the query
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { schemas, isLoading, error, refetch } = useSchemas({ 
    summary: true,
    enabled: isMounted,
    // Don't pass tenantIds when tenant is "local" to show all apps
    tenantIds: isLocalTenant ? undefined : (tenantId ? String(tenantId) : undefined),
    // Pass special callerName when tenant is "local" to skip tenant/company filtering
    callerName: isLocalTenant ? 'AppListWrapperLocal' : 'AppListWrapper',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<AppViewMode>('grid');
  const [refreshing, setRefreshing] = useState(false);

  // Get user display info for UserWelcome (same logic as UserProfileSelector: support name/lastname and API variants by language)
  const displayNameFields = user ? getDisplayNameFields(user as unknown as Record<string, unknown>) : { name: undefined, lastname: undefined };
  const userFirstName = user ? resolveLocalizedField(displayNameFields.name, language, 'en') : '';
  const welcomeName = userFirstName.trim() || user?.email || getT(TRANSLATION_KEYS.WELCOME_NAME_FALLBACK, language, defaultLang);
  const userDisplayName = welcomeName;
  const userInitials = (() => {
    const source = (typeof userDisplayName === 'string' ? userDisplayName : '').trim() || 'GR';
    return source
      .split(' ')
      .map((word) => word[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase();
  })();

  const apps = useMemo(
    () =>
      (schemas || [])
        .filter(
          (schema) =>
            schema.showInNavigation !== false &&
            !schema.inactive &&
            // Do not show system schemas in Apps list
            getSchemaType(schema) !== 'system'
        )
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [schemas],
  );

  const filteredApps = useMemo(() => {
    const query = (typeof searchQuery === 'string' ? searchQuery : '').trim().toLowerCase();
    if (!query) return apps;

    return apps.filter((schema) => {
      const pluralName = schema.plural_name?.toLowerCase() || '';
      const singularName = schema.singular_name?.toLowerCase() || '';
      const schemaId = schema.id?.toLowerCase() || '';
      return (
        pluralName.includes(query) ||
        singularName.includes(query) ||
        schemaId.includes(query)
      );
    });
  }, [apps, searchQuery]);

  const handleOpenApp = (schema: FormSchema) => {
    router.push(`/page/${schema.id}`);
  };

  const handleRefresh = async () => {
    if (!isMounted) return;
    try {
      setRefreshing(true);
      const result = await refetch();
      if (result.error) {
        console.error('Failed to refresh apps:', result.error);
      }
    } catch (error) {
      console.error('Error refreshing apps:', error);
    } finally {
      if (isMounted) {
        setRefreshing(false);
      }
    }
  };

  const hasApps = filteredApps.length > 0;

  useSetLayoutProps({
    title: getT(TRANSLATION_KEYS.TITLE_APPS, language, defaultLang),
    icon: 'Grid2X2',
    subtitle: (
      <span className="flex items-center gap-1">
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {getT(TRANSLATION_KEYS.SUBTITLE_APPS_LAUNCH, language, defaultLang)}
        </span>
      </span>
    ),
  });

  return (
      <div className="space-y-6">
        {/* User Welcome Section */}
        <UserWelcome
          userName={userDisplayName}
          avatar={user?.avatar}
          initials={userInitials}
          welcomeTitle={getT(TRANSLATION_KEYS.WELCOME_BACK_TITLE, language, defaultLang).replace('{name}', userDisplayName)}
          welcomeSubtitle={getT(TRANSLATION_KEYS.SUBTITLE_APPS_BROWSE, language, defaultLang)}
          welcomeBadges={
            isMounted
              ? [
                  {
                    label: `📱 ${getT(TRANSLATION_KEYS.APPS_AVAILABLE_BADGE, language, defaultLang).replace('{count}', String(apps.length))}`,
                    color: 'violet',
                  },
                  {
                    label: `🚀 ${getT(TRANSLATION_KEYS.BADGE_LAUNCH_ONE_CLICK, language, defaultLang)}`,
                    color: 'emerald',
                  },
                  {
                    label: `⚡ ${getT(TRANSLATION_KEYS.BADGE_REALTIME_ANALYTICS, language, defaultLang)}`,
                    color: 'indigo',
                  },
                ]
              : [
                  { label: `📱 ${getT(TRANSLATION_KEYS.TITLE_APPS, language, defaultLang)}`, color: 'violet' },
                  {
                    label: `🚀 ${getT(TRANSLATION_KEYS.BADGE_LAUNCH_ONE_CLICK, language, defaultLang)}`,
                    color: 'emerald',
                  },
                  {
                    label: `⚡ ${getT(TRANSLATION_KEYS.BADGE_REALTIME_ANALYTICS, language, defaultLang)}`,
                    color: 'indigo',
                  },
                ]
          }
          welcomeGradient="violet"
          welcomeShowPattern={true}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <IconBox
              name="AppWindow"
              variant="squircle"
              color="violet"
              size="sm"
              iconClassName="h-5 w-5"
              className="hidden shrink-0 sm:flex"
            />
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {getT(TRANSLATION_KEYS.APPS_COUNT_AVAILABLE, language, defaultLang).replace('{count}', String(apps.length))}
              </p>
              <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                {getT(TRANSLATION_KEYS.APPS_SEARCH_HINT, language, defaultLang)}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 shrink-0 flex-row flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <div className="flex h-8 shrink-0 items-center rounded-xl bg-gray-50 shadow-sm dark:bg-gray-700 sm:h-9">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-full w-10 p-0 rounded-xl',
                  viewMode === 'list'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                    : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-600'
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-full w-10 p-0 rounded-xl',
                  viewMode === 'grid'
                    ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-600'
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-full min-w-0 shrink-0 sm:w-40 md:w-52">
              <SearchBar
                placeholder={getT(TRANSLATION_KEYS.PLACEHOLDER_SEARCH_APPS, language, defaultLang)}
                value={searchQuery}
                onChange={setSearchQuery}
                className="h-8 w-full sm:h-9"
              />
            </div>
            <Button
              variant="square"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || refreshing}
              className="h-8 shrink-0 sm:h-9"
              title="Refresh apps"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            viewMode === 'grid' ? (
              <motion.div
                key="apps-loading-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <AppCardSkeleton key={index} index={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="apps-loading-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-3"
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <AppListSkeleton key={index} index={index} />
                ))}
              </motion.div>
            )
          ) : hasApps ? (
            viewMode === 'grid' ? (
              <motion.div
                key={`apps-grid-${searchQuery}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredApps.map((schema, index) => (
                  <AppListItem
                    key={schema.id}
                    schema={schema}
                    index={index}
                    viewMode="grid"
                    onOpen={handleOpenApp}
                    query={searchQuery}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`apps-list-${searchQuery}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-3"
              >
                {filteredApps.map((schema, index) => (
                  <AppListItem
                    key={schema.id}
                    schema={schema}
                    index={index}
                    viewMode="list"
                    onOpen={handleOpenApp}
                    query={searchQuery}
                  />
                ))}
              </motion.div>
            )
          ) : (
            <motion.div
              key="apps-empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 py-16 text-center dark:border-gray-700 dark:bg-gray-900/60"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-200">
                <AppWindow className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {getT(TRANSLATION_KEYS.EMPTY_NO_APPS_FOUND, language, defaultLang)}
              </h3>
              <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? getT(TRANSLATION_KEYS.EMPTY_APPS_TRY_ADJUSTING, language, defaultLang)
                  : getT(TRANSLATION_KEYS.EMPTY_APPS_SCHEMAS_MARKED, language, defaultLang)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}

AppListWrapper.displayName = 'AppListWrapper';


