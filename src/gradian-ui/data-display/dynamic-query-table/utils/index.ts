import { TableColumn } from '../../table/types';
import { formatFieldValue } from '../../table/utils/field-formatters';
import { Schema, SchemaField, ColumnGroup, ColumnGroupInfo } from '../types';

/**
 * Utility to map schema fields to TableColumn format
 */
export function createColumnsFromSchema(schema: Schema, highlightQuery?: string): TableColumn[] {
  if (!schema?.fields || !Array.isArray(schema.fields)) {
    return [];
  }

  return schema.fields.map((field) => ({
    id: field.id || field.name,
    label: field.label || field.name,
    accessor: (row: any) => {
      const fieldName = field.name;
      return row?.[fieldName];
    },
    sortable: false,
    align: 'left' as const,
    allowWrap: true,
    field: field,
    render: (value: any, row: any) => {
      return formatFieldValue(field, value, row, true, highlightQuery);
    },
  }));
}

/**
 * Utility to parse flattened data structure
 * Handles format: data.{schemaId}.{index}.{fieldName} or data.{schemaId}.{index}.{childSchemaId}.{index}.data.{index}.{fieldName}
 * Example: "data.inquiries.0.id" -> root level
 * Example: "data.inquiries.2.tenders.0.data.0.id" -> nested level
 * Example: "data.inquiries.2.tenders.0.data.0.tender-items.0.data.0.id" -> deeper nested level
 * 
 * When multiple items exist in arrays (e.g., multiple tender-items, quotation-items), 
 * creates separate rows instead of separate columns.
 */
