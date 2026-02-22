import type {
  MaterialConsumption,
  SalaryFact,
  SalaryComponentFact,
  OverheadRaw,
  OverheadAllocation,
  ProductionVolume,
} from '../types';

// Base FX for conversion (EUR → IRR) – used when amountBase not stored
const DEFAULT_EUR_TO_IRR = 1350000;

const toBase = (amount: number, currency: string): number =>
  currency === 'EUR' ? amount * DEFAULT_EUR_TO_IRR : amount;

export const materialConsumption: MaterialConsumption[] = [
  { productId: 'ds-1', periodId: '1402', amount: 1200000000, currency: 'IRR', amountBase: 1200000000 },
  { productId: 'ds-1', periodId: '1403', amount: 1250000000, currency: 'IRR', amountBase: 1250000000 },
  { productId: 'ds-1', periodId: '1404', amount: 1320000000, currency: 'IRR', amountBase: 1320000000 },
  { productId: 'ds-2', periodId: '1402', amount: 800000000, currency: 'IRR', amountBase: 800000000 },
  { productId: 'ds-2', periodId: '1403', amount: 850000000, currency: 'IRR', amountBase: 850000000 },
  { productId: 'ds-2', periodId: '1404', amount: 900000000, currency: 'IRR', amountBase: 900000000 },
  { productId: 'int-1', periodId: '1402', amount: 15000, currency: 'EUR', amountBase: 15000 * DEFAULT_EUR_TO_IRR },
  { productId: 'int-1', periodId: '1403', amount: 16000, currency: 'EUR', amountBase: 16000 * DEFAULT_EUR_TO_IRR },
  { productId: 'int-1', periodId: '1404', amount: 17000, currency: 'EUR', amountBase: 17000 * DEFAULT_EUR_TO_IRR },
];

export const salaryFacts: SalaryFact[] = [
  { costCenterId: 'cc-production', periodId: '1402', directIndirect: 'Direct', amount: 450000000 },
  { costCenterId: 'cc-production', periodId: '1402', directIndirect: 'Indirect', amount: 120000000 },
  { costCenterId: 'cc-production', periodId: '1403', directIndirect: 'Direct', amount: 480000000 },
  { costCenterId: 'cc-production', periodId: '1403', directIndirect: 'Indirect', amount: 128000000 },
  { costCenterId: 'cc-production', periodId: '1404', directIndirect: 'Direct', amount: 510000000 },
  { costCenterId: 'cc-production', periodId: '1404', directIndirect: 'Indirect', amount: 135000000 },
  { costCenterId: 'cc-qc', periodId: '1402', directIndirect: 'Direct', amount: 180000000 },
  { costCenterId: 'cc-qc', periodId: '1402', directIndirect: 'Indirect', amount: 60000000 },
  { costCenterId: 'cc-qc', periodId: '1403', directIndirect: 'Direct', amount: 190000000 },
  { costCenterId: 'cc-qc', periodId: '1403', directIndirect: 'Indirect', amount: 65000000 },
  { costCenterId: 'cc-qa', periodId: '1402', directIndirect: 'Indirect', amount: 90000000 },
  { costCenterId: 'cc-qa', periodId: '1403', directIndirect: 'Indirect', amount: 95000000 },
  { costCenterId: 'cc-engineering', periodId: '1402', directIndirect: 'Indirect', amount: 70000000 },
  { costCenterId: 'cc-utilities', periodId: '1402', directIndirect: 'Indirect', amount: 110000000 },
  { costCenterId: 'cc-utilities', periodId: '1403', directIndirect: 'Indirect', amount: 118000000 },
  { costCenterId: 'cc-utilities', periodId: '1404', directIndirect: 'Indirect', amount: 125000000 },
];

