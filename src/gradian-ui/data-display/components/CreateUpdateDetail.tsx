// CreateUpdateDetail Component
// Utility component to normalize createdAt/updatedAt - if they're the same, only show createdAt

"use client";

import React from 'react';

export interface CreateUpdateDetailProps {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

/**
 * Normalizes createdAt and updatedAt dates.
 * If they are the same, returns only createdAt (updatedAt will be null).
 * Otherwise, returns both as-is.
 */
export const normalizeCreateUpdateDates = ({
  createdAt,
  updatedAt,
}: CreateUpdateDetailProps): {
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
} => {
  // If either is missing, return as-is
  if (!createdAt || !updatedAt) {
    return { createdAt, updatedAt };
  }

  // Convert both to Date objects for comparison
  const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const updatedDate = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  // Check if dates are the same (compare timestamps)
  const createdTime = createdDate.getTime();
  const updatedTime = updatedDate.getTime();

  // If they're the same, only return createdAt
  if (createdTime === updatedTime) {
    return {
      createdAt,
      updatedAt: null,
    };
  }

  // Otherwise return both
  return { createdAt, updatedAt };
};

/**
 * Hook to normalize create/update dates
 */
export const useCreateUpdateDetail = ({
  createdAt,
  updatedAt,
}: CreateUpdateDetailProps) => {
  return React.useMemo(
    () => normalizeCreateUpdateDates({ createdAt, updatedAt }),
    [createdAt, updatedAt]
  );
};

