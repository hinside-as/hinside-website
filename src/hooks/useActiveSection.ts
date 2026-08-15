import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks which one of a set of full-viewport sections is currently "active"
 * for UI purposes (sidebar highlight, progress bar) — purely by observing
 * scroll position, never influencing it. A section counts as active exactly
 * when it crosses the vertical center of the viewport; since sections are
 * stacked with no gaps, exactly one is active at a time. Slide navigation
 * itself is left entirely to native browser scrolling.
 */
export function useActiveSection(containerRef: RefObject<HTMLElement | null>, selector: string): number {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sections = Array.from(container.querySelectorAll<HTMLElement>(selector));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(entry.target.getAttribute("data-slide-index"));
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [containerRef, selector]);

  return activeIndex;
}
