#!/usr/bin/env node

/**
 * Sync relation-types in data/all-data.json with relationTypeIds used in
 * repeatingConfig across data/all-schemas.json. Any relationTypeId that does
 * not exist in relation-types is added with:
 *   - id: the relationTypeId
 *   - label: derived from id (e.g. HAS_QUOTATION_ITEM → "Has Quotation Item")
 *   - color: "blue"
 *   - icon: "Workflow"
 *
 * Usage: node scripts/sync-relation-types.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'all-data.json');
const DATA_TMP = path.join(__dirname, '..', 'data', 'all-data.tmp.json');
const SCHEMAS_FILE = path.join(__dirname, '..', 'data', 'all-schemas.json');

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

/**
 * Convert relationTypeId to label: HAS_QUOTATION_ITEM → "Has Quotation Item"
 */
function idToLabel(id) {
  if (!id || typeof id !== 'string') return '';
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Collect all relationTypeIds from repeatingConfig in a schema (fields and sections).
 */
function collectRelationTypeIdsFromSchema(schema, out) {
  const visit = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.repeatingConfig && obj.repeatingConfig.relationTypeId) {
      const id = String(obj.repeatingConfig.relationTypeId).trim();
      if (id) out.add(id);
    }
    if (Array.isArray(obj)) {
      obj.forEach(visit);
    } else {
      Object.values(obj).forEach(visit);
    }
  };

  visit(schema);
}

function main() {
  const allData = loadJson(DATA_FILE, 'all-data.json');
  const allSchemas = loadJson(SCHEMAS_FILE, 'all-schemas.json');

  const relationTypes = allData['relation-types'];
  if (!Array.isArray(relationTypes)) {
    console.error('❌ all-data.json has no "relation-types" array');
    process.exit(1);
  }

  const existingIds = new Set(relationTypes.map((r) => r && r.id).filter(Boolean));

  const usedRelationTypeIds = new Set();
  if (Array.isArray(allSchemas)) {
    for (const schema of allSchemas) {
      if (schema) collectRelationTypeIdsFromSchema(schema, usedRelationTypeIds);
    }
  }

  const missing = [...usedRelationTypeIds].filter((id) => !existingIds.has(id));
  if (missing.length === 0) {
    console.log('✅ All relationTypeIds from schema repeatingConfig exist in relation-types.');
    return;
  }

  const createdBy = relationTypes[0]?.createdBy || '01KBF8N88CG4YPK6VDNQAE420Z';
  const now = new Date().toISOString();

  for (const id of missing.sort()) {
    relationTypes.push({
      id,
      label: idToLabel(id),
      color: 'blue',
      icon: 'Workflow',
      createdBy,
      updatedBy: createdBy,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  + ${id} → "${idToLabel(id)}"`);
  }

  const payload = JSON.stringify(allData, null, 2);
  writeJsonAtomically(DATA_FILE, DATA_TMP, payload);
  console.log(`✅ Added ${missing.length} missing relation type(s) to data/all-data.json`);
}

main();
