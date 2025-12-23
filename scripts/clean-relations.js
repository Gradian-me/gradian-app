#!/usr/bin/env node

/**
 * Remove relations whose sourceId or targetId no longer exist in data/all-data.json.
 * Designed to be run before builds to keep relation graph consistent.
 *
 * Usage: node scripts/clean-relations.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'all-data.json');
const RELATIONS_FILE = path.join(__dirname, '..', 'data', 'all-data-relations.json');
const RELATIONS_TMP = path.join(__dirname, '..', 'data', 'all-data-relations.tmp.json');

function loadJson(filePath, label) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`❌ Failed to read ${label} at ${filePath}:`, error.message);
    process.exit(1);
  }
}

function writeJsonAtomically(filePath, tmpPath, payload) {
  fs.writeFileSync(tmpPath, payload, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

function buildIdIndex(allData) {
  const index = new Map();

  for (const [schemaId, records] of Object.entries(allData || {})) {
    if (!Array.isArray(records)) continue;

    const ids = new Set();
    for (const record of records) {
      if (record && record.id !== undefined && record.id !== null) {
        ids.add(String(record.id));
      }
    }

    index.set(schemaId, ids);
  }

  return index;
}

function isRelationValid(relation, idIndex) {
  if (!relation || !relation.sourceSchema || !relation.targetSchema) {
    return false;
  }

  const sourceIds = idIndex.get(relation.sourceSchema);
  const targetIds = idIndex.get(relation.targetSchema);

  if (!sourceIds || !targetIds) {
    return false;
  }

  return sourceIds.has(String(relation.sourceId)) && targetIds.has(String(relation.targetId));
}

function main() {
  const allData = loadJson(DATA_FILE, 'all-data.json');
  const allRelations = loadJson(RELATIONS_FILE, 'all-data-relations.json');

  const idIndex = buildIdIndex(allData);

  const validRelations = [];
  let removedCount = 0;

  for (const relation of Array.isArray(allRelations) ? allRelations : []) {
    if (isRelationValid(relation, idIndex)) {
      validRelations.push(relation);
    } else {
      removedCount += 1;
    }
  }

  if (removedCount === 0) {
    console.log('✅ Relations are already consistent with all-data.json');
    return;
  }

  const payload = JSON.stringify(validRelations, null, 2);
  writeJsonAtomically(RELATIONS_FILE, RELATIONS_TMP, payload);

  console.log(`✅ Removed ${removedCount} invalid relation(s). Remaining: ${validRelations.length}`);
}

main();

