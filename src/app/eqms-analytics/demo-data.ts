import { EqmsAnalyticsData } from './types';

// Demo-friendly EQMS analytics data for a biotech/pharma enterprise.
export const eqmsAnalyticsDemoData: EqmsAnalyticsData = {
  kpis: {
    totalRecords: 1824,
    onTimeClosurePct: 91.3,
    overdue: 54,
    criticalRiskPct: 6.2,
    avgCycleDays: 22,
    customerImpactScore: 78,
  },
  timeSeries: [
    { month: 'Mar', change: 62, deviation: 44, complaint: 28, audit: 14, risk: 22, capa: 35 },
    { month: 'Apr', change: 68, deviation: 46, complaint: 31, audit: 16, risk: 24, capa: 39 },
    { month: 'May', change: 74, deviation: 51, complaint: 34, audit: 18, risk: 27, capa: 42 },
    { month: 'Jun', change: 80, deviation: 55, complaint: 36, audit: 19, risk: 28, capa: 47 },
    { month: 'Jul', change: 86, deviation: 58, complaint: 39, audit: 21, risk: 30, capa: 52 },
    { month: 'Aug', change: 92, deviation: 60, complaint: 41, audit: 22, risk: 32, capa: 55 },
    { month: 'Sep', change: 95, deviation: 62, complaint: 43, audit: 23, risk: 33, capa: 58 },
    { month: 'Oct', change: 101, deviation: 64, complaint: 46, audit: 25, risk: 36, capa: 61 },
    { month: 'Nov', change: 105, deviation: 66, complaint: 48, audit: 26, risk: 37, capa: 65 },
    { month: 'Dec', change: 112, deviation: 69, complaint: 51, audit: 27, risk: 39, capa: 69 },
    { month: 'Jan', change: 118, deviation: 72, complaint: 53, audit: 28, risk: 41, capa: 73 },
    { month: 'Feb', change: 124, deviation: 75, complaint: 56, audit: 29, risk: 43, capa: 77 },
  ],
  funnels: {
    change: [
      { stage: 'Proposed', value: 420 },
      { stage: 'Risk Assessed', value: 360 },
      { stage: 'Approved', value: 295 },
      { stage: 'Implemented', value: 248 },
      { stage: 'Verified', value: 232 },
    ],
    complaint: [
      { stage: 'Logged', value: 188 },
      { stage: 'Triaged', value: 160 },
      { stage: 'Investigated', value: 134 },
      { stage: 'Resolved', value: 118 },
      { stage: 'Closed', value: 112 },
    ],
  },
  changeCycle: [
    { month: 'Sep', cycle: 26, verifiedPct: 78 },
    { month: 'Oct', cycle: 24, verifiedPct: 80 },
    { month: 'Nov', cycle: 23, verifiedPct: 83 },
    { month: 'Dec', cycle: 22, verifiedPct: 84 },
    { month: 'Jan', cycle: 21, verifiedPct: 86 },
    { month: 'Feb', cycle: 20, verifiedPct: 88 },
  ],
  heatmaps: {
    deviationSeverityProcess: [
      { severity: 'Critical', process: 'Sterile Fill', count: 9 },
      { severity: 'Critical', process: 'Upstream', count: 7 },
      { severity: 'Major', process: 'Sterile Fill', count: 18 },
      { severity: 'Major', process: 'QC Release', count: 14 },
      { severity: 'Major', process: 'Packaging', count: 11 },
      { severity: 'Minor', process: 'Upstream', count: 22 },
      { severity: 'Minor', process: 'Downstream', count: 19 },
      { severity: 'Minor', process: 'Packaging', count: 16 },
    ],
  },
  radars: {
    audit: [
      { pillar: 'Data Integrity', score: 92 },
      { pillar: 'GMP Compliance', score: 88 },
      { pillar: 'CSV', score: 84 },
      { pillar: 'Training', score: 90 },
      { pillar: 'Supplier Quality', score: 81 },
      { pillar: 'Documentation', score: 86 },
    ],
    riskDimensions: [
      { name: 'Regulatory', score: 88 },
      { name: 'Product Quality', score: 84 },
      { name: 'Supply Chain', score: 78 },
      { name: 'Data Integrity', score: 82 },
      { name: 'Pharmacovigilance', score: 80 },
      { name: 'Cybersecurity', score: 72 },
    ],
  },
  paretoRootCauses: [
    { cause: 'Operator technique drift', count: 42 },
    { cause: 'Environmental excursions', count: 31 },
    { cause: 'Raw material variability', count: 28 },
    { cause: 'Cleaning validation gaps', count: 24 },
    { cause: 'Equipment calibration', count: 21 },
    { cause: 'Batch record errors', count: 19 },
  ],
  kris: {
    overall: 'Controlled',
    items: [
      { name: 'Critical deviations open', value: 6, status: 'amber', target: '<=5' },
      { name: 'On-time CAPA closure', value: 91, status: 'green', target: '>=90%' },
      { name: 'Complaint recurrence', value: 4, status: 'green', target: '<=5%' },
      { name: 'Audit findings ageing >60d', value: 7, status: 'amber', target: '<=5' },
    ],
  },
};

