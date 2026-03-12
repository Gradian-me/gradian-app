"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/gradian-ui/shared/utils/api";
import { cn } from "@/gradian-ui/shared/utils";
import { RefreshCw } from "lucide-react";
import { CopyContent } from "@/gradian-ui/form-builder/form-elements/components/CopyContent";

export interface GS1LookupContentProps {
  ai: string;
  value: string | number;
  lookupId: string;
  className?: string;
}

type LookupOption = {
  id?: string | number;
  label?: string;
  name?: string;
  value?: string;
  // Allow additional fields without typing every property
  [key: string]: unknown;
};

interface LookupApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export const GS1LookupContent: React.FC<GS1LookupContentProps> = ({
  ai,
  value,
  lookupId,
  className,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchLookup = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRequest<LookupApiResult>(
          `/api/lookups/options/${encodeURIComponent(lookupId)}`,
          {
            method: "GET",
            params: {
              includeIds: String(value),
            },
          },
        );

        if (!isMounted) return;

        if (!response.success) {
          const message = (response.error || response.message || "Lookup request failed") as string;
          setError(message);
          setOptions([]);
          return;
        }

        const rawData = response.data as LookupOption[] | LookupOption | null | undefined;

        if (!rawData) {
          setOptions([]);
          return;
        }

        const normalized: LookupOption[] = Array.isArray(rawData) ? rawData : [rawData];
        setOptions(normalized);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : "Unexpected error";
        setError(message);
        setOptions([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchLookup();

    return () => {
      isMounted = false;
    };
  }, [ai, value, lookupId, retryToken]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "mt-1 h-5 w-40 rounded bg-slate-200 dark:bg-slate-700 animate-pulse",
          className,
        )}
        aria-label="Loading lookup data"
      />
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "mt-1 inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 break-words",
          className,
        )}
      >
        <span>{error}</span>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-300 dark:bg-red-200 text-red-900  dark:text-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors p-1"
          aria-label="Retry lookup"
          onClick={() => setRetryToken((t) => t + 1)}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (!options.length) {
    return null;
  }

  const renderLabel = (opt: LookupOption, index: number): string => {
    const label =
      (typeof opt.label === "string" && opt.label.trim()) ||
      (typeof opt.name === "string" && opt.name.trim()) ||
      (typeof opt.value === "string" && opt.value.trim()) ||
      (opt.id !== undefined ? String(opt.id) : null);

    if (!label) {
      return `#${index + 1}`;
    }

    return label;
  };

  return (
    <div
      className={cn(
        "mt-1 inline-flex flex-wrap gap-1 text-xs text-slate-700 dark:text-slate-200",
        className,
      )}
    >
      {options.map((opt, index) => (
        <span
          key={String(opt.id ?? index)}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-2"
        >
          <span>{renderLabel(opt, index)}</span>
          <CopyContent
            content={renderLabel(opt, index)}
            className="ms-1"
          />
        </span>
      ))}
    </div>
  );
};

GS1LookupContent.displayName = "GS1LookupContent";

