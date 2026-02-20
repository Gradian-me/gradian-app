/**
 * Welcome Card Component
 * Displays a personalized welcome message with user avatar and badges
 */

'use client';

import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type TailwindColor = 
  | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
  | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky'
  | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia'
  | 'pink' | 'rose';

const gradientClasses: Record<string, string> = {
  // Grays
  slate: 'from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/30 dark:via-gray-950/30 dark:to-zinc-950/30 border-slate-200/50 dark:border-slate-800/50',
  gray: 'from-gray-50 via-slate-50 to-neutral-50 dark:from-gray-950/30 dark:via-slate-950/30 dark:to-neutral-950/30 border-gray-200/50 dark:border-gray-800/50',
  zinc: 'from-zinc-50 via-gray-50 to-slate-50 dark:from-zinc-950/30 dark:via-gray-950/30 dark:to-slate-950/30 border-zinc-200/50 dark:border-zinc-800/50',
  neutral: 'from-neutral-50 via-gray-50 to-slate-50 dark:from-neutral-950/30 dark:via-gray-950/30 dark:to-neutral-950/30 border-neutral-200/50 dark:border-neutral-800/50',
  stone: 'from-stone-50 via-neutral-50 to-gray-50 dark:from-stone-950/30 dark:via-neutral-950/30 dark:to-gray-950/30 border-stone-200/50 dark:border-stone-800/50',
  // Reds
  red: 'from-red-50 via-rose-50 to-pink-50 dark:from-red-950/30 dark:via-rose-950/30 dark:to-pink-950/30 border-red-200/50 dark:border-red-800/50',
  rose: 'from-rose-50 via-red-50 to-pink-50 dark:from-rose-950/30 dark:via-red-950/30 dark:to-pink-950/30 border-rose-200/50 dark:border-rose-800/50',
  // Oranges
  orange: 'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 border-orange-200/50 dark:border-orange-800/50',
  amber: 'from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/50',
  yellow: 'from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/30 dark:via-amber-950/30 dark:to-orange-950/30 border-yellow-200/50 dark:border-yellow-800/50',
  // Greens
  lime: 'from-lime-50 via-green-50 to-emerald-50 dark:from-lime-950/30 dark:via-green-950/30 dark:to-emerald-950/30 border-lime-200/50 dark:border-lime-800/50',
  green: 'from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border-green-200/50 dark:border-green-800/50',
  emerald: 'from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/30 dark:to-teal-950/30 border-emerald-200/50 dark:border-emerald-800/50',
  // Teals
  teal: 'from-teal-50 via-cyan-50 to-sky-50 dark:from-teal-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-teal-200/50 dark:border-teal-800/50',
  cyan: 'from-cyan-50 via-teal-50 to-sky-50 dark:from-cyan-950/30 dark:via-teal-950/30 dark:to-sky-950/30 border-cyan-200/50 dark:border-cyan-800/50',
  sky: 'from-sky-50 via-cyan-50 to-blue-50 dark:from-sky-950/30 dark:via-cyan-950/30 dark:to-blue-950/30 border-sky-200/50 dark:border-sky-800/50',
  // Blues
  blue: 'from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-blue-200/50 dark:border-blue-800/50',
  indigo: 'from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-purple-950/30 border-indigo-200/50 dark:border-indigo-800/50',
  // Purples
  violet: 'from-violet-200/90 via-purple-100/85 to-indigo-100/85 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border-violet-200/50 dark:border-violet-800/50',
  purple: 'from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-rose-950/30 border-purple-200/50 dark:border-purple-800/50',
  fuchsia: 'from-fuchsia-50 via-pink-50 to-purple-50 dark:from-fuchsia-950/30 dark:via-pink-950/30 dark:to-purple-950/30 border-fuchsia-200/50 dark:border-fuchsia-800/50',
  pink: 'from-pink-50 via-rose-50 to-fuchsia-50 dark:from-pink-950/30 dark:via-rose-950/30 dark:to-fuchsia-950/30 border-pink-200/50 dark:border-pink-800/50',
};

export interface WelcomeBadge {
  label: string;
  color?: TailwindColor;
  className?: string;
}

export interface WelcomeCardProps {
  /**
   * User's display name
   */
  userName: string;
  
  /**
   * User's avatar URL (optional)
   */
  avatar?: string;
  
