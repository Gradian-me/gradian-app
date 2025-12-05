/**
 * Utility function to determine if a heading level should be sticky
 */
export function getStickyHeadingsChecker(stickyHeadings: string[] = []) {
  const isSticky = (level: number): boolean => {
    const headingMark = '#'.repeat(level);
    return stickyHeadings.includes(headingMark);
  };

  return { isSticky };
}

/**
 * @deprecated Use getStickyHeadingsChecker instead. This function doesn't use React hooks.
 */
export function useStickyHeadings(stickyHeadings: string[] = []) {
  return getStickyHeadingsChecker(stickyHeadings);
}

