#!/usr/bin/env node

/**
 * Script to add createdBy and updatedBy fields to all data entries in all-data.json
 * that don't have these fields.
 * 
 * Usage: node scripts/add-created-updated-by.js
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_USER_ID = '01KBF8N88CG4YPK6VDNQAE420Z';
const DATA_FILE_PATH = path.join(__dirname, '..', 'data', 'all-data.json');

function addCreatedUpdatedBy() {
  try {
    console.log('Reading all-data.json...');
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContent);

    let totalEntries = 0;
    let updatedEntries = 0;
    const updatedSections = [];

    // Iterate through all top-level keys in the data object
    for (const [sectionKey, sectionData] of Object.entries(data)) {
      if (!Array.isArray(sectionData)) {
        continue;
      }

      let sectionUpdated = 0;

      // Iterate through each entry in the array
      for (const entry of sectionData) {
        if (typeof entry !== 'object' || entry === null) {
          continue;
        }

        totalEntries++;
        let entryUpdated = false;

        // Add createdBy if missing
        if (!entry.hasOwnProperty('createdBy') || entry.createdBy === null || entry.createdBy === undefined) {
          entry.createdBy = DEFAULT_USER_ID;
          entryUpdated = true;
        }

        // Add updatedBy if missing
        if (!entry.hasOwnProperty('updatedBy') || entry.updatedBy === null || entry.updatedBy === undefined) {
          entry.updatedBy = DEFAULT_USER_ID;
          entryUpdated = true;
        }

        if (entryUpdated) {
          updatedEntries++;
          sectionUpdated++;
        }
      }

      if (sectionUpdated > 0) {
        updatedSections.push({
          section: sectionKey,
          count: sectionUpdated
        });
      }
    }

    // Write the updated data back to the file
    console.log('\nWriting updated data to all-data.json...');
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');

    // Print summary
    console.log('\n=== Summary ===');
    console.log(`Total entries processed: ${totalEntries}`);
    console.log(`Entries updated: ${updatedEntries}`);
    console.log(`Entries unchanged: ${totalEntries - updatedEntries}`);
    
    if (updatedSections.length > 0) {
      console.log('\nSections with updates:');
      updatedSections.forEach(({ section, count }) => {
        console.log(`  - ${section}: ${count} entries`);
      });
    } else {
      console.log('\nNo entries needed updates. All entries already have createdBy and updatedBy fields.');
    }

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
addCreatedUpdatedBy();


