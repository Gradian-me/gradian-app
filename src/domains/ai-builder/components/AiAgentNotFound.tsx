'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Bot, Home, RefreshCw, Loader2, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { Card } from '@/components/ui/card';

interface AiAgentNotFoundProps {
  title?: string;
  description?: string;
  helperText?: string;
  onGoBack?: () => void;
  showGoBackButton?: boolean;
  homeHref?: string;
  showHomeButton?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export function AiAgentNotFound({
  title = 'Agent Not Found',
  description = "The AI agent you're looking for doesn't exist or has been deleted.",
  helperText = 'You can create a new AI agent in the Builder or return to the AI Agents page.',
  onGoBack,
  showGoBackButton = true,
  homeHref = '/builder/ai-agents',
  showHomeButton = true,
  onRefresh,
  refreshing = false,
}: AiAgentNotFoundProps) {
  const BackIcon = useBackIcon();
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
              <div className="absolute inset-0 bg-violet-100 dark:bg-violet-900/30 rounded-full blur-md opacity-50" />
              <div className="relative bg-linear-to-br from-violet-50 to-violet-50 dark:from-violet-950/50 dark:to-violet-950/50 p-8 rounded-full w-32 h-32 flex items-center justify-center">
                <Bot className="h-16 w-16 text-violet-600 dark:text-violet-400" strokeWidth={1.5} />
              </div>
            </motion.div>

            <div className="space-y-3">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100"
              >
                {title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-600 dark:text-gray-300 max-w-md"
              >
                {description}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md"
            >
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Need this agent?</strong> {helperText}
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
                    className="flex items-center gap-2"
                  >
                    <BackIcon className="h-4 w-4" />
                    <span>{getT(TRANSLATION_KEYS.BUTTON_GO_BACK)}</span>
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
              className="pt-8 border-t border-gray-200 dark:border-gray-700 w-full"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">Error Code: 404 | Agent Not Found</p>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

