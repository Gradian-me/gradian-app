import { TableColumn, TableConfig } from '../../table/types/index';

/**
 * Helper function to extract text from AST node recursively
 */
export function extractText(node: any): string {
  if (typeof node === 'string') return node;
  if (node?.value) return node.value;
  if (node?.children && Array.isArray(node.children)) {
    return node.children.map(extractText).join('');
  }
  return '';
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

