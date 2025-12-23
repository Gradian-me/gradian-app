// Gradian UI - Namespaced Export File
// Components and utilities are grouped under namespaces to avoid export collisions.

export * as FormBuilder from './form-builder';
export type { FormConfig } from './form-builder/form-wrapper/types';

export * as Layout from './layout';
export type { HeaderConfig } from './layout/header/types';

export * as Analytics from './analytics';

export * as DataDisplay from './data-display';
export type { CardConfig } from './data-display/card/types';

export * as SchemaManagerComponents from './schema-manager/components';
export * as SchemaManagerHooks from './schema-manager/hooks';
export * as SchemaManagerUtils from './schema-manager/utils';
export * as SchemaManagerTypes from './schema-manager/types';
export type { FormSchema, FormSection } from './schema-manager/types/form-schema';

export * as RelationManager from './relation-manager';

export * as SharedTypes from './shared/types';
export * as SharedUtils from './shared/utils';
export * as SharedHooks from './shared/hooks';
export * as SharedConfigs from './shared/configs';
export * as SharedConstants from './shared/constants';
export * as SharedComponents from './shared/components';
export * as SharedDomain from './shared/domain';
export * as SharedErrors from './shared/errors';
export * as IndexedDbManager from './indexdb-manager';
export * as Communication from './communication';
export * as FormulaEngine from './formula-engine';