/** Salary breakdown by component (base salary, overtime, night work, bonus, allowance) per cost center and period */
export const salaryComponentFacts: SalaryComponentFact[] = [
  // Production
  { costCenterId: 'cc-production', periodId: '1402', componentId: 'base', amount: 320000000 },
  { costCenterId: 'cc-production', periodId: '1402', componentId: 'overtime', amount: 65000000 },
  { costCenterId: 'cc-production', periodId: '1402', componentId: 'nightwork', amount: 38000000 },
  { costCenterId: 'cc-production', periodId: '1402', componentId: 'bonus', amount: 20000000 },
  { costCenterId: 'cc-production', periodId: '1402', componentId: 'allowance', amount: 7000000 },
  { costCenterId: 'cc-production', periodId: '1403', componentId: 'base', amount: 340000000 },
  { costCenterId: 'cc-production', periodId: '1403', componentId: 'overtime', amount: 72000000 },
  { costCenterId: 'cc-production', periodId: '1403', componentId: 'nightwork', amount: 40000000 },
  { costCenterId: 'cc-production', periodId: '1403', componentId: 'bonus', amount: 22000000 },
  { costCenterId: 'cc-production', periodId: '1403', componentId: 'allowance', amount: 6000000 },
  { costCenterId: 'cc-production', periodId: '1404', componentId: 'base', amount: 360000000 },
  { costCenterId: 'cc-production', periodId: '1404', componentId: 'overtime', amount: 78000000 },
  { costCenterId: 'cc-production', periodId: '1404', componentId: 'nightwork', amount: 42000000 },
  { costCenterId: 'cc-production', periodId: '1404', componentId: 'bonus', amount: 24000000 },
  { costCenterId: 'cc-production', periodId: '1404', componentId: 'allowance', amount: 6000000 },
  // QC Lab
  { costCenterId: 'cc-qc', periodId: '1402', componentId: 'base', amount: 165000000 },
  { costCenterId: 'cc-qc', periodId: '1402', componentId: 'overtime', amount: 12000000 },
  { costCenterId: 'cc-qc', periodId: '1402', componentId: 'nightwork', amount: 0 },
  { costCenterId: 'cc-qc', periodId: '1402', componentId: 'bonus', amount: 2000000 },
  { costCenterId: 'cc-qc', periodId: '1402', componentId: 'allowance', amount: 1000000 },
  { costCenterId: 'cc-qc', periodId: '1403', componentId: 'base', amount: 175000000 },
  { costCenterId: 'cc-qc', periodId: '1403', componentId: 'overtime', amount: 13000000 },
  { costCenterId: 'cc-qc', periodId: '1403', componentId: 'nightwork', amount: 0 },
  { costCenterId: 'cc-qc', periodId: '1403', componentId: 'bonus', amount: 1500000 },
  { costCenterId: 'cc-qc', periodId: '1403', componentId: 'allowance', amount: 1000000 },
  // QA
  { costCenterId: 'cc-qa', periodId: '1402', componentId: 'base', amount: 72000000 },
  { costCenterId: 'cc-qa', periodId: '1402', componentId: 'overtime', amount: 8000000 },
  { costCenterId: 'cc-qa', periodId: '1402', componentId: 'nightwork', amount: 0 },
  { costCenterId: 'cc-qa', periodId: '1402', componentId: 'bonus', amount: 0 },
  { costCenterId: 'cc-qa', periodId: '1402', componentId: 'allowance', amount: 10000000 },
  { costCenterId: 'cc-qa', periodId: '1403', componentId: 'base', amount: 76000000 },
  { costCenterId: 'cc-qa', periodId: '1403', componentId: 'overtime', amount: 9000000 },
  { costCenterId: 'cc-qa', periodId: '1403', componentId: 'nightwork', amount: 0 },
  { costCenterId: 'cc-qa', periodId: '1403', componentId: 'bonus', amount: 0 },
  { costCenterId: 'cc-qa', periodId: '1403', componentId: 'allowance', amount: 10000000 },
  // Engineering
  { costCenterId: 'cc-engineering', periodId: '1402', componentId: 'base', amount: 55000000 },
  { costCenterId: 'cc-engineering', periodId: '1402', componentId: 'overtime', amount: 10000000 },
  { costCenterId: 'cc-engineering', periodId: '1402', componentId: 'nightwork', amount: 5000000 },
  { costCenterId: 'cc-engineering', periodId: '1402', componentId: 'bonus', amount: 0 },
  { costCenterId: 'cc-engineering', periodId: '1402', componentId: 'allowance', amount: 0 },
  // Utilities
  { costCenterId: 'cc-utilities', periodId: '1402', componentId: 'base', amount: 75000000 },
  { costCenterId: 'cc-utilities', periodId: '1402', componentId: 'overtime', amount: 25000000 },
  { costCenterId: 'cc-utilities', periodId: '1402', componentId: 'nightwork', amount: 10000000 },
  { costCenterId: 'cc-utilities', periodId: '1402', componentId: 'bonus', amount: 0 },
  { costCenterId: 'cc-utilities', periodId: '1402', componentId: 'allowance', amount: 0 },
  { costCenterId: 'cc-utilities', periodId: '1403', componentId: 'base', amount: 80000000 },
  { costCenterId: 'cc-utilities', periodId: '1403', componentId: 'overtime', amount: 28000000 },
  { costCenterId: 'cc-utilities', periodId: '1403', componentId: 'nightwork', amount: 10000000 },
  { costCenterId: 'cc-utilities', periodId: '1404', componentId: 'base', amount: 85000000 },
  { costCenterId: 'cc-utilities', periodId: '1404', componentId: 'overtime', amount: 30000000 },
  { costCenterId: 'cc-utilities', periodId: '1404', componentId: 'nightwork', amount: 10000000 },
];

