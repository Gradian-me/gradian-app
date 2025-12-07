'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../card';
import { Badge } from '../../../components/ui/badge';
import { CardSection, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '../../shared/utils';
import { 
  getValueByRole, 
  getInitials, 
  getBadgeConfig, 
  findStatusFieldOptions,
  getAvatarContent,
  renderRatingStars,
  renderSection as renderSectionContent,
  getStatusColor
} from '../utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import type { BadgeOption } from '../../form-builder/form-elements/utils/badge-utils';

interface DynamicCardProps {
  data: any;
  metadata: {
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
  formSchema?: FormSchema;
  onClick?: (data: any) => void;
  onHover?: (isHovering: boolean) => void;
  className?: string;
  index?: number;
  animationDelay?: number;
}

export const DynamicCard: React.FC<DynamicCardProps> = ({
  data,
  metadata,
  formSchema,
  onClick,
  onHover,
  className,
  index = 0,
  animationDelay = 0.1
}) => {
  // Get status field options from schema
  const statusOptions = findStatusFieldOptions(formSchema);
  
  // Get status color with metadata colorMap support
  const getStatusColorLocal = (status: string): "default" | "secondary" | "outline" | "destructive" | "gradient" | "success" | "warning" | "info" => {
    const color = metadata.status?.colorMap?.[status] || getStatusColor(status, statusOptions);
    return color as "default" | "secondary" | "outline" | "destructive" | "gradient" | "success" | "warning" | "info";
  };

  const cardConfig = {
    id: metadata.id,
    name: metadata.name,
    title: formSchema ? getValueByRole(formSchema, data, 'title') : data.name || 'Unknown',
    subtitle: formSchema ? getValueByRole(formSchema, data, 'subtitle') : '',
    description: formSchema ? getValueByRole(formSchema, data, 'description') : '',
    styling: metadata.styling || { variant: 'default', size: 'md' },
    behavior: metadata.behavior || { clickable: true, hoverable: true },
    layout: { direction: 'vertical' as const }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(data);
    }
  };

  const handleHover = (isHovering: boolean) => {
    if (onHover) {
      onHover(isHovering);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: metadata.animations?.duration || 0.3, delay: index * (metadata.animations?.delay || 0.1) }}
    >
      <Card
        config={cardConfig}
        onClick={handleClick}
        onHover={handleHover}
        className={cn("h-full", className)}
      >
        <div className="w-full">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {formSchema && getAvatarContent({
              metadata,
              formSchema,
              data,
              getInitials
            })}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {cardConfig.title}
              </h3>
              {cardConfig.subtitle && (
                <p className="text-sm text-gray-500">
                  {cardConfig.subtitle}
                </p>
              )}
              {metadata.rating && (
                <div className="flex items-center space-x-1 mt-1">
                  {renderRatingStars({ 
                    rating: Number(getValueByRole(formSchema || {} as any, data, 'rating') || '0') || 0,
                    maxRating: metadata.rating?.maxRating || 5
                  })}
                  {metadata.rating?.showValue && (
                    <span className="text-sm text-gray-500 ms-1">
                      {(Number(getValueByRole(formSchema || {} as any, data, 'rating') || '0') || 0).toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {metadata.status && (() => {
            const statusValue = getValueByRole(formSchema || {} as any, data, 'status') || 'PENDING';
            const badgeConfig = getBadgeConfig(statusValue, statusOptions);
            return (
              <Badge variant={badgeConfig.color} className="flex items-center gap-1">
                {badgeConfig.icon && <IconRenderer iconName={badgeConfig.icon} className="h-3 w-3" />}
                {badgeConfig.label}
              </Badge>
            );
          })()}
        </div>

        {/* Content Sections */}
        <div className="space-y-4 w-full">
          {metadata.sections?.map((section) => (
            <div key={section.id} className="w-full">
              {formSchema && renderSectionContent({ section, formSchema, data })}
            </div>
          ))}
        </div>
        </div>
      </Card>
    </motion.div>
  );
};

DynamicCard.displayName = 'DynamicCard';
