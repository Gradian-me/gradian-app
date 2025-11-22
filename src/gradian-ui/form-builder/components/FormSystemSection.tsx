// Form System Section Component

import React from 'react';
import { FormSchema, FormData } from '@/gradian-ui/schema-manager/types/form-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '../../shared/utils';

export interface FormSystemSectionProps {
  schema: FormSchema;
  values: FormData;
  onChange: (fieldName: string, value: any) => void;
  onBlur: (fieldName: string) => void;
  disabled?: boolean;
}

export const FormSystemSection: React.FC<FormSystemSectionProps> = ({
  schema,
  values,
  onChange,
  onBlur,
  disabled = false,
}) => {
  // Check if System Section should be shown
  const shouldShow = schema.allowDataInactive === true || schema.allowDataForce === true;

  if (!shouldShow) {
    return null;
  }

  const inactiveValue = values.inactive === true;
  const forceValue = values.force === true;
  const forceReasonValue = values.forceReason || '';

  return (
    <Card className={cn(
      'border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30',
      'overflow-visible'
    )}>
      <CardHeader className="pb-4 px-6 pt-4">
        <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
          System Section
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 overflow-visible">
        <div className="space-y-4">
          <div className="flex flex-row items-center gap-6">
            {schema.allowDataInactive && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={inactiveValue}
                  onCheckedChange={(checked) => onChange('inactive', checked)}
                  disabled={disabled}
                  id="system-inactive"
                />
                <Label 
                  htmlFor="system-inactive"
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Inactive
                </Label>
              </div>
            )}
            
            {schema.allowDataForce && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={forceValue}
                  onCheckedChange={(checked) => onChange('force', checked)}
                  disabled={disabled}
                  id="system-force"
                />
                <Label 
                  htmlFor="system-force"
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Force
                </Label>
              </div>
            )}
          </div>
          
          {schema.allowDataForce && forceValue && (
            <div className="space-y-2">
              <Label 
                htmlFor="system-force-reason"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Force Reason
              </Label>
              <Textarea
                id="system-force-reason"
                name="forceReason"
                value={forceReasonValue}
                onChange={(e) => onChange('forceReason', e.target.value)}
                onBlur={() => onBlur('forceReason')}
                placeholder="Enter the reason for forcing this record..."
                rows={3}
                disabled={disabled}
                className="w-full"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

FormSystemSection.displayName = 'FormSystemSection';