export const overheadRaw: OverheadRaw[] = [
  { ledgerId: 'led-electricity', periodId: '1402', amount: 85000000, currency: 'IRR', amountBase: 85000000 },
  { ledgerId: 'led-electricity', periodId: '1403', amount: 92000000, currency: 'IRR', amountBase: 92000000 },
  { ledgerId: 'led-electricity', periodId: '1404', amount: 100000000, currency: 'IRR', amountBase: 100000000 },
  { ledgerId: 'led-depreciation', periodId: '1402', amount: 120000000, currency: 'IRR', amountBase: 120000000 },
  { ledgerId: 'led-depreciation', periodId: '1403', amount: 120000000, currency: 'IRR', amountBase: 120000000 },
  { ledgerId: 'led-depreciation', periodId: '1404', amount: 118000000, currency: 'IRR', amountBase: 118000000 },
  { ledgerId: 'led-maintenance', periodId: '1402', amount: 55000000, currency: 'IRR', amountBase: 55000000 },
  { ledgerId: 'led-maintenance', periodId: '1403', amount: 60000000, currency: 'IRR', amountBase: 60000000 },
  { ledgerId: 'led-qa', periodId: '1402', amount: 90000000, currency: 'IRR', amountBase: 90000000 },
  { ledgerId: 'led-qa', periodId: '1403', amount: 95000000, currency: 'IRR', amountBase: 95000000 },
  { ledgerId: 'led-import-eur', periodId: '1402', amount: 18000, currency: 'EUR', amountBase: 18000 * DEFAULT_EUR_TO_IRR },
  { ledgerId: 'led-import-eur', periodId: '1403', amount: 19000, currency: 'EUR', amountBase: 19000 * DEFAULT_EUR_TO_IRR },
  { ledgerId: 'led-import-eur', periodId: '1404', amount: 20000, currency: 'EUR', amountBase: 20000 * DEFAULT_EUR_TO_IRR },
];

export const overheadAllocation: OverheadAllocation[] = [
  { fromCostCenterId: 'cc-utilities', toProductId: 'fp-1', periodId: '1402', amount: 45000000 },
  { fromCostCenterId: 'cc-utilities', toProductId: 'fp-2', periodId: '1402', amount: 38000000 },
  { fromLedgerId: 'led-depreciation', toProductId: 'fp-1', periodId: '1402', amount: 65000000 },
  { fromLedgerId: 'led-depreciation', toProductId: 'fp-2', periodId: '1402', amount: 55000000 },
  { fromCostCenterId: 'cc-qa', toProductId: 'fp-1', periodId: '1402', amount: 48000000 },
  { fromCostCenterId: 'cc-qa', toProductId: 'fp-2', periodId: '1402', amount: 42000000 },
  { fromCostCenterId: 'cc-utilities', toProductId: 'fp-1', periodId: '1403', amount: 50000000 },
  { fromCostCenterId: 'cc-utilities', toProductId: 'fp-2', periodId: '1403', amount: 42000000 },
  { fromLedgerId: 'led-depreciation', toProductId: 'fp-1', periodId: '1403', amount: 65000000 },
  { fromLedgerId: 'led-depreciation', toProductId: 'fp-2', periodId: '1403', amount: 55000000 },
  { fromCostCenterId: 'cc-utilities', toProductId: 'fp-1', periodId: '1404', amount: 52000000 },
  { fromCostCenterId: 'cc-utilities', toProductId: 'fp-2', periodId: '1404', amount: 44000000 },
];

export const productionVolume: ProductionVolume[] = [
  { productId: 'fp-1', periodId: '1402', volume: 120000 },
  { productId: 'fp-1', periodId: '1403', volume: 128000 },
  { productId: 'fp-1', periodId: '1404', volume: 135000 },
  { productId: 'fp-2', periodId: '1402', volume: 85000 },
  { productId: 'fp-2', periodId: '1403', volume: 90000 },
  { productId: 'fp-2', periodId: '1404', volume: 95000 },
];
