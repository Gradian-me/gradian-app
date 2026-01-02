import { NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { formatToToon } from '@/gradian-ui/shared/utils/text-utils';
import { getAllLanguageKeys, expandMultilingualFields } from '@/gradian-ui/shared/utils/json-utils';

const DATA_FILE = join(process.cwd(), 'data', 'organizational-rag.json');
const DATA_DIR = join(process.cwd(), 'data');

/**
 * Ensure data directory and file exist
 */
async function ensureDataFile(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error ensuring data directory: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Read organizational RAG data from file
 */
async function readOrganizationalRag(): Promise<Record<string, any>> {
  try {
    await ensureDataFile();
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `Organizational RAG file not found: ${DATA_FILE}`,
      );
      return {};
    }
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading organizational RAG data: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {};
  }
}

/**
 * Recursively filter multilingual objects to extract language-specific values
 */
function applyLanguageFilter(data: any, language: string): any {
  if (data === null || data === undefined) {
    return data;
  }

  // If it's an object with language keys (e.g., {en: "...", fa: "..."})
  if (typeof data === 'object' && !Array.isArray(data)) {
    // Check if this looks like a multilingual object (has the language key)
    if (language && data[language] !== undefined) {
      return data[language];
    }
    
    // Otherwise, recursively process all properties
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = applyLanguageFilter(value, language);
    }
    return result;
  }

  // If it's an array, process each element
  if (Array.isArray(data)) {
    return data.map(item => applyLanguageFilter(item, language));
  }

  // Primitive value, return as is
  return data;
}

/**
 * Filter array items by IDs
 */
function filterByIds(items: any[], ids: string[]): any[] {
  if (!ids || ids.length === 0) {
    return items;
  }
  return items.filter(item => item.id && ids.includes(String(item.id)));
}

/**
 * Filter array items by codes
 */
function filterByCodes(items: any[], codes: string[]): any[] {
  if (!codes || codes.length === 0) {
    return items;
  }
  return items.filter(item => item.code && codes.includes(String(item.code)));
}

/**
 * Filter top-level keys
 */
function filterKeys(data: Record<string, any>, includedKeys?: string[], excludedKeys?: string[]): Record<string, any> {
  let result = { ...data };

  // Apply includedKeys filter (takes precedence)
  if (includedKeys && includedKeys.length > 0) {
    const filtered: Record<string, any> = {};
    for (const key of includedKeys) {
      if (result[key] !== undefined) {
        filtered[key] = result[key];
      }
    }
    result = filtered;
  }

  // Apply excludedKeys filter
  if (excludedKeys && excludedKeys.length > 0) {
    for (const key of excludedKeys) {
      delete result[key];
    }
  }

  return result;
}


/**
 * GET - Get organizational RAG data with filtering
 * Query parameters:
 * - language: Filter multilingual objects (e.g., "en", "fa")
 * - format: Response format (e.g., "json", "toon") - defaults to "json"
 * - includedKeys: Comma-separated top-level keys to include
 * - excludedKeys: Comma-separated top-level keys to exclude
 * - ids: Comma-separated IDs to filter items by
 * - codes: Comma-separated codes to filter items by
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await requireApiAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return 401 if unauthorized
    }

    // Read data
    const data = await readOrganizationalRag();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language') || undefined;
    const format = searchParams.get('format') || 'json';
    const includedKeysParam = searchParams.get('includedKeys');
    const excludedKeysParam = searchParams.get('excludedKeys');
    const idsParam = searchParams.get('ids');
    const codesParam = searchParams.get('codes');

    // Parse array parameters
    const includedKeys = includedKeysParam
      ? includedKeysParam.split(',').map(k => k.trim()).filter(Boolean)
      : undefined;
    const excludedKeys = excludedKeysParam
      ? excludedKeysParam.split(',').map(k => k.trim()).filter(Boolean)
      : undefined;
    const ids = idsParam
      ? idsParam.split(',').map(id => id.trim()).filter(Boolean)
      : undefined;
    const codes = codesParam
      ? codesParam.split(',').map(code => code.trim()).filter(Boolean)
      : undefined;

    // Apply key filtering first
    let filteredData = filterKeys(data, includedKeys, excludedKeys);

    // Apply ID and code filtering to array items
    for (const [key, value] of Object.entries(filteredData)) {
      if (Array.isArray(value)) {
        let filteredArray = value;

        // Filter by IDs
        if (ids && ids.length > 0) {
          filteredArray = filterByIds(filteredArray, ids);
        }

        // Filter by codes
        if (codes && codes.length > 0) {
          filteredArray = filterByCodes(filteredArray, codes);
        }

        filteredData[key] = filteredArray;
      }
    }

    // Apply language filtering (recursive)
    if (language) {
      filteredData = applyLanguageFilter(filteredData, language);
    }

    // Handle TOON format
    if (format === 'toon') {
      const toonParts: string[] = [];
      
      // Process each top-level key (e.g., "products", "organization_chart")
      for (const [key, value] of Object.entries(filteredData)) {
        if (Array.isArray(value) && value.length > 0) {
          let itemsToFormat = value;
          
          // If no language filter is applied, expand multilingual fields
          if (!language) {
            const languageKeys = getAllLanguageKeys(value);
            if (languageKeys.length > 0) {
              itemsToFormat = expandMultilingualFields(value, languageKeys);
            }
          }
          
          // Get all unique field names from all items in the array
          const allFields = new Set<string>();
          itemsToFormat.forEach((item: any) => {
            if (item && typeof item === 'object') {
              Object.keys(item).forEach(field => allFields.add(field));
            }
          });
          
          // Filter out 'id' and 'code' fields from toon output
          const fields = Array.from(allFields).filter(field => field !== 'id' && field !== 'code');
          
          if (fields.length > 0) {
            const toonFormat = formatToToon(key, itemsToFormat, fields);
            if (toonFormat) {
              toonParts.push(toonFormat);
            }
          }
        }
      }
      
      const toonOutput = toonParts.join('\n\n');
      
      return new NextResponse(toonOutput, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    // Default JSON format
    const responseData = {
      success: true,
      data: filteredData,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in GET /api/organization-rag: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organizational RAG data',
      },
      { status: 500 }
    );
  }
}

