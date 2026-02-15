'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLanguageStore } from '@/stores/language.store';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSingleValueByRole, getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { getInitials } from '@/gradian-ui/form-builder/form-elements/utils/avatar-utils';
import { getPrimaryDisplayString } from './value-display';

/**
 * Color map for avatar styling
 * Provides consistent color classes across all avatar implementations
 */
export const AVATAR_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-500/15',
    text: 'text-violet-700 dark:text-violet-100',
    border: 'border-violet-100 dark:border-violet-500/40',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-100',
    border: 'border-emerald-100 dark:border-emerald-500/40',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/15',
    text: 'text-indigo-700 dark:text-indigo-100',
    border: 'border-indigo-100 dark:border-indigo-500/40',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-100',
    border: 'border-blue-100 dark:border-blue-500/40',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-500/15',
    text: 'text-green-700 dark:text-green-100',
    border: 'border-green-100 dark:border-green-500/40',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-100',
    border: 'border-red-100 dark:border-red-500/40',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-500/15',
    text: 'text-orange-700 dark:text-orange-100',
    border: 'border-orange-100 dark:border-orange-500/40',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-100',
    border: 'border-amber-100 dark:border-amber-500/40',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-500/15',
    text: 'text-yellow-700 dark:text-yellow-100',
    border: 'border-yellow-100 dark:border-yellow-500/40',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-500/15',
    text: 'text-pink-700 dark:text-pink-100',
    border: 'border-pink-100 dark:border-pink-500/40',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-100',
    border: 'border-purple-100 dark:border-purple-500/40',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-500/15',
    text: 'text-teal-700 dark:text-teal-100',
    border: 'border-teal-100 dark:border-teal-500/40',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-500/15',
    text: 'text-cyan-700 dark:text-cyan-100',
    border: 'border-cyan-100 dark:border-cyan-500/40',
  },
  stone: {
    bg: 'bg-stone-50 dark:bg-stone-500/15',
    text: 'text-stone-700 dark:text-stone-100',
    border: 'border-stone-100 dark:border-stone-500/40',
  },
  neutral: {
    bg: 'bg-neutral-50 dark:bg-neutral-500/15',
    text: 'text-neutral-700 dark:text-neutral-100',
    border: 'border-neutral-100 dark:border-neutral-500/40',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-500/15',
    text: 'text-gray-700 dark:text-gray-100',
    border: 'border-gray-100 dark:border-gray-500/40',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-100',
    border: 'border-slate-100 dark:border-slate-500/40',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-100',
    border: 'border-rose-100 dark:border-rose-500/40',
  },
  fuchsia: {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/15',
    text: 'text-fuchsia-700 dark:text-fuchsia-100',
    border: 'border-fuchsia-100 dark:border-fuchsia-500/40',
  },
  lime: {
    bg: 'bg-lime-50 dark:bg-lime-500/15',
    text: 'text-lime-700 dark:text-lime-100',
    border: 'border-lime-100 dark:border-lime-500/40',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-100',
    border: 'border-sky-100 dark:border-sky-500/40',
  },
  zinc: {
    bg: 'bg-zinc-50 dark:bg-zinc-500/15',
    text: 'text-zinc-700 dark:text-zinc-100',
    border: 'border-zinc-100 dark:border-zinc-500/40',
  },
};

/**
 * Get avatar color classes based on color name
 * @param color - Color name (e.g., 'violet', 'emerald')
 * @param defaultColor - Default color if color not found (default: 'violet')
 * @returns Object with bg, text, and border class names
 */
export function getAvatarColorClasses(
  color?: string | null,
  defaultColor: string = 'violet'
): { bg: string; text: string; border: string } {
  if (!color) return AVATAR_COLOR_MAP[defaultColor];
  
  const normalizedColor = typeof color === 'string' ? color.toLowerCase() : defaultColor;
  return AVATAR_COLOR_MAP[normalizedColor] || AVATAR_COLOR_MAP[defaultColor];
}

/**
 * Resolved avatar data from schema and entity
 */
export interface ResolvedAvatarData {
  avatarLabel: string | null;
  iconValue: string | null;
  colorValue: string | null;
  hasAvatarField: boolean;
  hasIconField: boolean;
  hasColorField: boolean;
  shouldShowAvatar: boolean;
  shouldShowIconAvatar: boolean;
}

/**
 * Resolve avatar, icon, and color data from schema and entity
 * @param schema - Form schema
 * @param data - Entity data
 * @returns Resolved avatar data
 */
