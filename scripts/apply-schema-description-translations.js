/**
 * Applies per-language description_translations to each schema in data/all-schemas.json.
 * Uses scripts/schema-description-translations.json for en, fa, ar, es, fr, de, it, ru.
 * Schemas not in the map keep existing description_translations or get [{"en": description}].
 */

const fs = require('fs');
const path = require('path');

const SCHEMAS_PATH = path.join(__dirname, '..', 'data', 'all-schemas.json');
const TRANSLATIONS_PATH = path.join(__dirname, 'schema-description-translations.json');

const LANGS = ['en', 'fa', 'ar', 'es', 'fr', 'de', 'it', 'ru'];

const schemas = JSON.parse(fs.readFileSync(SCHEMAS_PATH, 'utf8'));
const translationsMap = JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf8'));

if (!Array.isArray(schemas)) {
  throw new Error('all-schemas.json root must be an array');
}

let applied = 0;
let fallback = 0;

for (const schema of schemas) {
  if (!schema || typeof schema !== 'object') continue;
  const id = schema.id;
  const desc = schema.description;
  if (desc == null || typeof desc !== 'string') continue;

  const map = translationsMap[id];
  if (map && typeof map === 'object') {
    schema.description_translations = LANGS.map((lang) => ({
      [lang]: map[lang] != null ? String(map[lang]) : String(desc),
    }));
    applied++;
  } else {
    const text = String(desc).trim();
    schema.description_translations = LANGS.map((lang) => ({ [lang]: text }));
    fallback++;
  }
}

fs.writeFileSync(SCHEMAS_PATH, JSON.stringify(schemas, null, 2));
console.log(
  `Applied separate-language description_translations: ${applied} from map, ${fallback} fallback (en only).`
);
