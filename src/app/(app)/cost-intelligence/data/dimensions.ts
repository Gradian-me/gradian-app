import type { Product, Period, Ledger, CostCenter, Currency, Scenario } from '../types';

export const products: Product[] = [
  { id: 'fp-1', name: 'Vial 10mg Final', parentId: null, level: 'Final' },
  { id: 'up-1', name: 'Unpacked 10mg', parentId: 'fp-1', level: 'Unpacked' },
  { id: 'ds-1', name: 'DS Batch A', parentId: 'up-1', level: 'Drug Substance' },
  { id: 'int-1', name: 'Intermediate I-1', parentId: 'ds-1', level: 'Intermediate' },
  { id: 'fp-2', name: 'Vial 20mg Final', parentId: null, level: 'Final' },
  { id: 'up-2', name: 'Unpacked 20mg', parentId: 'fp-2', level: 'Unpacked' },
  { id: 'ds-2', name: 'DS Batch B', parentId: 'up-2', level: 'Drug Substance' },
  { id: 'int-2', name: 'Intermediate I-2', parentId: 'ds-2', level: 'Intermediate' },
];

export const periods: Period[] = [
  { id: '1402', year: 1402 },
  { id: '1403', year: 1403 },
  { id: '1404', year: 1404 },
];

export const ledgers: Ledger[] = [
  { id: 'led-electricity', name: 'Electricity', category: 'Utilities', directIndirect: 'Indirect', currency: 'IRR' },
  { id: 'led-depreciation', name: 'Depreciation', category: 'Fixed', directIndirect: 'Indirect', currency: 'IRR' },
  { id: 'led-maintenance', name: 'Maintenance', category: 'Operations', directIndirect: 'Indirect', currency: 'IRR' },
  { id: 'led-qa', name: 'QA & QC', category: 'Quality', directIndirect: 'Indirect', currency: 'IRR' },
  { id: 'led-import-eur', name: 'Imported Raw (EUR)', category: 'Material', directIndirect: 'Direct', currency: 'EUR' },
];

export const costCenters: CostCenter[] = [
  { id: 'cc-production', name: 'Production' },
  { id: 'cc-qc', name: 'QC Lab' },
  { id: 'cc-qa', name: 'QA' },
  { id: 'cc-engineering', name: 'Engineering' },
  { id: 'cc-utilities', name: 'Utilities' },
];

export const currencies: Currency[] = [
  { id: 'IRR', code: 'IRR' },
  { id: 'EUR', code: 'EUR' },
];

export const scenarios: Scenario[] = [
  { id: 'base', name: 'Base' },
  { id: 'fx-shock', name: 'FX Shock' },
  { id: 'ledger-growth', name: 'Ledger Growth' },
  { id: 'combined', name: 'Combined' },
];