export function resolveAvatarData(
  schema: FormSchema | null | undefined,
  data: any
): ResolvedAvatarData {
  if (!schema || !data) {
    return {
      avatarLabel: null,
      iconValue: null,
      colorValue: null,
      hasAvatarField: false,
      hasIconField: false,
      hasColorField: false,
      shouldShowAvatar: false,
      shouldShowIconAvatar: false,
    };
  }

  // Check if fields exist in schema
  const hasAvatarField = schema?.fields?.some((f: any) => f.role === 'avatar') || false;
  const hasIconField = schema?.fields?.some((f: any) => f.role === 'icon') || false;
  const hasColorField = schema?.fields?.some((f: any) => f.role === 'color') || false;

  // Resolve avatar label
  const avatarValue = getSingleValueByRole(schema, data, 'avatar') || null;
  const titleValue = getValueByRole(schema, data, 'title') || data?.name || data?.title || null;
  const avatarLabel = avatarValue || titleValue || null;

  // Resolve icon value
  const iconFieldValue = getSingleValueByRole(schema, data, 'icon') ?? data?.icon ?? null;
  const normalizedIconValue = iconFieldValue
    ? (getPrimaryDisplayString(iconFieldValue) ?? 
       (typeof iconFieldValue === 'string' ? iconFieldValue : String(iconFieldValue)))
    : null;

  // Resolve color value
  const rawColorValue = getSingleValueByRole(schema, data, 'color') ?? data?.color ?? null;
  const resolvedColorId = typeof rawColorValue === 'string' ? rawColorValue.toLowerCase() : null;

  // Determine what to show
  const shouldShowAvatar = hasAvatarField && Boolean(avatarLabel);
  const shouldShowIconAvatar = !shouldShowAvatar && hasIconField && Boolean(normalizedIconValue);

  return {
    avatarLabel,
    iconValue: normalizedIconValue,
    colorValue: resolvedColorId,
    hasAvatarField,
    hasIconField,
    hasColorField,
    shouldShowAvatar,
    shouldShowIconAvatar,
  };
}

/**
 * Props for RoleBasedAvatar component
 */
export interface RoleBasedAvatarProps {
  schema: FormSchema | null | undefined;
  data: any;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  showShadow?: boolean;
  defaultColor?: string;
}

/**
 * Size mapping for avatar dimensions
 */
const AVATAR_SIZE_MAP: Record<string, { container: string; icon: string }> = {
  xs: { container: 'h-6 w-6', icon: 'h-3 w-3' },
  sm: { container: 'h-8 w-8', icon: 'h-3 w-3' },
  md: { container: 'h-10 w-10', icon: 'h-4 w-4' },
  lg: { container: 'h-12 w-12', icon: 'h-5 w-5' },
  xl: { container: 'h-14 w-14', icon: 'h-5 w-5' },
};

/**
 * RoleBasedAvatar Component
 * A reusable avatar component that automatically handles avatar, icon, and color roles
 * from schema and data, rendering the appropriate avatar type with proper styling.
 */
export const RoleBasedAvatar: React.FC<RoleBasedAvatarProps> = ({
  schema,
  data,
  size = 'md',
  className,
  showBorder = true,
  showShadow = true,
  defaultColor = 'violet',
}) => {
  const language = useLanguageStore((s) => s.language) ?? 'en';
  const resolved = resolveAvatarData(schema, data);
  const avatarColor = getAvatarColorClasses(resolved.colorValue, defaultColor);
  const sizeClasses = AVATAR_SIZE_MAP[size] || AVATAR_SIZE_MAP.md;
  const initials = resolved.avatarLabel ? getInitials(resolved.avatarLabel, language) : 'A';

  // Render avatar with initials
  if (resolved.shouldShowAvatar) {
    return (
      <Avatar
        className={cn(
          sizeClasses.container,
          'rounded-full flex items-center justify-center font-semibold',
          avatarColor.bg,
          avatarColor.text,
          showBorder && avatarColor.border,
          showShadow && 'shadow-sm',
          showBorder && 'border',
          className
        )}
      >
        <AvatarFallback
          className={cn(
            sizeClasses.container,
            'rounded-full flex items-center justify-center',
            avatarColor.bg,
            avatarColor.text,
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Render icon avatar
  if (resolved.shouldShowIconAvatar && resolved.iconValue) {
    return (
      <div
        className={cn(
          sizeClasses.container,
          'rounded-full flex items-center justify-center',
          avatarColor.bg,
          showBorder && avatarColor.border,
          showShadow && 'shadow-sm',
          showBorder && 'border',
          className
        )}
      >
        <IconRenderer
          iconName={resolved.iconValue}
          className={cn(sizeClasses.icon, avatarColor.text)}
        />
      </div>
    );
  }

  // Fallback: render avatar with initials
  return (
    <Avatar
      className={cn(
        sizeClasses.container,
        'rounded-full flex items-center justify-center font-semibold',
        avatarColor.bg,
        avatarColor.text,
        showBorder && avatarColor.border,
        showShadow && 'shadow-sm',
        showBorder && 'border',
        className
      )}
    >
      <AvatarFallback
        className={cn(
          sizeClasses.container,
          'rounded-full flex items-center justify-center',
          avatarColor.bg,
          avatarColor.text,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

RoleBasedAvatar.displayName = 'RoleBasedAvatar';

