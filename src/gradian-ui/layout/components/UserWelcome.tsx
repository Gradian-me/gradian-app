'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { WelcomeCard, WelcomeCardProps } from './WelcomeCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface UserWelcomeProps {
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomeBadges?: WelcomeCardProps['badges'];
  welcomeGradient?: WelcomeCardProps['gradient'];
  welcomeShowPattern?: boolean;
  userName: string;
  avatar?: string;
  initials?: string;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const UserWelcome: React.FC<UserWelcomeProps> = ({
  welcomeTitle,
  welcomeSubtitle = "Here's what's happening with your business today.",
  welcomeBadges,
  welcomeGradient = 'violet',
  welcomeShowPattern = true,
  userName,
  avatar,
  initials,
  errorMessage,
  onClearError,
}) => {
  return (
    <>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-12"
      >
        <WelcomeCard
          userName={userName}
          avatar={avatar}
          initials={initials}
          title={welcomeTitle}
          subtitle={welcomeSubtitle}
          badges={
            welcomeBadges || [
              {
                label: '📱 Apps Available for you',
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
            ]
          }
          gradient={welcomeGradient}
          showPattern={welcomeShowPattern}
        />
      </motion.div>

      {/* Error Display */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Error:</span>
                <span>{errorMessage}</span>
              </div>
              {onClearError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearError}
                  className="mt-2"
                >
                  Dismiss
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
};


