// Cost Intelligence Dashboard – star schema types

export type ProductLevel = 'Final' | 'Unpacked' | 'Drug Substance' | 'Intermediate';

export interface Product {
  id: string;
  name: string;
  parentId: string | null;
  level: ProductLevel;
}

export interface Period {
  id: string;
  year: number; // e.g. 1402, 1403, 1404
  quarter?: number;
  month?: number;
}

export interface Ledger {
  id: string;
  name: string;
  category: string;
  directIndirect: 'Direct' | 'Indirect';
  currency: string;
}

export interface CostCenter {
  id: string;
  name: string;
}

export interface Currency {
  id: string;
  code: string; // IRR, EUR
}

export type ScenarioId = 'base' | 'fx-shock' | 'ledger-growth' | 'combined';

export interface Scenario {
  id: ScenarioId;
  name: string;
}

// Facts
export interface MaterialConsumption {
  productId: string;
  periodId: string;
  amount: number;
  currency: string;
  amountBase?: number; // in base currency IRR
}

export interface SalaryFact {
  productId?: string;
  costCenterId: string;
  periodId: string;
  directIndirect: 'Direct' | 'Indirect';
  amount: number;
}

/** Salary breakdown by component (base, overtime, night work, bonus, etc.) */
export type SalaryComponentId = 'base' | 'overtime' | 'nightwork' | 'bonus' | 'allowance';

export interface SalaryComponentFact {
  costCenterId: string;
  periodId: string;
  componentId: SalaryComponentId;
  amount: number;
}

export interface SalaryComponentBarItem {
  componentName: string;
  amount: number;
}

export interface TotalSalaryByCostCenterItem {
  costCenterName: string;
  costCenterId: string;
  total: number;
}

export interface OverheadRaw {
  ledgerId: string;
  periodId: string;
  amount: number;
  currency: string;
  amountBase?: number;
}

export interface OverheadAllocation {
  fromCostCenterId?: string;
  fromLedgerId?: string;
  toProductId: string;
  periodId: string;
  amount: number;
}

export interface ProductionVolume {
  productId: string;
  periodId: string;
  volume: number;
}

export type AllocationMethod = 'step-down' | 'reciprocal';

export interface CostCenterAllocationRule {
  fromCostCenterId: string;
  toCostCenterId: string;
  driver: string;
  method: AllocationMethod;
  weight?: number;
}

// KPI and chart payload types
export interface CostIntelligenceKpis {
  totalAbsorbedCostIRR: number;
  unitCost: number;
  grossMarginPct: number;
  overheadAbsorptionRatePct: number;
  fxExposurePct: number;
  costVolatilityIndex: number;
}

export interface CostCompositionByPeriod {
  periodId: string;
  periodLabel: string;
  material: number;
  directSalary: number;
  indirectSalary: number;
  directOverhead: number;
  indirectOverhead: number;
}

export interface UnitCostTrendPoint {
  periodId: string;
  periodLabel: string;
  productId: string;
  productName: string;
  unitCost: number;
}

export interface VolumeUnitCostOverheadPoint {
  productId: string;
  productName: string;
  volume: number;
  unitCost: number;
  overheadShare: number;
}

export interface OverheadCategoryByPeriod {
  periodId: string;
  periodLabel: string;
  [ledgerKey: string]: string | number;
}

export interface LedgerPeriodGrowth {
  ledgerId: string;
  ledgerName: string;
  periodId: string;
  growthPct: number;
}

/** Growth intensity = growth impact weighted by ledger share of period overhead (varied per ledger × period). */
export interface LedgerPeriodGrowthIntensity {
  ledgerId: string;
  ledgerName: string;
  periodId: string;
  growthPct: number;
  intensity: number;
}

export interface CostCenterPeriodSalary {
  costCenterId: string;
  costCenterName: string;
  periodId: string;
  periodLabel: string;
  directSalary: number;
  indirectSalary: number;
}

export interface CostCenterProductAllocation {
  costCenterId: string;
  costCenterName: string;
  productId: string;
  productName: string;
  amount: number;
}

/** Single edge in cost center network: cost center → cost center (step-down). */
export interface CostCenterToCostCenterEdge {
  fromCostCenterId: string;
  fromCostCenterName: string;
  toCostCenterId: string;
  toCostCenterName: string;
  amount: number;
}

/** Full network: CC→CC edges and CC→product allocations for graph and tab. */
export interface CostCenterNetwork {
  ccToCc: CostCenterToCostCenterEdge[];
  ccToProduct: CostCenterProductAllocation[];
  /** Total allocated out per cost center per period (for line chart): id → { periodId, amount }[]. */
  allocatedByCcPerPeriod: Record<string, { periodId: string; amount: number }[]>;
}

export interface ScenarioParams {
  fxRateEurToIrr: number;
  ledgerGrowthPct: Record<string, number>;
}

/** Single material consumption entry for BOM node (e.g. top 5 by price). */
export interface BomMaterialItem {
  label: string;
  amount: number;
  currency: string;
}

/** Metadata for a BOM graph node (semi-product): cost breakdown and top materials. */
export interface BomNodeMetadata {
  productId: string;
  productName: string;
  level: ProductLevel;
  periodId: string;
  periodLabel: string;
  directOverhead: number;
  indirectOverhead: number;
  directSalary: number;
  indirectSalary: number;
  materialCost: number;
  top5MaterialsByPrice: BomMaterialItem[];
}
