import type {
  ScenarioId,
  ScenarioParams,
  CostIntelligenceKpis,
  CostCompositionByPeriod,
  UnitCostTrendPoint,
  VolumeUnitCostOverheadPoint,
  OverheadCategoryByPeriod,
  LedgerPeriodGrowth,
  LedgerPeriodGrowthIntensity,
  CostCenterPeriodSalary,
  CostCenterProductAllocation,
  CostCenterToCostCenterEdge,
  CostCenterNetwork,
  SalaryComponentBarItem,
  TotalSalaryByCostCenterItem,
  BomNodeMetadata,
  BomMaterialItem,
} from '../types';
import type { Product, Period, Ledger, CostCenter } from '../types';
import { products, periods, ledgers, costCenters } from './dimensions';
import {
  materialConsumption,
  salaryFacts,
  salaryComponentFacts,
  overheadRaw,
  overheadAllocation,
  productionVolume,
} from './facts';
import { costCenterAllocationRules, costCenterProductWeights } from './allocation-rules';

const DEFAULT_FX_EUR_IRR = 1350000;
const LEDGER_GROWTH_DEFAULT_PCT = 8;

export function getScenarioParams(
  scenarioId: ScenarioId,
  overrides?: { fxRateEurToIrr?: number; ledgerGrowthPct?: Record<string, number> }
): ScenarioParams {
  let fxRateEurToIrr = overrides?.fxRateEurToIrr ?? DEFAULT_FX_EUR_IRR;
  const ledgerGrowthPct: Record<string, number> = {};

  ledgers.forEach((l) => {
    ledgerGrowthPct[l.id] = overrides?.ledgerGrowthPct?.[l.id] ?? LEDGER_GROWTH_DEFAULT_PCT;
  });

  if ((scenarioId === 'fx-shock' || scenarioId === 'combined') && overrides?.fxRateEurToIrr == null) {
    fxRateEurToIrr = DEFAULT_FX_EUR_IRR * 1.1;
  }
  if (scenarioId === 'ledger-growth' || scenarioId === 'combined') {
    ledgers.forEach((l) => {
      ledgerGrowthPct[l.id] = (overrides?.ledgerGrowthPct?.[l.id] ?? LEDGER_GROWTH_DEFAULT_PCT) * 1.2;
    });
  }

  return { fxRateEurToIrr, ledgerGrowthPct };
}

function getProductName(id: string): string {
  return products.find((p) => p.id === id)?.name ?? id;
}

function getPeriodLabel(id: string): string {
  return periods.find((p) => p.id === id)?.id ?? id;
}

