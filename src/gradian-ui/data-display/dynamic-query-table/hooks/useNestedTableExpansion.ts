import { useState, useEffect } from 'react';

export function useNestedTableExpansion(data: any[], expandAllTrigger: number) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // When expandAllTrigger changes, expand all rows at this level
  useEffect(() => {
    if (expandAllTrigger > 0) {
      const allRowIndices = new Set(data.map((_, index) => index));
      setExpandedRows(allRowIndices);
    } else if (expandAllTrigger === 0 && expandedRows.size > 0) {
      // Only collapse if we had rows expanded
      setExpandedRows(new Set());
    }
  }, [expandAllTrigger, data.length]);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allRowIndices = new Set(data.map((_, index) => index));
    setExpandedRows(allRowIndices);
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  return {
    expandedRows,
    toggleRow,
    expandAll,
    collapseAll,
  };
}

