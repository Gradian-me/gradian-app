#!/usr/bin/env node

/**
 * 1) Remove relations whose sourceId or targetId no longer exist in data/all-data.json.
 * 2) Remove selectedFields/selectedSections from detailPageMetadata.quickActions where
 *    the field or section does not exist in that schema.
 * Designed to be run before builds to keep relation graph consistent.
 *
 * Usage: node scripts/clean-relations.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'all-data.json');
const SCHEMAS_FILE = path.join(__dirname, '..', 'data', 'all-schemas.json');
const SCHEMAS_TMP = path.join(__dirname, '..', 'data', 'all-schemas.tmp.json');
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

function buildSchemasIdIndex(allSchemas) {
  const ids = new Set();
  
  if (!Array.isArray(allSchemas)) {
    return ids;
  }

  for (const schema of allSchemas) {
    if (schema && schema.id !== undefined && schema.id !== null) {
      ids.add(String(schema.id));
    }
  }

  return ids;
}

function isRelationValid(relation, idIndex, schemasIdIndex) {
  if (!relation || !relation.sourceSchema || !relation.targetSchema) {
    return false;
  }

  const sourceIds = idIndex.get(relation.sourceSchema);
  if (!sourceIds || !sourceIds.has(String(relation.sourceId))) {
    return false;
  }

  // Special case: if targetSchema is "schemas", check all-schemas.json instead
  if (relation.targetSchema === 'schemas') {
    return schemasIdIndex.has(String(relation.targetId));
  }

  const targetIds = idIndex.get(relation.targetSchema);
  if (!targetIds || !targetIds.has(String(relation.targetId))) {
    return false;
  }

  return true;
}

function buildSchemaFieldAndSectionSets(schema) {
  const fieldIds = new Set();
  const sectionIds = new Set();

  if (Array.isArray(schema.sections)) {
    for (const s of schema.sections) {
      if (s && s.id != null) sectionIds.add(String(s.id));
    }
  }
  if (Array.isArray(schema.fields)) {
    for (const f of schema.fields) {
      if (f && f.id != null) fieldIds.add(String(f.id));
    }
  }

  return { fieldIds, sectionIds };
}

/**
 * Clean quickActions in schema.detailPageMetadata: remove entries from
 * selectedFields/selectedSections that don't exist in this schema.
 * Returns true if any change was made.
 */
function cleanQuickActionsForSchema(schema) {
  const meta = schema.detailPageMetadata;
  if (!meta || !Array.isArray(meta.quickActions)) return false;

  const { fieldIds, sectionIds } = buildSchemaFieldAndSectionSets(schema);
  let changed = false;

  for (const action of meta.quickActions) {
    if (!action) continue;

    if (Array.isArray(action.selectedFields)) {
      const before = action.selectedFields.length;
      action.selectedFields = action.selectedFields.filter((id) =>
        id != null && fieldIds.has(String(id))
      );
      if (action.selectedFields.length !== before) changed = true;
    }

    if (Array.isArray(action.selectedSections)) {
      const before = action.selectedSections.length;
      action.selectedSections = action.selectedSections.filter((id) =>
        id != null && sectionIds.has(String(id))
      );
      if (action.selectedSections.length !== before) changed = true;
    }
  }

  return changed;
}

function main() {
  const allData = loadJson(DATA_FILE, 'all-data.json');
  const allSchemas = loadJson(SCHEMAS_FILE, 'all-schemas.json');
  const allRelations = loadJson(RELATIONS_FILE, 'all-data-relations.json');

  const idIndex = buildIdIndex(allData);
  const schemasIdIndex = buildSchemasIdIndex(allSchemas);

  // --- Clean relations ---
  const validRelations = [];
  let removedCount = 0;

  for (const relation of Array.isArray(allRelations) ? allRelations : []) {
    if (isRelationValid(relation, idIndex, schemasIdIndex)) {
      validRelations.push(relation);
    } else {
      removedCount += 1;
    }
  }

  if (removedCount > 0) {
    const payload = JSON.stringify(validRelations, null, 2);
    writeJsonAtomically(RELATIONS_FILE, RELATIONS_TMP, payload);
    console.log(`✅ Removed ${removedCount} invalid relation(s). Remaining: ${validRelations.length}`);
  } else {
    console.log('✅ Relations are already consistent with all-data.json and all-schemas.json');
  }

  // --- Clean quickActions selectedFields/selectedSections ---
  let schemasChanged = false;
  if (Array.isArray(allSchemas)) {
    for (const schema of allSchemas) {
      if (schema && cleanQuickActionsForSchema(schema)) {
        schemasChanged = true;
      }
    }
  }

  if (schemasChanged) {
    const schemasPayload = JSON.stringify(allSchemas, null, 2);
    writeJsonAtomically(SCHEMAS_FILE, SCHEMAS_TMP, schemasPayload);
    console.log('✅ Cleaned invalid selectedFields/selectedSections from detailPageMetadata.quickActions in all-schemas.json');
  } else {
    console.log('✅ quickActions selectedFields/selectedSections are already consistent with schema fields/sections');
  }
}

main();

