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
      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-start">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex items-start">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                Success
              </h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-400">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

