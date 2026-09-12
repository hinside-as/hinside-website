/**
 * Shared naming so the homepage's portfolio card and a case-study page's own
 * hero media declare the exact same `view-transition-name` for a given
 * project — the two are on different pages/components with no shared state,
 * so a single source of truth here is what keeps them from drifting apart.
 */
export function caseCoverTransitionName(slug: string): string {
  return `case-cover-${slug}`;
}
