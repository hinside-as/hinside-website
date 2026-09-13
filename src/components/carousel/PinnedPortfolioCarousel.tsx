import { useEffect, useRef, type CSSProperties } from "react";
import EyeCursorItem from "./EyeCursorItem";
import type { PortfolioItem } from "./PortfolioCarousel";
import { caseCoverTransitionName } from "../../lib/viewTransitions";

export type PinnedPortfolioItem = PortfolioItem & { slug: string };

type TrackEntry =
  | { kind: "text"; key: string; text: string }
  | { kind: "project"; key: string; item: PinnedPortfolioItem };

// How far (in px) an image is allowed to drift inside its own frame as the
// track scrolls it past center — see .pppc-image's oversized 160%/-30%
// sizing below, which exists purely to give this room without exposing the
// frame's edges. Kept comfortably inside that 30%-per-side budget (~84px on
// the smallest card this ever renders at, the min(384px, 78vw) mobile floor)
// rather than pushing all the way to it.
const PARALLAX_RANGE_PX = 70;

/**
 * The homepage's Work section: a pinned viewport whose track moves
 * horizontally in lockstep with the page's own vertical scroll (the
 * caiguangxi.com reference the design brief pointed at), then releases into
 * the next section once the track runs out — no drag, no momentum, no
 * hijacked wheel/touch events. This is still 100% native scrolling; the only
 * thing JS does is read the real scroll position every frame and mirror it
 * into a horizontal transform (and, from that same position, a small
 * per-image parallax offset — see below). Every card shares this one
 * transform, so they all move at the same pixels-per-second by construction;
 * nothing here gives any individual card its own speed.
 */
