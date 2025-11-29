'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, List, RefreshCw, GitBranch, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/gradian-ui/form-builder/form-elements';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVersions } from '@/domains/version-management/hooks/useVersions';
import { VersionCard } from '@/domains/version-management/components/VersionCard';
import { VersionList } from '@/domains/version-management/components/VersionList';
import { ChangeType, Priority } from '@/domains/version-management/types';

export default function VersionsPage() {
  const {
    versions,
    loading,
    error,
    filters,
    viewMode,
    setFilters,
    setViewMode,
    refreshVersions,
  } = useVersions();

  const [refreshing, setRefreshing] = React.useState(false);

  // Get unique domains from all versions
  const allDomains = useMemo(() => {
    const domainSet = new Set<string>();
    versions.forEach(version => {
      version.changes.forEach(change => {
        change.affectedDomains.forEach(domain => domainSet.add(domain));
      });
    });
    return Array.from(domainSet).sort();
  }, [versions]);

  const filteredVersions = useMemo(() => {
    // Filtering is done on the server, but we can add client-side filtering here if needed
    return versions;
  }, [versions]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshVersions();
    } finally {
      setRefreshing(false);
    }
  };

  const changeTypeOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'feature', label: 'Feature' },
    { value: 'refactor', label: 'Refactor' },
    { value: 'add', label: 'Add' },
    { value: 'restore', label: 'Restore' },
    { value: 'enhance', label: 'Enhance' },
    { value: 'update', label: 'Update' },
  ];

  const priorityOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
  ];

  const domainOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Domains' },
    ...allDomains.map(domain => ({ value: domain, label: domain })),
  ];

  const sortOptions: { value: string; label: string }[] = [
    { value: 'timestamp', label: 'Date' },
    { value: 'version', label: 'Version' },
  ];

  const sortOrderOptions: { value: string; label: string }[] = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const hasVersions = filteredVersions.length > 0;

  return (
    <MainLayout
      title="App Versions"
      icon="GitBranch"
      subtitle={
        <span className="flex items-center gap-1">
          <span className="font-medium text-gray-800 dark:text-gray-100">
            Track and manage application versions
          </span>
          <span className="hidden text-gray-500 dark:text-gray-400 sm:inline">
            — view changes, priorities, and affected domains.
          </span>
        </span>
      }
    >
      <div className="space-y-6">
        {/* Filters and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 sm:p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-200 sm:flex">
                <GitBranch className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {versions.length} version{versions.length === 1 ? '' : 's'} available
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Search and filter versions by type, priority, or domain.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 p-1 shadow-inner dark:bg-gray-900/80">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className="relative inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-300"
                  aria-label="Grid view"
                >
                  {viewMode === 'grid' && (
                    <motion.span
                      layoutId="versions-view-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-gray-800"
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                  <Grid3X3 className="relative h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="relative inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-300"
                  aria-label="List view"
                >
                  {viewMode === 'list' && (
                    <motion.span
                      layoutId="versions-view-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-gray-800"
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                  <List className="relative h-3.5 w-3.5" />
                </button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="h-8 w-8 shrink-0"
                title="Refresh versions"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="sm:col-span-2">
              <SearchInput
                config={{ name: 'search', placeholder: 'Search versions...' }}
                value={filters.search || ''}
                onChange={(value) => setFilters({ search: value })}
                onClear={() => setFilters({ search: '' })}
                className="[&_input]:h-9"
              />
            </div>
            <Select
              value={filters.changeType || 'all'}
              onValueChange={(value) => setFilters({ changeType: value as ChangeType | 'all' })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Change Type" />
              </SelectTrigger>
              <SelectContent>
                {changeTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) => setFilters({ priority: value as Priority | 'all' })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.domain || 'all'}
              onValueChange={(value) => setFilters({ domain: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                {domainOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select
                value={filters.sortBy || 'timestamp'}
                onValueChange={(value) => setFilters({ sortBy: value as 'timestamp' | 'version' })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.sortOrder || 'desc'}
                onValueChange={(value) => setFilters({ sortOrder: value as 'asc' | 'desc' })}
              >
                <SelectTrigger className="h-9 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOrderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
          >
            {error}
          </motion.div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="versions-loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
                  className="h-64 animate-pulse rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900"
                />
              ))}
            </motion.div>
          ) : hasVersions ? (
            viewMode === 'grid' ? (
              <motion.div
                key={`versions-grid-${filters.search}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredVersions.map((version, index) => (
                  <VersionCard
                    key={version.id}
                    version={version}
                    index={index}
                    query={filters.search || ''}
                    filters={filters}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`versions-list-${filters.search}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-3"
              >
                {filteredVersions.map((version, index) => (
                  <VersionList
                    key={version.id}
                    version={version}
                    index={index}
                    query={filters.search || ''}
                    filters={filters}
                  />
                ))}
              </motion.div>
            )
          ) : (
            <motion.div
              key="versions-empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 py-16 text-center dark:border-gray-700 dark:bg-gray-900/60"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-200">
                <GitBranch className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                No versions found
              </h3>
              <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                {filters.search
                  ? 'Try adjusting your search terms or clearing the filters to see all versions.'
                  : 'Versions will appear here once they are created.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}

