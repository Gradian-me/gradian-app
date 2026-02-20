// Profile Card Component

import React from 'react';
import { Avatar } from '../../form-builder/form-elements';
import { ProfileSection } from '../types';
import { formatProfileFieldValue } from '../utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { cn } from '../../shared/utils';
import { motion } from 'framer-motion';

export interface ProfileCardProps {
  section: ProfileSection;
  className?: string;
  /** Language code for date formatting (uses calendarLocale from language-availables when set). */
  language?: string;
}

const MotionCard = motion(Card);

export const ProfileCard: React.FC<ProfileCardProps> = ({ section, className, language }) => {
  const { title, description, icon, fields, layout } = section;
  
  const gridClasses = cn(
    "grid gap-4",
    layout?.columns === 1 && "grid-cols-1",
    layout?.columns === 2 && "grid-cols-1 md:grid-cols-2",
    layout?.columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    layout?.gap === 2 && "gap-2",
    layout?.gap === 3 && "gap-3",
    layout?.gap === 4 && "gap-4",
    layout?.gap === 6 && "gap-6"
  );

  return (
    <MotionCard
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0.0, 0.2, 1] }}
      whileHover={{ translateY: -4, scale: 1.005 }}
      whileTap={{ scale: 0.997 }}
      className={cn(
        "h-full bg-white border border-gray-200 shadow-sm",
        "dark:bg-gray-900/60 dark:border-gray-700",
        className
      )}
    >
      <CardHeader className="bg-gray-50/50 border-b border-gray-200 pb-4 rounded-t-2xl dark:bg-gray-800/60 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {icon && <IconRenderer iconName={icon} className="h-5 w-5 text-gray-600 dark:text-gray-300" />}
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</CardTitle>
        </div>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-6 dark:bg-transparent">
        <div className={gridClasses}>
          {fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                {field.icon && (
                  <IconRenderer iconName={field.icon} className="h-4 w-4" />
                )}
                {field.label}
              </label>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {formatProfileFieldValue(field, { language })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </MotionCard>
  );
};

ProfileCard.displayName = 'ProfileCard';

