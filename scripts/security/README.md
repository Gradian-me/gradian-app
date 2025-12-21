# Security Scripts

This directory contains security scanning and analysis scripts for the project.

## Scripts

### `run-semgrep.js`

Runs Semgrep static analysis on the codebase to detect security vulnerabilities, bugs, and code quality issues.

#### Prerequisites

Semgrep must be installed. Choose one of these installation methods:

1. **Python (Recommended)**
   ```bash
   pip install semgrep
   ```

2. **Homebrew (Mac)**
   ```bash
   brew install semgrep
   ```

3. **Windows**
   - Download from [Semgrep releases](https://github.com/returntocorp/semgrep/releases)
   - Or use Docker (see below)

4. **Docker** (Alternative - no installation needed)
   ```bash
   npm run security:semgrep -- --docker
   ```

#### Usage

```bash
# Basic scan (auto-detects semgrep installation)
npm run security:semgrep

# Use Docker if semgrep not installed locally (Recommended for Windows)
npm run security:semgrep -- --docker

# Output only JSON report
npm run security:semgrep -- --json

# Use specific config (default: auto)
npm run security:semgrep -- --config=auto

# Don't fail on findings (useful for CI)
npm run security:semgrep -- --no-fail
```

#### Windows Unicode Encoding Issue

If you encounter a `'charmap' codec can't encode character` error on Windows:

1. **Use Docker (Recommended)**: `npm run security:semgrep -- --docker`
2. **Use PowerShell wrapper**: `powershell -ExecutionPolicy Bypass -File scripts/security/run-semgrep.ps1`
3. **Set console encoding manually**: Run `chcp 65001` in PowerShell/cmd before running the script
4. **Exclude problematic files**: Add file patterns to `.semgrepignore`

The script will automatically detect encoding errors and suggest using Docker if available.

#### Options

- `--json`, `-j`: Output only JSON report (no summary)
- `--text`, `-t`: Output text report
- `--config=<config>`: Semgrep config to use (default: `auto`)
- `--docker`: Force use of Docker (requires Docker installed)
- `--no-fail`: Don't exit with error code when findings are detected

#### Output

The script generates reports in the `reports/` directory:
- `semgrep-report.json`: Full JSON report with all findings
- Summary is displayed in the console

#### Exit Codes

- `0`: Scan completed successfully (no findings or `--no-fail` used)
- `2`: Security findings detected (when `--error` flag is used)
- `1`: Error during scan execution

#### Configuration

Semgrep uses the `.semgrepignore` file in the project root to exclude files and directories from scanning. Common exclusions include:
- `node_modules/`
- `.next/`
- Build outputs
- Generated files
- Documentation

## CI/CD Integration

This script is also used in the GitLab CI/CD pipeline (`.gitlab-ci.yml`) in the `semgrep_sast` job. The CI version uses Docker to ensure consistent execution across environments.

## Related Documentation

- [Security Guidelines](../../docs/SECURITY.md)
- [OWASP Security Audit](../../OWASP_SECURITY_AUDIT.md)
- [Security Implementation Summary](../../docs/SECURITY_IMPLEMENTATION_SUMMARY.md)

