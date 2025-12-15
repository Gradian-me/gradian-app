// Sidebar Utilities

import {
  LayoutDashboard,
  Home,
  CalendarDays,
  BarChart3,
  ShieldCheck,
  Plug,
  Network,
  Brackets,
  Wrench,
  Sparkles,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { NavigationItem } from '../types';
import { AD_MODE } from '@/gradian-ui/shared/constants/application-variables';

/**
 * Map menu icon string from menu-items schema to Lucide icon component
 */
const iconMap: Record<string, LucideIcon> = {
  Home,
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  ShieldCheck,
  Plug,
  Network,
  Brackets,
  Wrench,
  Sparkles,
  MessageCircle,
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

  const filtered = menuItems
    // Preserve a stable index-based ordering independent of updatedAt
    .map((item, idx) => ({ ...item, __sortIndex: item.sortIndex ?? idx }))
    .filter((item) => {
      if (!AD_MODE) return true;
      return !item.hideInAD;
    })
    .filter((item) => {
      // If no company is selected (or "All Companies" is selected), show all items
      if (companyId === null || companyId === undefined) {
        return true;
      }
      
      const companies = item.companies;
      // If item has no company restrictions, it's visible for all companies
      if (!companies || !Array.isArray(companies) || companies.length === 0) {
        return true;
      }
      
      // Item has company restrictions - check if selected company matches
      // Normalize both IDs to strings for comparison
      const normalizedCompanyId = String(companyId);
      const matches = companies.some((c: any) => {
        if (!c || c.id === null || c.id === undefined) return false;
        return String(c.id) === normalizedCompanyId;
      });
      
      // Debug logging for Integrations menu item
      if (item.menuTitle === 'Integrations' || item.menuUrl === '/integrations') {
        console.log('[Menu Filter] Integrations item:', {
          menuTitle: item.menuTitle,
          companyId,
          normalizedCompanyId,
          companies: companies.map((c: any) => ({ id: c?.id, label: c?.label })),
          matches,
        });
      }
      
      return matches;
    })
    .sort((a, b) => {
      const aIdx = Number.isFinite(a.__sortIndex) ? a.__sortIndex : 0;
      const bIdx = Number.isFinite(b.__sortIndex) ? b.__sortIndex : 0;
      return aIdx - bIdx;
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

  // Debug logging
  console.log('[Menu Filter] Results:', {
    totalItems: menuItems.length,
    filteredCount: filtered.length,
    companyId,
    items: filtered.map((item: any) => ({
      title: item.menuTitle,
      url: item.menuUrl,
      companies: item.companies?.map((c: any) => c?.id) || [],
    })),
  });

  return filtered;
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

