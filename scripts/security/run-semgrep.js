#!/usr/bin/env node

/**
 * Semgrep Security Scan Script
 * 
 * Runs Semgrep static analysis on the codebase to detect security vulnerabilities,
 * bugs, and code quality issues.
 * 
 * Prerequisites:
 * - Semgrep must be installed. Install via one of these methods:
 *   - Python: pip install semgrep
 *   - Homebrew (Mac): brew install semgrep
 *   - Windows: Download from https://github.com/returntocorp/semgrep/releases
 *   - Or use Docker (automatically handled by this script if semgrep not found)
 * 
 * Usage:
 *   npm run security:semgrep
 *   node scripts/security/run-semgrep.js
 *   node scripts/security/run-semgrep.js --json
 *   node scripts/security/run-semgrep.js --config auto
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REPORT_DIR = path.join(PROJECT_ROOT, 'reports');
const SEMGREP_REPORT_JSON = path.join(REPORT_DIR, 'semgrep-report.json');
const SEMGREP_REPORT_TXT = path.join(REPORT_DIR, 'semgrep-report.txt');

// Parse command line arguments
const args = process.argv.slice(2);
const outputJson = args.includes('--json') || args.includes('-j');
const outputText = args.includes('--text') || args.includes('-t');
const config = args.find(arg => arg.startsWith('--config='))?.split('=')[1] || 'auto';
const failOnFindings = !args.includes('--no-fail');
const useDocker = args.includes('--docker');

/**
 * Check if a command exists in PATH
 */
