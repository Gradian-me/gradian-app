# PowerShell wrapper for Semgrep security scan
# This script ensures proper UTF-8 encoding on Windows

# Set UTF-8 encoding for console output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set Python encoding environment variables
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

# Get the project root (parent of scripts directory)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

# Change to project root
Set-Location $projectRoot

# Run the Node.js script
node scripts/security/run-semgrep.js $args

# Exit with the same exit code
exit $LASTEXITCODE

