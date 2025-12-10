const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Compare GitLab CI/CD variables with local .env file
 * Reports differences without making any changes
 */

// Configuration
const ENV_FILE = '.env';
const EXCLUDE_VARS = ['GITLAB_TOKEN', 'GITLAB_PROJECT_ID', 'GITLAB_API_URL'];
const DEFAULT_ENVIRONMENT_SCOPE = '*';

/**
 * Load environment variables from .env file
 * This function reads .env and sets process.env variables
 */
function loadEnvFile() {
  const envFilePath = path.join(process.cwd(), ENV_FILE);
  
  if (!fs.existsSync(envFilePath)) {
    console.warn(`Warning: ${ENV_FILE} file not found at ${envFilePath}`);
    return;
  }
  
  try {
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const lines = content.split('\n');
    let loadedCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse KEY=VALUE format
      const match = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2];
        
        // Remove inline comments
        const commentIndex = value.indexOf(' #');
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        } else {
          value = value.trim();
        }
        
        // Handle quoted values
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
          // Unescape quotes
          if (value.includes('\\"')) {
            value = value.replace(/\\"/g, '"');
          }
        }
        
        // Only set if not already in process.env (existing env vars take precedence)
        if (!process.env[key]) {
          process.env[key] = value;
          loadedCount++;
        }
      }
    }
    
    if (loadedCount > 0) {
      console.log(`Loaded ${loadedCount} environment variable(s) from ${ENV_FILE}`);
    }
  } catch (error) {
    console.warn(`Warning: Failed to load ${ENV_FILE} file: ${error.message}`);
  }
}

// Load .env file first before reading GitLab config
loadEnvFile();

// Get GitLab configuration from environment (now includes .env values)
const gitlabToken = process.env.GITLAB_TOKEN;
const gitlabProjectId = process.env.GITLAB_PROJECT_ID || '52';
const gitlabApiUrl = process.env.GITLAB_API_URL || 'https://git.cinnagen.com/api/v4';

/**
 * Get all variables from GitLab CI/CD
 */