/** Material + salary + overhead rolled to period (and optional product), with FX and growth applied */
function getAbsorbedCostForPeriod(
  periodId: string,
  params: ScenarioParams,
  productId?: string
): { total: number; material: number; directSalary: number; indirectSalary: number; directOverhead: number; indirectOverhead: number; fxAmount: number } {
  const conv = (amount: number, currency: string) =>
    currency === 'EUR' ? amount * params.fxRateEurToIrr : amount;
  const toBaseMaterial = (r: { amount: number; currency: string; amountBase?: number }) =>
    r.currency === 'EUR' ? conv(r.amount, r.currency) : (r.amountBase ?? r.amount);

  let material = 0;
  materialConsumption
    .filter((r) => r.periodId === periodId && (!productId || r.productId === productId))
    .forEach((r) => {
      material += toBaseMaterial(r);
    });

  let directSalary = 0;
  let indirectSalary = 0;
  salaryFacts
    .filter((r) => r.periodId === periodId)
    .forEach((r) => {
      if (r.directIndirect === 'Direct') directSalary += r.amount;
      else indirectSalary += r.amount;
    });
  if (productId) {
    const productShare = 0.5;
    directSalary *= productShare;
    indirectSalary *= productShare;
  }

  let directOverhead = 0;
  let indirectOverhead = 0;
  overheadRaw
    .filter((r) => r.periodId === periodId)
    .forEach((r) => {
      const base = r.currency === 'EUR' ? conv(r.amount, r.currency) : (r.amountBase ?? r.amount);
      const ledger = ledgers.find((l) => l.id === r.ledgerId);
      const growth = (params.ledgerGrowthPct[r.ledgerId] ?? 0) / 100 + 1;
      const amt = base * growth;
      if (ledger?.directIndirect === 'Direct') directOverhead += amt;
      else indirectOverhead += amt;
    });

  const allocToProduct = productId
    ? overheadAllocation
        .filter((r) => r.periodId === periodId && r.toProductId === productId)
        .reduce((s, r) => s + r.amount, 0)
    : overheadAllocation
        .filter((r) => r.periodId === periodId)
        .reduce((s, r) => s + r.amount, 0);
  indirectOverhead += allocToProduct;

  let fxAmount = materialConsumption
    .filter((r) => r.periodId === periodId && r.currency === 'EUR' && (!productId || r.productId === productId))
    .reduce((s, r) => s + conv(r.amount, r.currency), 0);
  overheadRaw
    .filter((r) => r.periodId === periodId && r.currency === 'EUR')
    .forEach((r) => { fxAmount += conv(r.amount, r.currency); });

  const total = material + directSalary + indirectSalary + directOverhead + indirectOverhead;
  return {
    total,
    material,
    directSalary,
    indirectSalary,
    directOverhead,
    indirectOverhead,
    fxAmount,
  };
}

export function computeKPIs(
  periodId: string,
  scenarioId: ScenarioId,
  productId: string | undefined,
  overrides?: { fxRateEurToIrr?: number; ledgerGrowthPct?: Record<string, number> }
): CostIntelligenceKpis {
  const params = getScenarioParams(scenarioId, overrides);
  const cost = getAbsorbedCostForPeriod(periodId, params, productId);

  const vol = productId
    ? productionVolume.find((v) => v.periodId === periodId && v.productId === productId)?.volume ?? 1
    : productionVolume.filter((v) => v.periodId === periodId).reduce((s, v) => s + v.volume, 0);

  const unitCost = vol > 0 ? cost.total / vol : 0;
  const revenue = cost.total * 1.25;
  const grossMarginPct = revenue > 0 ? ((revenue - cost.total) / revenue) * 100 : 0;
  const overheadTotal = cost.directOverhead + cost.indirectOverhead;
  const overheadAbsorptionRatePct = cost.total > 0 ? (overheadTotal / cost.total) * 100 : 0;
  const fxExposurePct = cost.total > 0 ? (cost.fxAmount / cost.total) * 100 : 0;

  const periodCosts = periods.map((p) => getAbsorbedCostForPeriod(p.id, params).total);
  const mean = periodCosts.reduce((a, b) => a + b, 0) / periodCosts.length;
  const variance =
    periodCosts.reduce((s, c) => s + (c - mean) ** 2, 0) / Math.max(1, periodCosts.length - 1);
  const costVolatilityIndex = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  return {
    totalAbsorbedCostIRR: Math.round(cost.total),
    unitCost: Math.round(unitCost),
    grossMarginPct: Math.round(grossMarginPct * 10) / 10,
    overheadAbsorptionRatePct: Math.round(overheadAbsorptionRatePct * 10) / 10,
    fxExposurePct: Math.round(fxExposurePct * 10) / 10,
    costVolatilityIndex: Math.round(costVolatilityIndex * 10) / 10,
  };
}

export function getCostCompositionByPeriod(
  scenarioId: ScenarioId,
  overrides?: { fxRateEurToIrr?: number }
): CostCompositionByPeriod[] {
  const params = getScenarioParams(scenarioId, overrides);
  return periods.map((p) => {
    const c = getAbsorbedCostForPeriod(p.id, params);
    return {
      periodId: p.id,
      periodLabel: getPeriodLabel(p.id),
      material: c.material,
      directSalary: c.directSalary,
      indirectSalary: c.indirectSalary,
      directOverhead: c.directOverhead,
      indirectOverhead: c.indirectOverhead,
    };
  });
}

