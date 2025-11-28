// Sidebar Utilities

import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  Truck, 
  Calendar, 
  BarChart3, 
  Database, 
  Settings,
  Bell,
  User,
  Folder,
  LucideIcon,
  PencilRuler,
  Sparkles,
  Share2,
} from 'lucide-react';
import { NavigationItem } from '../types';

/**
 * Default navigation items for the sidebar
 */
export const defaultNavigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Tender Calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Integrations',
    href: '/integrations',
    icon: Database,
  },
  {
    name: 'Graph Designer',
    href: '/builder/graphs',
    icon: Share2,
  },
  {
    name: 'Builder',
    href: '/builder',
    icon: PencilRuler,
  },
  {
    name: 'AI Builder',
    href: '/ai-builder',
    icon: Sparkles,
  }
];

/**
 * Get initials from a name
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
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
  return pathname.startsWith(item.href);
};

