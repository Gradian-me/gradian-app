'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { KPIListProps, KPIListItem } from '../types';
import { CircularProgress } from './CircularProgress';
import { cn } from '@/lib/utils';
import { IconRenderer, getIconComponent } from '@/gradian-ui/shared/utils/icon-renderer';

// Helper to get color-based border and background classes
const getColorClasses = (color?: string) => {
  if (!color) return 'border-gray-200 dark:border-gray-800';
  
  const colorMap: Record<string, string> = {
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40',
    red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40',
    violet: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40',
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40',
    indigo: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40',
    green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40',
    emerald: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
    orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40',
    amber: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
    yellow: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/40',
    pink: 'border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/40',
    rose: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
  };
  
  return colorMap[color.toLowerCase()] || 'border-gray-200 dark:border-gray-800';
};

// Helper to get status badge variant
const getStatusBadgeVariant = (statusColor?: string): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' => {
  if (!statusColor) return 'default';
  
  const color = statusColor.toLowerCase();
  if (color === 'red' || color === 'destructive') return 'destructive';
  if (color === 'green' || color === 'emerald' || color === 'success') return 'success';
  if (color === 'yellow' || color === 'amber' || color === 'warning') return 'warning';
  if (color === 'blue' || color === 'info') return 'info';
  
  return 'default';
};

// Helper to check if URL is external
const isExternalUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
};

const KPIListItemComponent = ({ 
  item, 
  index 
}: { 
  item: KPIListItem; 
  index: number;
}) => {
  const colorClasses = getColorClasses(item.color);
  const statusIcon = item.status?.icon;
  
  // Render status icon - support both LucideIcon component and string icon name
  const renderStatusIcon = () => {
    if (!statusIcon) return null;
    
    if (typeof statusIcon === 'string') {
      return <IconRenderer iconName={statusIcon} className="h-3 w-3" />;
    }
    
    // statusIcon is a LucideIcon component
    const StatusIconComponent = statusIcon;
    return <StatusIconComponent className="h-3 w-3" />;
  };
  
  const itemContent = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        colorClasses,
        item.url && 'cursor-pointer hover:shadow-sm',
        !item.url && 'hover:bg-gray-50 dark:hover:bg-gray-900 dark:bg-gray-900'
      )}
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </h4>
        {item.subtitle && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
            {item.subtitle}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2 ms-3 flex-shrink-0">
        {item.status && (
          <Badge
            variant={getStatusBadgeVariant(item.status.color)}
            className="text-xs flex items-center gap-1"
          >
            {renderStatusIcon()}
            {item.status.label}
          </Badge>
        )}
        
        {item.progress !== undefined && (
          <CircularProgress
            progress={item.progress}
            size={40}
            strokeWidth={4}
            color={item.color}
          />
        )}
      </div>
    </motion.div>
  );

  if (item.url) {
    if (isExternalUrl(item.url)) {
      return (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {itemContent}
        </a>
      );
    }
    
    return (
      <Link href={item.url} className="block">
        {itemContent}
      </Link>
    );
  }

  return itemContent;
};

export function KPIList({
  title,
  subtitle,
  icon,
  items,
  className,
}: KPIListProps) {
  // Render header icon - support both LucideIcon component and string icon name
  const renderHeaderIcon = () => {
    if (typeof icon === 'string') {
      return <IconRenderer iconName={icon} className="h-5 w-5" />;
    }
    
    // icon is a LucideIcon component
    const IconComponent = icon;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {renderHeaderIcon()}
            <span>{title}</span>
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length > 0 ? (
            items.map((item, index) => (
              <KPIListItemComponent
                key={`${item.title}-${index}`}
                item={item}
                index={index}
              />
            ))
          ) : (
            <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
              No items to display
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

