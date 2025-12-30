'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/gradian-ui/form-builder/form-elements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationGroup } from './NotificationGroup';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationService } from '../services/notification.service';
import { Select, SelectOption } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { 
  Filter, 
  CheckCircle, 
  X, 
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  CheckCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion } from '@/components/ui/accordion';
import { HierarchyExpandCollapseControls } from '@/gradian-ui/data-display/components/HierarchyExpandCollapseControls';

export function NotificationsPage() {
  const {
    notifications,
    groupedNotifications,
    isLoading,
    error,
    filters,
    groupBy,
    unreadCount,
    updateFilters,
    updateGroupBy,
    markAsRead,
    acknowledge,
    markAsUnread,
    markAllAsRead,
    clearFilters
  } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  // Track if we've initialized the accordion
  const hasInitialized = useRef(false);

  // Initialize accordion with all groups open by default when groupedNotifications are loaded
  useEffect(() => {
    if (groupedNotifications.length > 0) {
      const allGroupValues = groupedNotifications.map((group) => `group-${group.category}`);
      // Only initialize once when first loaded
      if (!hasInitialized.current) {
        setAccordionValue(allGroupValues);
        hasInitialized.current = true;
      } else {
        // Update accordion value when groupedNotifications change (add new groups)
        setAccordionValue((prev) => {
          // Keep existing open groups, add new ones
          const existing = prev.filter((v) => allGroupValues.includes(v));
          const newGroups = allGroupValues.filter((v) => !prev.includes(v));
          return newGroups.length > 0 ? [...existing, ...newGroups] : existing;
        });
      }
    }
  }, [groupedNotifications]);

  const handleExpandAll = useCallback(() => {
    if (groupedNotifications.length > 0) {
      const allGroupValues = groupedNotifications.map((group) => `group-${group.category}`);
      setAccordionValue(allGroupValues);
    }
  }, [groupedNotifications]);

  const handleCollapseAll = useCallback(() => {
    setAccordionValue([]);
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    updateFilters({ search: value });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateFilters({ [key]: value === 'all' ? undefined : value });
  };

  const handleReadStatusChange = (value: string) => {
    const boolValue = value === 'all' ? undefined : value === 'read';
    updateFilters({ isRead: boolValue });
  };

  const handleSourceChange = (value: string) => {
    updateFilters({ sourceType: value === 'all' ? undefined : value as 'createdByMe' | 'assignedToMe' });
  };

  const getFilterCounts = () => {
    const counts = {
      all: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      success: 0,
      warning: 0,
      important: 0,
      info: 0,
      needsAcknowledgement: 0
    };

    // Count from all notifications, not just grouped ones
    notifications.forEach(notification => {
      // Count by type (already transformed from 'error' to 'important' in service layer)
      if (notification.type in counts) {
        counts[notification.type as keyof typeof counts]++;
      }
      // Count unread notifications that need acknowledgment
      if (!notification.isRead && notification.interactionType === 'needsAcknowledgement') {
        counts.needsAcknowledgement++;
      }
    });

    return counts;
  };

  const filterCounts = getFilterCounts();

  // Define options for Type filter
  const typeOptions: SelectOption[] = [
    { id: 'all', label: `All Types (${filterCounts.all || 0})` },
    { id: 'success', label: `Success (${filterCounts.success || 0})`, color: 'success', icon: 'CheckCircle' },
    { id: 'info', label: `Info (${filterCounts.info || 0})`, color: 'info', icon: 'Info' },
    { id: 'warning', label: `Warning (${filterCounts.warning || 0})`, color: 'warning', icon: 'AlertTriangle' },
    { id: 'important', label: `Important (${filterCounts.important || 0})`, color: 'destructive', icon: 'XCircle' }
  ];

  // Define options for Category filter
  const categoryOptions: SelectOption[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'quotation', label: 'Quotations' },
    { id: 'purchase_order', label: 'Purchase Orders' },
    { id: 'shipment', label: 'Shipments' },
    { id: 'vendor', label: 'Vendors' },
    { id: 'tender', label: 'Tenders' },
    { id: 'system', label: 'System' }
  ];

  // Define options for Status filter
  const statusOptions: SelectOption[] = [
    { id: 'all', label: 'All Status' },
    { id: 'unread', label: `Unread (${filterCounts.unread || 0})`, color: 'warning' },
    { id: 'read', label: 'Read', color: 'success' }
  ];

  // Define options for Source filter
  const sourceOptions: SelectOption[] = [
    { id: 'all', label: 'All Sources' },
    { id: 'createdByMe', label: 'Created by Me' },
    { id: 'assignedToMe', label: 'Assigned to Me' }
  ];

  // Define options for Group By select
  const groupByOptions: SelectOption[] = [
    { id: 'category', label: 'By Category', icon: 'FolderTree' },
    { id: 'type', label: 'By Type', icon: 'Shapes' },
    { id: 'priority', label: 'By Priority', icon: 'Flag' },
    { id: 'status', label: 'By Status', icon: 'ListChecks' }
  ];

  const cardClass = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm';

  return (
    <MainLayout title="Notifications" icon="Bell">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filterCounts.all}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unread</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filterCounts.unread}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCheck className="h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Need Acknowledgement</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filterCounts.needsAcknowledgement || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <X className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Important</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filterCounts.important || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Search & Filter</CardTitle>
                <div className="flex items-center gap-2">
                  <HierarchyExpandCollapseControls
                    onExpandAll={handleExpandAll}
                    onCollapseAll={handleCollapseAll}
                    variant="nobackground"
                    size="sm"
                    expandDisabled={accordionValue.length === groupedNotifications.length}
                    collapseDisabled={accordionValue.length === 0}
                  />
                  {unreadCount > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={markAllAsRead}
                      className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                    >
                      <CheckCircle2 className="h-4 w-4 me-2" />
                      <span className="hidden sm:inline">Mark All Read</span>
                      <span className="sm:hidden">Mark Read</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <Select
                    options={groupByOptions}
                    value={groupBy}
                    onValueChange={(value) => updateGroupBy(value as any)}
                    placeholder="Group by..."
                    config={{ name: 'groupBy', label: '' }}
                    size="sm"
                    className="w-full [&>button]:h-10"
                  />
                </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  className="shrink-0"
                  >
                    <Filter className="h-4 w-4 me-2" />
                    Filters
                  </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4">
              {/* Search */}
              <SearchInput
                config={{ name: 'search', placeholder: 'Search notifications...' }}
                value={searchTerm}
                onChange={(value) => handleSearch(value)}
                onClear={() => handleSearch('')}
              />

              {/* Filters */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800"
                >
                  <Select
                    options={typeOptions}
                    value={filters.type || 'all'}
                    onValueChange={(value) => handleFilterChange('type', value)}
                    placeholder="Select type..."
                    config={{ name: 'type', label: 'Type' }}
                    size="md"
                  />

                  <Select
                    options={categoryOptions}
                    value={filters.category || 'all'}
                    onValueChange={(value) => handleFilterChange('category', value)}
                    placeholder="Select category..."
                    config={{ name: 'category', label: 'Category' }}
                    size="md"
                  />

                  <Select
                    options={statusOptions}
                    value={filters.isRead === undefined ? 'all' : filters.isRead ? 'read' : 'unread'}
                    onValueChange={(value) => handleReadStatusChange(value)}
                    placeholder="Select status..."
                    config={{ name: 'status', label: 'Status' }}
                    size="md"
                  />

                  <Select
                    options={sourceOptions}
                    value={filters.sourceType || 'all'}
                    onValueChange={(value) => handleSourceChange(value)}
                    placeholder="Select source..."
                    config={{ name: 'sourceType', label: 'Source' }}
                    size="md"
                  />
                </motion.div>
              )}

              {/* Active Filters */}
              {(filters.type || filters.category || filters.isRead !== undefined) && (
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
                  {filters.type && (
                    <Badge variant="info" className="text-xs">
                      Type: {NotificationService.getTypeLabel(filters.type)}
                    </Badge>
                  )}
                  {filters.category && (
                    <Badge variant="info" className="text-xs">
                      Category: {NotificationService.getCategoryLabel(filters.category)}
                    </Badge>
                  )}
                  {filters.isRead !== undefined && (
                    <Badge variant="info" className="text-xs">
                      Status: {filters.isRead ? 'Read' : 'Unread'}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading notifications...</p>
          </div>
        ) : error ? (
          <Card className={cardClass}>
            <CardContent className="p-6 text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Notifications</h3>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </CardContent>
          </Card>
        ) : groupedNotifications.length === 0 ? (
          <Card className={cardClass}>
            <CardContent className="p-6 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Notifications Found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion
            type="multiple"
            value={accordionValue}
            onValueChange={setAccordionValue}
            className="space-y-6"
          >
            {groupedNotifications.map((group) => (
              <NotificationGroup
                key={group.category}
                group={group}
                groupBy={groupBy}
                onMarkAsRead={markAsRead}
                onAcknowledge={acknowledge}
                onMarkAsUnread={markAsUnread}
                value={`group-${group.category}`}
              />
            ))}
          </Accordion>
        )}
      </div>
    </MainLayout>
  );
}
