import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import axios from 'axios';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

interface PullEnvRequestBody {
  outputFile?: string; // Default: '.env'
  excludeVars?: string[]; // Variables to exclude from the output
  environmentScope?: string; // Filter by environment scope (default: '*')
}

/**
 * POST /api/git/pull-env
 * Pull environment variables from GitLab CI/CD variables and create .env file locally
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

    // Parse request body
    let requestBody: PullEnvRequestBody = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch {
      // Request body is optional, continue with defaults
    }

    const outputFile = requestBody.outputFile || '.env';
    const excludeVars = requestBody.excludeVars || ['GITLAB_TOKEN', 'GITLAB_PROJECT_ID', 'GITLAB_API_URL'];
    const environmentScope = requestBody.environmentScope || '*';

    // Fetch variables from GitLab
    loggingCustom(LogType.INFRA_LOG, 'info', `Fetching environment variables from GitLab (Project ID: ${gitlabProjectId}, Scope: ${environmentScope})`);
    const gitlabVars = await getGitLabVariables(
      gitlabApiUrl,
      gitlabToken,
      gitlabProjectId
    );
    loggingCustom(LogType.INFRA_LOG, 'info', `Retrieved ${gitlabVars.length} variable(s) from GitLab`);

    if (gitlabVars.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No environment variables found in GitLab',
          pulled: 0,
          file: outputFile,
        },
        { status: 200 }
      );
    }

    // Filter variables by environment scope and exclude list
    const filteredVars = gitlabVars.filter((variable: any) => {
      // Filter by environment scope
      if (environmentScope !== '*' && variable.environment_scope !== environmentScope) {
        return false;
      }
      // Exclude specified variables
      if (excludeVars.includes(variable.key)) {
        return false;
      }
      return true;
    });
    loggingCustom(LogType.INFRA_LOG, 'info', `Filtered to ${filteredVars.length} variable(s) after applying scope and exclusion filters`);

    if (filteredVars.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No environment variables match the filter criteria',
          pulled: 0,
          file: outputFile,
        },
        { status: 200 }
      );
    }

    // Sort variables alphabetically for consistent output
    filteredVars.sort((a: any, b: any) => a.key.localeCompare(b.key));

    // Format as .env file content
    const envFileContent = formatEnvFile(filteredVars);

    // Write to file
    const envFilePath = join(process.cwd(), outputFile);
    loggingCustom(LogType.INFRA_LOG, 'info', `Writing ${filteredVars.length} variable(s) to file: ${outputFile}`);
    await writeFile(envFilePath, envFileContent, 'utf-8');
    loggingCustom(LogType.INFRA_LOG, 'info', `Successfully wrote environment file: ${envFilePath}`);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully pulled ${filteredVars.length} environment variable(s) from GitLab`,
        pulled: filteredVars.length,
        file: outputFile,
        filePath: envFilePath,
        variables: filteredVars.map((v: any) => v.key),
      },
      { status: 200 }
    );
  } catch (error) {
    loggingCustom(LogType.INFRA_LOG, 'error', `GitLab pull env error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pull environment variables from GitLab',
      },
      { status: 500 }
    );
  }
}

/**
 * Format GitLab variables as .env file content
 */
function formatEnvFile(variables: any[]): string {
  const lines: string[] = [];
  
  // Group variables by prefix for better organization
  const grouped: Record<string, any[]> = {};
  const ungrouped: any[] = [];

  for (const variable of variables) {
    const key = variable.key;
    // Group by common prefixes (e.g., NEXT_PUBLIC_, URL_, etc.)
    const prefixMatch = key.match(/^([A-Z_]+_)/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      if (!grouped[prefix]) {
        grouped[prefix] = [];
      }
      grouped[prefix].push(variable);
    } else {
      ungrouped.push(variable);
    }
  }

  // Add grouped variables with section headers
  const sortedPrefixes = Object.keys(grouped).sort();
  for (const prefix of sortedPrefixes) {
    // Add a comment header for the group
    const groupName = prefix.replace(/_$/, '').replace(/_/g, ' ').toUpperCase();
    lines.push(`# ${groupName} Variables`);
    lines.push('');
    
    for (const variable of grouped[prefix]) {
      lines.push(formatEnvLine(variable));
    }
    lines.push('');
  }

  // Add ungrouped variables
  if (ungrouped.length > 0) {
    if (lines.length > 0) {
      lines.push('# Other Variables');
      lines.push('');
    }
    for (const variable of ungrouped) {
      lines.push(formatEnvLine(variable));
    }
  }

  return lines.join('\n');
}

/**
 * Format a single environment variable line
 */
function formatEnvLine(variable: any): string {
  const key = variable.key;
  let value = variable.value || '';

  // Escape special characters in values
  // If value contains spaces, quotes, or special chars, wrap in quotes
  if (value.includes(' ') || value.includes('"') || value.includes("'") || value.includes('=')) {
    // Escape quotes and wrap in double quotes
    value = value.replace(/"/g, '\\"');
    value = `"${value}"`;
  }

  return `${key}=${value}`;
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