export function parseFlattenedData(data: Record<string, any>): { rows: any[]; columns: string[] } {
  // Map to store rows: key is combination of all data array indices, value is the row data
  const rowsMap = new Map<string, Record<string, any>>();
  const columnSet = new Set<string>();

  // First pass: collect all keys and identify unique row combinations
  const allKeys: Array<{ key: string; rootIndex: number; fieldPath: string; dataIndices: number[] }> = [];
  
  Object.keys(data).forEach((key) => {
    // Skip schemas key
    if (key === 'schemas') return;

    // Parse pattern: data.{schemaId}.{index}.{fieldPath}
    const rootMatch = key.match(/^data\.([^.]+)\.(\d+)\.(.+)$/);
    if (rootMatch) {
      const rootIndex = parseInt(rootMatch[2]);
      const fieldPath = rootMatch[3];

      // Extract all data indices from the path
      // Pattern: {schemaId}.{index}.data.{dataIndex}.{fieldName} or deeper
      const dataIndices: number[] = [rootIndex];
      
      // Find all ".data.{index}" patterns in the field path
      const dataIndexMatches = fieldPath.matchAll(/\.data\.(\d+)/g);
      for (const match of dataIndexMatches) {
        dataIndices.push(parseInt(match[1]));
      }

      allKeys.push({ key, rootIndex, fieldPath, dataIndices });
    }
  });

  // Helper function to normalize column path
  function normalizeColumnPath(fieldPath: string): string {
    const pathParts = fieldPath.split('.');
    const normalizedParts: string[] = [];
    let i = 0;
    
    while (i < pathParts.length) {
      const part = pathParts[i];
      
      // Check if this is a schema ID followed by an index and "data"
      if (i + 2 < pathParts.length && 
          /^\d+$/.test(pathParts[i + 1]) && 
          pathParts[i + 2] === 'data') {
        // This is a schema path: {schemaId}.{index}.data
        normalizedParts.push(part); // schemaId
        normalizedParts.push('data'); // data
        i += 3; // Skip schemaId, index, and "data"
        
        // Skip the data index (it's part of the row key, not the column)
        if (i < pathParts.length && /^\d+$/.test(pathParts[i])) {
          i++; // Skip the data index
        }
      } else {
        // Regular field name or other part
        normalizedParts.push(part);
        i++;
      }
    }
    
    return normalizedParts.join('.');
  }
  
  // Second pass: normalize column paths and create rows
  // We only create rows for "leaf" nodes - the deepest level that has data for each branch
  // A leaf node is one where no other key has its indices as a prefix with additional indices
  
  // Find all unique index combinations
  const allIndexCombinations = new Set<string>();
  allKeys.forEach((item) => {
    allIndexCombinations.add(item.dataIndices.join(':'));
  });
  
  // Identify leaf nodes: combinations that don't have any child combinations
  const leafRowKeys = new Set<string>();
  allIndexCombinations.forEach((rowKey) => {
    const rowIndices = rowKey.split(':').map(x => parseInt(x));
    let isLeaf = true;
    
    // Check if any other combination has this as a prefix
    allIndexCombinations.forEach((otherKey) => {
      if (otherKey !== rowKey) {
        const otherIndices = otherKey.split(':').map(x => parseInt(x));
        // Check if otherIndices starts with rowIndices and has more elements
        if (otherIndices.length > rowIndices.length &&
            rowIndices.every((idx, i) => idx === otherIndices[i])) {
          isLeaf = false;
        }
      }
    });
    
    if (isLeaf) {
      leafRowKeys.add(rowKey);
    }
  });
  
  // Process each leaf row key
  leafRowKeys.forEach((rowKey) => {
    // Initialize row
    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, {});
    }
    const row = rowsMap.get(rowKey)!;
    const rowIndices = rowKey.split(':').map(x => parseInt(x));
    
    // Find all keys that match this row key or are parents of it
    // We want to include fields where dataIndices is a prefix of rowIndices (parent data)
    // or where dataIndices exactly matches rowIndices (same level data)
    allKeys.forEach(({ key, fieldPath, dataIndices }) => {
      // Check if this key's indices match the row key (exact match or parent prefix)
      const isExactMatch = dataIndices.length === rowIndices.length &&
        dataIndices.every((idx, i) => idx === rowIndices[i]);
      const isParentMatch = dataIndices.length < rowIndices.length &&
        dataIndices.every((idx, i) => idx === rowIndices[i]);
      
      if (isExactMatch || isParentMatch) {
        const columnPath = normalizeColumnPath(fieldPath);
        columnSet.add(columnPath);
        
        // For exact matches, always use the value
        // For parent matches, only use if not already set (exact match takes precedence)
        if (isExactMatch || !(columnPath in row)) {
          row[columnPath] = data[key];
        }
      }
    });
  });

  // Convert map to array, preserving row order
  const sortedKeys = Array.from(rowsMap.keys()).sort((a, b) => {
    // Parse keys: "index1:index2:..."
    const partsA = a.split(':').map(x => parseInt(x));
    const partsB = b.split(':').map(x => parseInt(x));
    
    // Compare indices lexicographically
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const indexA = partsA[i] ?? 0;
      const indexB = partsB[i] ?? 0;
      if (indexA !== indexB) {
        return indexA - indexB;
      }
    }
    
    return 0;
  });

  const rows = sortedKeys.map((key) => rowsMap.get(key)!);
  const columns = Array.from(columnSet).sort();

  return { rows, columns };
}

/**
 * Utility to determine schema index from field path
 * Returns { schemaIndex: number, fieldName: string, depth: number, schemaId?: string }
 * 
 * Handles normalized format (from parseFlattenedData):
 * - "id" (root level field - belongs to first schema)
 * - "tenders.data.id" (nested: schemaId="tenders", depth=1, fieldName="id")
 * - "tenders.data.tender-items.data.id" (deeper nested: schemaId="tender-items", depth=2, fieldName="id")
 * 
 * Pattern: {schemaId}.data.{fieldName} or {schemaId}.data.{childSchemaId}.data.{fieldName}
 * 
 * Also supports legacy format for backward compatibility:
 * - "tenders.0.data.0.id" (nested with indices)
 */