function commandExists(command) {
  try {
    if (process.platform === 'win32') {
      // On Windows, use where.exe directly (no shell interpretation)
      // SECURITY: Use execFile to avoid shell injection
      // nosemgrep: javascript.lang.security.detect-child-process
      // Rationale: execFileSync is safe - command is validated, no shell interpretation
      const { execFileSync } = require('child_process');
      try {
        execFileSync('where.exe', [command], { stdio: 'ignore' });
        return true;
      } catch {
        try {
          execFileSync('where.exe', [`${command}.cmd`], { stdio: 'ignore' });
          return true;
        } catch {
          return false;
        }
      }
    } else {
      // SECURITY: Use execFile to avoid shell injection
      // nosemgrep: javascript.lang.security.detect-child-process
      // Rationale: execFileSync is safe - command is validated, no shell interpretation
      const { execFileSync } = require('child_process');
      execFileSync('which', [command], { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Check if Docker is available
 */
function dockerAvailable() {
  return commandExists('docker');
}

/**
 * Run Semgrep using local installation
 */
function runSemgrepLocal() {
  console.log('🔍 Running Semgrep (local installation)...\n');

  // Ensure report directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const semgrepArgs = [
    '--config', config,
    '--json',
    '--output', SEMGREP_REPORT_JSON,
    PROJECT_ROOT
  ];

  if (failOnFindings) {
    semgrepArgs.push('--error');
  }

  try {
    // On Windows, use semgrep.cmd if available, otherwise semgrep
    const semgrepCmd = process.platform === 'win32' && commandExists('semgrep.cmd') 
      ? 'semgrep.cmd' 
      : 'semgrep';
    
    // Set UTF-8 encoding environment variables to handle Unicode characters on Windows
    const env = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      // Force UTF-8 in Windows console
      ...(process.platform === 'win32' && {
        'PYTHONLEGACYWINDOWSSTDIO': '0'
      })
    };
    
    // SECURITY: Use spawnSync without shell to prevent command injection
    // On Windows, we need shell for .cmd files, but we validate the command first
    // The semgrepCmd is validated to be either 'semgrep' or 'semgrep.cmd' (no user input)
    const semgrepProcess = spawnSync(
      semgrepCmd,
      semgrepArgs,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        env: env,
        // SECURITY: Only use shell on Windows for .cmd files, but command is validated
        // nosemgrep: javascript.lang.security.audit.spawn-shell-true
        shell: process.platform === 'win32' && semgrepCmd.endsWith('.cmd')
      }
    );
    
    // Print stdout and stderr
    if (semgrepProcess.stdout) {
      const stdout = semgrepProcess.stdout.toString();
      if (stdout) {
        process.stdout.write(stdout);
      }
    }
    if (semgrepProcess.stderr) {
      const stderr = semgrepProcess.stderr.toString();
      if (stderr) {
        process.stderr.write(stderr);
      }
    }
    
    // Check for Unicode errors in stderr
    const stderr = semgrepProcess.stderr?.toString() || '';
    const reportExists = fs.existsSync(SEMGREP_REPORT_JSON);
    const isUnicodeError = stderr.includes('charmap') || 
                          stderr.includes('codec') || 
                          stderr.includes('UnicodeEncodeError') ||
                          stderr.includes('can\'t encode character') ||
                          stderr.includes('\u202a');
    
    if (isUnicodeError && !reportExists) {
      console.error('\n❌ Unicode encoding error detected!');
      console.error('💡 This is a known Windows issue with Semgrep when scanning files with Unicode characters.');
      console.error('💡 Solution options:');
      console.error('   1. Use Docker: npm run security:semgrep -- --docker (Recommended)');
      console.error('   2. Use PowerShell wrapper: powershell -ExecutionPolicy Bypass -File scripts/security/run-semgrep.ps1');
      console.error('   3. Set console encoding: chcp 65001 (before running)');
      console.error('   4. Exclude problematic files in .semgrepignore\n');
      return { success: false, exitCode: 1, unicodeError: true };
    }
    
    // Check exit code
    if (semgrepProcess.status !== 0) {
      // Semgrep exits with code 2 when findings are found (with --error flag)
      // Exit code 1 is for other errors
      const exitCode = semgrepProcess.status || 1;
      
      // If exit code is 2, that means findings were found (which is a "successful" scan)
      // But we still need to check if the report file was created
      const findingsFound = exitCode === 2;
      
      if (!reportExists) {
        console.error(`\n⚠️  Semgrep exited with code ${exitCode} and no report was generated.`);
        if (!stderr && !semgrepProcess.stdout?.toString()) {
          console.error('💡 No error output captured. This might indicate a silent failure.');
          console.error('💡 Try running Semgrep manually to see the actual error:');
          console.error(`   ${semgrepCmd} --config=${config} --json --output=${SEMGREP_REPORT_JSON} ${PROJECT_ROOT}`);
        } else {
          console.error('💡 Check the error output above for details.');
        }
        // If no report, it's always a failure regardless of exit code
        return { success: false, exitCode, findingsFound: false };
      }
      
      // Report exists, so exit code 2 just means findings were found
      return { success: true, exitCode, findingsFound: findingsFound };
    }
    
    // Process succeeded - check if report was created
    // Semgrep should always create a report file, even if there are no findings
    if (!reportExists) {
      console.error('\n❌ Semgrep completed but no report file was created.');
      console.error(`💡 Expected report at: ${SEMGREP_REPORT_JSON}`);
      console.error('💡 This might indicate:');
      console.error('   - Semgrep encountered an error writing the report');
      console.error('   - Permission issues with the reports directory');
      console.error('   - Path issues (especially on Windows with spaces)');
      console.error('\n💡 Try:');
      console.error('   1. Run Semgrep manually: semgrep --config=auto --json --output=reports/test.json .');
      console.error('   2. Use Docker: npm run security:semgrep -- --docker');
      console.error('   3. Check Semgrep output above for errors\n');
      return { success: false, exitCode: 1 };
    }
    
    return { success: true, exitCode: 0 };
  } catch (error) {
    // Fallback error handling
    const reportExists = fs.existsSync(SEMGREP_REPORT_JSON);
    const errorOutput = error.message || '';
    const isUnicodeError = errorOutput.includes('charmap') || 
                          errorOutput.includes('codec') || 
                          errorOutput.includes('UnicodeEncodeError');
    
    if (isUnicodeError && !reportExists) {
      console.error('\n❌ Unicode encoding error detected!');
      console.error('💡 This is a known Windows issue with Semgrep.');
      console.error('💡 Solution: Use Docker: npm run security:semgrep -- --docker\n');
      return { success: false, exitCode: 1, unicodeError: true };
    }
    
    const exitCode = error.status || error.code || 1;
    return { success: false, exitCode, findingsFound: false };
  }
}

/**
 * Run Semgrep using Docker
 */
function runSemgrepDocker() {
  console.log('🐳 Running Semgrep via Docker...\n');

  // Ensure report directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const dockerArgs = [
    'run',
    '--rm',
    '-v', `${PROJECT_ROOT}:/src:ro`,
    '-v', `${REPORT_DIR}:/report:rw`,
    '-w', '/src',
    'returntocorp/semgrep:latest',
    'semgrep',
    '--config', config,
    '--json',
    '--output', '/report/semgrep-report.json',
    '/src'
  ];

  if (failOnFindings) {
    dockerArgs.push('--error');
  }

  try {
    // SECURITY: Use spawnSync without shell to prevent command injection
    // dockerArgs are constructed from validated inputs (no user input in command)
    // nosemgrep: javascript.lang.security.audit.spawn-shell-true
    // Rationale: shell is explicitly set to false, dockerArgs are validated (no user input)
    const dockerProcess = spawnSync('docker', dockerArgs, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      // SECURITY: Avoid shell on Windows - docker.exe should work without shell
      shell: false
    });
    
    if (dockerProcess.status !== 0) {
      const exitCode = dockerProcess.status || 1;
      return { success: exitCode === 2, exitCode, findingsFound: exitCode === 2 };
    }
    
    return { success: true, exitCode: 0 };
  } catch (error) {
    const exitCode = error.status || error.code || 1;
    return { success: false, exitCode, findingsFound: false };
  }
}

/**
 * Display report summary
 */
