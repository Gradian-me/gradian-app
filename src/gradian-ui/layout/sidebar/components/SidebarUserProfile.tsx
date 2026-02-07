'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarUserProfileProps } from '../types';
import { getInitials } from '../utils';
import { cn } from '../../../shared/utils';

const defaultUser = {
  name: 'Mahyar Abidi',
  role: 'Director of Data Analytics',
  department: 'Data Analytics',
  avatar: '/avatars/mahyar.jpg',
  initials: 'MA',
};

export const SidebarUserProfile: React.FC<SidebarUserProfileProps> = ({
  user = defaultUser,
  isCollapsed,
  isMobile,
  className,
}) => {
  const displayUser = user || defaultUser;
  const initials = displayUser.initials || getInitials(displayUser.name);

  return (
    <div className={cn("p-4 border-t border-gray-700", className)}>
      <AnimatePresence mode="wait">
        {(!isCollapsed || isMobile) ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {displayUser.name}
              </p>
              {displayUser.role && (
                <p className="text-xs text-gray-400 truncate">
                  {displayUser.role}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex justify-center"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

SidebarUserProfile.displayName = 'SidebarUserProfile';

