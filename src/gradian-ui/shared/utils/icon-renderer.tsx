import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Text } from 'lucide-react';

export interface IconRendererProps {
  iconName?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const getIconComponent = (iconName?: string): React.ComponentType<any> => {
  if (!iconName) return Text;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || Text;
};

export const isValidLucideIcon = (iconName?: string): boolean => {
  if (!iconName) return false;
  return !!(LucideIcons as any)[iconName];
};

export const IconRenderer: React.FC<IconRendererProps> = ({ iconName, className = "h-4 w-4", style }) => {
  const IconComponent = getIconComponent(iconName);
  return <IconComponent className={className} style={style} />;
};

// Export all Lucide icons for direct access if needed
export * as LucideIconComponents from 'lucide-react';

