import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import axios from 'axios';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

interface VariableOptions {
  protected?: boolean;
  masked?: boolean;
  raw?: boolean; // "raw" is GitLab's term for "hidden"
  environment_scope?: string;
}

interface SyncEnvRequestBody {
  variableOptions?: Record<string, VariableOptions>;
  defaultOptions?: VariableOptions;
  replaceAll?: boolean; // If true, delete all existing variables before syncing
}

/**
 * POST /api/git/sync-env
 * Sync environment variables from .env.prod file to GitLab CI/CD variables
 */
export async function POST(request: NextRequest) {
  try {
    // Get GitLab configuration from environment
    const gitlabToken = process.env.GITLAB_TOKEN;
    const gitlabProjectId = process.env.GITLAB_PROJECT_ID || '52';
    const gitlabApiUrl = process.env.GITLAB_API_URL || 'https://git.cinnagen.com/api/v4';

    if (!gitlabToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'GITLAB_TOKEN is not set in environment variables',
        },
        { status: 400 }
      );
    }

    // Parse request body for variable options
    let requestBody: SyncEnvRequestBody = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch {
      // Request body is optional, continue with defaults
    }

    const replaceAll = requestBody.replaceAll ?? true; // Default to true: delete all existing variables before syncing

    // Read .env.prod file
    const envFilePath = join(process.cwd(), '.env.prod');
    let envFileContent: string;

    try {
      envFileContent = await readFile(envFilePath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to read .env.prod file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 404 }
      );
    }

    // Parse .env.prod file (includes parsing variable options from comments)
    const { envVars, varOptions } = parseEnvFile(envFileContent);

    // Log all parsed variables for debugging
    loggingCustom(LogType.INFRA_LOG, 'info', `Parsed ${Object.keys(envVars).length} environment variables from .env.prod: ${Object.keys(envVars).join(', ')}`);

    // Exclude GitLab-specific variables from syncing
    const excludedVars = ['GITLAB_TOKEN', 'GITLAB_PROJECT_ID', 'GITLAB_API_URL'];
    const varsToSync = Object.entries(envVars).filter(
      ([key]) => !excludedVars.includes(key)
    );

    loggingCustom(LogType.INFRA_LOG, 'info', `After excluding GitLab-specific variables, ${varsToSync.length} variables will be synced: ${varsToSync.map(([key]) => key).join(', ')}`);

    if (varsToSync.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No environment variables to sync',
          synced: 0,
        },
        { status: 200 }
      );
    }

    // Merge variable options: request body > .env comments > defaults
    // Default: masked=true (hide in logs), raw=true (hide in UI), protected=true (only in protected branches)
    const defaultOptions: VariableOptions = {
      protected: true, // Only available in protected branches/tags by default
      masked: true, // Mask values in CI/CD logs by default
      raw: true, // Hide variables from GitLab UI by default
      environment_scope: '*',
      ...requestBody.defaultOptions,
    };

    // Get existing variables from GitLab
    const existingVars = await getGitLabVariables(
      gitlabApiUrl,
      gitlabToken,
      gitlabProjectId
    );

    // If replaceAll is true, delete all existing variables first
    const deletedVars: string[] = [];
    if (replaceAll && existingVars.length > 0) {
      for (const variable of existingVars) {
        try {
          await deleteGitLabVariable(
            gitlabApiUrl,
            gitlabToken,
            gitlabProjectId,
            variable.key
          );
          deletedVars.push(variable.key);
        } catch (error) {
          loggingCustom(LogType.INFRA_LOG, 'error', `Failed to delete variable ${variable.key}: ${error instanceof Error ? error.message : String(error)}`);
          // Continue with deletion of other variables
        }
      }
    }

    // Create a map of existing variables by key and environment_scope
    // GitLab allows the same key with different environment_scopes
    const existingVarsMap = new Map<string, any>();
    if (!replaceAll) {
      for (const variable of existingVars) {
        const scope = variable.environment_scope || '*';
        const mapKey = `${variable.key}:${scope}`;
        existingVarsMap.set(mapKey, variable);
        // Also store by key alone for backward compatibility
        if (!existingVarsMap.has(variable.key)) {
          existingVarsMap.set(variable.key, variable);
        }
      }
    }

    // Sync variables
    const results = {
      created: [] as string[],
      updated: [] as string[],
      failed: [] as Array<{ key: string; error: string }>,
    };

    for (const [key, value] of varsToSync) {
      try {
        // Get options for this variable (priority: request body > .env comments > defaults)
        // Merge options with explicit handling to ensure raw defaults to true
        const mergedOptions = {
          ...defaultOptions,
          ...varOptions[key],
          ...(requestBody.variableOptions?.[key] || {}),
        };
        
        // Explicitly ensure raw, masked, and protected default to true unless explicitly set to false
        const options: VariableOptions = {
          ...mergedOptions,
          protected: mergedOptions.protected !== false ? true : false, // protected=true restricts to protected branches
          masked: mergedOptions.masked !== false ? true : false,
          raw: mergedOptions.raw !== false ? true : false, // raw=true hides from UI
        };
        
        const environmentScope = options.environment_scope || '*';
        const mapKey = `${key}:${environmentScope}`;
        
        loggingCustom(LogType.INFRA_LOG, 'debug', `Variable ${key} options: protected=${options.protected}, masked=${options.masked}, raw=${options.raw}, environment_scope=${environmentScope}`);

        // Check if variable exists (by key:scope or just key)
        const existingVar = existingVarsMap.get(mapKey) || existingVarsMap.get(key);

        if (existingVar && !replaceAll) {
          // Update existing variable
          await updateGitLabVariable(
            gitlabApiUrl,
            gitlabToken,
            gitlabProjectId,
            key,
            value,
            options
          );
          results.updated.push(key);
        } else {
          // Try to create new variable
          try {
            await createGitLabVariable(
              gitlabApiUrl,
              gitlabToken,
              gitlabProjectId,
              key,
              value,
              options
            );
            results.created.push(key);
          } catch (createError) {
            // If creation fails with "already exists" error, try updating instead
            const errorMessage = createError instanceof Error ? createError.message : String(createError);
            if (errorMessage.includes('has already been taken') || errorMessage.includes('already exists')) {
              loggingCustom(LogType.INFRA_LOG, 'info', `Variable ${key} already exists, attempting to update instead...`);
              try {
                await updateGitLabVariable(
                  gitlabApiUrl,
                  gitlabToken,
                  gitlabProjectId,
                  key,
                  value,
                  options
                );
                results.updated.push(key);
              } catch (updateError) {
                // If update also fails, record the original creation error
                results.failed.push({
                  key,
                  error: errorMessage,
                });
              }
            } else {
              // For other errors, record as failed
              results.failed.push({
                key,
                error: errorMessage,
              });
            }
          }
        }
      } catch (error) {
        results.failed.push({
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalSynced = results.created.length + results.updated.length;

    return NextResponse.json(
      {
        success: results.failed.length === 0,
        message: replaceAll
          ? `Replaced all variables: deleted ${deletedVars.length}, created ${results.created.length}`
          : `Synced ${totalSynced} environment variable(s) to GitLab`,
        synced: totalSynced,
        created: results.created.length,
        updated: results.updated.length,
        deleted: replaceAll ? deletedVars.length : 0,
        failed: results.failed.length,
        details: {
          created: results.created,
          updated: results.updated,
          deleted: replaceAll ? deletedVars : [],
          failed: results.failed,
        },
      },
      { status: results.failed.length === 0 ? 200 : 207 } // 207 Multi-Status if some failed
    );
  } catch (error) {
    loggingCustom(LogType.INFRA_LOG, 'error', `GitLab sync error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync environment variables',
      },
      { status: 500 }
    );
  }
}

/**
 * Parse .env file content into key-value pairs and variable options
 * Supports special comments for variable configuration:
 * Format 1: # GITLAB_VAR_NAME: protected=true, masked=true, raw=true
 * Format 2: Comment on line before variable:
 *   # protected=true, masked=true, raw=true
 *   VAR_NAME=value
 */
function parseEnvFile(
  content: string
): { envVars: Record<string, string>; varOptions: Record<string, VariableOptions> } {
  const envVars: Record<string, string> = {};
  const varOptions: Record<string, VariableOptions> = {};
  const lines = content.split('\n');

  let pendingOptions: VariableOptions | null = null;
  let pendingVarName: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for GitLab variable options comment with variable name
    // Format: # GITLAB_VAR_NAME: protected=true, masked=true, raw=true
    const namedOptionsMatch = trimmedLine.match(/^#\s*GITLAB_(\w+):\s*(.+)$/i);
    if (namedOptionsMatch) {
      const varName = namedOptionsMatch[1];
      const optionsStr = namedOptionsMatch[2];
      pendingVarName = varName;
      pendingOptions = parseOptionsString(optionsStr);
      continue;
    }

    // Check for GitLab options comment without variable name (applies to next variable)
    // Format: # protected=true, masked=true, raw=true
    const optionsMatch = trimmedLine.match(/^#\s*(protected|masked|raw|environment_scope)=/i);
    if (optionsMatch) {
      pendingOptions = parseOptionsString(trimmedLine.replace(/^#\s*/, ''));
      continue;
    }

    // Skip empty lines and regular comments (but reset pending options if not GitLab-specific)
    if (!trimmedLine || (trimmedLine.startsWith('#') && !pendingOptions)) {
      if (trimmedLine.startsWith('#') && !pendingOptions) {
        pendingOptions = null;
        pendingVarName = null;
      }
      continue;
    }

    // Parse KEY=VALUE format
    // Support: VAR=value, VAR="value", VAR='value', VAR= (empty), VAR=value # comment
    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove inline comments (everything after # that's not inside quotes)
      // This handles cases like: VAR=value # comment
      if (value.includes('#')) {
        // Check if # is inside quotes
        let inQuotes = false;
        let quoteChar = '';
        let commentIndex = -1;
        
        for (let i = 0; i < value.length; i++) {
          const char = value[i];
          if ((char === '"' || char === "'") && (i === 0 || value[i - 1] !== '\\')) {
            if (!inQuotes) {
              inQuotes = true;
              quoteChar = char;
            } else if (char === quoteChar) {
              inQuotes = false;
              quoteChar = '';
            }
          } else if (char === '#' && !inQuotes) {
            commentIndex = i;
            break;
          }
        }
        
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        }
      }

      // Remove quotes if present (handle both single and double quotes)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Add variable even if value is empty (empty values are valid)
      if (key) {
        envVars[key] = value;
        
        // Apply pending options if they match this variable
        if (pendingOptions) {
          if (pendingVarName && pendingVarName === key) {
            // Options were specified with variable name
            varOptions[key] = pendingOptions;
          } else if (!pendingVarName) {
            // Options were on previous line, apply to this variable
            varOptions[key] = pendingOptions;
          }
        }
      }
    }
    
    // Reset pending options after processing a variable
    pendingOptions = null;
    pendingVarName = null;
  }

  return { envVars, varOptions };
}

/**
 * Parse options string like "protected=true, masked=true, raw=true"
 */
function parseOptionsString(optionsStr: string): VariableOptions {
  const options: VariableOptions = {};
  const optionPairs = optionsStr.split(',').map((s) => s.trim());
  
  for (const pair of optionPairs) {
    const [key, value] = pair.split('=').map((s) => s.trim());
    if (key === 'protected') {
      options.protected = value === 'true';
    } else if (key === 'masked') {
      options.masked = value === 'true';
    } else if (key === 'raw') {
      options.raw = value === 'true';
    } else if (key === 'environment_scope') {
      options.environment_scope = value;
    }
  }
  
  return options;
}

/**
 * Get existing GitLab CI/CD variables
 */
async function getGitLabVariables(
  apiUrl: string,
  token: string,
  projectId: string
): Promise<any[]> {
  try {
    const response = await axios.get(
      `${apiUrl}/projects/${projectId}/variables`,
      {
        headers: {
          'PRIVATE-TOKEN': token,
        },
      }
    );
    return response.data || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to fetch GitLab variables: ${error.response?.status} ${error.response?.statusText}`
      );
    }
    throw error;
  }
}

/**
 * Create a new GitLab CI/CD variable
 */
async function createGitLabVariable(
  apiUrl: string,
  token: string,
  projectId: string,
  key: string,
  value: string,
  options: VariableOptions = {}
): Promise<void> {
  try {
    // Ensure raw, masked, and protected are explicitly set (default to true)
    const rawValue = options.raw !== undefined ? options.raw : true;
    let maskedValue = options.masked !== undefined ? options.masked : true;
    const protectedValue = options.protected !== undefined ? options.protected : true;
    
    // GitLab requires masked variables to be at least 8 characters and match a regex pattern
    // If masking is requested but value doesn't meet requirements, disable masking
    if (maskedValue && value) {
      // GitLab masked variable requirements:
      // - At least 8 characters
      // - Must match: ^.{8,}$
      // - Cannot contain newlines or control characters
      const canBeMasked = value.length >= 8 && 
                         !value.includes('\n') && 
                         !value.includes('\r') &&
                         /^[\x20-\x7E]{8,}$/.test(value);
      
      if (!canBeMasked) {
        loggingCustom(LogType.INFRA_LOG, 'warn', `Variable ${key} cannot be masked (value too short or contains invalid characters). Disabling masking.`);
        maskedValue = false;
      }
    }
    
    const payload: any = {
      key,
      value,
      protected: protectedValue, // protected=true restricts to protected branches/tags
      masked: maskedValue,
      raw: rawValue, // raw=true hides variable from GitLab UI
      environment_scope: options.environment_scope || '*',
    };

    loggingCustom(LogType.INFRA_LOG, 'info', `Creating variable ${key} with protected=${protectedValue}, masked=${maskedValue}, raw=${rawValue}, valueLength=${value.length}, valuePreview=${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    loggingCustom(LogType.INFRA_LOG, 'debug', `Payload for ${key}: ${JSON.stringify({ ...payload, value: value.substring(0, 20) + '...' })}`);

    await axios.post(
      `${apiUrl}/projects/${projectId}/variables`,
      payload,
      {
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Extract detailed error information from GitLab API response
      let errorMsg = error.message;
      
      // Log the full error for debugging
      loggingCustom(LogType.INFRA_LOG, 'error', `Error creating variable ${key}: Status=${error.response?.status}, StatusText=${error.response?.statusText}, Data=${JSON.stringify(error.response?.data)}`);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // GitLab API can return errors in different formats
        try {
          if (typeof errorData === 'string') {
            errorMsg = errorData;
          } else if (errorData.message) {
            errorMsg = typeof errorData.message === 'string' 
              ? errorData.message 
              : JSON.stringify(errorData.message, null, 2);
          } else if (Array.isArray(errorData)) {
            errorMsg = errorData.map((err: any) => {
              if (typeof err === 'string') return err;
              if (err?.message) return err.message;
              try {
                return JSON.stringify(err, null, 2);
              } catch {
                return String(err);
              }
            }).join(', ');
          } else if (errorData.error) {
            errorMsg = typeof errorData.error === 'string' 
              ? errorData.error 
              : JSON.stringify(errorData.error, null, 2);
          } else {
            // Try to stringify the whole error data with proper formatting
            try {
              errorMsg = JSON.stringify(errorData, null, 2);
            } catch (stringifyError) {
              // If stringify fails (circular reference), try to extract what we can
              errorMsg = `Error object: ${String(errorData)}`;
            }
          }
        } catch (parseError) {
          errorMsg = `Failed to parse error: ${String(errorData)}`;
        }
      }
      
      const statusInfo = error.response?.status 
        ? ` (Status: ${error.response.status} ${error.response.statusText})`
        : '';
      
      throw new Error(
        `Failed to create GitLab variable ${key}: ${errorMsg}${statusInfo}`
      );
    }
    throw error;
  }
}

/**
 * Update an existing GitLab CI/CD variable
 */
async function updateGitLabVariable(
  apiUrl: string,
  token: string,
  projectId: string,
  key: string,
  value: string,
  options: VariableOptions = {}
): Promise<void> {
  try {
    // Ensure raw, masked, and protected are explicitly set (default to true)
    const rawValue = options.raw !== undefined ? options.raw : true;
    let maskedValue = options.masked !== undefined ? options.masked : true;
    const protectedValue = options.protected !== undefined ? options.protected : true;
    
    // GitLab requires masked variables to be at least 8 characters and match a regex pattern
    // If masking is requested but value doesn't meet requirements, disable masking
    if (maskedValue && value) {
      // GitLab masked variable requirements:
      // - At least 8 characters
      // - Must match: ^.{8,}$
      // - Cannot contain newlines or control characters
      const canBeMasked = value.length >= 8 && 
                         !value.includes('\n') && 
                         !value.includes('\r') &&
                         /^[\x20-\x7E]{8,}$/.test(value);
      
      if (!canBeMasked) {
        loggingCustom(LogType.INFRA_LOG, 'warn', `Variable ${key} cannot be masked (value too short or contains invalid characters). Disabling masking.`);
        maskedValue = false;
      }
    }
    
    const payload: any = {
      value,
      protected: protectedValue, // protected=true restricts to protected branches/tags
      masked: maskedValue,
      raw: rawValue, // raw=true hides variable from GitLab UI
      environment_scope: options.environment_scope || '*',
    };

    const environmentScope = options.environment_scope || '*';
    
    loggingCustom(LogType.INFRA_LOG, 'info', `Updating variable ${key} with protected=${protectedValue}, masked=${maskedValue}, raw=${rawValue}, valueLength=${value.length}, valuePreview=${value.substring(0, 50)}${value.length > 50 ? '...' : ''}, environment_scope=${environmentScope}`);

    // GitLab API requires environment_scope in the URL if it's not '*'
    // Format: /projects/:id/variables/:key?filter[environment_scope]=:scope
    let updateUrl = `${apiUrl}/projects/${projectId}/variables/${encodeURIComponent(key)}`;
    if (environmentScope !== '*') {
      updateUrl += `?filter[environment_scope]=${encodeURIComponent(environmentScope)}`;
    }

    await axios.put(
      updateUrl,
      payload,
      {
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Extract detailed error information from GitLab API response
      let errorMsg = error.message;
      
      // Log the full error for debugging
      loggingCustom(LogType.INFRA_LOG, 'error', `Error updating variable ${key}: Status=${error.response?.status}, StatusText=${error.response?.statusText}, Data=${JSON.stringify(error.response?.data)}`);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // GitLab API can return errors in different formats
        try {
          if (typeof errorData === 'string') {
            errorMsg = errorData;
          } else if (errorData.message) {
            errorMsg = typeof errorData.message === 'string' 
              ? errorData.message 
              : JSON.stringify(errorData.message, null, 2);
          } else if (Array.isArray(errorData)) {
            errorMsg = errorData.map((err: any) => {
              if (typeof err === 'string') return err;
              if (err?.message) return err.message;
              try {
                return JSON.stringify(err, null, 2);
              } catch {
                return String(err);
              }
            }).join(', ');
          } else if (errorData.error) {
            errorMsg = typeof errorData.error === 'string' 
              ? errorData.error 
              : JSON.stringify(errorData.error, null, 2);
          } else {
            // Try to stringify the whole error data with proper formatting
            try {
              errorMsg = JSON.stringify(errorData, null, 2);
            } catch (stringifyError) {
              // If stringify fails (circular reference), try to extract what we can
              errorMsg = `Error object: ${String(errorData)}`;
            }
          }
        } catch (parseError) {
          errorMsg = `Failed to parse error: ${String(errorData)}`;
        }
      }
      
      const statusInfo = error.response?.status 
        ? ` (Status: ${error.response.status} ${error.response.statusText})`
        : '';
      
      throw new Error(
        `Failed to update GitLab variable ${key}: ${errorMsg}${statusInfo}`
      );
    }
    throw error;
  }
}

/**
 * Delete a GitLab CI/CD variable
 */
async function deleteGitLabVariable(
  apiUrl: string,
  token: string,
  projectId: string,
  key: string
): Promise<void> {
  try {
    await axios.delete(
      `${apiUrl}/projects/${projectId}/variables/${encodeURIComponent(key)}`,
      {
        headers: {
          'PRIVATE-TOKEN': token,
        },
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(
        `Failed to delete GitLab variable ${key}: ${errorMsg}`
      );
    }
    throw error;
  }
}

