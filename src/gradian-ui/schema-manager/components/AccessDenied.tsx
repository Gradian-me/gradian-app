'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldX, ArrowLeft, Home, RefreshCw, Loader2, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { AccessCheckResult } from '@/gradian-ui/shared/utils/access-control';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  helperText?: string;
  onGoBack?: () => void;
  showGoBackButton?: boolean;
  homeHref?: string;
  showHomeButton?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  accessCheck?: AccessCheckResult;
}

export function AccessDenied({
  title = 'Access Denied',
  description = "You don't have permission to access this resource.",
  helperText = 'If you believe you should have access, please contact your system administrator.',
  onGoBack,
  showGoBackButton = true,
  homeHref = '/apps',
  showHomeButton = true,
  onRefresh,
  refreshing = false,
  accessCheck,
}: AccessDeniedProps) {
  // Use accessCheck to enhance the message if provided
  const finalTitle = accessCheck?.code === 'UNAUTHORIZED' ? 'Authentication Required' : title;
  const finalDescription = accessCheck?.reason || description;
  const finalHelperText = accessCheck?.requiredRole 
    ? `This resource requires the "${accessCheck.requiredRole}" role. ${helperText}`
    : helperText;
  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.history.back();
    }
  };

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
              <div className="absolute inset-0 bg-red-100 rounded-full blur-md opacity-50" />
              <div className="relative bg-gradient-to-br from-red-50 to-red-50 p-8 rounded-full w-32 h-32 flex items-center justify-center">
                <ShieldX className="h-16 w-16 text-red-600" strokeWidth={1.5} />
              </div>
            </motion.div>

            <div className="space-y-3">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100"
              >
                {finalTitle}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-600 dark:text-gray-300 max-w-md"
              >
                {finalDescription}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md"
            >
              <p className="text-sm text-red-800">
                <strong>Need access?</strong> {finalHelperText}
              </p>
            </motion.div>

            {(showGoBackButton || showHomeButton || onRefresh) && (
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
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Go Back</span>
                  </Button>
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
              className="pt-8 border-t border-gray-200 w-full"
            >
              <p className="text-xs text-gray-500 dark:text-gray-300">
                Error Code: 403 | {accessCheck?.code || 'Access Denied'}
                {accessCheck?.schemaId && ` | Schema: ${accessCheck.schemaId}`}
                {accessCheck?.dataId && ` | Data: ${accessCheck.dataId}`}
              </p>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

