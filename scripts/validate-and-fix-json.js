#!/usr/bin/env node

/**
 * Script to validate and fix JSON syntax errors in all-data.json
 * 
 * Usage: node scripts/validate-and-fix-json.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, '..', 'data', 'all-data.json');

function validateAndFixJson() {
  try {
    console.log('Reading all-data.json...');
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    
    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(fileContent);
      console.log('✅ JSON is valid!');
      return;
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError.message);
      
      // Try to find and fix common JSON issues
      if (parseError.message.includes('position')) {
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
          const errorPos = parseInt(match[1]);
          const start = Math.max(0, errorPos - 200);
          const end = Math.min(fileContent.length, errorPos + 200);
          const context = fileContent.substring(start, end);
          
          console.log('\nContext around error position:');
          console.log(context);
          console.log('\nTrying to identify the issue...');
          
          // Check for common issues
          const lines = fileContent.split('\n');
          const errorLine = fileContent.substring(0, errorPos).split('\n').length;
          console.log(`Error is around line ${errorLine}`);
          
          // Try to find unclosed strings, missing commas, etc.
          let fixedContent = fileContent;
          
          // Check for unclosed strings (look for strings that don't end with quote before next property)
          // This is a simple heuristic - might need more sophisticated parsing
          const unclosedStringPattern = /"([^"]*)$/m;
          if (unclosedStringPattern.test(context)) {
            console.log('⚠️  Possible unclosed string detected');
          }
          
          // Try to fix common issues
          // 1. Missing closing quotes in strings
          // 2. Missing commas between properties
          // 3. Trailing commas
          
          // For now, just report the issue
          console.log('\n⚠️  Manual inspection required. The JSON file may have syntax errors.');
          console.log(`Error position: ${errorPos} (approximately line ${errorLine})`);
          process.exit(1);
        }
      }
      
      throw parseError;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
validateAndFixJson();


