import { TableColumn, TableConfig } from '../../table/types/index';

/**
 * Format number with thousand separators
 */
function formatNumberWithSeparators(text: string): string {
  // Match numbers (integers or decimals) that are standalone or part of text
  // This regex matches:
  // - Whole numbers: 1234567
  // - Decimal numbers: 1234.56
  // - Numbers with signs: +1234, -1234
  // - Numbers with currency symbols: $1234, 1234 IRR
  // - Numbers in parentheses: (1234)
  // But avoids matching:
  // - Dates: 2024-01-01
  // - Percentages: 50% (we'll handle these separately)
  // - Phone numbers, IDs, etc.
  
  // First, try to match standalone numbers (most common case)
  const numberPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d{4,}(?:\.\d+)?)/g;
  
  return text.replace(numberPattern, (match) => {
    // Skip if already has commas (already formatted)
    if (match.includes(',')) return match;
    
    // Check if it's a decimal number
    const hasDecimal = match.includes('.');
    const parts = hasDecimal ? match.split('.') : [match];
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // Only format if integer part has 4+ digits
    if (integerPart.length < 4) return match;
    
    // Add thousand separators to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return hasDecimal ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  });
}

/**
 * Helper function to extract text from AST node recursively
 */
export function extractText(node: any): string {
  let text = '';
  if (typeof node === 'string') {
    text = node;
  } else if (node?.value) {
    text = node.value;
  } else if (node?.children && Array.isArray(node.children)) {
    text = node.children.map(extractText).join('');
  }
  
  // Format numbers only once at the end
  return formatNumberWithSeparators(text);
}

/**
 * Parse table structure from markdown AST
 */
export function parseMarkdownTable(node: any): {
  headers: string[];
  data: Record<string, any>[];
} | null {
  try {
    const tableNode = node as any;
    const rows = tableNode.children || [];
    
    if (rows.length === 0) {
      return null;
    }
    
    // First row is header (skip separator row if present)
    const headerRowIndex = 0;
    const headerRow = rows[headerRowIndex];
    if (!headerRow || headerRow.type !== 'tableRow') {
      return null;
    }
    
    const headerCells = headerRow?.children || [];
    const headers = headerCells.map((cell: any) => {
      return extractText(cell).trim();
    });
    
    if (headers.length === 0) {
      return null;
    }
    
    // Remaining rows are data (skip separator row)
    const dataRows = rows.slice(headerRowIndex + 1).filter((row: any) => {
      if (row.type !== 'tableRow') return false;
      // Skip separator rows (rows with only dashes/pipes)
      const cells = row.children || [];
      const cellTexts = cells.map((cell: any) => extractText(cell).trim());
      return !cellTexts.every((text: string) => /^[-|:\s]+$/.test(text));
    });
    
    const data = dataRows.map((row: any) => {
      const cells = row.children || [];
      const rowData: Record<string, any> = {};
      cells.forEach((cell: any, index: number) => {
        const text = extractText(cell).trim();
        const headerKey = headers[index] || `col${index}`;
        // Normalize header key for accessor
        rowData[headerKey] = text;
      });
      return rowData;
    });
    
    return { headers, data };
  } catch (error) {
    return null;
  }
}

/**
 * Create TableColumn array from headers
 */
export function createTableColumns(headers: string[]): TableColumn<any>[] {
  return headers.map((header: string, index: number) => {
    const headerKey = header || `col${index}`;
    return {
      id: headerKey,
      label: header || `Column ${index + 1}`,
      accessor: (row: any) => row[headerKey] || '',
    };
  });
}

/**
 * Create TableConfig from parsed table data
 */
export function createTableConfig(
  columns: TableColumn<any>[],
  data: Record<string, any>[]
): TableConfig<any> {
  return {
    id: 'markdown-table',
    columns: columns,
    data: data,
    pagination: { enabled: false },
    sorting: { enabled: false },
    filtering: { enabled: false },
    striped: true,
    bordered: true,
    hoverable: true,
  };
}

