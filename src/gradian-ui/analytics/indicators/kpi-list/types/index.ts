import { LucideIcon } from 'lucide-react';

export interface KPIListItemStatus {
  id: string;
  label: string;
  icon: LucideIcon | string; // Support both LucideIcon component and string icon name
  color: string;
}

export interface KPIListItem {
  title: string;
  subtitle?: string;
  color?: string; // Tailwind color name: blue, red, violet, purple, etc.
  url?: string; // Optional navigation link
  status?: KPIListItemStatus;
  progress?: number; // 0-100
}

export interface KPIListProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon | string; // Support both LucideIcon component and string icon name
  items: KPIListItem[];
  className?: string;
}

