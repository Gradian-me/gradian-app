#!/usr/bin/env node

/**
 * Build script for CDN form embed helper
 * 
 * This script builds the CDN JavaScript file with webpack-obfuscator
 * Usage: node scripts/build-cdn.js [--watch]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const watch = args.includes('--watch');

const webpackConfigPath = path.resolve(__dirname, '../webpack.cdn.config.js');
const outputDir = path.resolve(__dirname, '../public/cdn');
const outputFile = path.join(outputDir, 'form-embed-helper.min.js');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🔨 Building CDN form embed helper...');
console.log(`   Config: ${webpackConfigPath}`);
console.log(`   Output: ${outputFile}`);
console.log(`   Mode: ${watch ? 'watch' : 'production'}\n`);

try {
  const command = watch
    ? `webpack --config ${webpackConfigPath} --watch`
    : `webpack --config ${webpackConfigPath}`;

  execSync(command, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });

  if (!watch) {
    // Check if file was created
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      console.log(`\n✅ Build complete!`);
      console.log(`   File: ${outputFile}`);
      console.log(`   Size: ${fileSizeKB} KB`);
      
      // Generate integrity hash
      try {
        const crypto = require('crypto');
        const fileContent = fs.readFileSync(outputFile);
        const hash = crypto.createHash('sha384').update(fileContent).digest('base64');
        console.log(`   SHA384: ${hash}`);
        console.log(`\n   SRI Hash: sha384-${hash}`);
      } catch (err) {
        console.warn('   Could not generate integrity hash');
      }
    } else {
      console.error('❌ Build failed: Output file not found');
      process.exit(1);
    }
  }
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

