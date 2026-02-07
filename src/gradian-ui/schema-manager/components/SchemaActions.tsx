'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Loader2, LayoutList, RefreshCw } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';

interface SchemaActionsProps {
  onBack?: () => void;
  onSave?: () => void;
  onReset?: () => void;
  onViewSchemaList?: () => void;
  viewSchemaListUrl?: string; // URL for the view list link (supports middle-click to open in new tab)
  saving?: boolean;
  backLabel?: string;
  saveLabel?: string;
  resetLabel?: string;
  viewSchemaListLabel?: string;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  refreshLabel?: string;
}

export function SchemaActions({ 
  onBack, 
  onSave, 
  onReset,
  onViewSchemaList,
  viewSchemaListUrl,
  saving = false,
  backLabel = 'Back to Schemas',
  saveLabel = 'Save Schema',
  resetLabel = 'Reset',
  viewSchemaListLabel = 'View List',
  onRefresh,
  refreshing = false,
  refreshLabel = 'Refresh'
}: SchemaActionsProps) {
  const BackIcon = useBackIcon();
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          <BackIcon className="h-4 w-4 md:me-2" />
          <span className="hidden md:inline">{backLabel}</span>
        </Button>
      )}
      <div className="flex gap-2 ms-auto flex-wrap">
        {viewSchemaListUrl ? (
          // Use Link component for middle-click support (opens in new tab)
          <Button variant="outline" asChild>
            <Link href={viewSchemaListUrl}>
              <LayoutList className="h-4 w-4 md:me-2" />
              <span className="hidden md:inline">{viewSchemaListLabel}</span>
            </Link>
          </Button>
        ) : onViewSchemaList ? (
          // Fallback to onClick handler if URL is not provided
          <Button variant="outline" onClick={onViewSchemaList}>
            <LayoutList className="h-4 w-4 md:me-2" />
            <span className="hidden md:inline">{viewSchemaListLabel}</span>
          </Button>
        ) : null}
        {onRefresh && (
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={refreshing}
            title={refreshLabel}
          >
            <RefreshCw className={`h-4 w-4 md:me-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{refreshLabel}</span>
          </Button>
        )}
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 md:me-2" />
            <span className="hidden md:inline">{resetLabel}</span>
          </Button>
        )}
        {onSave && (
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 md:me-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 md:me-2" />
            )}
            <span className="hidden md:inline">{saveLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

