'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DynamicQueryTableProps, Schema } from '../types';
import { useDynamicQueryData } from '../hooks';
import { FlatTableRenderer } from './FlatTableRenderer';
import { NestedTableRenderer } from './NestedTableRenderer';
import { SchemaNotFound } from '@/gradian-ui/schema-manager/components';
import { AccessDenied } from '@/gradian-ui/schema-manager/components';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { cn } from '@/gradian-ui/shared/utils';
import { FlatTableSkeleton } from './FlatTableSkeleton';
import { NestedTableSkeleton } from './NestedTableSkeleton';

export function DynamicQueryTable({
  dynamicQueryId,
  flatten: controlledFlatten = false,
  showFlattenSwitch = true,
  onFlattenChange,
  showIds: controlledShowIds = false,
  onShowIdsChange,
  queryParams,
  highlightQuery,
  onRefreshReady,
  expandAllTrigger,
  onExpandAllReady,
  flattenedSchemas,
  onStatusChange,
  dynamicQueryActions,
  onEditEntity,
}: DynamicQueryTableProps) {
  const BackIcon = useBackIcon();
  const [internalFlatten, setInternalFlatten] = useState(controlledFlatten);
  const [internalShowIds, setInternalShowIds] = useState(controlledShowIds);
  const [refreshing, setRefreshing] = useState(false);

  // Use controlled or internal state
  const flatten = onFlattenChange !== undefined ? controlledFlatten : internalFlatten;
  const setFlatten = onFlattenChange || setInternalFlatten;
  const showIds = onShowIdsChange !== undefined ? controlledShowIds : internalShowIds;
  const setShowIds = onShowIdsChange || setInternalShowIds;

  const { loading, error, statusCode, responseData, refetch } = useDynamicQueryData(dynamicQueryId, flatten, queryParams);

  // Expose status to parent component
  React.useEffect(() => {
    if (onStatusChange) {
      const isSuccess = !loading && !error && statusCode === 200 && !!responseData?.data;
      onStatusChange(isSuccess, statusCode, loading, error);
    }
  }, [onStatusChange, loading, error, statusCode, responseData]);

  // Expose refresh function to parent component
  React.useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(async () => {
        setRefreshing(true);
        try {
          await refetch();
        } finally {
          setRefreshing(false);
        }
      });
    }
  }, [onRefreshReady, refetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (loading) {
    return (
      <div className="w-full">
        {flatten ? (
          <FlatTableSkeleton 
            schemaCount={3}
            columnCountPerSchema={4}
            rowCount={5}
            showIds={showIds}
          />
        ) : (
          <NestedTableSkeleton 
            columnCount={5}
            rowCount={5}
            showIds={showIds}
          />
        )}
      </div>
    );
  }

  // Handle 404 - Not Found
  if (statusCode === 404) {
    return (
      <SchemaNotFound
        title="Dynamic Query Not Found"
        description={`The dynamic query "${dynamicQueryId}" doesn't exist or hasn't been configured yet.`}
        helperText="Need this query? Contact your system administrator to configure the dynamic query."
        showGoBackButton={true}
        showHomeButton={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        errorCodeText="Dynamic Query Not Found"
      />
    );
  }

  // Handle 403 - Forbidden/Access Denied
  if (statusCode === 403) {
    return (
      <AccessDenied
        title="Access Denied"
        description={error || "You don't have permission to access this dynamic query."}
        helperText="If you believe you should have access, please contact your system administrator."
        showGoBackButton={true}
        showHomeButton={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    );
  }

  // Handle other errors
  if (error) {
    // Extract status code from error message if present
    const statusCodeMatch = error.match(/(\d{3})/);
    const extractedStatusCode = statusCodeMatch ? parseInt(statusCodeMatch[1]) : (statusCode || undefined);
    const isServerError = extractedStatusCode && extractedStatusCode >= 500;
    const isClientError = extractedStatusCode && extractedStatusCode >= 400 && extractedStatusCode < 500;
    
    // Clean up error message
    let errorMessage = error;
    if (errorMessage.includes('fetch failed')) {
      errorMessage = 'Failed to connect to the server';
    }
    
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <Card className="p-8 md:p-12">
            <div className="flex flex-col items-center text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full blur-md opacity-50" />
                <div className="relative bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 p-8 rounded-full w-32 h-32 flex items-center justify-center">
                  <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400" strokeWidth={1.5} />
                </div>
              </motion.div>

              <div className="space-y-3">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100"
                >
                  {isServerError ? 'Server Error' : isClientError ? 'Request Failed' : 'Error Occurred'}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg text-gray-600 dark:text-gray-300 max-w-md"
                >
                  {errorMessage}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={cn(
                  "border rounded-lg p-4 max-w-md",
                  isServerError 
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/50"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50"
                )}
              >
                <p className={cn(
                  "text-sm",
                  isServerError 
                    ? "text-red-800 dark:text-red-300"
                    : "text-amber-800 dark:text-amber-300"
                )}>
                  <strong>
                    {isServerError 
                      ? 'Server Issue:' 
                      : isClientError 
                        ? 'Request Issue:' 
                        : 'What happened?'}
                  </strong>{' '}
                  {isServerError 
                    ? 'The server encountered an error while processing your request. Please try again later or contact support if the problem persists.'
                    : isClientError
                      ? 'There was an issue with your request. Please check your input and try again.'
                      : 'An unexpected error occurred. Please try refreshing the page.'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 pt-4 flex-wrap"
              >
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>{refreshing ? 'Refreshing...' : 'Try Again'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2"
                >
                  <BackIcon className="h-4 w-4" />
                  <span>{getT(TRANSLATION_KEYS.BUTTON_GO_BACK)}</span>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="pt-8 border-t border-gray-200 dark:border-gray-700 w-full"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {extractedStatusCode && `Error Code: ${extractedStatusCode} | `}
                  {error}
                </p>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!responseData?.data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">No data available</div>
      </div>
    );
  }

  const { data } = responseData;
  const schemas: Schema[] = data.schemas || [];

  return (
    <div className="w-full space-y-4">
      {flatten ? (
        <FlatTableRenderer 
          data={data} 
          schemas={schemas} 
          showFlattenSwitch={showFlattenSwitch} 
          flatten={flatten} 
          onFlattenChange={setFlatten} 
          showIds={showIds}
          onShowIdsChange={setShowIds}
          highlightQuery={highlightQuery}
          dynamicQueryActions={dynamicQueryActions}
          dynamicQueryId={dynamicQueryId}
          onEditEntity={onEditEntity}
        />
      ) : (
        <NestedTableRenderer 
          data={data} 
          schemas={schemas} 
          showFlattenSwitch={showFlattenSwitch} 
          flatten={flatten} 
          onFlattenChange={setFlatten}
          highlightQuery={highlightQuery}
          expandAllTrigger={expandAllTrigger}
          onExpandAllReady={onExpandAllReady}
          showIds={showIds}
          flattenedSchemas={flattenedSchemas}
          dynamicQueryActions={dynamicQueryActions}
          dynamicQueryId={dynamicQueryId}
          onEditEntity={onEditEntity}
        />
      )}
    </div>
  );
}

DynamicQueryTable.displayName = 'DynamicQueryTable';

