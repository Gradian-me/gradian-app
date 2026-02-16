'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CompanySelector } from './CompanySelector';
import { NotificationsDropdown } from './NotificationsDropdown';
import { UserProfileSelector } from './UserProfileSelector';
import { ENABLE_NOTIFICATION } from '@/gradian-ui/shared/configs/env-config';
import { TestDropdown } from './TestDropdown';
import { useTheme } from 'next-themes';

interface HeaderProps {
  title: string;
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreateClick?: () => void;
}

export function Header({ 
  title, 
  showCreateButton = false, 
  createButtonText = "Create",
  onCreateClick 
}: HeaderProps) {
  const { resolvedTheme } = useTheme();
  const profileTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-2xl font-semibold text-gray-900"
        >
          {title}
        </motion.h1>

        <div className="flex items-center space-x-4">
          {/* Company Selector Component */}
          <CompanySelector />

          {/* User Profile Component */}
          <UserProfileSelector theme={profileTheme} />
          {/* Notifications (after user selector) */}
          {ENABLE_NOTIFICATION && <NotificationsDropdown initialCount={3} />}

          {/* Create Button */}
          {showCreateButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Button 
                onClick={handleCreateClick} 
                className="flex items-center space-x-2"
                aria-label={createButtonText}
                tabIndex={0}
              >
                <Plus className="h-4 w-4" />
                <span>{createButtonText}</span>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
