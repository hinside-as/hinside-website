import { useEffect, type RefObject } from "react";

/**
 * Keeps --header-reveal (a 0–1 custom property Header.astro's [data-solid]
 * rule reads to drive its own transform — see that component's comments)
 * in sync with actual scroll position, continuously — not via a discrete
 * "is this the active slide" flag plus a fixed-duration CSS transition.
 * 1 while the element matching `firstSlideSelector` sits at its resting
 * position at the top of the viewport, decreasing to 0 as it scrolls out
 * of view, and staying 0 for every slide after it.
 *
 * Shared by CaseStudyExperience and HomeExperience: both keep the header
 * visible only on the first section. An earlier version toggled a binary
 * hidden flag off which slide was "active" (via IntersectionObserver) and
 * let a ~300ms CSS transition animate the header to its new state; that
 * reads fine at normal scroll speed, but a fast fling can let native
 * momentum scrolling settle well before the transition finishes, so the
 * header kept animating for a moment after the page had already stopped
 * moving — visibly detached/bouncy. Driving the reveal directly off scroll
 * position removes that
 * independent timer entirely: the header always sits exactly where the
 * current scroll offset says it should, at any scroll speed, and inherits
 * whatever native deceleration produced that scroll instead of following
 * its own separate easing curve.
 */
export function useHeaderReveal(containerRef: RefObject<HTMLElement | null>, firstSlideSelector: string) {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const firstSlide = containerRef.current?.querySelector<HTMLElement>(firstSlideSelector);
    if (!header || !firstSlide) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = firstSlide.getBoundingClientRect();
      // Normalized against the header's own height, not the slide's — the
      // header only ever travels its own height (translateY(-100%) is a
      // full hide), so tying the 0-1 progress to that same short distance
      // means it finishes retracting/revealing within roughly the first
      // --header-height of scroll, matching how far it actually moves.
      // Normalizing against the slide's full height instead (the previous
      // behavior) stretched that same transition across the whole slide,
      // so the header sat at some partial, still-visible reveal state for
      // most of the slide's scroll range — long after its own motion
      // should have finished — and its solid background clipped the
      // slide's own content (e.g. the hero headline) sliding past
      // underneath it, most noticeably scrolling back up into the slide.
      const headerHeight = header.getBoundingClientRect().height || 1;
      const hiddenPx = Math.min(Math.max(-rect.top, 0), headerHeight);
      const reveal = 1 - hiddenPx / headerHeight;
      document.documentElement.style.setProperty("--header-reveal", reveal.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--header-reveal");
    };
  }, [containerRef, firstSlideSelector]);
}
