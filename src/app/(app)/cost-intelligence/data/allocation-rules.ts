import type { CostCenterAllocationRule } from '../types';

/** Cost center → cost center (step-down). Weights per fromCostCenter must sum to 1. QC allocates to Production only; only Production allocates to products. Order: Engineering first (no incoming), then Utilities (receives from Eng), then QA, then QC, then Production. */
export const costCenterAllocationRules: CostCenterAllocationRule[] = [
  // Engineering → Production, QC, Utilities (so Utilities receives from Engineering)
  { fromCostCenterId: 'cc-engineering', toCostCenterId: 'cc-production', driver: 'Maintenance hours', method: 'step-down', weight: 0.6 },
  { fromCostCenterId: 'cc-engineering', toCostCenterId: 'cc-qc', driver: 'Calibration', method: 'step-down', weight: 0.3 },
  { fromCostCenterId: 'cc-engineering', toCostCenterId: 'cc-utilities', driver: 'Shared facilities', method: 'step-down', weight: 0.1 },
  // Utilities → Production, QC, QA, Engineering
  { fromCostCenterId: 'cc-utilities', toCostCenterId: 'cc-production', driver: 'Energy consumption', method: 'step-down', weight: 0.5 },
  { fromCostCenterId: 'cc-utilities', toCostCenterId: 'cc-qc', driver: 'Floor area', method: 'step-down', weight: 0.2 },
  { fromCostCenterId: 'cc-utilities', toCostCenterId: 'cc-qa', driver: 'Headcount', method: 'step-down', weight: 0.15 },
  { fromCostCenterId: 'cc-utilities', toCostCenterId: 'cc-engineering', driver: 'Machine hours', method: 'step-down', weight: 0.15 },
  // QA → Production, QC, Engineering, Utilities
  { fromCostCenterId: 'cc-qa', toCostCenterId: 'cc-production', driver: 'Batch count', method: 'step-down', weight: 0.5 },
  { fromCostCenterId: 'cc-qa', toCostCenterId: 'cc-qc', driver: 'Sample count', method: 'step-down', weight: 0.3 },
  { fromCostCenterId: 'cc-qa', toCostCenterId: 'cc-engineering', driver: 'Validation support', method: 'step-down', weight: 0.1 },
  { fromCostCenterId: 'cc-qa', toCostCenterId: 'cc-utilities', driver: 'Site services', method: 'step-down', weight: 0.1 },
  // QC Lab → Production only (QC does not allocate to products)
  { fromCostCenterId: 'cc-qc', toCostCenterId: 'cc-production', driver: 'Lab services', method: 'step-down', weight: 1 },
];

/** Only Production allocates to products (after step-down). */
export const costCenterProductWeights: Record<string, Record<string, number>> = {
  'cc-production': { 'fp-1': 0.6, 'fp-2': 0.4 },
};
