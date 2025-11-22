/**
 * Message Display Component
 * Displays error and success messages
 */

'use client';

import React from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';

interface MessageDisplayProps {
  error: string | null;
  successMessage: string | null;
}

export function MessageDisplay({ error, successMessage }: MessageDisplayProps) {
  return (
    <>
      {/* Error Message - Modern Style */}
      {error && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-red-950/30 dark:via-rose-950/30 dark:to-pink-950/30 border border-red-200/50 dark:border-red-800/50 shadow-sm">
          <div className="relative p-4">
            <div className="flex items-start">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 mr-3 shrink-0">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide">
                  Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message - Modern Style */}
      {successMessage && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border border-green-200/50 dark:border-green-800/50 shadow-sm">
          <div className="relative p-4">
            <div className="flex items-start">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 mr-3 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 uppercase tracking-wide">
                  Success
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

