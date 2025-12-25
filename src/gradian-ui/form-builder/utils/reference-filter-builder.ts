import { extractFromDynamicContext } from './dynamic-context-extractor';
import { extractValueFromContext } from './dynamic-context-replacer';

/**
 * Builds a sourceUrl for filtering picker items based on a reference entity relation.
 * This is used to filter items (like status-items or parameter-items) based on their
 * relation to a parent entity (like status-groups or parameter-groups).
 * 
 * @param params - Configuration for building the reference filter URL
 * @param params.referenceSchema - Schema of the reference entity (e.g., "status-groups")
 * @param params.referenceRelationTypeId - Relation type ID (e.g., "HAS_STATUS_ITEM")
 * @param params.referenceEntityId - ID of the reference entity, can be static or use dynamic context
 * @param params.targetSchema - Target schema to filter (e.g., "status-items") - optional, defaults to targetSchema from field
 * @param params.schema - Form schema object (for dynamic context extraction, optional)
 * @param params.values - Form values (for dynamic context extraction, optional)
 * @returns Source URL string or empty string if parameters are invalid
 * 
 * @example
 * // Static reference entity ID
 * buildReferenceFilterUrl({
 *   referenceSchema: 'status-groups',
 *   referenceRelationTypeId: 'HAS_STATUS_ITEM',
 *   referenceEntityId: '01KCXSBQMD17BR96WWSKBJMEZ4',
 *   targetSchema: 'status-items'
 * })
 * // Returns: '/api/data/all-relations?schema=status-groups&direction=both&otherSchema=status-items&relationTypeId=HAS_STATUS_ITEM&id=01KCXSBQMD17BR96WWSKBJMEZ4'
 * 
 * @example
 * // Dynamic reference entity ID from schema
 * buildReferenceFilterUrl({
 *   referenceSchema: 'status-groups',
 *   referenceRelationTypeId: 'HAS_STATUS_ITEM',
 *   referenceEntityId: '{{formSchema.statusGroup.[0].id}}',
 *   targetSchema: 'status-items',
 *   schema: formSchema
 * })
 * 
 * @example
 * // Dynamic reference entity ID from form data
 * buildReferenceFilterUrl({
 *   referenceSchema: 'categories',
 *   referenceRelationTypeId: 'HAS_SUBCATEGORY',
 *   referenceEntityId: '{{formData.category.id}}',
 *   targetSchema: 'subcategories',
 *   values: formValues
 * })
 */
export function buildReferenceFilterUrl(params: {
  referenceSchema: string;
  referenceRelationTypeId: string;
  referenceEntityId: string;
  targetSchema?: string;
  schema?: any;
  values?: any;
}): string {
  const { referenceSchema, referenceRelationTypeId, referenceEntityId, targetSchema, schema, values } = params;

  // Validate required parameters
  if (!referenceSchema || !referenceRelationTypeId || !referenceEntityId) {
    return '';
  }

  // Resolve referenceEntityId - check if it uses dynamic context syntax
  let resolvedEntityId: string = '';
  
  if (referenceEntityId.includes('{{') && referenceEntityId.includes('}}')) {
    // Extract dynamic context pattern: {{contextKey.path}}
    const match = referenceEntityId.match(/\{\{(\w+)\.([^}]+)\}\}/);
    if (match) {
      const [, contextKey, path] = match;
      
      // Try using provided schema/values first (more reliable)
      if (contextKey === 'formSchema' && schema) {
        resolvedEntityId = extractValueFromContext('formSchema', path, { formSchema: schema });
      } else if (contextKey === 'formData' && values) {
        resolvedEntityId = extractValueFromContext('formData', path, { formData: values });
      } else {
        // Fallback to using extractFromDynamicContext (uses dynamic context store)
        // This is URI-encoded, so we decode it
        if (contextKey === 'formSchema') {
          resolvedEntityId = decodeURIComponent(extractFromDynamicContext('formSchema', path));
        } else if (contextKey === 'formData') {
          resolvedEntityId = decodeURIComponent(extractFromDynamicContext('formData', path));
        }
      }
      
      // If dynamic resolution failed and we got an empty string, return empty to indicate failure
      // This allows the caller to handle the case where dynamic context isn't ready yet
      if (!resolvedEntityId || resolvedEntityId === '') {
        return '';
      }
    } else {
      // Invalid dynamic context syntax - return empty
      return '';
    }
  } else {
    // Static value - use as-is (trim whitespace to handle any accidental spaces)
    resolvedEntityId = referenceEntityId.trim();
  }

  // If resolved entity ID is empty, return empty string
  if (!resolvedEntityId || resolvedEntityId === '') {
    return '';
  }

  // Build the API URL
  const baseUrl = '/api/data/all-relations';
  const queryParams = new URLSearchParams({
    schema: referenceSchema,
    direction: 'both',
    relationTypeId: referenceRelationTypeId,
    id: resolvedEntityId,
  });

  // Add targetSchema (otherSchema) if provided
  if (targetSchema) {
    queryParams.append('otherSchema', targetSchema);
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

