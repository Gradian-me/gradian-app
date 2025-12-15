'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EqmsAnalyticsData } from '../types';

type Props = {
  kris: EqmsAnalyticsData['kris'];
};

const badgeVariant = (status: 'green' | 'amber' | 'red') => {
  if (status === 'green') return 'success';
  if (status === 'amber') return 'warning';
  return 'destructive';
};

export default function EqmsKriPanel({ kris }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Risk Indicators</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Overall posture</span>
          <Badge variant="outline">{kris.overall}</Badge>
        </div>
        <div className="space-y-3">
          {kris.items.map(item => (
            <div key={item.name} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Target: {item.target}</p>
              </div>
              <Badge variant={badgeVariant(item.status)}>{item.value}{typeof item.value === 'number' && item.name.includes('%') ? '%' : ''}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