async function getGitLabVariables() {
  if (!gitlabToken) {
    throw new Error('GITLAB_TOKEN is not set in environment variables');
  }

  try {
    console.log(`Fetching variables from GitLab (Project ID: ${gitlabProjectId})...`);
    const response = await axios.get(
      `${gitlabApiUrl}/projects/${gitlabProjectId}/variables`,
      {
        headers: {
          'PRIVATE-TOKEN': gitlabToken,
        },
      }
    );
    
    const allVars = response.data || [];
    console.log(`Retrieved ${allVars.length} variable(s) from GitLab`);
    
    // Filter variables by environment scope and exclude list
    const filteredVars = allVars.filter((variable) => {
      // Filter by environment scope
      if (DEFAULT_ENVIRONMENT_SCOPE !== '*' && variable.environment_scope !== DEFAULT_ENVIRONMENT_SCOPE) {
        return false;
      }
      // Exclude specified variables
      if (EXCLUDE_VARS.includes(variable.key)) {
        return false;
      }
      return true;
    });
    
    console.log(`Filtered to ${filteredVars.length} variable(s) after applying scope and exclusion filters`);
    
    // Convert to key-value map
    const varsMap = {};
    filteredVars.forEach((variable) => {
      varsMap[variable.key] = variable.value || '';
    });
    
    return varsMap;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to fetch GitLab variables: ${error.response?.status} ${error.response?.statusText} - ${error.response?.data?.message || ''}`
      );
    }
    throw error;
  }
}

/**
 * Parse .env file content into key-value pairs
 */
function parseEnvFile(content) {
  const envVars = {};
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }
    
    // Parse KEY=VALUE format
    // Support: VAR=value, VAR="value", VAR='value', VAR= (empty), VAR=value # comment
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      
      // Remove inline comments
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) {
        value = value.substring(0, commentIndex).trim();
      } else {
        value = value.trim();
      }
      
      // Handle quoted values
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
        // Unescape quotes
        if (value.includes('\\"')) {
          value = value.replace(/\\"/g, '"');
        }
      }
      
      envVars[key] = value;
    }
  }
  
  return envVars;
}

/**
 * Read and parse local .env file
 */
function readLocalEnvFile() {
  const envFilePath = path.join(process.cwd(), ENV_FILE);
  
  if (!fs.existsSync(envFilePath)) {
    console.warn(`Warning: ${ENV_FILE} file not found at ${envFilePath}`);
    return {};
  }
  
  try {
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const envVars = parseEnvFile(content);
    console.log(`Read ${Object.keys(envVars).length} variable(s) from ${ENV_FILE}`);
    return envVars;
  } catch (error) {
    throw new Error(`Failed to read ${ENV_FILE} file: ${error.message}`);
  }
}

/**
 * Compare GitLab variables with local .env file
 */
function compareVariables(gitlabVars, localVars) {
  const comparison = {
    onlyInGitLab: [],
    onlyInLocal: [],
    differentValues: [],
    matching: [],
  };
  
  // Get all unique keys
  const allKeys = new Set([
    ...Object.keys(gitlabVars),
    ...Object.keys(localVars),
  ]);
  
  // Compare each variable
  for (const key of allKeys) {
    const gitlabValue = gitlabVars[key];
    const localValue = localVars[key];
    
    if (gitlabValue === undefined) {
      comparison.onlyInLocal.push(key);
    } else if (localValue === undefined) {
      comparison.onlyInGitLab.push(key);
    } else if (gitlabValue !== localValue) {
      comparison.differentValues.push({
        key,
        gitlabValue,
        localValue,
      });
    } else {
      comparison.matching.push(key);
    }
  }
  
  // Sort all arrays alphabetically
  comparison.onlyInGitLab.sort();
  comparison.onlyInLocal.sort();
  comparison.differentValues.sort((a, b) => a.key.localeCompare(b.key));
  comparison.matching.sort();
  
  return comparison;
}

/**
 * Format value for display (mask sensitive values)
 */
function formatValueForDisplay(value, maxLength = 50) {
  if (!value) return '(empty)';
  
  // Mask values that look like secrets (long strings, tokens, etc.)
  if (value.length > 32) {
    return `${value.substring(0, 10)}...${value.substring(value.length - 4)} (${value.length} chars)`;
  }
  
  if (value.length > maxLength) {
    return `${value.substring(0, maxLength)}... (${value.length} chars)`;
  }
  
  return value;
}

/**
 * Print comparison report
 */
function printReport(comparison) {
  console.log('\n' + '='.repeat(80));
  console.log('ENVIRONMENT VARIABLES COMPARISON REPORT');
  console.log('='.repeat(80));
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Matching variables:        ${comparison.matching.length}`);
  console.log(`Only in GitLab:            ${comparison.onlyInGitLab.length}`);
  console.log(`Only in local .env:        ${comparison.onlyInLocal.length}`);
  console.log(`Different values:          ${comparison.differentValues.length}`);
  console.log(`Total variables in GitLab: ${comparison.onlyInGitLab.length + comparison.differentValues.length + comparison.matching.length}`);
  console.log(`Total variables in .env:   ${comparison.onlyInLocal.length + comparison.differentValues.length + comparison.matching.length}`);
  
  // Only in GitLab
  if (comparison.onlyInGitLab.length > 0) {
    console.log('\n🔵 VARIABLES ONLY IN GITLAB');
    console.log('-'.repeat(80));
    comparison.onlyInGitLab.forEach((key) => {
      console.log(`  ${key}`);
    });
  }
  
  // Only in local .env
  if (comparison.onlyInLocal.length > 0) {
    console.log('\n🟡 VARIABLES ONLY IN LOCAL .ENV');
    console.log('-'.repeat(80));
    comparison.onlyInLocal.forEach((key) => {
      console.log(`  ${key}`);
    });
  }
  
  // Different values
  if (comparison.differentValues.length > 0) {
    console.log('\n🔴 VARIABLES WITH DIFFERENT VALUES');
    console.log('-'.repeat(80));
    comparison.differentValues.forEach(({ key, gitlabValue, localValue }) => {
      console.log(`  ${key}:`);
      console.log(`    GitLab: ${formatValueForDisplay(gitlabValue)}`);
      console.log(`    Local:  ${formatValueForDisplay(localValue)}`);
    });
  }
  
  // Matching (optional, can be verbose)
  if (comparison.matching.length > 0 && process.argv.includes('--show-matching')) {
    console.log('\n✅ MATCHING VARIABLES');
    console.log('-'.repeat(80));
    comparison.matching.forEach((key) => {
      console.log(`  ${key}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Report completed. No changes were made.');
  console.log('='.repeat(80) + '\n');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting GitLab vs .env comparison...\n');
    
    // Fetch from GitLab
    const gitlabVars = await getGitLabVariables();
    
    // Read local .env file
    const localVars = readLocalEnvFile();
    
    // Compare
    const comparison = compareVariables(gitlabVars, localVars);
    
    // Print report
    printReport(comparison);
    
    // Exit with error code if there are differences (useful for CI/CD)
    if (process.argv.includes('--exit-on-diff')) {
      const hasDifferences = 
        comparison.onlyInGitLab.length > 0 ||
        comparison.onlyInLocal.length > 0 ||
        comparison.differentValues.length > 0;
      
      if (hasDifferences) {
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { getGitLabVariables, readLocalEnvFile, compareVariables };