export function getUnitCostTrendByProduct(
  scenarioId: ScenarioId,
  productIds: string[],
  overrides?: { fxRateEurToIrr?: number }
): UnitCostTrendPoint[] {
  const params = getScenarioParams(scenarioId, overrides);
  const result: UnitCostTrendPoint[] = [];
  for (const period of periods) {
    for (const productId of productIds.length ? productIds : products.map((p) => p.id)) {
      const cost = getAbsorbedCostForPeriod(period.id, params, productId);
      const vol = productionVolume.find(
        (v) => v.periodId === period.id && v.productId === productId
      )?.volume;
      const unitCost = vol && vol > 0 ? cost.total / vol : 0;
      result.push({
        periodId: period.id,
        periodLabel: getPeriodLabel(period.id),
        productId,
        productName: getProductName(productId),
        unitCost: Math.round(unitCost),
      });
    }
  }
  return result;
}

export function getVolumeUnitCostOverhead(
  periodId: string,
  scenarioId: ScenarioId,
  overrides?: { fxRateEurToIrr?: number }
): VolumeUnitCostOverheadPoint[] {
  const params = getScenarioParams(scenarioId, overrides);
  const result: VolumeUnitCostOverheadPoint[] = [];
  const finalProducts = products.filter((p) => p.level === 'Final');
  for (const p of finalProducts) {
    const cost = getAbsorbedCostForPeriod(periodId, params, p.id);
    const vol = productionVolume.find((v) => v.periodId === periodId && v.productId === p.id)?.volume ?? 1;
    const unitCost = cost.total / vol;
    const overheadShare =
      cost.total > 0 ? ((cost.directOverhead + cost.indirectOverhead) / cost.total) * 100 : 0;
    result.push({
      productId: p.id,
      productName: p.name,
      volume: vol,
      unitCost: Math.round(unitCost),
      overheadShare: Math.round(overheadShare * 10) / 10,
    });
  }
  return result;
}

const TOP_MATERIALS_COUNT = 5;

/**
 * Metadata for a single BOM node (semi-product): overhead (direct/indirect),
 * salary (direct/indirect), material cost, and top 5 material consumption entries by price.
 * Used to show node details when clicking a product in the BOM graph.
 */
