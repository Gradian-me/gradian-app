export type EqmsAnalyticsData = {
  kpis: {
    totalRecords: number;
    onTimeClosurePct: number;
    overdue: number;
    criticalRiskPct: number;
    avgCycleDays: number;
    customerImpactScore: number;
  };
  timeSeries: Array<{
    month: string;
    change: number;
    deviation: number;
    complaint: number;
    audit: number;
    risk: number;
    capa: number;
  }>;
  funnels: {
    change: Array<{ stage: string; value: number }>;
    complaint: Array<{ stage: string; value: number }>;
  };
  changeCycle: Array<{ month: string; cycle: number; verifiedPct: number }>;
  heatmaps: {
    deviationSeverityProcess: Array<{ severity: string; process: string; count: number }>;
  };
  radars: {
    audit: Array<{ pillar: string; score: number }>;
    riskDimensions: Array<{ name: string; score: number }>;
  };
  paretoRootCauses: Array<{ cause: string; count: number }>;
  kris: {
    overall: 'Controlled' | 'Elevated' | 'High';
    items: Array<{ name: string; value: number; status: 'green' | 'amber' | 'red'; target: string }>;
  };
};

