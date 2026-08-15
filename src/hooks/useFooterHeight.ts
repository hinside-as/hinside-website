import { useEffect } from "react";

/**
 * Keeps --footer-height (the real, current rendered height of .site-footer)
 * in sync via ResizeObserver — used by any last slide that wants to size
 * itself as exactly "100dvh minus the footer" so that slide plus the footer
 * together always add up to one viewport. That's what lets scrolling into
 * the last slide bring the footer into view in the same continuous motion,
 * instead of a further, mostly-empty stretch of scroll before it appears —
 * see CLAUDE.md's case-study/homepage scroll-experience notes for the
 * general pattern this implements (first used for the homepage's contact
 * slide, now shared with the case-study template's own promo slide).
 *
 * entry.contentRect is deliberately not used here — it's the content box
 * only (excludes padding/border), which undercounts how much real vertical
 * space the footer occupies. getBoundingClientRect matches what actually
 * needs subtracting from 100dvh by callers.
 */
export function useFooterHeight() {
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (!footer) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--footer-height", `${footer.getBoundingClientRect().height}px`);
    });
    observer.observe(footer);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--footer-height");
    };
  }, []);
}
