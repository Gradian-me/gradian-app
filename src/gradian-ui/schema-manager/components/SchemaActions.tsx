'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Loader2, LayoutList, RefreshCw } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants';
import { getT } from '@/gradian-ui/shared/utils';

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
  backLabel = getT(TRANSLATION_KEYS.SCHEMA_BUTTON_BACK_TO_SCHEMAS),
  saveLabel = getT(TRANSLATION_KEYS.SCHEMA_BUTTON_SAVE_SCHEMA),
  resetLabel = getT(TRANSLATION_KEYS.BUTTON_RESET),
  viewSchemaListLabel = getT(TRANSLATION_KEYS.BUTTON_VIEW_LIST),
  onRefresh,
  refreshing = false,
  refreshLabel = getT(TRANSLATION_KEYS.BUTTON_REFRESH)
}: SchemaActionsProps) {
  const BackIcon = useBackIcon();
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="text-xs">
          <BackIcon className="h-4 w-4 md:me-2" />
          <span className="hidden md:inline">{backLabel}</span>
        </Button>
      )}
      <div className="flex gap-2 ms-auto flex-wrap">
        {viewSchemaListUrl ? (
          // Use Link component for middle-click support (opens in new tab)
          <Button variant="outline" asChild className="text-xs">
            <Link href={viewSchemaListUrl}>
              <LayoutList className="h-4 w-4 md:me-2" />
              <span className="hidden md:inline">{viewSchemaListLabel}</span>
            </Link>
          </Button>
        ) : onViewSchemaList ? (
          // Fallback to onClick handler if URL is not provided
          <Button variant="outline" onClick={onViewSchemaList} className="text-xs">
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
            className="text-xs"
          >
            <RefreshCw className={`h-4 w-4 md:me-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{refreshLabel}</span>
          </Button>
        )}
        {onReset && (
          <Button variant="outline" onClick={onReset} className="text-xs">
            <RotateCcw className="h-4 w-4 md:me-2" />
            <span className="hidden md:inline">{resetLabel}</span>
          </Button>
        )}
        {onSave && (
          <Button onClick={onSave} disabled={saving} className="text-xs">
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

