const { readFile, writeFile, mkdir } = require('fs/promises');
const { join } = require('path');
const { existsSync } = require('fs');
const { ulid } = require('ulid');

const DATA_FILE = join(process.cwd(), 'data', 'app-versions.json');
const DATA_DIR = join(process.cwd(), 'data');
const PACKAGE_JSON_FILE = join(process.cwd(), 'package.json');

// Version utilities
function parseVersion(version) {
  if (/^\d+\.\d{2}\.\d{3}$/.test(version)) {
    const parts = version.split('.');
    return {
      major: parseInt(parts[0], 10),
      minor: parseInt(parts[1], 10),
      patch: parseInt(parts[2], 10),
    };
  }
  const parts = version.split('.');
  if (parts.length >= 3) {
    return {
      major: parseInt(parts[0], 10) || 1,
      minor: parseInt(parts[1], 10) || 0,
      patch: parseInt(parts[2], 10) || 0,
    };
  }
  throw new Error(`Invalid version format: ${version}`);
}

function formatVersion(major, minor, patch) {
  return `${major}.${minor.toString().padStart(2, '0')}.${patch.toString().padStart(3, '0')}`;
}

function incrementVersion(currentVersion, priority) {
  const { major, minor, patch } = parseVersion(currentVersion);
  
  if (priority === 'High') {
    return formatVersion(major, minor + 1, 0);
  } else {
    return formatVersion(major, minor, patch + 1);
  }
}

async function ensureDataFile() {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    
    if (!existsSync(DATA_FILE)) {
      await writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring data file:', error);
  }
}

async function readVersions() {
  try {
    await ensureDataFile();
    const fileContent = await readFile(DATA_FILE, 'utf-8');
    const versions = JSON.parse(fileContent);
    return Array.isArray(versions) ? versions : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await ensureDataFile();
      return [];
    }
    console.error('Error reading versions:', error);
    return [];
  }
}

async function writeVersions(versions) {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(versions, null, 2), 'utf-8');
}

async function readPackageJson() {
  try {
    const fileContent = await readFile(PACKAGE_JSON_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading package.json:', error);
    throw error;
  }
}

async function updatePackageJsonVersion(newVersion) {
  try {
    const packageJson = await readPackageJson();
    packageJson.version = newVersion;
    await writeFile(PACKAGE_JSON_FILE, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
  } catch (error) {
    console.error('Error updating package.json:', error);
    throw error;
  }
}

async function createVersion(changes, priority) {
  try {
    // Get current version from package.json
    const packageJson = await readPackageJson();
    const currentVersion = packageJson.version || '1.00.000';
    
    // Determine highest priority from changes
    const priorities = changes.map(c => c.priority);
    const priorityOrder = { LOW: 1, Medium: 2, High: 3 };
    const highestPriority = priorities.reduce((max, p) => 
      priorityOrder[p] > priorityOrder[max] ? p : max
    , priorities[0]);
    
    // Use provided priority or highest from changes
    const versionPriority = priority || highestPriority;
    
    // Increment version based on priority
    const newVersion = incrementVersion(currentVersion, versionPriority);
    
    // Create new version entry
    const newVersionEntry = {
      id: ulid(),
      timestamp: new Date().toISOString(),
      version: newVersion,
      changes: changes.map(change => ({
        changeType: change.changeType,
        description: change.description,
        priority: change.priority,
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
    
    console.log(`✅ Version ${newVersion} created successfully`);
    console.log(JSON.stringify(newVersionEntry, null, 2));
    
    return newVersionEntry;
  } catch (error) {
    console.error('Error creating version:', error);
    throw error;
  }
}

// Main execution
const changes = [
  {
    changeType: 'feature',
    description: 'Markdown Viewer | Updated package dependencies and added new types for react-syntax-highlighter',
    priority: 'High',
    affectedDomains: ['markdown-viewer', 'dependencies']
  },
  {
    changeType: 'enhance',
    description: 'Improved health check timestamps for better monitoring accuracy',
    priority: 'Medium',
    affectedDomains: ['health-check', 'monitoring']
  },
  {
    changeType: 'feature',
    description: 'Added new company and tag entries in all-data.json',
    priority: 'High',
    affectedDomains: ['data-management', 'companies', 'tags']
  },
  {
    changeType: 'refactor',
    description: 'Standardized page titles across the application for consistency',
    priority: 'Medium',
    affectedDomains: ['ui', 'layout']
  },
  {
    changeType: 'update',
    description: 'Revised layout components to reflect the new title format',
    priority: 'Medium',
    affectedDomains: ['layout', 'ui']
  }
];

const priority = 'High'; // Highest priority from changes

createVersion(changes, priority)
  .then(() => {
    console.log('\n✅ Version update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to create version:', error);
    process.exit(1);
  });

