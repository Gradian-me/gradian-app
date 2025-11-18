'use client';

import { ConditionGroup } from '../types';
import { generateRulePreview } from '../utils/rule-operations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface RulePreviewProps {
  rootGroup: ConditionGroup;
  className?: string;
}

export function RulePreview({ rootGroup, className }: RulePreviewProps) {
  const [copied, setCopied] = useState(false);
  const preview = generateRulePreview(rootGroup);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      toast.success('Rule preview copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Rule Preview</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm font-mono overflow-x-auto border border-gray-200 dark:border-gray-800">
          {preview || 'No conditions defined'}
        </pre>
      </CardContent>
    </Card>
  );
}