  /**
   * User's initials for fallback (optional, auto-generated from userName if not provided)
   */
  initials?: string;
  
  /**
   * Welcome message title (optional, defaults to "Welcome back, dear {userName}")
   */
  title?: string;
  
  /**
   * Subtitle/description text
   */
  subtitle?: string;
  
  /**
   * Array of badges to display
   */
  badges?: WelcomeBadge[];
  
  /**
   * Gradient color scheme
   */
  gradient?: TailwindColor;
  
  /**
   * Show decorative pattern overlay
   */
  showPattern?: boolean;
  
  /**
   * Additional className
   */
  className?: string;
}

const getInitials = (name: string): string => {
  const safeName = typeof name === 'string' ? name : '';
  if (!safeName) return 'A';
  
  const words = safeName.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return 'A';
  
  if (words.length === 1) {
    // Single word: take first two characters
    return words[0].substring(0, 2).toUpperCase();
  }
  
  if (words.length === 2) {
    // Two words: take first letter of each
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  // More than 2 words: first letter of first two words + first letter of last word
  return (words[0][0] + words[1][0] + words[words.length - 1][0]).toUpperCase();
};

const getBadgeColorClasses = (color: TailwindColor = 'violet'): string => {
  const colorMap: Record<string, string> = {
    violet:
      'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-500/15 dark:text-violet-100 dark:border-violet-500/40 dark:hover:bg-violet-500/25',
    emerald:
      'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-500/40 dark:hover:bg-emerald-500/25',
    indigo:
      'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-100 dark:border-indigo-500/40 dark:hover:bg-indigo-500/25',
    blue:
      'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/15 dark:text-blue-100 dark:border-blue-500/40 dark:hover:bg-blue-500/25',
    green:
      'bg-green-50 text-green-700 border border-green-100 dark:bg-green-500/15 dark:text-green-100 dark:border-green-500/40 dark:hover:bg-green-500/25',
    red:
      'bg-red-50 text-red-700 border border-red-100 dark:bg-red-500/15 dark:text-red-100 dark:border-red-500/40 dark:hover:bg-red-500/25',
    orange:
      'bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-500/15 dark:text-orange-100 dark:border-orange-500/40 dark:hover:bg-orange-500/25',
    amber:
      'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-500/40 dark:hover:bg-amber-500/25',
    yellow:
      'bg-yellow-50 text-yellow-700 border border-yellow-100 dark:bg-yellow-500/15 dark:text-yellow-100 dark:border-yellow-500/40 dark:hover:bg-yellow-500/25',
    pink:
      'bg-pink-50 text-pink-700 border border-pink-100 dark:bg-pink-500/15 dark:text-pink-100 dark:border-pink-500/40 dark:hover:bg-pink-500/25',
    purple:
      'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-500/15 dark:text-purple-100 dark:border-purple-500/40 dark:hover:bg-purple-500/25',
  };
  return colorMap[color] || colorMap.violet;
};

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  userName,
  avatar,
  initials,
  title,
  subtitle,
  badges = [],
  gradient = 'violet',
  showPattern = true,
  className,
}) => {
  const userInitials = initials || getInitials(userName);
  const displayTitle = title || `Welcome back, ${userName}`;
  const gradientClass = gradientClasses[gradient] || gradientClasses['violet'];
  const borderClass = gradientClass.split(' ').find(cls => cls.startsWith('border-')) || 'border-violet-200/50 dark:border-violet-800/50';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-linear-to-br border shadow-sm p-8',
        gradientClass,
        className
      )}
    >
      {/* Decorative background pattern */}
      {showPattern && (
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      )}

      <div className="relative">
        <div className="flex flex-row flex-nowrap gap-4 items-center sm:gap-6 mb-6">
          <Avatar className="h-20 w-20 border-4 border-violet-100 dark:border-violet-500/40 shadow-lg">
            {avatar ? (
              <AvatarImage src={avatar} alt={userName} />
            ) : null}
            <AvatarFallback className="text-2xl bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {displayTitle}
            </h2>
            {subtitle && (
              <p className="text-md md:text-lg text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={cn(
                  'text-sm px-3 py-1 shadow-sm',
                  getBadgeColorClasses(badge.color),
                  badge.className
                )}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

WelcomeCard.displayName = 'WelcomeCard';