export default function PinnedPortfolioCarousel({
  items,
  introText,
  outroText,
}: {
  items: PinnedPortfolioItem[];
  /** Text-only bookend slots woven into the same track as the project cards
   * (see the Figma spec) — not links, just the track's first and last
   * entries. */
  introText: string;
  outroText: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const introRef = useRef<HTMLParagraphElement | null>(null);
  const outroRef = useRef<HTMLParagraphElement | null>(null);

  const entries: TrackEntry[] = [
    { kind: "text", key: "intro", text: introText },
    ...items.map((item): TrackEntry => ({ kind: "project", key: item.slug, item })),
    { kind: "text", key: "outro", text: outroText },
  ];

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    // Reduced motion gets the honest fallback instead of a faked-still
    // version of the same effect: no pin, no scroll-linked transform, no
    // parallax — just a plain block that the CSS below turns into a native
    // horizontally scrollable strip (overflow-x: auto on .pppc-sticky).
    // Skipping the whole effect (rather than running it with animations
    // disabled) means no extra scroll distance is ever added to the page
    // for a visitor who asked for less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let maxTranslate = 0;

    // 1px of vertical scroll == 1px of horizontal track movement, and the
    // section's own height is sized to exactly match that (one viewport for
    // the pin itself, plus however far the track has left to travel) — so
    // the sticky element releases at the exact instant the track finishes,
    // never a moment early or late. No separate "progress" fraction or
    // easing curve to keep in sync with a hand-picked section height.
    const measure = () => {
      // Leading/trailing padding is computed, not the flat CSS clamp() it
      // used to be, so the *first project card's* left edge lands exactly
      // at viewport-center when the track is untransformed, and the *last
      // project card's* right edge lands there too once fully scrolled —
      // both ends framed the same way, with the intro/outro quote peeking
      // in from off-center rather than the cards themselves starting
      // mid-screen. Solving for it: card1.left = padding + introWidth + gap
      // must equal half the viewport width, so padding = half width minus
      // introWidth minus gap (and symmetrically for the trailing side,
      // since maxTranslate itself falls out of the track's total width —
      // see the comment below on why that's enough to also place the last
      // card correctly with no separate calculation needed there).
      const gapPx = parseFloat(getComputedStyle(track).columnGap) || 0;
      const viewportWidth = sticky.clientWidth;
      const introWidth = introRef.current?.getBoundingClientRect().width ?? 0;
      const outroWidth = outroRef.current?.getBoundingClientRect().width ?? 0;
      const paddingStart = Math.max(0, viewportWidth / 2 - gapPx - introWidth);
      const paddingEnd = Math.max(0, viewportWidth / 2 - gapPx - outroWidth);
      track.style.paddingInlineStart = `${paddingStart}px`;
      track.style.paddingInlineEnd = `${paddingEnd}px`;

      maxTranslate = Math.max(0, track.scrollWidth - sticky.clientWidth);
      section.style.height = `${sticky.clientHeight + maxTranslate}px`;
    };

    const apply = () => {
      // getBoundingClientRect().top, not window.scrollY directly: this is
      // robust to whatever sits above the section (see HomeExperience's own
      // negative margin-top on .hs__work, which cancels the header's
      // reserved space so this section's top already sits at the viewport's
      // top edge from the very first frame — without that, there's a window
      // where the section hasn't reached position: sticky's stuck state yet
      // but this was already translating the track, reading as the whole
      // carousel drifting diagonally instead of purely sideways). Live
      // getBoundingClientRect() also can't go stale the way a once-measured
      // offsetTop can (see this function's git history for that bug).
      const raw = -section.getBoundingClientRect().top;
      const clamped = Math.min(Math.max(raw, 0), maxTranslate);
      track.style.transform = `translate3d(${-clamped}px, 0, 0)`;

      // Parallax: each image drifts opposite its own card's position
      // relative to the sticky viewport's center — zero exactly at center,
      // growing as the card approaches either edge — so it reads as the
      // photo lagging slightly behind the frame carrying it, not a fixed
      // offset. Same technique BaseLayout's own [data-parallax] elements
      // use for vertical drift (a distance-from-center factor written to a
      // CSS custom property), just measured horizontally here since that's
      // the axis this carousel actually moves on.
      //
      // Normalized against half the sticky viewport's own width, not each
      // card's own width — a card's own width was tried first (reasoning:
      // a card only travels about one card-width either side of center
      // before it's off-screen), but that's only true on a viewport barely
      // wider than the card itself. On an ordinary desktop viewport a card
      // is visible across a much wider band than its own width, so most of
      // that band fell outside the card-width normalizer's ±1 range and
      // just sat clamped at the max offset — frozen the instant it
      // appeared, only actually animating for a brief window near center,
      // and different cards visible at once could be in different halves
      // of that (one already clamped-still, another mid-swing), reading as
      // inconsistent rates rather than one shared rule. Using the
      // viewport's own half-width means every visible card is within ±1 (a
      // card literally cannot be more than half a viewport away from
      // center while any part of it is still on screen), so the drift
      // updates continuously for as long as anything is visible, in
      // lockstep with the exact same track transform driving everything
      // else — no separate easing curve, no per-card timing, just this
      // frame's scroll position mapped through one shared, always-linear
      // rule.
      const stickyRect = sticky.getBoundingClientRect();
      const stickyCenter = stickyRect.left + stickyRect.width / 2;
      const parallaxNormalizer = stickyRect.width / 2;
      imageRefs.current.forEach((img) => {
        const cardRect = img.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const normalized = parallaxNormalizer > 0 ? (cardCenter - stickyCenter) / parallaxNormalizer : 0;
        const offset = Math.max(-1, Math.min(1, normalized)) * PARALLAX_RANGE_PX;
        img.style.setProperty("--pppc-parallax", `${offset.toFixed(1)}px`);
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        apply();
        ticking = false;
      });
    };

    measure();
    apply();

    const resizeObserver = new ResizeObserver(() => {
      measure();
      apply();
    });
    resizeObserver.observe(track);
    resizeObserver.observe(sticky);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  return (
    <section ref={sectionRef} className="pppc-pin" aria-label="Portfolio">
      <div ref={stickyRef} className="pppc-sticky">
        <div ref={trackRef} className="pppc-track">
          {entries.map((entry) =>
            entry.kind === "text" ? (
              <p
                key={entry.key}
                className="pppc-quote"
                ref={entry.key === "intro" ? introRef : outroRef}
              >
                {entry.text}
              </p>
            ) : (
              <a
                key={entry.key}
                href={entry.item.href}
                className="pppc-card"
                aria-label={`${entry.item.title} — ${entry.item.subtitle}`}
                style={entry.item.accent ? ({ "--accent": entry.item.accent } as CSSProperties) : undefined}
              >
                <div className="pppc-image-frame">
                  <EyeCursorItem isCarouselDragging={() => false}>
                    <img
                      ref={(el) => {
                        if (el) imageRefs.current.set(entry.key, el);
                        else imageRefs.current.delete(entry.key);
                      }}
                      className="pppc-image"
                      src={entry.item.image}
                      alt={entry.item.imageAlt}
                      style={{ viewTransitionName: caseCoverTransitionName(entry.item.slug) }}
                    />
                  </EyeCursorItem>
                </div>
                <div className="pppc-meta">
                  <div className="pppc-title">{entry.item.title}</div>
                  <p className="pppc-subtitle">{entry.item.subtitle}</p>
                </div>
              </a>
            ),
          )}
        </div>
      </div>

      <style>{`
        .pppc-pin {
          position: relative;
          width: 100%;
          background: #ebebeb;
          color: #141414;
        }
        .pppc-sticky {
          position: sticky;
          top: 0;
          height: 100svh;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .pppc-track {
          display: flex;
          align-items: center;
          width: max-content;
          gap: 24px;
          /* Static fallback only — the effect above overrides both sides
             via inline style once mounted, computing them so the first/last
             project card lands flush with viewport-center at either end of
             the scroll (see measure()'s own comment). This value only ever
             shows pre-hydration or under prefers-reduced-motion, where the
             effect bails out entirely and this becomes a plain scrollable
             strip instead. */
          padding-inline: clamp(1rem, 6vw, var(--space-8, 6rem));
          will-change: transform;
        }
        /* Fixed 384px per the Figma spec (desktop), not a fluid clamp() —
           min() only steps in to keep it from overflowing a narrow phone
           screen, it never grows past 384px on anything wider. */
        .pppc-card {
          --card-size: min(384px, 78vw);
          position: relative;
          display: block;
          text-decoration: none;
          color: inherit;
          width: var(--card-size);
          flex: 0 0 auto;
        }
        .pppc-image-frame {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }
        /* .pppc-card's own height (what .pppc-track's align-items: center
           actually aligns by) is deliberately just the image frame's —
           title/subtitle live outside normal flow (see .pppc-meta's
           position: absolute below) instead of stacking underneath it, so
           a card whose title happens to wrap to a second line can't make
           that one card's box taller than the others and throw off
           everyone's shared center. Every card uses the same --card-size,
           so with meta out of the height calculation entirely, all four
           are now exactly the same height by construction, not just
           usually the same height. */
        /* Oversized relative to its frame (160%, recentered with a -30%
           inset) purely so the parallax transform below has room to pan
           without ever revealing an edge — see PARALLAX_RANGE_PX's own
           comment in the component for the budget this stays inside. */
        .pppc-image {
          display: block;
          width: 160%;
          height: 160%;
          margin: -30%;
          max-width: none;
          object-fit: cover;
          filter: grayscale(1) saturate(0.28);
          transform: translateX(var(--pppc-parallax, 0px));
          transition: filter var(--duration-base) var(--ease-standard);
        }
        .pppc-card:hover .pppc-image,
        .pppc-card:focus-visible .pppc-image {
          filter: grayscale(0) saturate(1.04);
        }
        .pppc-meta {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .pppc-title {
          font-size: var(--text-base);
          font-weight: var(--weight-regular);
          transition: color var(--duration-fast) var(--ease-standard);
        }
        .pppc-card:hover .pppc-title,
        .pppc-card:focus-visible .pppc-title {
          color: var(--accent, inherit);
        }
        .pppc-subtitle {
          margin: 0;
          font-size: var(--text-sm);
          opacity: 0.65;
        }
        .pppc-card:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 6px;
        }
        /* Half a card's width, matching the Figma spec exactly (384/2) —
           short enough that the line wraps into a handful of short lines
           rather than one long one, same visual weight as the image cards
           either side of it. */
        .pppc-quote {
          width: min(192px, 48vw);
          flex: 0 0 auto;
          margin: 0;
          font-size: var(--text-base);
          font-weight: var(--weight-thin);
          font-style: italic;
          line-height: 1.5;
        }
        @media (max-width: 720px), (hover: none), (pointer: coarse) {
          .pppc-image {
            transition: none;
            filter: grayscale(0) saturate(1.04);
          }
        }
        /* Reduced-motion fallback: no pin, no JS-driven transform or
           parallax (see the effect above, which bails out entirely under
           this same query) — just a normal block whose track becomes a
           native horizontally scrollable strip, so the content is still
           fully reachable. */
        @media (prefers-reduced-motion: reduce) {
          .pppc-sticky {
            position: static;
            height: auto;
            overflow-x: auto;
            padding-block: var(--space-4);
          }
          .pppc-track {
            transform: none !important;
          }
          .pppc-image {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