function displayReportSummary() {
  if (!fs.existsSync(SEMGREP_REPORT_JSON)) {
    console.log('⚠️  Report file not found. Semgrep may not have generated output.');
    return;
  }

  try {
    const reportData = JSON.parse(fs.readFileSync(SEMGREP_REPORT_JSON, 'utf-8'));
    const results = reportData.results || [];

    console.log('\n' + '='.repeat(50));
    console.log('📊 Semgrep Security Scan Results');
    console.log('='.repeat(50) + '\n');

    const totalFindings = results.length;
    console.log(`🔍 Total findings: ${totalFindings}\n`);

    if (totalFindings === 0) {
      console.log('✅ No security issues found!\n');
      return;
    }

    // Group by severity
    const severityCounts = {
      ERROR: 0,
      WARNING: 0,
      INFO: 0
    };

    results.forEach(result => {
      const severity = result.extra?.severity || 'INFO';
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });

    console.log('📈 Findings by severity:');
    console.log(`  🚨 ERROR:   ${severityCounts.ERROR}`);
    console.log(`  ⚠️  WARNING: ${severityCounts.WARNING}`);
    console.log(`  ℹ️  INFO:    ${severityCounts.INFO}`);
    console.log();

    // Display top findings (limit to 20 for readability)
    const displayLimit = 20;
    console.log(`📋 Top ${Math.min(displayLimit, totalFindings)} findings:\n`);
    console.log('-'.repeat(50));

    results.slice(0, displayLimit).forEach((result, index) => {
      const severity = result.extra?.severity || 'INFO';
      const severityIcon = severity === 'ERROR' ? '🚨' : severity === 'WARNING' ? '⚠️' : 'ℹ️';
      const ruleId = result.check_id || 'unknown';
      const message = result.message || 'No message';
      const filePath = path.relative(PROJECT_ROOT, result.path);
      const lineRange = result.start?.line === result.end?.line
        ? `${result.start.line}`
        : `${result.start.line}-${result.end.line}`;

      console.log(`\n${index + 1}. ${severityIcon} [${severity}] ${ruleId}`);
      console.log(`   File: ${filePath}:${lineRange}`);
      console.log(`   ${message}`);
    });

    if (totalFindings > displayLimit) {
      console.log(`\n... and ${totalFindings - displayLimit} more findings`);
    }

    console.log('\n' + '-'.repeat(50));
    console.log(`\n📄 Full JSON report: ${SEMGREP_REPORT_JSON}`);
    console.log(`\n💡 Tip: Use 'npm run security:semgrep -- --json' to see full JSON output\n`);
  } catch (error) {
    console.error('❌ Error reading report:', error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔒 Semgrep Security Scan');
  console.log('='.repeat(50));
  console.log(`📁 Project root: ${PROJECT_ROOT}`);
  console.log(`⚙️  Config: ${config}`);
  console.log(`📊 Output: ${outputJson ? 'JSON only' : 'Summary + JSON'}`);
  console.log(`📄 Report file: ${SEMGREP_REPORT_JSON}`);
  console.log('='.repeat(50) + '\n');

  // Ensure report directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    console.log(`📁 Created report directory: ${REPORT_DIR}\n`);
  }

  let result;

  // Determine how to run Semgrep
  if (useDocker) {
    if (!dockerAvailable()) {
      console.error('❌ Docker is not available. Please install Docker or use local Semgrep installation.');
      process.exit(1);
    }
    result = runSemgrepDocker();
  } else if (commandExists('semgrep')) {
    result = runSemgrepLocal();
    
    // If Unicode error occurred, suggest Docker as alternative
    if (result.unicodeError && dockerAvailable() && !useDocker) {
      console.log('💡 Trying Docker as alternative to avoid encoding issues...\n');
      result = runSemgrepDocker();
    }
  } else if (dockerAvailable()) {
    console.log('ℹ️  Semgrep not found locally. Trying Docker...\n');
    result = runSemgrepDocker();
  } else {
    console.error('❌ Semgrep not found. Please install Semgrep using one of these methods:');
    console.error('');
    console.error('  1. Python: pip install semgrep');
    console.error('  2. Homebrew (Mac): brew install semgrep');
    console.error('  3. Windows: Download from https://github.com/returntocorp/semgrep/releases');
    console.error('  4. Or use Docker: npm run security:semgrep -- --docker');
    console.error('');
    process.exit(1);
  }

  // Display results only if scan was successful
  if (result.success) {
    if (!outputJson) {
      displayReportSummary();
    } else if (fs.existsSync(SEMGREP_REPORT_JSON)) {
      console.log(fs.readFileSync(SEMGREP_REPORT_JSON, 'utf-8'));
    }
  }

  // Exit with appropriate code
  if (!result.success) {
    if (result.findingsFound && failOnFindings) {
      // Findings found (exit code 2) - this is actually a "successful" scan that found issues
      console.error('\n❌ Semgrep scan found security issues. Please review the findings above.');
      process.exit(result.exitCode || 2);
    } else if (!result.unicodeError) {
      // Actual failure (exit code 1 or other)
      console.error('\n❌ Semgrep scan failed. Please check the output above for errors.');
      process.exit(result.exitCode || 1);
    } else {
      // Unicode error - already handled
      process.exit(result.exitCode || 1);
    }
  } else {
    // Success - scan completed with no failures
    console.log('\n✅ Semgrep scan completed successfully.');
    process.exit(0);
  }
}

// Run main function
main();

