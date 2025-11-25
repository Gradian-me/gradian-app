'use client';

import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { GridBuilder } from '../../layout/grid-builder';
import { LoadingSkeleton, LoadingSpinner } from '../../layout/components';
import { DynamicCard } from './DynamicCard';
import { CardSection, FormSchema, ListMetadata } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '../../shared/utils';

interface DynamicListProps {
  data: any[];
  cardMetadata: {
    id: string;
    name: string;
    title?: string;
    subtitle?: string;
    description?: string;
    avatar?: {
      field?: string;
      fallback?: string;
      imagePath?: string;
    };
    status?: {
      field?: string;
      colorMap?: Record<string, string>;
    };
    rating?: {
      field?: string;
      maxRating?: number;
      showValue?: boolean;
    };
    sections?: CardSection[];
    styling?: {
      variant?: 'default' | 'minimal' | 'elevated' | 'outlined' | 'filled';
      size?: 'sm' | 'md' | 'lg' | 'xl';
      rounded?: boolean;
      shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    };
    behavior?: {
      clickable?: boolean;
      hoverable?: boolean;
    };
    animations?: {
      stagger?: boolean;
      duration?: number;
      delay?: number;
    };
  };
  listMetadata: ListMetadata;
  formSchema?: FormSchema;
  isLoading?: boolean;
  error?: string | null;
  onItemClick?: (item: any) => void;
  onItemHover?: (isHovering: boolean, item: any) => void;
  className?: string;
}

export const DynamicList: React.FC<DynamicListProps> = ({
  data,
  cardMetadata,
  listMetadata,
  formSchema,
  isLoading = false,
  error = null,
  onItemClick,
  onItemHover,
  className
}) => {
  // Get Lucide icon component by name
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-12 w-12 text-gray-400 mx-auto mb-4" /> : null;
  };

  // Loading state
  if (isLoading) {
    if (listMetadata.loadingState?.skeleton) {
      const columns = listMetadata.layout.columns || { default: 1, sm: 2, md: 3, lg: 4 };
      const gap = listMetadata.layout.gap || 6;
      return (
        <LoadingSkeleton
          variant="card"
          count={listMetadata.loadingState.count || 8}
          columns={columns}
          gap={gap}
          className={className}
        />
      );
    }

    return (
      <LoadingSpinner centered containerClassName="h-64" />
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <LucideIcons.AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">Error loading data</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    const emptyState = listMetadata.emptyState;
    if (!emptyState) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: listMetadata.animations?.duration || 0.3 }}
        className="text-center py-12"
      >
        {getIcon(emptyState.icon)}
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">{emptyState.title}</h3>
        <p className="text-gray-500 mb-4">
          {emptyState.description}
        </p>
      </motion.div>
    );
  }

  // Render items
  const renderItems = () => {
    return data
      .filter(item => item && item.id)
      .map((item, index) => (
        <DynamicCard
          key={item.id}
          data={item}
          metadata={cardMetadata}
          formSchema={formSchema}
          onClick={onItemClick}
          onHover={(isHovering) => onItemHover?.(isHovering, item)}
          index={index}
          animationDelay={listMetadata.animations?.delay || 0.1}
        />
      ));
  };

  // Grid layout
  if (listMetadata.layout.type === 'grid') {
    return (
      <div className={cn("space-y-6", className)}>
        <GridBuilder config={{
          id: listMetadata.id,
          name: listMetadata.name,
          columns: listMetadata.layout.columns || { default: 1, sm: 2, md: 3, lg: 4 },
          gap: listMetadata.layout.gap || 6,
          responsive: true
        }}>
          {renderItems()}
        </GridBuilder>
      </div>
    );
  }

  // List layout
  return (
    <div className={cn("space-y-4", className)}>
      {renderItems()}
    </div>
  );
};

DynamicList.displayName = 'DynamicList';
