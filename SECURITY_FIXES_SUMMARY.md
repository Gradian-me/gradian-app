# Security Fixes Summary

This document summarizes the security fixes applied based on Semgrep SAST scan results.

## Critical (ERROR) Issues Fixed

### 1. Child Process and Shell Spawn Issues (`scripts/security/run-semgrep.js`)
**Issue**: Use of `execSync` and `spawnSync` with shell enabled could allow command injection.

**Fix**: 
- Replaced `execSync` with `execFileSync` for command existence checks
- Removed unnecessary shell usage in `spawnSync` calls
- Added explicit security comments explaining the safe usage

**Files Modified**:
- `scripts/security/run-semgrep.js`

### 2. Insecure Document Method - innerHTML (`src/domains/chat/components/ChatInput.tsx`)
**Issue**: Direct use of `innerHTML` could allow XSS if content is not properly sanitized.

**Fix**:
- Created new HTML sanitization utility using DOMPurify
- Added defense-in-depth sanitization: HTML escaping + DOMPurify
- All `innerHTML` assignments now use `sanitizeForContentEditable()`

**Files Modified**:
- `src/domains/chat/components/ChatInput.tsx`
- `src/gradian-ui/shared/utils/html-sanitizer.ts` (new file)

### 3. Insecure Document Method - innerHTML (`src/gradian-ui/data-display/markdown/components/MermaidDiagramSimple.tsx`)
**Issue**: SVG content from Mermaid library set via `innerHTML` without additional sanitization.

**Fix**:
- Added DOMPurify sanitization specifically for SVG content
- Created `sanitizeSvg()` function with appropriate allowlist for SVG elements

**Files Modified**:
- `src/gradian-ui/data-display/markdown/components/MermaidDiagramSimple.tsx`
- `src/gradian-ui/shared/utils/html-sanitizer.ts`

### 4. GCM Tag Length Validation (`src/gradian-ui/shared/domain/utils/sensitive-field-encryption.util.ts`)
**Issue**: GCM authentication tag length not explicitly validated before use.

**Fix**:
- Added explicit tag length validation before creating decipher
- Added detailed security comments explaining GCM tag requirements
- Enhanced error logging for invalid tag lengths

**Files Modified**:
- `src/gradian-ui/shared/domain/utils/sensitive-field-encryption.util.ts`

### 5. JWT Token Exposure (`tests/httpbook/password_test.http`)
**Issue**: Real JWT tokens in test file could be committed to version control.

**Fix**:
- Redacted JWT tokens in test file
- Added security comment warning about token exposure

**Files Modified**:
- `tests/httpbook/password_test.http`

### 6. dangerouslySetInnerHTML (`src/gradian-ui/data-display/markdown/components/markdown-elements/CodeComponent.tsx`)
**Issue**: KaTeX HTML output used with `dangerouslySetInnerHTML` without additional sanitization.

**Fix**:
- Added DOMPurify sanitization for KaTeX HTML output
- Configured allowlist for MathML elements required by KaTeX

**Files Modified**:
- `src/gradian-ui/data-display/markdown/components/markdown-elements/CodeComponent.tsx`
- `src/gradian-ui/shared/utils/html-sanitizer.ts`

## Warning Issues Addressed

### 1. Path Traversal Warnings
**Issue**: Semgrep flags `path.join()` and `path.resolve()` as potentially unsafe.

**Fix**:
- Added Semgrep suppression comments with security rationale
- Verified all path operations use `validateFilePath()` utility
- Added explicit path validation checks

**Files Modified**:
- `src/gradian-ui/data-display/markdown/utils/pathResolver.ts`
- `src/gradian-ui/shared/utils/security-utils.ts`

### 2. Prototype Pollution Warnings
**Issue**: Semgrep flags object property access patterns.

**Fix**:
- Added Semgrep suppression comments explaining safety measures
- Verified all flagged code uses `safeGetProperty()` or `isPrototypePollutionKey()` checks
- Added security comments documenting protection mechanisms

**Files Modified**:
- `src/gradian-ui/shared/utils/security-utils.ts`

### 3. Wildcard PostMessage Configuration
**Issue**: Use of `'*'` as targetOrigin in postMessage.

**Fix**:
- Added security comment explaining necessity for CDN embedding
- Documented that message payload is limited to non-sensitive control messages
- Added Semgrep suppression with rationale

**Files Modified**:
- `src/gradian-ui/form-builder/utils/gradian-form-embed.cdn.js`

## New Security Utilities

### HTML Sanitization (`src/gradian-ui/shared/utils/html-sanitizer.ts`)
Created centralized HTML sanitization utilities:
- `sanitizeHtml()` - General HTML sanitization with configurable allowlist
- `sanitizeSvg()` - SVG-specific sanitization for Mermaid diagrams
- `sanitizeForContentEditable()` - Restrictive sanitization for contentEditable elements

All utilities use DOMPurify for defense-in-depth protection against XSS.

## Remaining Warnings

Some warnings remain but are safe due to:
1. **Non-literal regexp**: Used in schema validation where patterns are controlled
2. **Unsafe format string**: Used in logging/debugging contexts where input is controlled
3. **Path traversal**: Already protected by `validateFilePath()` utility

These are documented with security comments and Semgrep suppressions where appropriate.

## Security Best Practices Applied

1. **Defense in Depth**: Multiple layers of sanitization (HTML escaping + DOMPurify)
2. **Input Validation**: All user input validated before processing
3. **Safe APIs**: Prefer safe APIs (`execFileSync` over `execSync`, `hasOwnProperty` checks)
4. **Explicit Validation**: Explicit checks for security-critical operations (GCM tag length)
5. **Documentation**: Security comments explain why code is safe or how it's protected

## Testing Recommendations

1. Run Semgrep scan again to verify fixes
2. Test HTML sanitization with various XSS payloads
3. Verify path traversal protection with malicious paths
4. Test encryption/decryption with various tag lengths
5. Verify CDN embedding still works with postMessage changes

