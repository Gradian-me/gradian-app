/**
 * Form Filler Preload Routes Builder
 * Builds preload routes for AI form filler agent based on schema structure
 */

import type { FormSchema, FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { buildReferenceFilterUrl } from '@/gradian-ui/form-builder/utils/reference-filter-builder';

export interface PreloadRoute {
  route: string;
  title: string;
  description: string;
  method?: 'GET' | 'POST';
  jsonPath?: string;
  body?: any;
  queryParameters?: Record<string, string>;
  outputFormat?: 'json' | 'string' | 'toon';
  includedFields?: string[];
}

export interface BuildFormFillerPreloadRoutesOptions {
  /** When true, do not add the schema route (use agent preload with {{formSchema.id}} instead). */
  skipSchemaRoute?: boolean;
}

/**
 * Builds preload routes for form filler agent from schema and form data
 * @param schema - The form schema
 * @param formData - Optional current form data (for dynamic context in reference fields)
 * @param options - Optional: skipSchemaRoute to omit schema route (e.g. when using agent preload with {{formSchema.id}})
 * @returns Array of preload route configurations
 */
export function buildFormFillerPreloadRoutes(
  schema: FormSchema,
  formData?: Record<string, any>,
  options?: BuildFormFillerPreloadRoutesOptions
): PreloadRoute[] {
  const routes: PreloadRoute[] = [];
  const processedSchemas = new Set<string>(); // Track processed schemas to avoid duplicates
  const skipSchemaRoute = options?.skipSchemaRoute === true;

  // Include schema definition as RAG data (unless skipped when using agent preload with {{formSchema.id}})
  if (schema.id && !skipSchemaRoute) {
    routes.push({
      route: `/api/schemas/${schema.id}`,
      title: `${schema.singular_name || schema.name} Schema`,
      description: `Complete schema definition for ${schema.singular_name || schema.name} including fields, sections, validation rules, and field options. Use this to understand the exact structure and requirements for generating form data.`,
      method: 'GET',
      jsonPath: 'data',
      outputFormat: 'json',
    });
  }

  // Process all fields to extract related schemas and routes
  if (schema.fields && Array.isArray(schema.fields)) {
    schema.fields.forEach((field: FormField) => {
      // Handle targetSchema (picker fields)
      if (field.targetSchema && !processedSchemas.has(field.targetSchema)) {
        processedSchemas.add(field.targetSchema);
        routes.push({
          route: `/api/data/${field.targetSchema}`,
          title: `${field.targetSchema} Data`,
          description: `Available items from ${field.targetSchema} schema. Use this to match user descriptions to actual items when filling reference/picker fields.`,
          method: 'GET',
          jsonPath: 'data',
          outputFormat: 'json',
          queryParameters: {
            limit: '100', // Limit to 100 items for RAG
          },
          includedFields: ['id', 'label', 'name', 'singular_name', 'plural_name'], // Include key identifying fields
        });
      }

      // Handle referenceSchema (reference-based filtering)
      if (field.referenceSchema && field.referenceRelationTypeId && field.referenceEntityId) {
        // Build reference filter URL
        const referenceUrl = buildReferenceFilterUrl({
          referenceSchema: field.referenceSchema,
          referenceRelationTypeId: field.referenceRelationTypeId,
          referenceEntityId: field.referenceEntityId,
          targetSchema: field.targetSchema,
          schema: schema,
          values: formData,
        });

        if (referenceUrl && referenceUrl.trim() !== '') {
          // Extract target schema from URL or use field.targetSchema
          const targetSchema = field.targetSchema || field.referenceSchema;
          const routeKey = `reference-${field.referenceSchema}-${targetSchema}`;
          
          if (!processedSchemas.has(routeKey)) {
            processedSchemas.add(routeKey);
            routes.push({
              route: referenceUrl,
              title: `Filtered ${targetSchema || 'Items'} from ${field.referenceSchema}`,
              description: `Items from ${targetSchema || field.referenceSchema} filtered by relation to ${field.referenceSchema}. Use this to match user descriptions when filling reference fields.`,
              method: 'GET',
              jsonPath: 'data',
              outputFormat: 'json',
              includedFields: ['id', 'label', 'name', 'singular_name', 'plural_name'],
            });
          }
        }
      }

      // Handle sourceUrl (custom API endpoints)
      if (field.sourceUrl && typeof field.sourceUrl === 'string') {
        // Check if this sourceUrl is already added
        if (!processedSchemas.has(field.sourceUrl)) {
          processedSchemas.add(field.sourceUrl);
          routes.push({
            route: field.sourceUrl,
            title: `${field.label || field.name} Options`,
            description: `Available options for ${field.label || field.name} field from custom source. Use this to match user descriptions to available options.`,
            method: 'GET',
            jsonPath: 'data',
            outputFormat: 'json',
            includedFields: ['id', 'label', 'name', 'value'],
          });
        }
      }

      // Handle repeating sections with targetSchema
      // Note: Repeating sections are in schema.sections, but we check here for completeness
      if (schema.sections) {
        schema.sections.forEach((section) => {
          if (section.isRepeatingSection && section.repeatingConfig?.targetSchema) {
            const targetSchema = section.repeatingConfig.targetSchema;
            if (!processedSchemas.has(targetSchema)) {
              processedSchemas.add(targetSchema);
              routes.push({
                route: `/api/data/${targetSchema}`,
                title: `${targetSchema} Data`,
                description: `Available items from ${targetSchema} schema for repeating section ${section.title || section.id}. Use this to understand the structure of repeating section items.`,
                method: 'GET',
                jsonPath: 'data',
                outputFormat: 'json',
                queryParameters: {
                  limit: '100',
                },
                includedFields: ['id', 'label', 'name', 'singular_name', 'plural_name'],
              });
            }
          }
        });
      }
    });
  }

  return routes;
}

