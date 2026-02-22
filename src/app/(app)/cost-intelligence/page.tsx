'use client';

import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormTabs, FormTabsList, FormTabsTrigger } from '@/gradian-ui/form-builder/form-elements';
import { createChartTheme } from '@/gradian-ui/shared/constants/chart-theme';
import { CostKpiCards } from './_components/cost-kpi-cards';
import CostStackedBarTrend from './_components/cost-stacked-bar-trend';
import CostMultiLine from './_components/cost-multi-line';
import CostTreemap from './_components/cost-treemap';
import CostScatter from './_components/cost-scatter';
import CostStackedArea from './_components/cost-stacked-area';
import CostHeatmap from './_components/cost-heatmap';
import CostRadar from './_components/cost-radar';
import CostWaterfall from './_components/cost-waterfall';
import CostTornado from './_components/cost-tornado';
import CostInsightCard from './_components/cost-insight-card';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';
import type { ScenarioId } from './types';
import { products, periods, ledgers, costCenters } from './data/dimensions';
import {
  computeKPIs,
  getCostCompositionByPeriod,
  getUnitCostTrendByProduct,
  getVolumeUnitCostOverhead,
  getOverheadCategoryByPeriod,
  getLedgerPeriodGrowth,
  getLedgerPeriodGrowthIntensity,
  getCostCenterPeriodSalary,
  getCostCenterProductAllocation,
  getCostCenterNetwork,
  getAllocatedOverheadByCostCenterPerPeriod,
  getSalaryComponentsForPeriod,
  getTotalSalaryByCostCenter,
  getOverheadPerUnitByPeriod,
  getLocalVsForeignByPeriod,
  getFxShockImpactByProduct,
  getLedgerImpactTornado,
  DEFAULT_FX_EUR_IRR,
} from './data/scenario-engine';
import ReactECharts from 'echarts-for-react';
import { CHART_COLOR_PALETTE } from '@/gradian-ui/shared/constants/chart-theme';
import { Label } from '@/components/ui/label';

type Tabs =
  | 'cost-structure'
  | 'overhead'
  | 'salary'
  | 'fx'
  | 'ledger-growth'
  | 'cost-center-network';

