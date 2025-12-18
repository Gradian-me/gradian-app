import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ulid } from 'ulid';
import { AppVersion, VersionChange, Priority, ChangeType } from '@/domains/version-management/types';
import { incrementVersion, compareVersions, parseVersion, formatVersion } from '@/domains/version-management/utils/version.utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

const DATA_FILE = join(process.cwd(), 'data', 'app-versions.json');
const DATA_DIR = join(process.cwd(), 'data');
const PACKAGE_JSON_FILE = join(process.cwd(), 'package.json');

// Debug: Log the resolved path (only in development)
if (process.env.NODE_ENV === 'development') {
  loggingCustom(LogType.INFRA_LOG, 'log', `DATA_FILE path: ${DATA_FILE}`);
  loggingCustom(LogType.INFRA_LOG, 'log', `Current working directory: ${process.cwd()}`);
}

/**
 * Ensure data directory and file exist
 */
async function ensureDataFile(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    
    if (!existsSync(DATA_FILE)) {
      await writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error ensuring data file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Read versions from file
 */
async function readVersions(): Promise<AppVersion[]> {
  try {
    await ensureDataFile();
    
    // Check if file exists
    if (!existsSync(DATA_FILE)) {
      loggingCustom(LogType.INFRA_LOG, 'error', `Data file does not exist at: ${DATA_FILE}`);
      return [];
    }
    
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    
    // Check if file is empty
    if (!fileContent || fileContent.trim().length === 0) {
      loggingCustom(LogType.INFRA_LOG, 'error', `Data file is empty at: ${DATA_FILE}`);
      return [];
    }
    
    const versions = JSON.parse(fileContent);
    
    if (!Array.isArray(versions)) {
      loggingCustom(LogType.INFRA_LOG, 'error', `Data file does not contain an array. Got: ${typeof versions}`);
      return [];
    }
    
    return versions;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureDataFile();
      return [];
    }
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading versions: ${error instanceof Error ? error.message : String(error)}`,
    );
    loggingCustom(LogType.INFRA_LOG, 'error', `Attempted to read from: ${DATA_FILE}`);
    return [];
  }
}

/**
 * Write versions to file
 */
async function writeVersions(versions: AppVersion[]): Promise<void> {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(versions, null, 2), 'utf-8');
}

/**
 * Read package.json
 */
async function readPackageJson(): Promise<any> {
  try {
    const fileContent = await readFile(PACKAGE_JSON_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Update package.json version
 */
async function updatePackageJsonVersion(newVersion: string): Promise<void> {
  try {
    const packageJson = await readPackageJson();
    packageJson.version = newVersion;
    await writeFile(PACKAGE_JSON_FILE, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error updating package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Get current version from package.json or latest version from versions
 */
async function getCurrentVersion(): Promise<string> {
  try {
    const packageJson = await readPackageJson();
    if (packageJson.version) {
      // Convert to our format if needed
      const version = packageJson.version;
      if (/^\d+\.\d{2}\.\d{3}$/.test(version)) {
        return version;
      }
      // Convert semver to our format
      const parts = version.split('.');
      if (parts.length >= 3) {
        const major = parseInt(parts[0], 10) || 1;
        const minor = parseInt(parts[1], 10) || 0;
        const patch = parseInt(parts[2], 10) || 0;
        return formatVersion(major, minor, patch);
      }
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading package.json version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  
  // Fallback: get latest version from versions file
  const versions = await readVersions();
  if (versions.length > 0) {
    // Sort by version and get latest
    const sorted = [...versions].sort((a, b) => compareVersions(b.version, a.version));
    return sorted[0].version;
  }
  
  // Default version
  return '1.00.000';
}

/**
 * Filter versions based on query parameters
 */
function filterVersions(versions: AppVersion[], searchParams: URLSearchParams): AppVersion[] {
  let filtered = [...versions];
  
  const search = searchParams.get('search');
  const changeType = searchParams.get('changeType');
  const priority = searchParams.get('priority');
  const domain = searchParams.get('domain');
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(version => {
      const versionMatch = version.version.toLowerCase().includes(searchLower);
      const changeMatch = version.changes.some(change => 
        change.description.toLowerCase().includes(searchLower) ||
        change.affectedDomains.some(d => d.toLowerCase().includes(searchLower))
      );
      return versionMatch || changeMatch;
    });
  }
  
  if (changeType && changeType !== 'all') {
    filtered = filtered.filter(version =>
      version.changes.some(change => change.changeType === changeType)
    );
  }
  
  if (priority && priority !== 'all') {
    filtered = filtered.filter(version =>
      version.changes.some(change => change.priority === priority)
    );
  }
  
  if (domain && domain !== 'all') {
    filtered = filtered.filter(version =>
      version.changes.some(change => 
        change.affectedDomains.some(d => d.toLowerCase() === domain.toLowerCase())
      )
    );
  }
  
  // Sorting
  const sortBy = searchParams.get('sortBy') || 'timestamp';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  filtered.sort((a, b) => {
    if (sortBy === 'version') {
      const comparison = compareVersions(a.version, b.version);
      return sortOrder === 'asc' ? comparison : -comparison;
    } else {
      // timestamp
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    }
  });
  
  return filtered;
}

/**
 * GET - Get all versions with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const versions = await readVersions();
    loggingCustom(LogType.INFRA_LOG, 'log', `Read ${versions.length} versions from file`);
    
    const searchParams = request.nextUrl.searchParams;
    const filtered = filterVersions(versions, searchParams);
    
    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in GET /api/builders/versions: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch versions',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new version
 * Auto-increments version based on priority and syncs to package.json
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.changes || !Array.isArray(body.changes) || body.changes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: changes (array)',
        },
        { status: 400 }
      );
    }
    
    // Validate each change
    for (const change of body.changes) {
      if (!change.changeType || !change.description || !change.priority) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each change must have: changeType, description, and priority',
          },
          { status: 400 }
        );
      }
    }
    
    // Get current version
    const currentVersion = await getCurrentVersion();
    
    // Determine highest priority from changes
    const priorities: Priority[] = body.changes.map((c: VersionChange) => c.priority);
    const priorityOrder = { LOW: 1, Medium: 2, High: 3 };
    const highestPriority = priorities.reduce((max, p) => 
      priorityOrder[p] > priorityOrder[max] ? p : max
    , priorities[0]);
    
    // Use provided priority or highest from changes
    const versionPriority = (body.priority as Priority) || highestPriority;
    
    // Increment version based on priority
    const newVersion = incrementVersion(currentVersion, versionPriority);
    
    // Create new version entry
    const newVersionEntry: AppVersion = {
      id: ulid(),
      timestamp: new Date().toISOString(),
      version: newVersion,
      changes: body.changes.map((change: any) => ({
        changeType: change.changeType as ChangeType,
        description: change.description,
        priority: change.priority as Priority,
        affectedDomains: change.affectedDomains || [],
      })),
    };
    
    // Read existing versions
    const versions = await readVersions();
    versions.push(newVersionEntry);
    
    // Write versions
    await writeVersions(versions);
    
    // Update package.json
    await updatePackageJsonVersion(newVersion);
    
    return NextResponse.json({
      success: true,
      data: newVersionEntry,
      message: `Version ${newVersion} created successfully`,
    }, { status: 201 });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error in POST /api/builders/versions: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create version',
      },
      { status: 500 }
    );
  }
}

