/**
 * Response Card Viewer Component
 * Displays clickable cards based on AI response and responseCards configuration
 */

'use client';

import React, { useMemo } from 'react';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';
import type { ResponseCardConfig } from '../types';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

interface ResponseCardViewerProps {
  response: string;
  responseCards: ResponseCardConfig[];
  onCardClick: (cardData: { id: string; label: string; icon?: string }, schemaData: any) => void;
}

/**
 * Simple JSON path parser
 * Supports:
 * - $ for root
 * - $[0] for array items
 * - $.field for nested properties
 * - $[0].field for nested properties in array items
 */
function getValueByPath(obj: any, path: string): any {
  if (!path || path === '$') {
    return obj;
  }

  // Remove leading $ and . if present
  const normalizedPath = path.replace(/^\$\.?/, '');
  
  if (!normalizedPath) {
    return obj;
  }

  // Handle array notation like [0] or [0].field
  const arrayMatch = normalizedPath.match(/^\[(\d+)\](.*)$/);
  if (arrayMatch) {
    const index = parseInt(arrayMatch[1], 10);
    const rest = arrayMatch[2].replace(/^\./, '');
    if (Array.isArray(obj) && obj[index] !== undefined) {
      return rest ? getValueByPath(obj[index], `$.${rest}`) : obj[index];
    }
    return undefined;
  }

  // Handle dot notation
  const parts = normalizedPath.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    // Handle array notation in the middle
    const arrayPartMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayPartMatch) {
      const key = arrayPartMatch[1];
      const index = parseInt(arrayPartMatch[2], 10);
      current = current[key];
      if (Array.isArray(current) && current[index] !== undefined) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  
  return current;
}

/**
 * Extract cards from response based on configuration
 */
function extractCards(response: string, config: ResponseCardConfig[]): Array<{
  id: string;
  label: string;
  icon?: string;
  schemaData: any;
}> {
  if (!response || !config || config.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(response);
    const cards: Array<{
      id: string;
      label: string;
      icon?: string;
      schemaData: any;
    }> = [];

    // Use the first config (can be extended later to support multiple configs)
    const cardConfig = config[0];

    // Handle array responses
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        // For array items, use the item directly and remove $ prefix from paths
        const idPath = cardConfig.idPath.replace(/^\$\.?/, '');
        const labelPath = cardConfig.labelPath.replace(/^\$\.?/, '');
        const iconPath = cardConfig.iconPath.replace(/^\$\.?/, '');
        const schemaPath = cardConfig.schemaPath.replace(/^\$\.?/, '');

        const id = idPath ? getValueByPath(item, `$.${idPath}`) : item.id || item;
        const label = labelPath ? getValueByPath(item, `$.${labelPath}`) : item.label || item.singular_name || item.name;
        const icon = iconPath ? getValueByPath(item, `$.${iconPath}`) : item.icon;
        const schemaData = schemaPath ? getValueByPath(item, `$.${schemaPath}`) : item;

        if (id && label && schemaData) {
          cards.push({
            id: String(id),
            label: String(label),
            icon: icon ? String(icon) : undefined,
            schemaData,
          });
        }
      });
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Handle single object response
      const id = getValueByPath(parsed, cardConfig.idPath);
      const label = getValueByPath(parsed, cardConfig.labelPath);
      const icon = getValueByPath(parsed, cardConfig.iconPath);
      const schemaData = getValueByPath(parsed, cardConfig.schemaPath);

      if (id && label && schemaData) {
        cards.push({
          id: String(id),
          label: String(label),
          icon: icon ? String(icon) : undefined,
          schemaData,
        });
      }
    }

    return cards;
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'error', `Error parsing response for cards: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

export function ResponseCardViewer({
  response,
  responseCards,
  onCardClick,
}: ResponseCardViewerProps) {
  const cards = useMemo(() => {
    if (!response || !responseCards || responseCards.length === 0) {
      return [];
    }
    return extractCards(response, responseCards);
  }, [response, responseCards]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Generated Schemas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onCardClick(card, card.schemaData)}
            className={cn(
              'relative overflow-hidden rounded-xl',
              'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50',
              'dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30',
              'border border-violet-200/50 dark:border-violet-800/50',
              'shadow-sm hover:shadow-md',
              'transition-all duration-200',
              'text-left p-5',
              'hover:scale-[1.02] hover:border-violet-300 dark:hover:border-violet-700',
              'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2'
            )}
          >
            <div className="flex items-start gap-3">
              {card.icon && (
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50 shrink-0">
                  <IconRenderer
                    iconName={card.icon}
                    className="h-5 w-5 text-violet-600 dark:text-violet-400"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {card.label}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Click to preview
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