export default function CostIntelligencePage() {
  const { resolvedTheme } = useTheme();
  const chartTheme = useMemo(() => createChartTheme(resolvedTheme === 'dark'), [resolvedTheme]);
  const [activeTab, setActiveTab] = useState<Tabs>('cost-structure');
  const [periodId, setPeriodId] = useState('1403');
  const [scenarioId, setScenarioId] = useState<ScenarioId>('base');
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [fxRateOverride, setFxRateOverride] = useState(DEFAULT_FX_EUR_IRR);

  useSetLayoutProps({ title: 'Cost Intelligence', icon: 'Calculator' });

  const kpis = useMemo(
    () =>
      computeKPIs(periodId, scenarioId, productId, {
        fxRateEurToIrr: scenarioId === 'fx-shock' || scenarioId === 'combined' ? fxRateOverride : undefined,
      }),
    [periodId, scenarioId, productId, fxRateOverride]
  );

  const costComposition = useMemo(
    () =>
      getCostCompositionByPeriod(scenarioId, {
        fxRateEurToIrr: scenarioId === 'fx-shock' || scenarioId === 'combined' ? fxRateOverride : undefined,
      }),
    [scenarioId, fxRateOverride]
  );

  const unitCostTrend = useMemo(
    () =>
      getUnitCostTrendByProduct(scenarioId, productId ? [productId] : [], {
        fxRateEurToIrr: scenarioId === 'fx-shock' || scenarioId === 'combined' ? fxRateOverride : undefined,
      }),
    [scenarioId, productId, fxRateOverride]
  );

  const volumeUnitCostOverhead = useMemo(
    () =>
      getVolumeUnitCostOverhead(periodId, scenarioId, {
        fxRateEurToIrr: scenarioId === 'fx-shock' || scenarioId === 'combined' ? fxRateOverride : undefined,
      }),
    [periodId, scenarioId, fxRateOverride]
  );

  const overheadByPeriod = useMemo(
    () =>
      getOverheadCategoryByPeriod(scenarioId, {
        fxRateEurToIrr: scenarioId === 'fx-shock' || scenarioId === 'combined' ? fxRateOverride : undefined,
      }),
    [scenarioId, fxRateOverride]
  );

  const ledgerGrowthData = useMemo(() => getLedgerPeriodGrowth(scenarioId), [scenarioId]);
  const heatmapLedgerPeriod = useMemo(
    () =>
      ledgerGrowthData.map((d) => ({ x: d.periodId, y: d.ledgerName, value: d.growthPct })),
    [ledgerGrowthData]
  );
  const ledgerGrowthIntensityData = useMemo(() => getLedgerPeriodGrowthIntensity(), []);
  const heatmapLedgerPeriodIntensity = useMemo(
    () =>
      ledgerGrowthIntensityData.map((d) => ({
        x: d.periodId,
        y: d.ledgerName,
        value: d.intensity,
      })),
    [ledgerGrowthIntensityData]
  );

  const overheadPerUnit = useMemo(
    () =>
      getOverheadPerUnitByPeriod(scenarioId, {
        fxRateEurToIrr: scenarioId === 'fx-shock' || scenarioId === 'combined' ? fxRateOverride : undefined,
      }),
    [scenarioId, fxRateOverride]
  );

  const radarOverhead = useMemo(() => {
    const last = overheadByPeriod[overheadByPeriod.length - 1];
    if (!last) return [];
    return ledgers.map((l) => ({
      name: l.name,
      value: (typeof last[l.name] === 'number' ? (last[l.name] as number) : 0) / 1e6,
    }));
  }, [overheadByPeriod]);

  const costCenterSalary = useMemo(() => getCostCenterPeriodSalary(scenarioId), [scenarioId]);
  const salaryComponentsBar = useMemo(
    () => getSalaryComponentsForPeriod(periodId),
    [periodId]
  );
  const totalSalaryByCostCenter = useMemo(
    () => getTotalSalaryByCostCenter(periodId),
    [periodId]
  );
  const costCenterNetwork = useMemo(() => getCostCenterNetwork(periodId), [periodId]);
  const ccProductAllocation = useMemo(
    () => costCenterNetwork.ccToProduct,
    [costCenterNetwork]
  );
  const heatmapCcProduct = useMemo(() => {
    const byKey = new Map<string, number>();
    ccProductAllocation.forEach((a) => {
      byKey.set(`${a.costCenterId}:${a.productId}`, Math.round(a.amount / 1e6));
    });
    const finalProds = products.filter((p) => p.level === 'Final');
    return costCenters.flatMap((cc) =>
      finalProds.map((p) => ({
        x: cc.name,
        y: p.name,
        value: byKey.get(`${cc.id}:${p.id}`) ?? 0,
      }))
    );
  }, [ccProductAllocation]);
  const allocatedOverheadByCcAllPeriods = useMemo(
    () => getAllocatedOverheadByCostCenterPerPeriod(),
    []
  );

  const localVsForeign = useMemo(
    () => getLocalVsForeignByPeriod(scenarioId, { fxRateEurToIrr: fxRateOverride }),
    [scenarioId, fxRateOverride]
  );

  const fxShockImpact = useMemo(() => {
    const base = DEFAULT_FX_EUR_IRR;
    const shock = fxRateOverride !== base ? fxRateOverride : base * 1.1;
    return getFxShockImpactByProduct(periodId, base, shock);
  }, [periodId, fxRateOverride]);

  const tornadoData = useMemo(() => {
    const pid = productId || products.find((p) => p.level === 'Final')?.id;
    return pid ? getLedgerImpactTornado(periodId, pid) : [];
  }, [periodId, productId]);

  const bomGraph = useMemo(() => {
    const nodes: GraphNodeData[] = products.map((p) => ({
      id: p.id,
      schemaId: 'product',
      title: p.name,
      incomplete: false,
      parentId: p.parentId,
      payload: { level: p.level },
    }));
    const edges: GraphEdgeData[] = products
      .filter((p) => p.parentId)
      .map((p) => ({
        id: `e-${p.parentId}-${p.id}`,
        source: p.parentId!,
        target: p.id,
        sourceId: p.parentId!,
        targetId: p.id,
        sourceSchema: 'product',
        targetSchema: 'product',
        relationTypeId: 'contains',
      }));
    return {
      nodes,
      edges,
      nodeTypes: [
        { id: 'Final', label: 'Final', color: 'blue', icon: 'Package' },
        { id: 'Unpacked', label: 'Unpacked', color: 'violet', icon: 'Layers' },
        { id: 'Drug Substance', label: 'Drug Substance', color: 'green', icon: 'FlaskConical' },
        { id: 'Intermediate', label: 'Intermediate', color: 'amber', icon: 'Box' },
      ],
      relationTypes: [{ id: 'contains', label: 'Contains', color: 'slate', icon: 'ArrowRight' }],
    };
  }, []);

  const networkGraph = useMemo(() => {
    const nodes: GraphNodeData[] = [
      ...costCenters.map((cc) => ({
        id: cc.id,
        schemaId: 'costCenter',
        title: cc.name,
        incomplete: false,
        parentId: null as string | null,
        payload: { type: 'costCenter' },
      })),
      ...products
        .filter((p) => p.level === 'Final')
        .map((p) => ({
          id: p.id,
          schemaId: 'product',
          title: p.name,
          incomplete: false,
          parentId: null as string | null,
          payload: { type: 'product' },
        })),
    ];
    const edges: GraphEdgeData[] = [
      ...costCenterNetwork.ccToCc.map((e, i) => ({
        id: `cc-cc-${i}`,
        source: e.fromCostCenterId,
        target: e.toCostCenterId,
        sourceId: e.fromCostCenterId,
        targetId: e.toCostCenterId,
        sourceSchema: 'costCenter',
        targetSchema: 'costCenter',
        relationTypeId: 'allocates-to-cc',
        payload: { amount: e.amount, label: `${(e.amount / 1e6).toFixed(1)}M` },
      })),
      ...costCenterNetwork.ccToProduct.map((a, i) => ({
        id: `cc-prod-${i}`,
        source: a.costCenterId,
        target: a.productId,
        sourceId: a.costCenterId,
        targetId: a.productId,
        sourceSchema: 'costCenter',
        targetSchema: 'product',
        relationTypeId: 'allocates',
        payload: { amount: a.amount, label: `${(a.amount / 1e6).toFixed(1)}M` },
      })),
    ];
    return {
      nodes,
      edges,
      nodeTypes: [
        { id: 'costCenter', label: 'Cost Center', color: 'violet', icon: 'Building' },
        { id: 'product', label: 'Product', color: 'blue', icon: 'Package' },
      ],
      relationTypes: [
        { id: 'allocates-to-cc', label: 'Allocates to CC', color: 'amber', icon: 'ArrowRight' },
        { id: 'allocates', label: 'Allocates to Product', color: 'green', icon: 'ArrowRight' },
      ],
    };
  }, [costCenterNetwork]);

  const allocatedOverheadByCc = allocatedOverheadByCcAllPeriods;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Cost Intelligence
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Multi-period cost structure, overhead, FX exposure, and cost center allocation.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          value={productId ?? ''}
          onChange={(e) => setProductId(e.target.value || undefined)}
        >
          <option value="">All products</option>
          {products.filter((p) => p.level === 'Final').map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <CostKpiCards kpis={kpis} />

      <FormTabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tabs)}>
        <FormTabsList className="min-w-full bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex-wrap">
          {[
            ['cost-structure', 'Cost Structure & BOM'],
            ['overhead', 'Overhead'],
            ['salary', 'Salary & Cost Center'],
            ['fx', 'FX Exposure'],
            ['ledger-growth', 'Ledger Growth'],
            ['cost-center-network', 'Cost Center Network'],
          ].map(([id, label]) => (
            <FormTabsTrigger key={id} value={id} className="px-4 py-1.5 text-sm">
              {label}
            </FormTabsTrigger>
          ))}
        </FormTabsList>
      </FormTabs>

      {activeTab === 'cost-structure' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product hierarchy (BOM)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[320px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <GraphViewer
                    data={{
                      nodes: bomGraph.nodes,
                      edges: bomGraph.edges,
                      nodeTypes: bomGraph.nodeTypes,
                      relationTypes: bomGraph.relationTypes,
                    }}
                    height="100%"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cost composition by period</CardTitle>
              </CardHeader>
              <CardContent>
                <CostStackedBarTrend data={costComposition} theme={chartTheme} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Unit cost trend</CardTitle>
              </CardHeader>
              <CardContent>
                <CostMultiLine data={unitCostTrend} theme={chartTheme} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Hierarchical cost breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CostTreemap data={costComposition} theme={chartTheme} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Volume vs unit cost vs overhead share</CardTitle>
              </CardHeader>
              <CardContent>
                <CostScatter data={volumeUnitCostOverhead} theme={chartTheme} />
              </CardContent>
            </Card>
          </div>
          <div className="h-full min-h-0">
            <CostInsightCard
              title="Cost structure insights"
              payload={{
                costComposition,
                unitCostTrend,
                volumeUnitCostOverhead,
                periodId,
                scenarioId,
              }}
              prompt="Focus on BOM and cost structure. Summarize key cost drivers and suggest where to look for savings."
            />
          </div>
        </div>
      )}

      {activeTab === 'overhead' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overhead categories by period</CardTitle>
              </CardHeader>
              <CardContent>
                <CostStackedArea
                  data={overheadByPeriod}
                  ledgerNames={ledgers.map((l) => l.name)}
                  theme={chartTheme}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ledger × Period growth %</CardTitle>
              </CardHeader>
              <CardContent>
                <CostHeatmap
                  data={heatmapLedgerPeriod}
                  xLabel="Period"
                  yLabel="Ledger"
                  theme={chartTheme}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Overhead structure (latest period)</CardTitle>
              </CardHeader>
              <CardContent>
                <CostRadar data={radarOverhead} theme={chartTheme} title="Overhead by ledger" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Overhead per unit</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts
                  option={{
                    ...chartTheme,
                    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
                    grid: { ...chartTheme.grid, top: '12%', bottom: '15%' },
                    xAxis: {
                      ...chartTheme.xAxis,
                      type: 'category',
                      data: overheadPerUnit.map((d) => d.periodLabel),
                    },
                    yAxis: { ...chartTheme.yAxis, type: 'value', name: 'IRR' },
                    series: [
                      {
                        type: 'line',
                        data: overheadPerUnit.map((d) => d.overheadPerUnit),
                        smooth: true,
                        itemStyle: { color: CHART_COLOR_PALETTE[2] },
                      },
                    ],
                  }}
                  style={{ height: 280, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="h-full min-h-0">
            <CostInsightCard
              title="Overhead insights"
              payload={{ overheadByPeriod, ledgerGrowthData, periodId, scenarioId }}
              prompt="Focus on overhead growth and allocation. Which ledgers drive the most risk?"
            />
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Salary components (selected period)</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={{
                  ...chartTheme,
                  tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
                  grid: { ...chartTheme.grid, left: '18%', right: '10%', top: '8%', bottom: '12%', containLabel: true },
                  xAxis: {
                    ...chartTheme.xAxis,
                    type: 'value',
                    name: 'IRR',
                    nameGap: 8,
                  },
                  yAxis: {
                    ...chartTheme.yAxis,
                    type: 'category',
                    data: salaryComponentsBar.map((d) => d.componentName),
                    inverse: true,
                  },
                  series: [
                    {
                      type: 'bar',
                      data: salaryComponentsBar.map((d) => d.amount),
                      itemStyle: {
                        color: (params: { dataIndex: number }) =>
                          CHART_COLOR_PALETTE[params.dataIndex % CHART_COLOR_PALETTE.length],
                      },
                      barMaxWidth: 28,
                    },
                  ],
                }}
                style={{ height: 280, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total salary by cost center (selected period)</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={{
                  ...chartTheme,
                  tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
                  grid: { ...chartTheme.grid, left: '22%', right: '12%', top: '8%', bottom: '12%', containLabel: true },
                  xAxis: {
                    ...chartTheme.xAxis,
                    type: 'value',
                    name: 'IRR',
                    nameGap: 8,
                  },
                  yAxis: {
                    ...chartTheme.yAxis,
                    type: 'category',
                    data: totalSalaryByCostCenter.map((d) => d.costCenterName),
                    inverse: true,
                  },
                  series: [
                    {
                      type: 'bar',
                      data: totalSalaryByCostCenter.map((d) => d.total),
                      itemStyle: { color: CHART_COLOR_PALETTE[0] },
                      barMaxWidth: 28,
                    },
                  ],
                }}
                style={{ height: 280, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cost center × Period (salary)</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={{
                  ...chartTheme,
                  tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
                  legend: { ...chartTheme.legend, data: ['Direct', 'Indirect'], top: '2%' },
                  grid: { ...chartTheme.grid, top: '18%', bottom: '12%' },
                  xAxis: {
                    ...chartTheme.xAxis,
                    type: 'category',
                    data: Array.from(new Set(costCenterSalary.map((d) => d.periodLabel))),
                  },
                  yAxis: { ...chartTheme.yAxis, type: 'value', name: 'IRR' },
                  series: [
                    {
                      name: 'Direct',
                      type: 'bar',
                      stack: 'salary',
                      data: periods.map(
                        (p) =>
                          costCenterSalary
                            .filter((d) => d.periodId === p.id)
                            .reduce((s, d) => s + d.directSalary, 0)
                      ),
                      itemStyle: { color: CHART_COLOR_PALETTE[0] },
                    },
                    {
                      name: 'Indirect',
                      type: 'bar',
                      stack: 'salary',
                      data: periods.map(
                        (p) =>
                          costCenterSalary
                            .filter((d) => d.periodId === p.id)
                            .reduce((s, d) => s + d.indirectSalary, 0)
                      ),
                      itemStyle: { color: CHART_COLOR_PALETTE[1] },
                    },
                  ],
                }}
                style={{ height: 320, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cost center × Product allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <CostHeatmap
                data={heatmapCcProduct}
                xLabel="Cost center"
                yLabel="Product"
                theme={chartTheme}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'fx' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>FX rate (EUR → IRR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label className="text-sm">Rate</Label>
                  <input
                    type="range"
                    min={1350000}
                    max={1800000}
                    step={50000}
                    value={fxRateOverride}
                    onChange={(e) => setFxRateOverride(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono min-w-28">{fxRateOverride.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Local vs foreign cost by period</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts
                  option={{
                    ...chartTheme,
                    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
                    legend: { ...chartTheme.legend, data: ['Local (IRR)', 'Foreign (EUR→IRR)'], top: '2%' },
                    grid: { ...chartTheme.grid, top: '18%', bottom: '12%' },
                    xAxis: {
                      ...chartTheme.xAxis,
                      type: 'category',
                      data: localVsForeign.map((d) => d.periodLabel),
                    },
                    yAxis: { ...chartTheme.yAxis, type: 'value', name: 'IRR' },
                    series: [
                      {
                        name: 'Local (IRR)',
                        type: 'bar',
                        stack: 'cost',
                        data: localVsForeign.map((d) => d.local),
                        itemStyle: { color: CHART_COLOR_PALETTE[0] },
                      },
                      {
                        name: 'Foreign (EUR→IRR)',
                        type: 'bar',
                        stack: 'cost',
                        data: localVsForeign.map((d) => d.foreign),
                        itemStyle: { color: CHART_COLOR_PALETTE[2] },
                      },
                    ],
                  }}
                  style={{ height: 320, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>FX shock impact per product</CardTitle>
              </CardHeader>
              <CardContent>
                <CostWaterfall
                  data={fxShockImpact}
                  theme={chartTheme}
                  title={
                    fxRateOverride !== DEFAULT_FX_EUR_IRR
                      ? `Base ${DEFAULT_FX_EUR_IRR.toLocaleString()} → ${fxRateOverride.toLocaleString()}`
                      : `Base ${DEFAULT_FX_EUR_IRR.toLocaleString()} → +10% shock (move slider to change)`
                  }
                />
              </CardContent>
            </Card>
          </div>
          <div className="h-full min-h-0">
            <CostInsightCard
              title="FX exposure insights"
              payload={{
                localVsForeign,
                fxShockImpact,
                fxRateOverride,
                periodId,
              }}
              prompt="Focus on FX exposure and margin impact. Which products are most sensitive to EUR/IRR?"
            />
          </div>
        </div>
      )}

      {activeTab === 'ledger-growth' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ledger impact on margin (tornado)</CardTitle>
              </CardHeader>
              <CardContent>
                <CostTornado
                  data={tornadoData}
                  theme={chartTheme}
                  title="Base vs Ledger growth scenario"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ledger × Period growth intensity</CardTitle>
                <p className="text-muted-foreground text-sm font-normal">
                  Weighted impact: growth % × ledger share of period overhead (varied by ledger and period).
                </p>
              </CardHeader>
              <CardContent>
                <CostHeatmap
                  data={heatmapLedgerPeriodIntensity}
                  xLabel="Period"
                  yLabel="Ledger"
                  theme={chartTheme}
                />
              </CardContent>
            </Card>
          </div>
          <div className="h-full min-h-0">
            <CostInsightCard
              title="Ledger growth insights"
              payload={{ tornadoData, ledgerGrowthData, periodId, productId }}
              prompt="Focus on which products are most sensitive to electricity and other ledger cost increases."
            />
          </div>
        </div>
      )}

      {activeTab === 'cost-center-network' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost center allocation network</CardTitle>
                <p className="text-muted-foreground text-sm font-normal">
                  Step-down: support CCs allocate to QC and Production; QC Lab allocates to Production only; only Production allocates to products. Numbers from salary and allocation rules.
                </p>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[380px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <GraphViewer
                    data={{
                      nodes: networkGraph.nodes,
                      edges: networkGraph.edges,
                      nodeTypes: networkGraph.nodeTypes,
                      relationTypes: networkGraph.relationTypes,
                    }}
                    height="100%"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cost center × Product allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <CostHeatmap
                  data={heatmapCcProduct}
                  xLabel="Cost center"
                  yLabel="Product"
                  theme={chartTheme}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Allocated overhead per cost center by period</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts
                  option={{
                    ...chartTheme,
                    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
                    legend: {
                      ...chartTheme.legend,
                      data: costCenters.map((c) => c.name),
                      top: '2%',
                      type: 'scroll',
                    },
                    grid: { ...chartTheme.grid, top: '22%', bottom: '12%' },
                    xAxis: {
                      ...chartTheme.xAxis,
                      type: 'category',
                      data: periods.map((p) => p.id),
                    },
                    yAxis: { ...chartTheme.yAxis, type: 'value', name: 'IRR' },
                    series: costCenters.map((cc, i) => ({
                      name: cc.name,
                      type: 'line',
                      data: (allocatedOverheadByCc[cc.id] ?? []).map((d) => d.amount),
                      smooth: true,
                      itemStyle: {
                        color: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
                      },
                    })),
                  }}
                  style={{ height: 320, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="h-full min-h-0">
            <CostInsightCard
              title="Cost center propagation insights"
              payload={{
                ccProductAllocation,
                allocatedOverheadByCc,
                periodId,
              }}
              prompt="Focus on which cost centers create the largest propagation impact and allocation distortion."
            />
          </div>
        </div>
      )}
    </div>
  );
}
