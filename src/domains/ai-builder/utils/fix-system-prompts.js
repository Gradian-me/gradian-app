const fs = require('fs');
const path = require('path');

// Get the path to ai-agents.json (relative to project root)
const agentsJsonPath = path.join(__dirname, '../../../../data/ai-agents.json');

const content = fs.readFileSync(agentsJsonPath, 'utf8');
const data = JSON.parse(content);

// Function to fix markdown formatting issues
function fixMarkdownFormatting(text) {
  if (!text) return text;
  
  // Fix missing newlines before markdown headers and important symbols
  // Pattern: text.## or text.### or text.** or text.###
  let fixed = text;
  
  // Fix: text.## -> text.\n##
  fixed = fixed.replace(/([^\n])##/g, '$1\n##');
  
  // Fix: text.### -> text.\n###
  fixed = fixed.replace(/([^\n])###/g, '$1\n###');
  
  // Fix: text.** -> text.\n** (but not if it's already part of a pattern like **text**)
  // Only fix if ** is at the start of a new section (followed by capital letter or CRITICAL/IMPORTANT)
  fixed = fixed.replace(/([^\n])\*\*([A-Z]|CRITICAL|IMPORTANT)/g, '$1\n**$2');
  
  // Fix: text.**Step -> text.\n**Step
  fixed = fixed.replace(/([^\n])\*\*Step/g, '$1\n**Step');
  
  // Fix: text.**CRITICAL -> text.\n**CRITICAL
  fixed = fixed.replace(/([^\n])\*\*CRITICAL/g, '$1\n**CRITICAL');
  
  // Fix: text.**IMPORTANT -> text.\n**IMPORTANT
  fixed = fixed.replace(/([^\n])\*\*IMPORTANT/g, '$1\n**IMPORTANT');
  
  // Fix: text.### -> text.\n### (for numbered sections like ### 1. Document Title)
  fixed = fixed.replace(/([^\n])###\s+\d+\./g, '$1\n### $2');
  
  // Fix: text.## -> text.\n## (for sections like ## Critical Instructions)
  fixed = fixed.replace(/([^\n])##\s+[A-Z]/g, (match, p1) => {
    // Check if it's not already a header (preceded by newline or start of string)
    return p1 + '\n##' + match.slice(p1.length + 2);
  });
  
  // Fix table structure issues
  // Fix malformed table rows with trailing || or | at end
  fixed = fixed.replace(/\|\|\s*\n/g, '|\n');
  fixed = fixed.replace(/\|\s*\|\s*\n/g, '|\n');
  
  // Remove invalid separator rows that appear in the middle of tables
  // Pattern: separator rows (only dashes/pipes) that are NOT immediately after a header row
  // We'll do this by first marking valid separators, then removing invalid ones
  fixed = fixed.replace(/\n\|[-|:\s]+\|\n(?=\|[^|]*[A-Za-z])/g, '\n');
  
  // Fix KPI table - add missing separator row
  // Pattern: | KPI Name | Description | Type | ... | followed by | Process Cycle Time
  fixed = fixed.replace(/(\| KPI Name \| Description \| Type [^|\n]*\|)\n(\| Process Cycle Time)/g, (match, header, dataRow) => {
    const headerCols = header.split('|').filter(c => c.trim()).length;
    const separator = '|' + Array(headerCols).fill('---').join('|') + '|\n';
    return header + '\n' + separator + dataRow;
  });
  
  // Fix RACI table - add missing separator row
  // Pattern: | Activity/Step | Responsible | ... | followed by | Step 1:
  fixed = fixed.replace(/(\| Activity\/Step \| Responsible [^|\n]*\|)\n(\| Step \d+:)/g, (match, header, dataRow) => {
    const headerCols = header.split('|').filter(c => c.trim()).length;
    const separator = '|' + Array(headerCols).fill('---').join('|') + '|\n';
    return header + '\n' + separator + dataRow;
  });
  
  // Generic fix: Add separator row after any table header that's missing one
  // Pattern: header row (with text) followed directly by data row (missing separator)
  // But only if the data row starts with | and has text
  fixed = fixed.replace(/(\|[^|\n]*[A-Za-z][^|\n]*\|)\n(\|[^|\n]*[A-Za-z][^|\n]*\|)/g, (match, header, dataRow) => {
    // Check if there's already a separator between them (skip if separator exists)
    // Count columns in header
    const headerCols = header.split('|').filter(c => {
      const trimmed = c.trim();
      return trimmed && !trimmed.match(/^[-|:\s]+$/);
    }).length;
    
    // Count columns in data row
    const dataCols = dataRow.split('|').filter(c => {
      const trimmed = c.trim();
      return trimmed && !trimmed.match(/^[-|:\s]+$/);
    }).length;
    
    // Only add separator if:
    // 1. Columns match
    // 2. Both have multiple columns (looks like a table)
    // 3. Header doesn't end with separator pattern
    if (headerCols > 1 && headerCols === dataCols && !header.match(/[-|:\s]+\|$/)) {
      // Create separator row with correct number of columns
      const separator = '|' + Array(headerCols).fill('---').join('|') + '|\n';
      return header + '\n' + separator + dataRow;
    }
    return match;
  });
  
  // Ensure proper newlines in table rows (each row should be on its own line)
  // Fix table rows that are missing newlines between them
  // Pattern: |col1|col2| |col1|col2| (two rows without newline)
  fixed = fixed.replace(/\|\s*\n\s*\|/g, '|\n|');
  
  // Remove trailing spaces after newlines (fix \n  \n  patterns)
  fixed = fixed.replace(/\n[ \t]+/g, '\n');
  
  // Clean up multiple consecutive newlines (more than 2)
  fixed = fixed.replace(/\n{3,}/g, '\n\n');
  
  return fixed;
}

// Fix all systemPrompt fields
let fixedCount = 0;
data.forEach((agent, index) => {
  if (agent.systemPrompt) {
    const original = agent.systemPrompt;
    const fixed = fixMarkdownFormatting(original);
    if (original !== fixed) {
      agent.systemPrompt = fixed;
      fixedCount++;
      console.log(`Fixed agent ${index + 1}: ${agent.id || 'unknown'}`);
    }
  }
});

// Write back to file
fs.writeFileSync(agentsJsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`\nFixed ${fixedCount} system prompts`);
console.log('JSON file updated successfully');