export function getBomNodeMetadata(
  periodId: string,
  scenarioId: ScenarioId,
  productId: string,
  overrides?: { fxRateEurToIrr?: number; ledgerGrowthPct?: Record<string, number> }
): BomNodeMetadata {
  const params = getScenarioParams(scenarioId, overrides);
  const cost = getAbsorbedCostForPeriod(periodId, params, productId);
  const product = products.find((p) => p.id === productId);
  const conv = (amount: number, currency: string) =>
    currency === 'EUR' ? amount * params.fxRateEurToIrr : amount;
  const toBase = (r: { amount: number; currency: string; amountBase?: number }) =>
    r.currency === 'EUR' ? conv(r.amount, r.currency) : (r.amountBase ?? r.amount);

  const consumptionRows = materialConsumption
    .filter((r) => r.productId === productId)
    .map((r) => ({
      label: `Period ${r.periodId}`,
      amount: toBase(r),
      currency: 'IRR',
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_MATERIALS_COUNT);

  return {
    productId,
    productName: product?.name ?? productId,
    level: product?.level ?? 'Intermediate',
    periodId,
    periodLabel: getPeriodLabel(periodId),
    directOverhead: Math.round(cost.directOverhead),
    indirectOverhead: Math.round(cost.indirectOverhead),
    directSalary: Math.round(cost.directSalary),
    indirectSalary: Math.round(cost.indirectSalary),
    materialCost: Math.round(cost.material),
    top5MaterialsByPrice: consumptionRows,
  };
}

export function getOverheadCategoryByPeriod(
  scenarioId: ScenarioId,
  overrides?: { fxRateEurToIrr?: number }
): OverheadCategoryByPeriod[] {
  const params = getScenarioParams(scenarioId, overrides);
  return periods.map((p) => {
    const row: OverheadCategoryByPeriod = {
      periodId: p.id,
      periodLabel: getPeriodLabel(p.id),
    };
    ledgers.forEach((l) => {
      const raw = overheadRaw.filter((r) => r.periodId === p.id && r.ledgerId === l.id);
      const base = raw.reduce(
        (s, r) => s + (r.amountBase ?? r.amount * (r.currency === 'EUR' ? params.fxRateEurToIrr : 1)),
        0
      );
      const growth = (params.ledgerGrowthPct[l.id] ?? 0) / 100 + 1;
      row[l.name] = Math.round(base * growth);
    });
    return row;
  });
}

/** Computes actual period-over-period growth % from overheadRaw. First period (1402) has 0 (base); later periods show growth vs previous period. */
export function getLedgerPeriodGrowth(
  _scenarioId?: ScenarioId,
  _overrides?: { ledgerGrowthPct?: Record<string, number> }
): LedgerPeriodGrowth[] {
  const result: LedgerPeriodGrowth[] = [];
  const periodOrder = periods.map((p) => p.id);
  ledgers.forEach((l) => {
    periodOrder.forEach((periodId, idx) => {
      const prevPeriodId = idx > 0 ? periodOrder[idx - 1] : null;
      const curr = overheadRaw.find((r) => r.ledgerId === l.id && r.periodId === periodId);
      const currAmount = curr ? (curr.amountBase ?? curr.amount) : 0;
      if (!prevPeriodId) {
        result.push({
          ledgerId: l.id,
          ledgerName: l.name,
          periodId,
          growthPct: 0,
        });
        return;
      }
      const prev = overheadRaw.find((r) => r.ledgerId === l.id && r.periodId === prevPeriodId);
      const prevAmount = prev ? (prev.amountBase ?? prev.amount) : 0;
      const growthPct =
        prevAmount > 0 ? Math.round(((currAmount - prevAmount) / prevAmount) * 1000) / 10 : 0;
      result.push({
        ledgerId: l.id,
        ledgerName: l.name,
        periodId,
        growthPct,
      });
    });
  });
  return result;
}

/** Growth intensity = growth % weighted by ledger share of period overhead. Varied per ledger × period (not a constant). */
export function getLedgerPeriodGrowthIntensity(): LedgerPeriodGrowthIntensity[] {
  const periodOrder = periods.map((p) => p.id);
  const result: LedgerPeriodGrowthIntensity[] = [];
  periodOrder.forEach((periodId, idx) => {
    const prevPeriodId = idx > 0 ? periodOrder[idx - 1] : null;
    const periodTotal = overheadRaw
      .filter((r) => r.periodId === periodId)
      .reduce((s, r) => s + (r.amountBase ?? r.amount), 0);
    const prevPeriodTotal =
      prevPeriodId == null
        ? 0
        : overheadRaw
            .filter((r) => r.periodId === prevPeriodId)
            .reduce((s, r) => s + (r.amountBase ?? r.amount), 0);
    ledgers.forEach((l) => {
      const curr = overheadRaw.find((r) => r.ledgerId === l.id && r.periodId === periodId);
      const currAmount = curr ? (curr.amountBase ?? curr.amount) : 0;
      if (!prevPeriodId) {
        result.push({
          ledgerId: l.id,
          ledgerName: l.name,
          periodId,
          growthPct: 0,
          intensity: 0,
        });
        return;
      }
      const prev = overheadRaw.find((r) => r.ledgerId === l.id && r.periodId === prevPeriodId);
      const prevAmount = prev ? (prev.amountBase ?? prev.amount) : 0;
      const growthPct =
        prevAmount > 0 ? Math.round(((currAmount - prevAmount) / prevAmount) * 1000) / 10 : 0;
      const share = periodTotal > 0 ? currAmount / periodTotal : 0;
      const intensity = Math.round(Math.abs(growthPct) * share * 10) / 10;
      result.push({
        ledgerId: l.id,
        ledgerName: l.name,
        periodId,
        growthPct,
        intensity,
      });
    });
  });
  return result;
}

export function getCostCenterPeriodSalary(
  scenarioId: ScenarioId
): CostCenterPeriodSalary[] {
  const result: CostCenterPeriodSalary[] = [];
  periods.forEach((period) => {
    costCenters.forEach((cc) => {
      const direct = salaryFacts
        .filter(
          (f) =>
            f.periodId === period.id &&
            f.costCenterId === cc.id &&
            f.directIndirect === 'Direct'
        )
        .reduce((s, f) => s + f.amount, 0);
      const indirect = salaryFacts
        .filter(
          (f) =>
            f.periodId === period.id &&
            f.costCenterId === cc.id &&
            f.directIndirect === 'Indirect'
        )
        .reduce((s, f) => s + f.amount, 0);
      if (direct > 0 || indirect > 0) {
        result.push({
          costCenterId: cc.id,
          costCenterName: cc.name,
          periodId: period.id,
          periodLabel: getPeriodLabel(period.id),
          directSalary: direct,
          indirectSalary: indirect,
        });
      }
    });
  });
  return result;
}

const SALARY_COMPONENT_LABELS: Record<string, string> = {
  base: 'Base Salary',
  overtime: 'Overtime',
  nightwork: 'Night Work',
  bonus: 'Bonus',
  allowance: 'Allowance',
};

/** Totals per salary component (across all cost centers) for a period – for horizontal bar chart */
export function getSalaryComponentsForPeriod(periodId: string): SalaryComponentBarItem[] {
  const byComponent: Record<string, number> = {};
  salaryComponentFacts
    .filter((f) => f.periodId === periodId)
    .forEach((f) => {
      byComponent[f.componentId] = (byComponent[f.componentId] ?? 0) + f.amount;
    });
  return (['base', 'overtime', 'nightwork', 'bonus', 'allowance'] as const).map((id) => ({
    componentName: SALARY_COMPONENT_LABELS[id] ?? id,
    amount: Math.round(byComponent[id] ?? 0),
  }));
}

/** Total salary per cost center for a period – for horizontal bar chart */
export function getTotalSalaryByCostCenter(periodId: string): TotalSalaryByCostCenterItem[] {
  const byCc: Record<string, number> = {};
  salaryComponentFacts
    .filter((f) => f.periodId === periodId)
    .forEach((f) => {
      byCc[f.costCenterId] = (byCc[f.costCenterId] ?? 0) + f.amount;
    });
  return costCenters
    .map((cc) => ({
      costCenterName: cc.name,
      costCenterId: cc.id,
      total: Math.round(byCc[cc.id] ?? 0),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Own cost per cost center for a period (salary direct + indirect). */
function getCostCenterOwnCost(periodId: string): Record<string, number> {
  const out: Record<string, number> = {};
  costCenters.forEach((cc) => {
    out[cc.id] = salaryFacts
      .filter((f) => f.periodId === periodId && f.costCenterId === cc.id)
      .reduce((s, f) => s + f.amount, 0);
  });
  return out;
}

/** Step-down order: Engineering first (no incoming), then Utilities (receives from Eng), QA, QC (→ Production only), then Production (→ products). */
const STEP_DOWN_ORDER = ['cc-engineering', 'cc-utilities', 'cc-qa', 'cc-qc', 'cc-production'];

/** Full cost center network for a period: CC→CC (step-down) and CC→product, with consistent numbers. */
export function getCostCenterNetwork(periodId: string): CostCenterNetwork {
  const ownCost = getCostCenterOwnCost(periodId);
  const received: Record<string, number> = {};
  costCenters.forEach((cc) => (received[cc.id] = 0));

  const ccToCc: CostCenterToCostCenterEdge[] = [];

  for (const fromCcId of STEP_DOWN_ORDER) {
    const total = (ownCost[fromCcId] ?? 0) + (received[fromCcId] ?? 0);
    if (total <= 0) continue;

    const rules = costCenterAllocationRules.filter((r) => r.fromCostCenterId === fromCcId);
    const weightSum = rules.reduce((s, r) => s + (r.weight ?? 0), 0) || 1;
    const fromCc = costCenters.find((c) => c.id === fromCcId);
    const fromCcName = fromCc?.name ?? fromCcId;

    for (const r of rules) {
      const w = (r.weight ?? 0) / weightSum;
      const amount = Math.round(total * w);
      if (amount > 0) {
        received[r.toCostCenterId] = (received[r.toCostCenterId] ?? 0) + amount;
        const toCc = costCenters.find((c) => c.id === r.toCostCenterId);
        ccToCc.push({
          fromCostCenterId: fromCcId,
          fromCostCenterName: fromCcName,
          toCostCenterId: r.toCostCenterId,
          toCostCenterName: toCc?.name ?? r.toCostCenterId,
          amount,
        });
      }
    }
  }

  const ccToProduct: CostCenterProductAllocation[] = [];
  const finalProducts = products.filter((p) => p.level === 'Final');

  for (const ccId of ['cc-production']) {
    const total = (ownCost[ccId] ?? 0) + (received[ccId] ?? 0);
    const weights = costCenterProductWeights[ccId];
    const cc = costCenters.find((c) => c.id === ccId);
    if (!weights || !cc || total <= 0) continue;
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    for (const [prodId, w] of Object.entries(weights)) {
      const amount = Math.round((total * w) / weightSum);
      if (amount > 0) {
        const prod = finalProducts.find((p) => p.id === prodId);
        ccToProduct.push({
          costCenterId: ccId,
          costCenterName: cc.name,
          productId: prodId,
          productName: prod?.name ?? prodId,
          amount,
        });
      }
    }
  }

  const allocatedByCcPerPeriod: Record<string, { periodId: string; amount: number }[]> = {};
  costCenters.forEach((cc) => {
    const toCcSum = ccToCc.filter((e) => e.fromCostCenterId === cc.id).reduce((s, e) => s + e.amount, 0);
    const toProdSum = ccToProduct.filter((a) => a.costCenterId === cc.id).reduce((s, a) => s + a.amount, 0);
    allocatedByCcPerPeriod[cc.id] = [{ periodId, amount: toCcSum + toProdSum }];
  });

  return { ccToCc, ccToProduct, allocatedByCcPerPeriod };
}

/** Aggregates getCostCenterNetwork across all periods for the "allocated overhead by CC by period" chart. */
export function getAllocatedOverheadByCostCenterPerPeriod(): Record<string, { periodId: string; amount: number }[]> {
  const byCc: Record<string, { periodId: string; amount: number }[]> = {};
  costCenters.forEach((cc) => (byCc[cc.id] = []));
  periods.forEach((p) => {
    const net = getCostCenterNetwork(p.id);
    costCenters.forEach((cc) => {
      const toCc = net.ccToCc.filter((e) => e.fromCostCenterId === cc.id).reduce((s, e) => s + e.amount, 0);
      const toProd = net.ccToProduct.filter((a) => a.costCenterId === cc.id).reduce((s, a) => s + a.amount, 0);
      byCc[cc.id].push({ periodId: p.id, amount: toCc + toProd });
    });
  });
  return byCc;
}

export function getCostCenterProductAllocation(periodId: string): CostCenterProductAllocation[] {
  return getCostCenterNetwork(periodId).ccToProduct;
}

/** Overhead per unit by period (total overhead / total volume) */
export function getOverheadPerUnitByPeriod(
  scenarioId: ScenarioId,
  overrides?: { fxRateEurToIrr?: number }
): Array<{ periodId: string; periodLabel: string; overheadPerUnit: number }> {
  const params = getScenarioParams(scenarioId, overrides);
  return periods.map((p) => {
    const c = getAbsorbedCostForPeriod(p.id, params);
    const overhead = c.directOverhead + c.indirectOverhead;
    const vol = productionVolume.filter((v) => v.periodId === p.id).reduce((s, v) => s + v.volume, 0);
    return {
      periodId: p.id,
      periodLabel: getPeriodLabel(p.id),
      overheadPerUnit: vol > 0 ? Math.round(overhead / vol) : 0,
    };
  });
}

/** Local vs foreign cost by period (for FX tab) */
export function getLocalVsForeignByPeriod(
  scenarioId: ScenarioId,
  overrides?: { fxRateEurToIrr?: number }
): Array<{ periodId: string; periodLabel: string; local: number; foreign: number }> {
  const params = getScenarioParams(scenarioId, overrides);
  return periods.map((p) => {
    const c = getAbsorbedCostForPeriod(p.id, params);
    const foreign = c.fxAmount;
    const local = c.total - foreign;
    return {
      periodId: p.id,
      periodLabel: getPeriodLabel(p.id),
      local,
      foreign,
    };
  });
}

/** FX shock impact per product (base cost vs shocked cost delta) for waterfall */
export function getFxShockImpactByProduct(
  periodId: string,
  baseFxRate: number,
  shockedFxRate: number
): Array<{ name: string; value: number }> {
  const baseParams = getScenarioParams('base', { fxRateEurToIrr: baseFxRate });
  const shockParams = getScenarioParams('base', { fxRateEurToIrr: shockedFxRate });
  const result: Array<{ name: string; value: number }> = [];
  products.filter((p) => p.level === 'Final').forEach((prod) => {
    const baseCost = getAbsorbedCostForPeriod(periodId, baseParams, prod.id).total;
    const shockCost = getAbsorbedCostForPeriod(periodId, shockParams, prod.id).total;
    result.push({ name: prod.name, value: Math.round(shockCost - baseCost) });
  });
  return result;
}

/** Tornado: per-ledger margin impact. Shocks one ledger at a time (+shockPct). Uses fixed base revenue so margin erodes when cost rises. */
const LEDGER_SHOCK_PCT = 25;

export function getLedgerImpactTornado(
  periodId: string,
  productId: string
): Array<{ name: string; low: number; high: number }> {
  const baseParams = getScenarioParams('base');
  const baseCost = getAbsorbedCostForPeriod(periodId, baseParams, productId).total;
  const baseRevenue = baseCost * 1.25;
  const baseMargin = baseRevenue > 0 ? ((baseRevenue - baseCost) / baseRevenue) * 100 : 0;

  const items = ledgers.map((l) => {
    const shockParams = getScenarioParams('base', {
      ledgerGrowthPct: { [l.id]: LEDGER_GROWTH_DEFAULT_PCT + LEDGER_SHOCK_PCT },
    });
    const shockedCost = getAbsorbedCostForPeriod(periodId, shockParams, productId).total;
    const shockedMargin =
      baseRevenue > 0 ? ((baseRevenue - shockedCost) / baseRevenue) * 100 : 0;
    const erosion = Math.round((baseMargin - shockedMargin) * 10) / 10;
    return {
      name: l.name,
      low: Math.round(shockedMargin * 10) / 10,
      high: Math.max(0, erosion),
    };
  });
  return items.sort((a, b) => b.high - a.high);
}

export { DEFAULT_FX_EUR_IRR };
