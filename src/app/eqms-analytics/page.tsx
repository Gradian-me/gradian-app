'use client';

import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormTabs, FormTabsList, FormTabsTrigger } from '@/gradian-ui/form-builder/form-elements';
import { CHART_COLOR_PALETTE, createChartTheme } from '@/gradian-ui/shared/constants/chart-theme';
import { eqmsAnalyticsDemoData } from './demo-data';
import { EqmsKpiCards } from './_components/eqms-kpi-cards';
import EqmsStackedArea from './_components/eqms-stacked-area';
import EqmsFunnel from './_components/eqms-funnel';
import EqmsRadar from './_components/eqms-radar';
import EqmsHeatmap from './_components/eqms-heatmap';
import EqmsPareto from './_components/eqms-pareto';
import EqmsKriPanel from './_components/eqms-kri-panel';
import EqmsInsightCard from './_components/eqms-insight-card';
import ReactECharts from 'echarts-for-react';
import { EqmsAnalyticsData } from './types';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';

type Tabs = 'overview' | 'change' | 'deviation' | 'complaint' | 'audit' | 'risk' | 'capa';

export default function EqmsAnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const chartTheme = useMemo(() => createChartTheme(resolvedTheme === 'dark'), [resolvedTheme]);
  const [activeTab, setActiveTab] = useState<Tabs>('overview');
  const data: EqmsAnalyticsData = eqmsAnalyticsDemoData;

  const rootCauseGraph = useMemo(() => {
    const nodes: GraphNodeData[] = [
      {
        id: 'dv-001',
        schemaId: 'deviation',
        title: 'DV-001: Sterile Fill Temp Excursion',
        incomplete: false,
        parentId: null,
        payload: { nodeTypeId: 'deviation', severity: 'Critical', month: 'May' },
      },
      {
        id: 'cause-operator',
        schemaId: 'cause',
        title: 'Operator step skipped',
        incomplete: false,
        parentId: null,
        payload: { nodeTypeId: 'cause-human', impact: 'High' },
      },
      {
        id: 'cause-maint',
        schemaId: 'cause',
        title: 'Maintenance backlog',
        incomplete: false,
        parentId: null,
        payload: { nodeTypeId: 'cause-machine', impact: 'Medium' },
      },
      {
        id: 'cause-sop',
        schemaId: 'cause',
        title: 'SOP gap in line clearance',
        incomplete: false,
        parentId: null,
        payload: { nodeTypeId: 'cause-method', impact: 'High' },
      },
      {
        id: 'action-cap',
        schemaId: 'action',
        title: 'CAPA: retrain operators',
        incomplete: false,
        parentId: null,
        payload: { nodeTypeId: 'action-preventive', status: 'Open' },
      },
      {
        id: 'action-corrective',
        schemaId: 'action',
        title: 'Corrective: recalibrate fillers',
        incomplete: false,
        parentId: null,
        payload: { nodeTypeId: 'action-corrective', status: 'Closed' },
      },
    ];

    const edges: GraphEdgeData[] = [
      { id: 'e1', source: 'cause-operator', target: 'dv-001', sourceId: 'cause-operator', targetId: 'dv-001', sourceSchema: 'cause', targetSchema: 'deviation', relationTypeId: 'causes' },
      { id: 'e2', source: 'cause-maint', target: 'dv-001', sourceId: 'cause-maint', targetId: 'dv-001', sourceSchema: 'cause', targetSchema: 'deviation', relationTypeId: 'causes' },
      { id: 'e3', source: 'cause-sop', target: 'dv-001', sourceId: 'cause-sop', targetId: 'dv-001', sourceSchema: 'cause', targetSchema: 'deviation', relationTypeId: 'causes' },
      { id: 'e4', source: 'dv-001', target: 'action-cap', sourceId: 'dv-001', targetId: 'action-cap', sourceSchema: 'deviation', targetSchema: 'action', relationTypeId: 'triggers' },
      { id: 'e5', source: 'dv-001', target: 'action-corrective', sourceId: 'dv-001', targetId: 'action-corrective', sourceSchema: 'deviation', targetSchema: 'action', relationTypeId: 'triggers' },
    ];

    const nodeTypes = [
      { id: 'deviation', label: 'Deviation', color: 'red', icon: 'AlertTriangle' },
      { id: 'cause-human', label: 'Human', color: 'blue', icon: 'User' },
      { id: 'cause-machine', label: 'Machine', color: 'orange', icon: 'Cog' },
      { id: 'cause-method', label: 'Method', color: 'green', icon: 'FileText' },
      { id: 'action-preventive', label: 'Preventive Action', color: 'emerald', icon: 'Shield' },
      { id: 'action-corrective', label: 'Corrective Action', color: 'amber', icon: 'Wrench' },
    ];

    const relationTypes = [
      { id: 'causes', label: 'Causes', color: 'red', icon: 'ArrowRight' },
      { id: 'triggers', label: 'Triggers', color: 'purple', icon: 'ArrowRight' },
    ];

    return { nodes, edges, nodeTypes, relationTypes };
  }, []);

  const complaintScatterOption = useMemo(() => {
    const complaints = [
      { severity: 5, days: 14 },
      { severity: 4, days: 10 },
      { severity: 3, days: 7 },
      { severity: 4, days: 9 },
      { severity: 2, days: 5 },
      { severity: 5, days: 18 },
      { severity: 1, days: 3 },
      { severity: 3, days: 6 },
    ];
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'item', formatter: (p: any) => `Severity ${p.data[0]} - ${p.data[1]} days` },
      grid: { ...chartTheme.grid, top: '12%', bottom: '18%', left: '8%', right: '6%' },
      xAxis: { ...chartTheme.xAxis, name: 'Severity', type: 'value', min: 0, max: 5.5 },
      yAxis: { ...chartTheme.yAxis, name: 'Resolution days', type: 'value', min: 0 },
      series: [
        {
          symbolSize: 14,
          data: complaints.map(c => [c.severity, c.days]),
          type: 'scatter',
          itemStyle: { color: CHART_COLOR_PALETTE[2] },
        },
      ],
    };
  }, [chartTheme]);

  const capaBurndownOption = useMemo(() => {
    const points = [
      { week: 'W1', open: 72 },
      { week: 'W2', open: 64 },
      { week: 'W3', open: 55 },
      { week: 'W4', open: 47 },
      { week: 'W5', open: 38 },
      { week: 'W6', open: 32 },
      { week: 'W7', open: 27 },
      { week: 'W8', open: 21 },
    ];
    return {
      ...chartTheme,
      tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
      grid: { ...chartTheme.grid, top: '12%', bottom: '18%' },
      xAxis: { ...chartTheme.xAxis, type: 'category', data: points.map(p => p.week) },
      yAxis: { ...chartTheme.yAxis, type: 'value', name: 'Open CAPAs' },
      series: [
        {
          type: 'line',
          data: points.map(p => p.open),
          smooth: true,
          itemStyle: { color: CHART_COLOR_PALETTE[4] },
          areaStyle: { color: CHART_COLOR_PALETTE[4] + '22' },
        },
      ],
    };
  }, [chartTheme]);

  return (
    <MainLayout title="EQMS Analytics" icon="ShieldCheck">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">EQMS Analytics</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Change, deviation, complaint, audit, and risk intelligence tailored for biologics operations.
              </p>
            </div>
          </div>
        </motion.div>

        <EqmsKpiCards kpis={data.kpis} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <FormTabs value={activeTab} onValueChange={v => setActiveTab(v as Tabs)}>
            <FormTabsList className="min-w-full bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
              {[
                ['overview', 'Overview'],
                ['change', 'Change Mgmt'],
                ['deviation', 'Deviation'],
                ['complaint', 'Complaints'],
                ['audit', 'Audit'],
                ['risk', 'Risk'],
                ['capa', 'CAPA'],
              ].map(([id, label]) => (
                <FormTabsTrigger key={id} value={id} className="px-4 py-1.5 text-sm">
                  {label}
                </FormTabsTrigger>
              ))}
            </FormTabsList>
          </FormTabs>
        </motion.div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>EQMS Volume Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <EqmsStackedArea data={data.timeSeries} theme={chartTheme} />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Top Root Causes (Pareto)</CardTitle>
              </CardHeader>
              <CardContent>
                <EqmsPareto data={data.paretoRootCauses} theme={chartTheme} />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'change' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Control Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <EqmsFunnel data={data.funnels.change} theme={chartTheme} title="Change Control" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Cycle Time & Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts
                    option={{
                      ...chartTheme,
                      tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
                      legend: { ...chartTheme.legend, data: ['Cycle (days)', 'Verified %'], top: '2%', left: '2%' },
                      grid: { ...chartTheme.grid, top: '16%', bottom: '16%' },
                      xAxis: { ...chartTheme.xAxis, type: 'category', data: data.changeCycle.map(c => c.month) },
                      yAxis: [
                        { ...chartTheme.yAxis, type: 'value', name: 'Cycle (days)' },
                        { ...chartTheme.yAxis, type: 'value', name: 'Verified %', max: 100 },
                      ],
                      series: [
                        {
                          name: 'Cycle (days)',
                          type: 'bar',
                          data: data.changeCycle.map(c => c.cycle),
                          itemStyle: { color: CHART_COLOR_PALETTE[0], borderRadius: [4, 4, 0, 0] },
                        },
                        {
                          name: 'Verified %',
                          type: 'line',
                          yAxisIndex: 1,
                          data: data.changeCycle.map(c => c.verifiedPct),
                          smooth: true,
                          itemStyle: { color: CHART_COLOR_PALETTE[3] },
                        },
                      ],
                    }}
                    style={{ height: 320, width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <EqmsInsightCard
                agentId="data-analysis-expert"
                title="Change Insights"
                payload={{ funnel: data.funnels.change, cycle: data.changeCycle }}
                prompt="Act as a GxP quality analyst. Summarize change control drop-offs, cycle time trend, and give 3 actions to improve verification throughput without compromising compliance."
              />
            </div>
          </div>
        )}

        {activeTab === 'deviation' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Root Cause Pareto (Last 6m)</CardTitle>
                </CardHeader>
                <CardContent>
                  <EqmsPareto data={data.paretoRootCauses} theme={chartTheme} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Deviation → Causes → Actions (Graph)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[380px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <GraphViewer
                      data={{
                        nodes: rootCauseGraph.nodes,
                        edges: rootCauseGraph.edges,
                        nodeTypes: rootCauseGraph.nodeTypes,
                        relationTypes: rootCauseGraph.relationTypes,
                      }}
                      height="100%"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <EqmsInsightCard
                agentId="data-analysis-expert"
                title="Deviation Insights"
                payload={{ pareto: data.paretoRootCauses, graph: rootCauseGraph }}
                prompt="Analyze the top deviation root causes over the last 6 months and their linked actions. Identify systemic drivers and propose the top 3 mitigation actions with highest impact."
              />
            </div>
          </div>
        )}

        {activeTab === 'complaint' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Complaint Severity vs Resolution Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={complaintScatterOption} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <EqmsInsightCard
                agentId="data-analysis-expert"
                title="Complaint Insights"
                payload={{ complaints: 'biologics customer complaints severity vs resolution' }}
                prompt="Provide a concise view of complaint severity vs resolution time. Flag any SLA risk, recurrence patterns, and propose 2 actions to reduce high-severity resolution time."
              />
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Coverage Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <EqmsRadar data={data.radars.audit} theme={chartTheme} title="Audit Readiness" />
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <EqmsInsightCard
                agentId="data-analysis-expert"
                title="Audit Insights"
                payload={{ auditRadar: data.radars.audit }}
                prompt="Summarize audit readiness gaps across Data Integrity, GMP, CSV, Training, Supplier Quality, and Documentation. Suggest next-step remediations before FDA/EMA inspections."
              />
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Coverage Radar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EqmsRadar data={data.radars.riskDimensions} theme={chartTheme} title="Risk Coverage" />
                  </CardContent>
                </Card>
              </div>
              <EqmsKriPanel kris={data.kris} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Risk Hotspots (Severity × Process)</CardTitle>
              </CardHeader>
              <CardContent>
                <EqmsHeatmap data={data.heatmaps.deviationSeverityProcess} theme={chartTheme} />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'capa' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>CAPA Burndown (8-week)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={capaBurndownOption} style={{ height: 300, width: '100%' }} opts={{ renderer: 'svg' }} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>CAPA Effectiveness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Effectiveness Verified</span>
                    <span className="font-semibold text-green-600">89%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Repeat Events (90d)</span>
                    <span className="font-semibold text-amber-600">4 cases</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Verification Lead Time</span>
                    <span className="font-semibold text-blue-600">9 days</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="h-full min-h-0">
              <EqmsInsightCard
                agentId="data-analysis-expert"
                title="CAPA Insights"
                payload={{ capaBurndown: '8-week burndown', effectiveness: '89%' }}
                prompt="Review CAPA burndown and effectiveness. Highlight backlog risk, repeat event drivers, and 2 high-yield actions to sustain on-time closure in a biotech quality system."
              />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

