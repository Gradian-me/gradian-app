'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AppWindow, Grid3X3, List, RefreshCw, Sparkles } from 'lucide-react';

import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SearchInput } from '@/gradian-ui/form-builder/form-elements';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { useSchemas } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { FormSchema } from '@/gradian-ui/schema-manager/types';
import { UserWelcome } from '@/gradian-ui/layout/components/UserWelcome';
import { useUserStore } from '@/stores/user.store';
import { resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { cn } from '@/gradian-ui/shared/utils';
import { Skeleton } from '@/components/ui/skeleton';

type AppViewMode = 'grid' | 'list';

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
  const animationDelay = Math.min(
    index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
    UI_PARAMS.CARD_INDEX_DELAY.MAX,
  );

  const isGrid = viewMode === 'grid';

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
        <Card className="group relative flex h-full flex-col overflow-hidden border border-violet-100/70 bg-linear-to-br from-violet-50/70 via-white to-indigo-50/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40">
          <div
            className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.18) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
          <CardHeader className="relative z-10 flex-1 space-y-2 px-4 pb-2 pt-4">
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
                      schema.plural_name || schema.singular_name || schema.id,
                      query,
                      'bg-violet-100/70 text-violet-900 rounded px-0.5 dark:bg-violet-500/30 dark:text-violet-50'
                    )}
                  </CardTitle>
                </div>
                {schema.description && (
                  <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    {renderHighlightedText(
                      schema.description,
                      query,
                      'bg-amber-100/70 text-amber-900 rounded px-0.5 dark:bg-amber-500/30 dark:text-amber-50'
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 flex items-center justify-between gap-3 px-4 pb-4 pt-0">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <Badge
                variant="outline"
                className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200"
              >
                App
              </Badge>
              {schema.isSystemSchema && (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  System
                </Badge>
              )}
            </div>
            <Button
              size="icon"
              className="h-8 w-8 rounded-full border border-violet-200/70 bg-white/80 text-violet-600 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md group-hover:-translate-y-0.5 dark:border-violet-500/50 dark:bg-gray-900/80 dark:text-violet-200 dark:hover:bg-violet-500/10"
              onClick={() => onOpen(schema)}
            >
              <Sparkles className="h-3.5 w-3.5" />
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
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-violet-100/70 bg-linear-to-r from-violet-50/70 via-white to-indigo-50/60 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40"
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
                schema.plural_name || schema.singular_name || schema.id,
                query,
                'bg-violet-100/70 text-violet-900 rounded px-0.5 dark:bg-violet-500/30 dark:text-violet-50'
              )}
            </h3>
            {schema.isSystemSchema && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
              >
                System
              </Badge>
            )}
          </div>
          {schema.description && (
            <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
              {renderHighlightedText(
                schema.description,
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
        onClick={() => onOpen(schema)}
      >
        <Sparkles className="h-3.5 w-3.5" />
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
      <Card className="group relative flex h-full flex-col overflow-hidden border border-violet-100/70 bg-linear-to-br from-violet-50/70 via-white to-indigo-50/60 shadow-sm dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40">
        <CardHeader className="relative z-10 flex-1 space-y-2 px-4 pb-2 pt-4">
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
        <CardContent className="relative z-10 flex items-center justify-between gap-3 px-4 pb-4 pt-0">
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
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-violet-100/70 bg-linear-to-r from-violet-50/70 via-white to-indigo-50/60 p-4 shadow-sm dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40"
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
  const language = useLanguageStore((state) => state.language || 'en');
  const [isMounted, setIsMounted] = useState(false);
  
  // Ensure component is mounted before enabling the query
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { schemas, isLoading, refetch } = useSchemas({ 
    summary: true,
    enabled: isMounted 
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<AppViewMode>('grid');
  const [refreshing, setRefreshing] = useState(false);

  // Get user display info for UserWelcome
  const userFirstName = user ? resolveLocalizedField(user.name, language, 'en') : '';
  const userDisplayName = userFirstName || user?.email || 'there';
  const userInitials = (() => {
    const source = userDisplayName?.trim() || 'GR';
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
            !schema.isSystemSchema
        )
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [schemas],
  );

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
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
      await refetch();
    } finally {
      if (isMounted) {
        setRefreshing(false);
      }
    }
  };

  const hasApps = filteredApps.length > 0;

  return (
    <MainLayout
      title="Apps"
      icon="Grid2X2"
      subtitle={
        <span className="flex items-center gap-1">
          <span className="font-medium text-gray-800 dark:text-gray-100">
            Launch your data-driven experiences
          </span>
          <span className="hidden text-gray-500 dark:text-gray-400 sm:inline">
            — browse, search, and open any app.
          </span>
        </span>
      }
    >
      <div className="space-y-6">
        {/* User Welcome Section */}
        <UserWelcome
          userName={userDisplayName}
          avatar={user?.avatar}
          initials={userInitials}
          welcomeSubtitle="Browse and launch your business applications."
          welcomeBadges={[
            {
              label: `📱 ${apps.length} App${apps.length === 1 ? '' : 's'} Available for you`,
              color: 'violet',
            },
            {
              label: '🚀 Launch in One Click',
              color: 'emerald',
            },
            {
              label: '⚡ Real-time Analytics',
              color: 'indigo',
            },
          ]}
          welcomeGradient="violet"
          welcomeShowPattern={true}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
        >
          <div className="flex flex-1 items-center gap-3">
            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-200 sm:flex">
              <AppWindow className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {apps.length} app{apps.length === 1 ? '' : 's'} available
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Type to search, then open an app in a single click.
              </p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchInput
                config={{ name: 'search', placeholder: 'Search Apps' }}
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                className="[&_input]:h-9"
              />
            </div>
            <div className="flex items-center space-x-1 shrink-0 border border-gray-300 dark:border-gray-500 rounded-md h-9">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-full w-10 p-0 rounded-md',
                  viewMode === 'list'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                    : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
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
                  'h-full w-10 p-0 rounded-md',
                  viewMode === 'grid'
                    ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading || refreshing}
              className="h-9 w-9 shrink-0"
              title="Refresh apps"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
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
                No apps found
              </h3>
              <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? 'Try adjusting your search terms or clearing the search box to see all available apps.'
                  : 'Schemas that are marked to show in navigation will appear here as apps you can open.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}

AppListWrapper.displayName = 'AppListWrapper';


