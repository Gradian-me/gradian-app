'use client';

import { useState, useMemo } from 'react';
import { Property } from '../types';
import { Select, SelectOption } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { filterProperties, groupPropertiesBySchema, formatPropertyPath } from '../utils/property-utils';
import { SearchInput } from '@/gradian-ui/form-builder/form-elements';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPropertyTypeDisplay } from '../utils/property-utils';

interface PropertySelectorProps {
  properties: Property[];
  value: Property | null;
  onChange: (property: Property | null) => void;
  excludePropertyId?: string; // Property to exclude (for property reference)
  error?: string;
  required?: boolean;
}

export function PropertySelector({
  properties,
  value,
  onChange,
  excludePropertyId,
  error,
  required = false,
}: PropertySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter and group properties
  const filteredProperties = useMemo(() => {
    let filtered = filterProperties(properties, searchTerm);
    if (excludePropertyId) {
      filtered = filtered.filter((p) => p.id !== excludePropertyId);
    }
    return filtered;
  }, [properties, searchTerm, excludePropertyId]);

  const groupedProperties = useMemo(
    () => groupPropertiesBySchema(filteredProperties),
    [filteredProperties]
  );

  // Convert to SelectOption format
  const options: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [];
    Object.entries(groupedProperties).forEach(([schemaName, props]) => {
      props.forEach((prop) => {
        opts.push({
          id: prop.id,
          value: prop.id,
          label: formatPropertyPath(prop),
          icon: 'Database',
        });
      });
    });
    return opts;
  }, [groupedProperties]);

  const handleChange = (selectedId: string) => {
    const selected = properties.find((p) => p.id === selectedId);
    onChange(selected || null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Property {required && <span className="text-red-500">*</span>}
      </label>
      <Select
        options={options}
        value={value?.id || ''}
        onValueChange={handleChange}
        placeholder="Select property..."
        config={{ name: 'property', label: '' }}
        error={error}
        size="md"
      />
      {value && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <Badge variant="outline" className="me-2">
            {getPropertyTypeDisplay(value.type)}
          </Badge>
          {value.description && <span>{value.description}</span>}
        </div>
      )}
    </div>
  );
}

