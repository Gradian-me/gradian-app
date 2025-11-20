/**
 * Extracts JSON object or array from text that may contain markdown code blocks,
 * explanations, or other surrounding text.
 * 
 * @param text - The text to extract JSON from
 * @returns The extracted JSON string, or null if no valid JSON is found
 */
export function extractJson(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Remove leading/trailing whitespace
  const trimmed = text.trim();

  // Try to find JSON in markdown code blocks first
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
  const jsonBlockMatch = trimmed.match(jsonBlockRegex);
  
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    const jsonCandidate = jsonBlockMatch[1].trim();
    if (isValidJson(jsonCandidate)) {
      return jsonCandidate;
    }
  }

  // Try to find JSON object or array directly
  // Look for first { or [ and try to extract complete JSON
  const objectStart = trimmed.indexOf('{');
  const arrayStart = trimmed.indexOf('[');
  
  let startIndex = -1;
  if (objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart)) {
    startIndex = objectStart;
  } else if (arrayStart !== -1) {
    startIndex = arrayStart;
  }

  if (startIndex !== -1) {
    // Try to extract JSON starting from the first { or [
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = startIndex; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && bracketCount === 0) {
          endIndex = i + 1;
          break;
        }
      } else if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
        if (braceCount === 0 && bracketCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    if (endIndex !== -1) {
      const jsonCandidate = trimmed.substring(startIndex, endIndex).trim();
      if (isValidJson(jsonCandidate)) {
        return jsonCandidate;
      }
    }
  }

  // Last resort: try the entire trimmed string
  if (isValidJson(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Validates if a string is valid JSON
 */
function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

