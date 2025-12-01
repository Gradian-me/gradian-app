// Sidebar Utilities

import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Database,
  PencilRuler,
  Sparkles,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { NavigationItem } from '../types';
import { AD_MODE } from '@/gradian-ui/shared/constants/application-variables';

/**
 * Map menu icon string from menu-items schema to Lucide icon component
 */
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Database,
  PencilRuler,
  Sparkles,
  Share2,
};

/**
 * Transform menu-items API data into sidebar NavigationItem[]
 * - Applies AD_MODE filter: if AD_MODE is true, hide items where hideInAD is true.
 * - Applies company filter: if companyId is set, only show items that either have no companies
 *   or include the selected company in their companies field.
 */
export function mapMenuItemsToNavigationItems(
  menuItems: any[],
  companyId?: string | number | null
): NavigationItem[] {
  if (!Array.isArray(menuItems)) return [];

  return menuItems
    .filter((item) => {
      if (!AD_MODE) return true;
      return !item.hideInAD;
    })
    .filter((item) => {
      if (companyId === null || companyId === undefined) return true;
      const companies = item.companies;
      if (!companies || !Array.isArray(companies) || companies.length === 0) {
        // No company restriction, visible for all
        return true;
      }
      // companies is expected to be an array of picker values { id, label, ... }
      return companies.some((c: any) => String(c?.id) === String(companyId));
    })
    .map<NavigationItem>((item) => {
      const iconName: string | undefined = item.menuIcon;
      const Icon = iconName && iconMap[iconName] ? iconMap[iconName] : LayoutDashboard;

      return {
        id: item.id,
        name: item.menuTitle ?? 'Menu Item',
        href: item.menuUrl ?? '/',
        icon: Icon,
      };
    });
}
/**
 * Get initials from a name
 * Maximum 3 characters: first two words + last word if more than 2 words
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return '?';
  
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

/**
 * Check if a navigation item is active based on current pathname
 */
export const isActiveNavigationItem = (
  item: NavigationItem,
  pathname: string
): boolean => {
  if (item.href === '/') {
    return pathname === '/';
  }

  // Builder should only be active on its exact route (/builder), not on nested routes like /builder/graphs
  if (item.href === '/builder') {
    return pathname === '/builder';
  }

  // For other items, treat the item as active for itself and its sub-paths
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
};

