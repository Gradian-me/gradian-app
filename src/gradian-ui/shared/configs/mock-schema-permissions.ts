/**
 * Mock schema permissions for development/testing.
 * When a schema ID is listed here, its permissions are overridden so that
 * page access (view permission) and action buttons respect this list.
 *
 * To add more schemas or change permissions, edit the record below.
 * After changing this file: clear the schema cache (e.g. call POST /api/schemas/clear-cache
 * or use the schema manager "Clear cache" action) and refresh the page so the Edit button appears.
 */
export const MOCK_SCHEMA_PERMISSIONS: Record<string, string[]> = {
  'deviation-management': ['view', 'edit'],
};

export function getMockPermissionsForSchema(schemaId: string): string[] | undefined {
  return MOCK_SCHEMA_PERMISSIONS[schemaId];
}

/**
 * Apply mock permissions to a schema if it has a mock entry.
 * Use when the schema source (file/API) does not provide permissions.
 */
export function applyMockSchemaPermissions<T extends { id?: string; permissions?: string[] }>(
  schema: T
): T {
  const id = schema?.id;
  if (!id) return schema;
  const mock = getMockPermissionsForSchema(id);
  if (!mock) return schema;
  return { ...schema, permissions: mock };
}
