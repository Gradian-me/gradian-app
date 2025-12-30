'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { DynamicQueryTable } from '@/gradian-ui/data-display/components/DynamicQueryTable';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DynamicQueryTablePage() {
  const [dynamicQueryId, setDynamicQueryId] = useState('test-query-id');
  const [flatten, setFlatten] = useState(false);
  const [queryIdInput, setQueryIdInput] = useState('test-query-id');

  const handleLoadQuery = () => {
    if (queryIdInput.trim()) {
      setDynamicQueryId(queryIdInput.trim());
    }
  };

  return (
    <MainLayout
      title="Dynamic Query Table Component"
      subtitle="Display dynamic query results as flat or nested tables"
      icon="Table"
    >
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Configure the dynamic query table settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query-id">Dynamic Query ID</Label>
              <div className="flex gap-2">
                <Input
                  id="query-id"
                  value={queryIdInput}
                  onChange={(e) => setQueryIdInput(e.target.value)}
                  placeholder="Enter dynamic query ID"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLoadQuery();
                    }
                  }}
                />
                <Button onClick={handleLoadQuery}>Load Query</Button>
              </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p>
                <strong>Current Query ID:</strong> {dynamicQueryId}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <CardDescription>
              {flatten
                ? 'Displaying results as a flat table with dot-notation keys'
                : 'Displaying results as nested expandable tables'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicQueryTable
              dynamicQueryId={dynamicQueryId}
              flatten={flatten}
              onFlattenChange={setFlatten}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

