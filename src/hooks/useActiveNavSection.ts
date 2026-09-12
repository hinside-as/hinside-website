import { useEffect, useState } from "react";

/**
 * Tracks which nav destination the page is currently scrolled to, for the
 * sliding-underline indicator — purely by observation, same principle as
 * useActiveSection (case-study TOC/progress). Reads a plain string off
 * `data-nav-section` rather than a numeric index: each page section
 * declares which nav link it belongs to directly (several sections can
 * share one nav link, e.g. the hero/identity/work sections all count as
 * "work"), so this stays correct regardless of how many sections exist or
 * get added/removed later — no index-range math to keep in sync.
 */
export function useActiveNavSection(selector = "[data-nav-section]"): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute("data-nav-section");
          if (id) setActiveId(id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [selector]);

  return activeId;
}
