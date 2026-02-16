// Repeating Section Component

import React from 'react';
import { RepeatingSectionProps } from '@/gradian-ui/schema-manager/types/form-schema';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getSectionTranslatedDescription } from '@/gradian-ui/schema-manager/utils/schema-utils';

export const RepeatingSection: React.FC<RepeatingSectionProps> = ({
  section,
  items,
  onAdd,
  onRemove,
  renderItem,
  values,
  errors,
  touched,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
}) => {
  const { title, repeatingConfig } = section;
  const {
    minItems = 0,
    maxItems,
    itemTitle = (index: number) => `${title} ${index + 1}`,
  } = repeatingConfig || {};

  const canAdd = !maxItems || items.length < maxItems;
  const canRemove = items.length > minItems;
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const noItemsAddedYet = getT(TRANSLATION_KEYS.EMPTY_NO_ITEMS_ADDED_YET, language, defaultLang);

  // Get section-level error
  const sectionError = errors?.[section.id];
  const headerSectionMessage = sectionError;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-start gap-2">
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
            {items.length}
          </span>
          {headerSectionMessage && (
            <span className="text-xs text-red-600 mt-0.5" role="alert">
              • {headerSectionMessage}
            </span>
          )}
        </div>
        {(section.description || section.descriptionTranslations?.length) && (
          <p className="text-xs text-gray-600 mt-1">{getSectionTranslatedDescription(section, language, section.description ?? '')}</p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p>{noItemsAddedYet}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={item.id || `item-${index}`} className="border border-gray-200 rounded-lg shadow-sm">
              <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-900">
                    {itemTitle(index + 1)}
                  </CardTitle>
                  {canRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(index)}
                      disabled={disabled}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {renderItem(item, index)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onAdd}
            disabled={disabled}
            className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 me-2" />
            Add {title}
          </Button>
        </div>
      )}
    </div>
  );
};

RepeatingSection.displayName = 'RepeatingSection';