export function getSchemaInfoFromPath(fieldPath: string, schemas?: Schema[]): { schemaIndex: number; fieldName: string; depth: number; schemaId?: string } {
  const parts = fieldPath.split('.');
  
  // If it's just a field name (no nesting), it's root level (schema index 0)
  if (parts.length === 1) {
    return { schemaIndex: 0, fieldName: parts[0], depth: 0 };
  }
  
  // Check if this is the normalized format (schemaId.data.fieldName) or legacy format (schemaId.index.data.index.fieldName)
  const isNormalized = parts.length >= 3 && parts[1] === 'data' && !/^\d+$/.test(parts[0]);
  
  const schemaIds: string[] = [];
  let i = 0;
  
  if (isNormalized) {
    // Normalized format: {schemaId}.data.{fieldName} or {schemaId}.data.{childSchemaId}.data.{fieldName}
    while (i < parts.length) {
      // Look for pattern: {schemaId}.data
      if (i + 1 < parts.length && parts[i + 1] === 'data') {
        schemaIds.push(parts[i]);
        i += 2; // Skip schemaId and "data"
      } else {
        i++;
      }
    }
  } else {
    // Legacy format: {schemaId}.{index}.data.{index}.{fieldName}
    while (i < parts.length) {
      // Look for pattern: {schemaId}.{number}.data.{number}
      if (i + 3 < parts.length && 
          /^\d+$/.test(parts[i + 1]) && 
          parts[i + 2] === 'data' && 
          /^\d+$/.test(parts[i + 3])) {
        schemaIds.push(parts[i]);
        i += 4; // Skip schemaId, index, "data", index
      } else {
        i++;
      }
    }
  }
  
  // The depth is the number of nested schemas (0 = root, 1 = first nested, etc.)
  const depth = schemaIds.length;
  
  // Extract the actual field name (last part)
  const fieldName = parts[parts.length - 1];
  
  // Determine schema index based on the last schema ID in the path
  // If we have nested schemas, use the last one; otherwise it's root (index 0)
  let schemaIndex = 0;
  let schemaId: string | undefined;
  
  if (schemaIds.length > 0) {
    // Use the last schema ID (the deepest nested one)
    schemaId = schemaIds[schemaIds.length - 1];
    // Find the schema index in the schemas array
    if (schemas && schemas.length > 0) {
      const foundIndex = schemas.findIndex(s => {
        const normalizedSchemaId = schemaId!.replace(/-/g, '');
        const normalizedSchemaIdFromList = s.id.replace(/-/g, '');
        return s.id === schemaId || 
               s.id === normalizedSchemaId || 
               normalizedSchemaIdFromList === normalizedSchemaId ||
               s.id.includes(schemaId!) ||
               schemaId!.includes(s.id);
      });
      if (foundIndex !== -1) {
        schemaIndex = foundIndex;
      } else {
        // Fallback: use depth as index (but cap at schema list length)
        schemaIndex = depth < schemas.length ? depth : schemas.length - 1;
      }
    } else {
      // No schemas provided, use depth as index
      schemaIndex = depth;
    }
  } else {
    // No nested schemas found, it's root level (schema index 0)
    schemaIndex = 0;
  }
  
  return { schemaIndex, fieldName, depth, schemaId };
}

/**
 * Get border color classes for a column based on its position in schema group
 */
export function getBorderColorClasses(columnId: string, columnToGroupInfo: Map<string, ColumnGroupInfo>): string {
  const groupInfo = columnToGroupInfo.get(columnId);
  if (!groupInfo) return 'border-r border-gray-200 dark:border-gray-700';
  // Check if this is the last column in its group
  const isLastInGroup = groupInfo.columnIndex === groupInfo.totalInGroup - 1;
  if (isLastInGroup) {
    return 'border-r-2 border-violet-300 dark:border-violet-600';
  }
  return 'border-r border-gray-200 dark:border-gray-700';
}

/**
 * Get border color classes for schema header
 */
export function getSchemaHeaderBorderColor(groupIndex: number, isLast: boolean): string {
  if (isLast) return 'border-r-0';
  return 'border-r-2 border-violet-300 dark:border-violet-600';
}

/**
 * Create a map of column IDs to their schema group info
 */
export function createColumnToGroupInfoMap(columnGroups: ColumnGroup[]): Map<string, ColumnGroupInfo> {
  const map = new Map<string, ColumnGroupInfo>();
  columnGroups.forEach((group, groupIndex) => {
    group.columns.forEach((column, columnIndex) => {
      map.set(column.id, {
        groupIndex,
        columnIndex,
        totalInGroup: group.columns.length
      });
    });
  });
  return map;
}

