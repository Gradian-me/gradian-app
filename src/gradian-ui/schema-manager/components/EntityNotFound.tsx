'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileX, Home, RefreshCw, Loader2, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { Card } from '@/components/ui/card';

interface EntityNotFoundProps {
  title?: string;
  description?: string;
  entityName?: string;
  entityId?: string;
  helperText?: string;
  onGoBack?: () => void;
  showGoBackButton?: boolean;
  homeHref?: string;
  showHomeButton?: boolean;
  listHref?: string;
  showListButton?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  errorCodeText?: string;
}

export function EntityNotFound({
  title,
  description,
  entityName = 'Entity',
  entityId,
  helperText,
  onGoBack,
  showGoBackButton = true,
  homeHref = '/apps',
  showHomeButton = false,
  listHref,
  showListButton = true,
  onRefresh,
  refreshing = false,
  errorCodeText,
}: EntityNotFoundProps) {
  const BackIcon = useBackIcon();
  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.history.back();
    }
  };

  const defaultTitle = title || `${entityName} Not Found`;
  const defaultDescription = description || 
    (entityId 
      ? `The ${entityName.toLowerCase()} with ID "${entityId}" doesn't exist or has been deleted.`
      : `The ${entityName.toLowerCase()} you're looking for doesn't exist or has been deleted.`);
  const defaultHelperText = helperText || 
    `The ${entityName.toLowerCase()} may have been removed, or you may not have permission to view it.`;

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
                <FileX className="h-16 w-16 text-red-600 dark:text-red-400" strokeWidth={1.5} />
              </div>
            </motion.div>

            <div className="space-y-3">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100"
              >
                {defaultTitle}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-600 dark:text-gray-300 max-w-md"
              >
                {defaultDescription}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 max-w-md"
            >
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>What happened?</strong> {defaultHelperText}
              </p>
            </motion.div>

            {(showGoBackButton || showHomeButton || showListButton || onRefresh) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 pt-4 flex-wrap"
              >
                {showGoBackButton && (
                  <Button
                    onClick={handleGoBack}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <BackIcon className="h-4 w-4" />
                    <span>{getT(TRANSLATION_KEYS.BUTTON_GO_BACK)}</span>
                  </Button>
                )}
                {showListButton && listHref && (
                  <Link href={listHref}>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <BackIcon className="h-4 w-4" />
                      <span>View All {entityName}s</span>
                    </Button>
                  </Link>
                )}
                {onRefresh && (
                  <Button
                    variant="outline"
                    onClick={() => onRefresh()}
                    disabled={refreshing}
                    className="flex items-center space-x-2"
                  >
                    {refreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </Button>
                )}
                {showHomeButton && (
                  <Link href={homeHref}>
                    <Button className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Go to Apps</span>
                    </Button>
                  </Link>
                )}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="pt-8 border-t border-gray-200 dark:border-gray-700 w-full"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Error Code: 404 | {errorCodeText || `${entityName} Not Found`}
              </p>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

