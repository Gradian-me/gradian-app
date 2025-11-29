#!/usr/bin/env node

/**
 * Build script for CDN form embed helper
 * 
 * This script builds multiple CDN JavaScript files with webpack-obfuscator
 * Usage: node scripts/build-cdn.js [--watch]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const watch = args.includes('--watch');

// Define all build configurations
const buildConfigs = [
  {
    name: 'Popup Version',
    config: 'webpack.cdn.config.js',
    output: 'form-embed-helper.min.js',
  },
  {
    name: 'Modal Version',
    config: 'webpack.cdn.modal.config.js',
    output: 'form-embed-helper-modal.min.js',
  },
];

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public/cdn');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🔨 Building CDN form embed helpers...');
console.log(`   Output directory: ${outputDir}`);
console.log(`   Mode: ${watch ? 'watch' : 'production'}\n`);

// Build all configs
let allSuccess = true;
const results = [];

for (const buildConfig of buildConfigs) {
  const configPath = path.join(projectRoot, buildConfig.config);
  const outputFile = path.join(outputDir, buildConfig.output);

  console.log(`\n📦 Building ${buildConfig.name}...`);
  console.log(`   Config: ${buildConfig.config}`);
  console.log(`   Output: ${buildConfig.output}`);

  try {
    // Use quoted paths to handle spaces
    const configPathQuoted = JSON.stringify(configPath);
    const command = watch
      ? `webpack --config ${configPathQuoted} --watch`
      : `webpack --config ${configPathQuoted}`;

    execSync(command, {
      stdio: 'inherit',
      cwd: projectRoot,
      shell: true, // Use shell to handle path quoting properly
    });

    if (!watch) {
      // Check if file was created
      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        
        // Generate integrity hash
        let hash = null;
        try {
          const crypto = require('crypto');
          const fileContent = fs.readFileSync(outputFile);
          hash = crypto.createHash('sha384').update(fileContent).digest('base64');
        } catch (err) {
          // Ignore hash generation errors
        }

        results.push({
          name: buildConfig.name,
          file: buildConfig.output,
          size: fileSizeKB,
          hash: hash,
          success: true,
        });

        console.log(`   ✅ ${buildConfig.name} built successfully`);
        console.log(`   Size: ${fileSizeKB} KB`);
        if (hash) {
          console.log(`   SRI Hash: sha384-${hash}`);
        }
      } else {
        console.error(`   ❌ Output file not found: ${buildConfig.output}`);
        results.push({
          name: buildConfig.name,
          file: buildConfig.output,
          success: false,
        });
        allSuccess = false;
      }
    } else {
      // In watch mode, just mark as started
      results.push({
        name: buildConfig.name,
        file: buildConfig.output,
        success: true,
        watching: true,
      });
    }
  } catch (error) {
    console.error(`   ❌ Build failed for ${buildConfig.name}:`, error.message);
    results.push({
      name: buildConfig.name,
      file: buildConfig.output,
      success: false,
      error: error.message,
    });
    allSuccess = false;
  }
}

if (!watch) {
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Build Summary:');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}: ${result.file} (${result.size} KB)`);
    } else {
      console.log(`❌ ${result.name}: Failed`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  });
  
  console.log('='.repeat(60));
  
  if (allSuccess) {
    console.log('\n✅ All builds completed successfully!');
  } else {
    console.log('\n❌ Some builds failed. Check errors above.');
    process.exit(1);
  }
}

